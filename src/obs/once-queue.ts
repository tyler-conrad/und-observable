const onceQueue: Map<Function, any[]> = new Map();

export let manualOnceQueue = false;

let onceQueueRunScheduled = false;
export function once(callback: Function, ...args: any[]): void {
    onceQueue.set(callback, args);
    if(!manualOnceQueue && !onceQueueRunScheduled){
        onceQueueRunScheduled = true;
        Promise.resolve().then(runOnceQueue)
    }
}

export function runOnceQueue(): void {
    for(const [callback, args] of onceQueue){
        callback.apply(args[0], args.slice(1));
    }
    onceQueue.clear();
    onceQueueRunScheduled = false;
}
