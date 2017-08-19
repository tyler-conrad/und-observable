import {target, obs} from './obs';
import {patchLength} from './util';
import {patchWithEventEmitter, EventEmitter} from './event-emitter';

export class ObservableWeakSet<T> extends EventEmitter {
    parentProxy: Object;

    get size(): number{
        return this[target].size;
    }

    has(value: T): boolean {
        return this[target].has(value);
    }

    add(value: T): ObservableWeakSet<T> {
        const hasValue = this.has(value);
        this[target].add(value);
        if(!hasValue){
            this.emit('add', value, 'add', this);
            this.emit('change', this, 'add', value);
            this.parentProxy && (<EventEmitter>this.parentProxy).emit(
                'change', this, 'add', value);

        }
        return this;
    }

    delete(value: T): boolean {
        const ret = this[target].delete(value);
        if(ret){
            this.emit('delete', value, 'delete', this);
            this.emit('change', this, 'delete', value);
            this.parentProxy && (<EventEmitter>this.parentProxy).emit(
                'change', this, 'delete', value);
        }
        return ret;
    }

    constructor(
            iterable: Iterable<T> = [],
            weakSet: WeakSet<T> = undefined,
            parentProxy: Object = undefined,
            emitOnConstruction: boolean = false){
        super();
        this[target] = weakSet ? weakSet : new WeakSet<T>();
        this.parentProxy = parentProxy;

        if(weakSet){
            return;
        }

        for(const i of iterable){
            if(emitOnConstruction) {
                this.add(i);
            }
            else {
                this[target].add(i);
            }
        }
    }
}
patchLength(ObservableWeakSet);

export class ObservableSet<T> extends EventEmitter {
    parentProxy: Object;

    get size(): number{
        return this[target].size;
    }

    add(value: T): ObservableSet<T> {
        const hasValue = this.has(value);
        this[target].add(value);
        if(!hasValue){
            this.emit('add', value, 'add', this);
            this.emit('change', this, 'add', value);
            this.parentProxy && (<EventEmitter>this.parentProxy).emit(
                'change', this, 'add', value);

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

    delete(value: T): boolean {
        const ret = this[target].delete(value);
        if(ret){
            this.emit('delete', value, 'delete', this);
            this.emit('change', this, 'delete', value);
            this.parentProxy && (<EventEmitter>this.parentProxy).emit(
                'change', this, 'delete', value);
        }
        return ret;
    }

    entries(): Iterable<[T, T]> {
        return this[target].entries();
    }

    forEach(callback: (value?: T, key?: T, observableSet?: ObservableSet<T>) => void, thisArg: any): void {
        this[target].forEach((value: T, key: T, set: Set<T>) => {
            callback.call(thisArg, value, key, this);
        });
    }

    has(value: T): boolean {
        return this[target].has(value);
    }

    keys(): Iterable<T> {
        return this[target].keys();
    }

    values(): Iterable<T> {
        return this[target].values();
    }

    [Symbol.iterator](): Iterator<T>{
        return this[target][Symbol.iterator];
    }

    constructor(
            iterable: Iterable<T> = [],
            parentProxy: Object = undefined,
            emitOnConstruction: boolean = false){
        super();
        this[target] = iterable instanceof Set ? iterable : new Set<T>(iterable);
        this.parentProxy = parentProxy;

        if(emitOnConstruction){
            const values = [...this[target].values()];
            this[target].clear();
            for(const val of values){
                this.add(val);
            }
        }
    }
}
patchLength(ObservableSet);

export class RecursiveObservableSet<T> extends EventEmitter {
    parentProxy: Object;
    private _observePrototypes: boolean;
    private _blackList: PropertyKey[];
    private _whiteList: PropertyKey[];
    private _unwrapped: Map<T, any>;

    get size(): number{
        return this[target].size;
    }

    add(value: T): RecursiveObservableSet<T>{
        const o = obs(
            value,
            true,
            this.parentProxy,
            this._observePrototypes,
            this._blackList,
            this._whiteList);
        const hasValue = this.has(o);
        if(!(hasValue && o[target])){
            this[target].add(o);
            this._unwrapped.set(o && o[target], o);
        }
        // o is a primitive so always add to Set to preserve regular Set behavior
        else if(!o[target]){
            this[target].add(o);
            this._unwrapped.set(o, o);
        }
        if(!hasValue){
            this.emit('add', value, 'add', this);
            this.emit('change', this, 'add', value);
            if(this.parentProxy !== this){
                (<EventEmitter>this.parentProxy).emit('change', this, 'add', value);
            }
        }
        return this;
    }

    clear(): void {
        const empty = this.size === 0;
        this[target].clear();
        this._unwrapped.clear();
        if(!empty){
            this.emit('clear', this, 'clear');
            this.emit('change', this, 'clear');
            if(this.parentProxy !== this) {
                (<EventEmitter>this.parentProxy).emit('change', this, 'clear');
            }
        }
    }

    delete(value: T): boolean {
        let o = value;
        if(this._unwrapped.has(value)){
            o = this._unwrapped.get(value);
        }
        const ret = this[target].delete(o);
        this._unwrapped.delete(value && value[target]);
        if(ret){
            this.emit('delete', value, 'delete', this);
            this.emit('change', this, 'delete', value);
            if(this.parentProxy !== this){
                (<EventEmitter>this.parentProxy).emit('change', this, 'delete', value);
            }
        }
        return ret;
    }

    has(value: T): boolean {
        return this[target].has(value) || this._unwrapped.has(value);
    }

    entries(): Iterable<[T, T]> {
        return this[target].entries();
    }

    forEach(callback: (value?: T, key?: T, recursiveObservableSet?: RecursiveObservableSet<T>) => void, thisArg: any): void {
        this[target].forEach((value: T, key: T, set: Set<T>) => {
            callback.call(thisArg, value, key, this);
        });
    }

    keys(): Iterable<T> {
        return this[target].keys();
    }

    values(): Iterable<T> {
        return this[target].values();
    }

    [Symbol.iterator](): Iterator<T>{
        return this[target][Symbol.iterator];
    }

    constructor(
            iterable: Iterable<T> = [],
            parentProxy: Object = undefined,
            emitOnConstruction: boolean = false,
            observePrototypes: boolean = false,
            blackList: PropertyKey[] = [target],
            whiteList: PropertyKey[] = []){
        super();
        this[target] = iterable instanceof Set ? iterable : new Set<T>(iterable);
        this.parentProxy = parentProxy ? parentProxy : this;
        this._observePrototypes = observePrototypes;
        this._blackList = blackList;
        this._whiteList = whiteList;

        this._unwrapped = new Map<T, any>();
        const values = [...this[target].values()];
        this[target].clear();
        for(const value in values) {
            const o = obs(
                value,
                true,
                this.parentProxy,
                this._observePrototypes,
                this._blackList,
                this._whiteList);
            this._unwrapped.set(value && value[target], o);
            if (emitOnConstruction) {
                this.add(o);
            }
            else {
                this[target].add(o);
            }
        }
    }
}
patchLength(RecursiveObservableSet);
