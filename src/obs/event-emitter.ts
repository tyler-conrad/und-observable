import {target} from './obs';

const listeners: WeakMap<Object, Map<PropertyKey, Set<Function>>> = new WeakMap();

export class EventEmitter {
    off(event?: PropertyKey): EventEmitter {
        if(listeners.has(this)){
            if(event){
                const keyMap = listeners.get(this);
                if (keyMap.has(event)){
                    keyMap.get(event).clear();
                }
                else {
                    console.warn(`off() called on event with no listeners: ${this} ${event}`);
                }
            }
            else {
                listeners.delete(this);
            }
        }
        else {
            console.warn(`off() called on EventEmitter with no listeners: ${this}`);
        }
        return this;
    }

    on(event: PropertyKey, callback: Function): EventEmitter {
        if(listeners.has(this)){
            const keyMap = listeners.get(this);
            if(keyMap.has(event)){
                keyMap.get(event).add(callback);
            }
            else {
                keyMap.set(event, new Set([callback]));
            }
        }
        else{
            listeners.set(this, new Map([[event, new Set([callback])]]));
        }
        return this;
    }

    emit(event: PropertyKey, value: any, op: string, ...args: any[]): EventEmitter {
        if(listeners.has(this)){
            const keyMap = listeners.get(this);
            if(keyMap.has(event)){
                for(const callback of keyMap.get(event)){
                    callback(value, op, event, ...args);
                }
            }
        }
        return this;
    }
}

export function patchWithEventEmitter(object: any){
    object[target] = object;
    Object.setPrototypeOf(object,
        Object.create(
            Object.getPrototypeOf(object),
            (<any>Object).getOwnPropertyDescriptors(EventEmitter.prototype)));
}
