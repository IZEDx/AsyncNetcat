// Imports
import {createServer, Socket} from "net"; // basic TCP stuff
import {dataEvent, IDataEvent, NodeDataStream} from "./dataevent";

// Constants
const EOT = "\u0004";
const NO_OUTPUT = process.argv[4] == "-h";                      // True when -h is appended after the port on the cli
const log = (str : string) => NO_OUTPUT || console.log(str);    // Console log only when allowed

/**
 * Async Piping.
 * @param {IDataEvent} input Data comes
 * @param {NodeDataStream} output Data goes
 * @returns {Promise<void>}
 */
async function pipe(input : IDataEvent, output : NodeDataStream){

    for await (let data of dataEvent(input)){
        if(output == null || !output.writable) throw "Output Unavailable";

        let ieot = data.indexOf(EOT);
        output.write(ieot == 0 ? data : data.filter(k => k < ieot).toString());
    }

    output.write(EOT);
}

/**
 * Netcat. Piping from input to socket and from socket to output.
 * @param {Socket} socket Data Transfer Partner
 * @param {NodeJS.ReadStream} input Sending Data
 * @param {NodeJS.WriteStream} output Receiving Data
 */
export function netcat(socket : Socket, input : NodeJS.ReadStream, output : NodeJS.WriteStream){
    log(`Connected to ${socket.remoteAddress}:${socket.remotePort}`);

    pipe(socket, output).then(() => log("Received EOT"));
    pipe(input,  socket).then(() => log("Sending EOT"));
}



export function main(args : string[]){
    let host : string = args[2];
    let port : number = parseInt(args[3]);

    if(args.length < 4){
        console.log("Usage:");
        console.log("Client: npm start -- <host> <port>");
        console.log("Server: npm start -- -l <port>");
        return;
    }

    if (host == "-l") {
        createServer(socket => netcat(socket, process.stdin, process.stdout)).listen(port);
    }else{
        let socket = new Socket();
        socket.connect(port, host, () => netcat(socket, process.stdin, process.stdout));
    }
}
main(process.argv);