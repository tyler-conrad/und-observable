import {target, descriptorUnchanged, obs} from './obs';
import {patchWithEventEmitter, EventEmitter} from './event-emitter';

function keysFromPrototypeChain(object): Set<PropertyKey> {
    const keys = new Set<PropertyKey>();
    let proto = object;
    while((proto = Object.getPrototypeOf(proto)) !== null){
        for(const key of Reflect.ownKeys(proto)){
            keys.add(key);
        }
    }
    return keys;
}

export function observableObject(
        object: Object,
        recursive: boolean = false,
        parentProxy = undefined,
        observePrototypes: boolean = false,
        blackList: PropertyKey[] = [target],
        whiteList: PropertyKey[] = []){
    patchWithEventEmitter(object);

    const bl = new Set<PropertyKey>(blackList);
    if(!observePrototypes){
        for(const key of keysFromPrototypeChain(object)){
            bl.add(key);
        }
    }
    for(const key of whiteList){
        bl.delete(key);
    }

    const proxy = new Proxy(object, {
        defineProperty(
                target: Object,
                propKey: PropertyKey,
                newDescriptor: PropertyDescriptor){
            let doEmit = true;
            const targetDescriptor = Object.getOwnPropertyDescriptor(target, propKey);
            if(descriptorUnchanged(targetDescriptor, newDescriptor)){
                doEmit = false;
            }
            if(recursive
                && !bl.has(propKey)
                && newDescriptor.value instanceof Object){
                newDescriptor.value = obs(
                    newDescriptor.value, true, parentProxy ? parentProxy : proxy);
            }
            const ret = Reflect.defineProperty(target, propKey, newDescriptor);
            if(doEmit){
                proxy.emit(propKey, newDescriptor.value, 'set', proxy, newDescriptor);
                proxy.emit('change', proxy, 'set', propKey, newDescriptor.value, newDescriptor);
                parentProxy && (<EventEmitter>parentProxy).emit(
                    'change', proxy, 'set', propKey, newDescriptor.value, newDescriptor);
            }
            return ret;
        },
        get(proxyTarget: Object, propKey: PropertyKey, receiver: Object){
            const propVal = Reflect.get(proxyTarget, propKey, receiver);
            if(recursive && !bl.has(propKey)){
                const isObservable = !!propVal[target];
                const o = obs(propVal, true, parentProxy ? parentProxy : proxy);
                if(!isObservable && propVal instanceof Object) {
                    // bypass proxy and set directly on target
                    if(!Reflect.set(proxyTarget, propKey, o)){
                        console.warn(`Failed to wrap property in observable: ${receiver} ${proxyTarget} ${propKey}`);
                    }
                }
                return o;
            }
            return propVal;
        },
        deleteProperty(target: Object, propKey: PropertyKey){
            const ret = Reflect.deleteProperty(target, propKey);
            if(ret){
                proxy.emit(propKey, undefined, 'delete', proxy);
                proxy.emit('change', proxy, 'delete', propKey, undefined);
                parentProxy && (<EventEmitter>parentProxy).emit(
                    'change', proxy, 'delete', propKey, undefined);
            }
            return ret;
        }
    });
    return proxy;
}
