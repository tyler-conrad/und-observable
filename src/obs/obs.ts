import {ObservableClass} from './class';
import {ObservableSet, RecursiveObservableSet, ObservableWeakSet} from './set';
import {
    ObservableMap,
    RecursiveObservableMap,
    ObservableWeakMap,
    RecursiveObservableWeakMap
} from './map';
import {observableObject} from './object';

export const target = Symbol('__target__');

function sameOrUndefined(
        key: string,
        targetDescriptor: PropertyDescriptor,
        newDescriptor: PropertyDescriptor){
    return (key in newDescriptor ? targetDescriptor[key] === newDescriptor[key] : true)
}

export function descriptorUnchanged(
        targetDescriptor: PropertyDescriptor,
        newDescriptor: PropertyDescriptor){
    return targetDescriptor
        && sameOrUndefined('value', targetDescriptor, newDescriptor)
        && sameOrUndefined('writable', targetDescriptor, newDescriptor)
        && sameOrUndefined('get', targetDescriptor, newDescriptor)
        && sameOrUndefined('set', targetDescriptor, newDescriptor)
        && sameOrUndefined('configurable', targetDescriptor, newDescriptor)
        && sameOrUndefined('enumerable', targetDescriptor, newDescriptor)
}

export function obs(
        object: Object,
        recursive: boolean = false,
        parentProxy: Object = undefined,
        observePrototypes: boolean = false,
        blackList: PropertyKey[] = [target],
        whiteList: PropertyKey[] = []): any {
    if(object && (<any>object)[target]){
        if(object instanceof ObservableClass
        || object instanceof ObservableSet
        || object instanceof RecursiveObservableSet
        || object instanceof ObservableWeakSet
        || object instanceof ObservableMap
        || object instanceof RecursiveObservableMap
        || object instanceof ObservableWeakMap
        || object instanceof RecursiveObservableWeakMap){
            object.parentProxy = parentProxy ? parentProxy : object.parentProxy;
        }
        return object;
    }

    if(object instanceof WeakSet){
        return new ObservableWeakSet(undefined, object, parentProxy);
    }

    if(object instanceof Set){
        if(recursive){
            return new RecursiveObservableSet(
                object, parentProxy, false, observePrototypes, blackList, whiteList);
        }
        return new ObservableSet(object, parentProxy, false);
    }

    if(object instanceof WeakMap){
        return new ObservableWeakMap(undefined, object, parentProxy);
    }

    if(object instanceof Map){
        if(recursive){
            return new RecursiveObservableMap(
                object, parentProxy, false, observePrototypes, blackList, whiteList)
        }
        return new ObservableMap(object, parentProxy, false);
    }

    if(object instanceof Object){
        return observableObject(
            object, recursive, parentProxy, observePrototypes, blackList, whiteList);
    }

    return object;
}
