// Async Hacks
(<any>Symbol)["asyncIterator"] = Symbol.asyncIterator || Symbol.for("asyncIterator");
interface AsyncIterable<T>{[Symbol.asyncIterator](): AsyncIterator<T>;}

// Subset of NodeJS.EventEmitter requiring the events "data", "end" and "error"
export interface IDataEvent{
    on(event : "data",  cb : (data : Buffer)    => void) : void;
    on(event : "end",   cb : ()                 => void) : void;
    on(event : "error", cb : (err : Error)      => void) : void;
}

// types implementing IDataEvent and NodeJS.WriteStream
export type NodeDataStream = IDataEvent&NodeJS.WriteStream;

/**
 * Async Data Generator. Takes an input providing data and yields that.
 * @param {IDataEvent} stream
 * @returns {AsyncIterable<Buffer>}
 */
export async function* dataEvent(stream : IDataEvent) : AsyncIterable<Buffer> {
    let waiting  : ((data : Buffer) => void)[]  = [];
    let buffered : Buffer[]                     = [];
    let ended                                   = false;

    stream.on("error",  (err  : Error)  => { throw err } );
    stream.on("end",    ()              => ended = true );
    stream.on("data",   (data : Buffer) => {
        if(waiting.length == 0) return buffered.push(data);
        waiting[0](data);
        waiting.splice(0,1);
    });

    while(!ended){
        yield await new Promise<Buffer>( resolve => {
            if(buffered.length == 0) return waiting.push(resolve);
            resolve(buffered[0]);
            buffered.splice(0,1);
        });
    }
}
