import { IComponent, DownstreamStreamsConfig, IObjectLogger } from "@scramjet/types";

import net from "net";

import { isDefined, TypedEmitter } from "@scramjet/utility";
import { ObjLogger } from "@scramjet/obj-logger";
import { CommunicationChannel } from "@scramjet/symbols";

type MaybeSocket = net.Socket | null
type RunnerConnectionsInProgress = [
    MaybeSocket, MaybeSocket, MaybeSocket, MaybeSocket, MaybeSocket, MaybeSocket, MaybeSocket, MaybeSocket
]
type RunnerOpenConnections = [
    net.Socket, net.Socket, net.Socket, net.Socket, net.Socket, net.Socket, net.Socket, net.Socket
]

type Events = {
    connect: (id: string, streams: DownstreamStreamsConfig) => void
}

/**
 * Server for incoming connections from Runners
 */
export class SocketServer extends TypedEmitter<Events> implements IComponent {
    // TODO: probably to change to net server, to verify
    server?: net.Server;

    logger: IObjectLogger;

    private runnerConnectionsInProgress = new Map<string, RunnerConnectionsInProgress>()

    constructor(private port: number) {
        super();

        this.logger = new ObjLogger(this);
    }

    async start(): Promise<void> {
        this.server = net.createServer();

        this.server
            .on("connection", async (connection) => {
                this.logger.info("New incoming Runner connection to SocketServer");

                connection.on("error", (err) => {
                    this.logger.error("Error on connection from runner", err);
                });

                const id = await new Promise<string>((resolve) => {
                    connection.once("readable", () => {
                        resolve(connection.read(36).toString());
                    });
                });

                this.logger.info("Connection from Instance", id);

                let runner = this.runnerConnectionsInProgress.get(id);

                if (!runner) {
                    runner = [null, null, null, null, null, null, null, null];
                    this.runnerConnectionsInProgress.set(id, runner);
                }

                const channel = await new Promise<number>((resolve) => {
                    connection.once("readable", () => {
                        resolve(parseInt(connection.read(1).toString(), 10));
                    });
                });

                connection.on("error", (err) => {
                    this.logger.error("Error on Instance in stream", id, channel, err);
                });

                this.logger.info("Connection on channel", channel);

                if (runner[channel] === null) {
                    runner[channel] = connection;
                } else {
                    throw new Error(`Runner(${id}) wanted to connect on already initialized channel ${channel}`);
                }

                if (runner.every(isDefined)) {
                    this.runnerConnectionsInProgress.delete(id);

                    runner[CommunicationChannel.LOG]!.pipe(this.logger.inputStringifiedLogStream);
                    this.emit("connect", id, runner as RunnerOpenConnections);
                }
            });

        return new Promise((res, rej) => {
            this.server!
                .listen(this.port, () => {
                    this.logger.info("SocketServer on", this.server?.address());
                    res();
                })
                .on("error", rej);
        });
    }

    close() {
        this.server?.close((err: any) => {
            if (err) {
                this.logger.error(err);
            }
        });
    }
}
