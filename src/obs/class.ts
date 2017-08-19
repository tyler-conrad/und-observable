import {target, descriptorUnchanged} from './obs';
import {EventEmitter} from './event-emitter';

const obsRefMap: WeakMap<Function, Set<PropertyKey>> = new WeakMap();

function propertyKeyToCallbackName(pk: PropertyKey){
    if(typeof pk === 'string'){
        return 'on' + pk[0].toUpperCase() + pk.slice(1)
    }
    else if(typeof pk === 'number'){
        return 'on' + Number(pk).toString();
    }
    else {
        return 'on' + pk.toString();
    }
}

export function obsRef(proto: EventEmitter, propKey: PropertyKey): void {
    const ctor = proto.constructor;
    if(obsRefMap.has(ctor)){
        obsRefMap.get(ctor).add(propKey);
    }
    else {
        obsRefMap.set(ctor, new Set([propKey]));
    }
}

export class ObservableClass extends EventEmitter {
    parentProxy: Object;

    constructor(parentProxy: Object = undefined){
        super();
        this[target] = this;
        this.parentProxy = parentProxy;

        const keys: Set<PropertyKey> = new Set();
        let ctor: Function = Object.getPrototypeOf(this).constructor;
        while(ctor !== ObservableClass){
            if(obsRefMap.has(ctor)){
                for(const key of obsRefMap.get(ctor)){
                    keys.add(key);
                }
            }
            ctor = Object.getPrototypeOf(ctor);
        }

        const proxy = <ObservableClass>new Proxy(this, {
            defineProperty(
                target: Object,
                propKey: PropertyKey,
                newDescriptor: PropertyDescriptor){
                let doEmit = true;
                const targetDescriptor = Object.getOwnPropertyDescriptor(target, propKey);
                if(descriptorUnchanged(targetDescriptor, newDescriptor)){
                    doEmit = false;
                }
                const ret = Reflect.defineProperty(target, propKey, newDescriptor);
                if(doEmit && keys.has(propKey)){
                    proxy.emit(propKey, newDescriptor.value, 'set', proxy, newDescriptor);
                    proxy.emit('change', proxy, 'set', propKey, newDescriptor.value, newDescriptor);
                    proxy.parentProxy && (<EventEmitter>proxy.parentProxy).emit(
                        'change', proxy, 'set', propKey, newDescriptor.value, newDescriptor);
                }
                return ret;
            },
            deleteProperty(target: Object, propKey: PropertyKey){
                const ret = Reflect.deleteProperty(target, propKey);
                if(ret){
                    proxy.emit(propKey, undefined, 'delete', proxy);
                    proxy.emit('change', proxy, 'delete', propKey, undefined);
                    proxy.parentProxy && (<EventEmitter>proxy.parentProxy).emit(
                        'change', proxy, 'delete', propKey, undefined);
                }
                return ret;
            }
        });

        for(const key of keys){
            const callback = proxy[propertyKeyToCallbackName(key)];
            if(!callback){
                continue;
            }
            proxy.on(key, callback.bind(this));
        }
        return proxy;
    }
}
