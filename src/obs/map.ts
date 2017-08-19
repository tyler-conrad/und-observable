import {target, obs} from './obs';
import {patchLength} from './util';
import {EventEmitter} from './event-emitter';

export class ObservableWeakMap<T extends Object, U> extends EventEmitter {
    parentProxy: Object;

    set(key: T, value: U): ObservableWeakMap<T, U> {
        const hasEntry = this[target].has(key) && this[target].get(key) === value;
        this[target].set(key, value);
        if(!hasEntry){
            const keyValue = {key, value};
            this.emit('set', keyValue, 'set', this);
            this.emit('change', this, 'set', [key, value]);
            this.parentProxy && (<EventEmitter>this.parentProxy).emit(
                'change', this, 'set', keyValue);
        }
        return this;
    }

    delete(key: T): boolean {
        const value = this[target].get(key);
        const ret = this[target].delete(key);
        if(ret){
            const keyValue = {key, value};
            this.emit('delete', keyValue, 'delete', this);
            this.emit('change', this, 'delete', [key, value]);
            this.parentProxy && (<EventEmitter>this.parentProxy).emit(
                'change', this, 'delete', keyValue);
        }
        return ret;
    }

    has(value: T): boolean {
        return this[target].has(value);
    }

    get(key: T): U {
        return this[target].get(key);
    }

    constructor(
            iterable: Iterable<[T, U]> = [],
            weakMap: WeakMap<T, U> = undefined,
            parentProxy: Object = undefined,
            emitOnConstruction: boolean = false){
        super();
        this[target] = weakMap ? weakMap : new WeakMap<T, U>();
        this.parentProxy = parentProxy;

        if(weakMap){
            return;
        }

        for(const [key, value] of iterable){
            if(emitOnConstruction){
                this.set(key, value);
            }
            else {
                this[target].set(key, value);
            }
        }
    }
}
patchLength(ObservableWeakMap);

export class RecursiveObservableWeakMap<T extends Object, U> extends EventEmitter {
    parentProxy: Object;
    private _observePrototypes: boolean;
    private _blackList: PropertyKey[];
    private _whiteList: PropertyKey[];
    private _unwrappedKeys: WeakMap<T, any>;
    private _unwrappedValues: WeakMap<T, U>;

    has(key: T): boolean {
        return this[target].has(key)
            || this._unwrappedKeys.has(key && key[target]);
    }

    set(key: T, value: U): RecursiveObservableWeakMap<T, U> {
        const oValue = obs(
            value,
            true,
            this.parentProxy,
            this._observePrototypes,
            this._blackList,
            this._whiteList);

        const hasKey = this.has(key);
        const hasValue =
            hasKey
            && (this[target].get(
                this._unwrappedKeys.get(key && key[target])) === oValue
            || this._unwrappedValues.get(
                key && key[target]) === oValue && oValue[target]);

        let doEmit = false;
        if(hasKey){
            const k = this._unwrappedKeys.get(key && key[target]);
            if(hasValue){
                if(oValue && oValue[target]){
                    this[target].set(k, this[target].get(k));
                }
                else if(oValue == null || !oValue[target]){
                    this[target].set(k, oValue);
                }
            }
            else {
                this._unwrappedValues.set(
                    k && k[target], oValue && oValue[target]);
                this[target].set(k, oValue);
                doEmit = true;
            }
        }
        else {
            this._unwrappedKeys.set(key && key[target], key);
            this._unwrappedValues.set(
                key && key[target], oValue && oValue[target]);
            this[target].set(key, oValue);
            doEmit = true;
        }

        if(doEmit){
            const keyValue = {
                key: this._unwrappedKeys.get(key && key[target]),
                value: oValue
            };
            this.emit('set', keyValue, 'set', this);
            this.emit('change', this, 'set', keyValue);
            if(this.parentProxy !== this){
                (<EventEmitter>this.parentProxy).emit(
                    'change', this, 'set', keyValue);
            }
        }

        return this;
    }

    delete(key: T): boolean {
        let k = key;
        if(this._unwrappedKeys.has(key && key[target])){
            k = this._unwrappedKeys.get(key && key[target]);
        }
        const value = this[target].get(k);
        this._unwrappedKeys.delete(key && key[target]);
        this._unwrappedValues.delete(key && key[target]);
        const ret = this[target].delete(k);
        if(ret){
            const keyValue = {key: k, value};
            this.emit('delete', keyValue, 'delete', this);
            this.emit('change', this, 'delete', [key, value]);
            if(this.parentProxy !== this){
                (<EventEmitter>this.parentProxy).emit(
                    'change', this, 'delete', keyValue);
            }
        }
        return ret;
    }

    get(key: T): U {
        let k = key;
        if(this._unwrappedKeys.has(key && key[target])){
            k = this._unwrappedKeys.get(key && key[target]);
        }
        return this[target].get(k);
    }

    constructor(
            iterable: Iterable<[T, U]> = [],
            parentProxy: Object = undefined,
            emitOnConstruction: boolean = false,
            observePrototypes: boolean = false,
            blackList: PropertyKey[] = [target],
            whiteList: PropertyKey[] = []){
        super();
        this[target] = new WeakMap<T, U>();
        this.parentProxy = parentProxy ? parentProxy : this;
        this._observePrototypes = observePrototypes;
        this._blackList = blackList;
        this._whiteList = whiteList;

        this._unwrappedKeys = new WeakMap<T, any>();
        this._unwrappedValues = new WeakMap<T, U>();

        for(const [key, value] of iterable){
            if(emitOnConstruction){
                this.set(key, value);
            }
            else {
                const oValue = obs(
                    value,
                    true,
                    this.parentProxy,
                    this._observePrototypes,
                    this._blackList,
                    this._whiteList);

                this._unwrappedKeys.set(key && key[target], key);
                this._unwrappedValues.set(key && key[target], value && value[target]);

                this[target].set(key, oValue);
            }
        }
    }
}
patchLength(RecursiveObservableWeakMap);

export class ObservableMap<T, U> extends EventEmitter{
    parentProxy: Object;

    get size(): number {
        return this[target].size;
    }

    set(key: T, value: U): ObservableMap<T, U> {
        const hasEntry = this[target].has(key) && this[target].get(key) === value;
        this[target].set(key, value);
        if(!hasEntry){
            const keyValue = {key, value};
            this.emit('set', keyValue, 'set', this);
            this.emit('change', this, 'set', [key, value]);
            this.parentProxy && (<EventEmitter>this.parentProxy).emit(
                'change', this, 'set', keyValue);
        }
        return this;
    }

    clear(): void {
        const empty = this.size === 0;
        this[target].clear();
        if(!empty){
            this.emit('clear', this, 'clear');
            this.emit('change', this, 'clear');
            this.parentProxy && (<EventEmitter>this.parentProxy).emit(
                'change', this, 'clear');
        }
    }

    delete(key: T): boolean {
        const value = this[target].get(key);
        const ret = this[target].delete(key);
        if(ret){
            const keyValue = {key, value};
            this.emit('delete', keyValue, 'delete', this);
            this.emit('change', this, 'delete', [key, value]);
            this.parentProxy && (<EventEmitter>this.parentProxy).emit(
                'change', this, 'delete', keyValue);
        }
        return ret;
    }

    entries(): Iterable<[T, U]> {
        return this[target].entries();
    }

    forEach(callback: (value?: U, key?: T, observableMap?: ObservableMap<T, U>) => void, thisArg: any): void {
        this[target].forEach((value: U, key: T, map: Map<T, U>) => {
            callback.call(thisArg, value, key, this);
        });
    }

    get(key: T): U {
        return this[target].get(key);
    }

    has(value: T): boolean {
        return this[target].has(value);
    }

    keys(): Iterable<T> {
        return this[target].keys();
    }

    values(): Iterable<U> {
        return this[target].values();
    }

    [Symbol.iterator](): Iterator<T> {
        return this[target][Symbol.iterator];
    }

    constructor(
            iterable: Iterable<[T, U]> = [],
            parentProxy: Object = undefined,
            emitOnConstruction: boolean = false){
        super();
        this[target] = iterable instanceof Map ? iterable : new Map<T, U>(iterable);
        this.parentProxy = parentProxy;

        if(emitOnConstruction){
            const entries = [...this[target].entries()];
            this[target].clear();
            for(const [key, value] of entries){
                this.set(key, value)
            }
        }
    }
}
patchLength(ObservableMap);

export class RecursiveObservableMap<T, U> extends EventEmitter {
    parentProxy: Object;
    private _observePrototypes: boolean;
    private _blackList: PropertyKey[];
    private _whiteList: PropertyKey[];
    private _unwrappedKeys: Map<T, any>;
    private _unwrappedValues: Map<T, U>;

    get size(): number{
        return this[target].size;
    }

    has(key: T): boolean {
        return this[target].has(key)
            || this._unwrappedKeys.has(key && key[target]);
    }

    set(key: T, value: U): RecursiveObservableMap<T, U> {
        const oKey = obs(
            key,
            true,
            this.parentProxy,
            this._observePrototypes,
            this._blackList,
            this._whiteList);

        const oValue = obs(
            value,
            true,
            this.parentProxy,
            this._observePrototypes,
            this._blackList,
            this._whiteList);

        const hasKey = this.has(oKey);
        const hasValue =
            hasKey
            && (this[target].get(
                this._unwrappedKeys.get(oKey && oKey[target])) === oValue
            || this._unwrappedValues.get(
                oKey && oKey[target]) === oValue && oValue[target]);

        let doEmit = false;
        if(hasKey){
            if(oKey && oKey[target]){
                const key = this._unwrappedKeys.get(oKey && oKey[target]);
                if(hasValue){
                    if(oValue && oValue[target]){
                        this[target].set(key, this[target].get(key));
                    }
                    else if(oValue == null || !oValue[target]){
                        this[target].set(key, oValue);
                    }
                }
                else {
                    this._unwrappedValues.set(
                        key && key[target], oValue && oValue[target]);
                    this[target].set(key, oValue);
                    doEmit = true;
                }
            }
            else if(oKey == null || !oKey[target]){
                if(hasValue){
                    if(oValue && oValue[target]){
                        this[target].set(oKey, this[target].get(oKey))
                    }
                    else if(oValue == null || !oValue[target]){
                        this[target].set(oKey, oValue);
                    }
                }
                else {
                    this._unwrappedValues.set(oKey, oValue && oValue[target]);
                    this[target].set(oKey, oValue);
                    doEmit = true;
                }
            }
        }
        else {
            this._unwrappedKeys.set(oKey && oKey[target], oKey);
            this._unwrappedValues.set(
                oKey && oKey[target], oValue && oValue[target]);
            this[target].set(oKey, oValue);
            doEmit = true;
        }

        if(doEmit){
            const keyValue = {
                key: this._unwrappedKeys.get(oKey && oKey[target]),
                value: oValue
            };

            this.emit('set', keyValue, 'set', this);
            this.emit('change', this, 'set', keyValue);
            if(this.parentProxy !== this){
                (<EventEmitter>this.parentProxy).emit('change', this, 'set', keyValue);
            }
        }
        return this;
    }

    clear(): void {
        const empty = this.size === 0;
        this[target].clear();
        this._unwrappedKeys.clear();
        this._unwrappedValues.clear();
        if(!empty){
            this.emit('clear', this, 'clear');
            this.emit('change', this, 'clear');
            if(this.parentProxy !== this) {
                (<EventEmitter>this.parentProxy).emit('change', this, 'clear');
            }
        }
    }

    delete(key: T): boolean {
        let k = key;
        if(this._unwrappedKeys.has(key && key[target])){
            k = this._unwrappedKeys.get(key && key[target]);
        }
        const value = this[target].get(k);
        this._unwrappedKeys.delete(key && key[target]);
        this._unwrappedValues.delete(key && key[target]);
        const ret = this[target].delete(k);
        if(ret){
            const keyValue = {key: k, value};
            this.emit('delete', keyValue, 'delete', this);
            this.emit('change', this, 'delete', [key, value]);
            if(this.parentProxy !== this){
                (<EventEmitter>this.parentProxy).emit(
                    'change', this, 'delete', keyValue);
            }
        }
        return ret;
    }

    get(key: T): U {
        let k = key;
        if(this._unwrappedKeys.has(key && key[target])){
            k = this._unwrappedKeys.get(key && key[target]);
        }
        return this[target].get(k);
    }

    entries(): Iterable<[T, U]>{
        return this[target].entries();
    }

    forEach(callback: (
        value?: U,
        key?: T,
        recursiveObservableMap?: RecursiveObservableMap<T, U>) => void,
            thisArg: any): void {
        this[target].forEach((value: U, key: T, map: Map<T, U>) => {
            callback.call(thisArg, value, key, this);
        });
    }

    keys(): Iterable<T> {
        return this[target].keys();
    }

    values(): Iterable<U> {
        return this[target].values();
    }

    [Symbol.iterator](): Iterator<T> {
        return this[target][Symbol.iterator];
    }

    constructor(
            iterable: Iterable<[T, U]> = [],
            parentProxy: Object = undefined,
            emitOnConstruction: boolean = false,
            observePrototypes: boolean = false,
            blackList: PropertyKey[] = [target],
            whiteList: PropertyKey[] = []){
        super();
        this[target] = iterable instanceof Map ? iterable : new Map<T, U>(iterable);
        this.parentProxy = parentProxy ? parentProxy : this;
        this._observePrototypes = observePrototypes;
        this._blackList = blackList;
        this._whiteList = whiteList;

        this._unwrappedKeys = new Map<T, any>();
        this._unwrappedValues = new Map<T, U>();

        const entries = [...this[target].entries()];
        this[target].clear();
        for(const [key, value] of entries){
            if(emitOnConstruction){
                this.set(key, value);
            }
            else {
                const oKey = obs(
                    key,
                    true,
                    this.parentProxy,
                    this._observePrototypes,
                    this._blackList,
                    this._whiteList);

                const oValue = obs(
                    value,
                    true,
                    this.parentProxy,
                    this._observePrototypes,
                    this._blackList,
                    this._whiteList);

                this._unwrappedKeys.set(key && key[target], oKey);
                this._unwrappedValues.set(key && key[target], value && value[target]);

                this[target].set(oKey, oValue);
            }
        }
    }
}
patchLength(RecursiveObservableMap);
