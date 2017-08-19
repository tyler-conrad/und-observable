export function patchLength(ctor){
    Object.defineProperty(ctor, 'length', {
        configurable: true,
        enumerable: false,
        writable: false,
        value: 0
    });
}
