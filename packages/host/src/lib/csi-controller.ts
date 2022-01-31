import {
    APIRoute,
    AppConfig,
    CSIConfig,
    DownstreamStreamsConfig,
    EncodedMessage,
    ExitCode,
    HandshakeAcknowledgeMessage,
    ICommunicationHandler,
    ParsedMessage,
    PassThroughStreamsConfig,
    ReadableStream,
    SequenceInfo,
    WritableStream,
    InstanceConifg,
    ILifeCycleAdapterRun,
    MessageDataType,
    IObjectLogger
} from "@scramjet/types";
import {
    AppError,
    CSIControllerError,
    CommunicationHandler,
    HostError,
    MessageUtilities,
    InstanceAdapterError
} from "@scramjet/model";
import { CommunicationChannel as CC, RunnerMessageCode } from "@scramjet/symbols";
import { PassThrough, Readable } from "stream";
import { development } from "@scramjet/sth-config";

import { DataStream } from "scramjet";
import { EventEmitter } from "events";
import { ServerResponse } from "http";
import { getRouter } from "@scramjet/api-server";

import { getInstanceAdapter } from "@scramjet/adapters";
import { defer, promiseTimeout, TypedEmitter } from "@scramjet/utility";
import { ObjLogger } from "@scramjet/obj-logger";
import { ProcessInstanceAdapter } from "@scramjet/adapters/src/process-instance-adapter";

const stopTimeout = 7000;

type Events = {
    pang: (payload: MessageDataType<RunnerMessageCode.PANG>) => void,
    error: (error: any) => void,
    end: (code: number) => void,
}

/**
 * Handles all Instance lifecycle, exposes instance's HTTP API.
 */
export class CSIController extends TypedEmitter<Events> {
    id: string;

    private keepAliveRequested?: boolean;
    config: CSIConfig;
    sequence: SequenceInfo;
    appConfig: AppConfig;
    instancePromise?: Promise<number>;
    sequenceArgs: Array<any> | undefined;
    controlDataStream?: DataStream;
    router?: APIRoute;
    info: {
        ports?: any,
        created?: Date,
        started?: Date
    } = {};
    provides?: string;
    requires?: string;
    initResolver?: { res: Function, rej: Function };
    startResolver?: { res: Function, rej: Function };
    startPromise: Promise<void>;

    apiOutput = new PassThrough();
    apiInputEnabled = true;

    /**
     * Logger.
     *
     * @type {IObjectLogger}
     */
    logger: IObjectLogger;

    private _instanceAdapter?: ILifeCycleAdapterRun;

    get instanceAdapter(): ILifeCycleAdapterRun {
        if (!this._instanceAdapter) {
            throw new Error("Instance adapter uninitialized");
        }

        return this._instanceAdapter;
    }

    _endOfSequence?: Promise<number>;

    get endOfSequence(): Promise<number> {
        if (!this._endOfSequence) {
            throw new InstanceAdapterError("RUNNER_NOT_STARTED");
        }

        return this._endOfSequence;
    }

    set endOfSequence(prm: Promise<number>) {
        this._endOfSequence = prm;
    }

    /**
     * Streams connected do API.
     */
    private downStreams?: DownstreamStreamsConfig;
    private upStreams?: PassThroughStreamsConfig;

    communicationHandler: ICommunicationHandler;

    constructor(
        id: string,
        sequence: SequenceInfo,
        appConfig: AppConfig,
        sequenceArgs: any[] | undefined,
        communicationHandler: CommunicationHandler,
        csiConfig: CSIConfig
    ) {
        super();

        this.id = id;
        this.sequence = sequence;
        this.appConfig = appConfig;
        this.config = csiConfig;
        this.sequenceArgs = sequenceArgs;

        this.communicationHandler = communicationHandler;

        this.startPromise = new Promise((res, rej) => {
            this.startResolver = { res, rej };
        });

        this.logger = new ObjLogger(this, { id: this.id });

        this.logger.debug("Constructor executed");
        this.info.created = new Date();
    }

    async start() {
        const i = new Promise((res, rej) => {
            this.initResolver = { res, rej };
            this.startInstance();
        });

        i.then(() => this.main()).catch(e => {
            this.emit("error", e);
        });

        return i;
    }

    async main() {
        this.logger.trace("Instance started");

        let code = 0;

        try {
            code = await this.instanceStopped();

            this.logger.trace("Instance stopped.");
        } catch (e: any) {
            code = e;
            this.logger.error("Instance caused error, code:", e);
        }

        this.emit("end", code);
    }

    startInstance() {
        this._instanceAdapter = getInstanceAdapter(this.config.noDocker);
        this._instanceAdapter.logger.pipe(this.logger);

        const instanceConfig: InstanceConifg = {
            ...this.sequence.config,
            instanceAdapterExitDelay: this.config.instanceAdapterExitDelay
        };

        const instanceMain = async () => {
            try {
                await this.instanceAdapter.init();

                this.logger.trace("Streams hooked and routed");

                this.endOfSequence = this.instanceAdapter.run(instanceConfig, this.config.instancesServerPort, this.id);

                this.logger.trace("Sequence initialized");

                const exitcode = await this.endOfSequence;

                // TODO: if we have a non-zero exit code is this expected?
                this.logger.trace("Sequence finished with status", exitcode);

                if (exitcode === 0) {
                    this.logger.trace("Sequence finished with success", exitcode);
                } else {
                    this.logger.error("Sequence finished with error", exitcode);
                }

                return exitcode;
            } catch (error: any) {
                this.logger.error("Error caught", error.stack);

                await this.instanceAdapter.cleanup();

                this.logger.error("Cleanup done (post error)");

                return 213;
            }
        };

        this.instancePromise = instanceMain();
    }

    instanceStopped(): Promise<ExitCode> {
        if (!this.instancePromise) {
            throw new CSIControllerError("UNATTACHED_STREAMS");
        }

        return this.instancePromise;
    }

    hookupStreams(streams: DownstreamStreamsConfig) {
        this.logger.trace("Hookup streams");

        this.downStreams = streams;

        if (development()) {
            streams[CC.STDOUT].pipe(process.stdout);
            streams[CC.STDERR].pipe(process.stderr);
        }

        streams[CC.LOG].pipe(this.logger.inputStringifiedLogStream);

        this.upStreams = [
            new PassThrough(), new PassThrough(), new PassThrough(), new PassThrough(),
            new PassThrough(), new PassThrough(), new PassThrough(), new PassThrough(),
        ];

        this.upStreams.forEach((stream, i) => stream?.on("error", (err) => {
            this.logger.error("Downstream error on channel", i, err);
        }));

        this.communicationHandler.hookUpstreamStreams(this.upStreams);
        this.communicationHandler.hookDownstreamStreams(this.downStreams);

        this.communicationHandler.pipeStdio();
        this.communicationHandler.pipeMessageStreams();
        this.communicationHandler.pipeDataStreams();

        this.controlDataStream = new DataStream();
        this.controlDataStream
            .JSONStringify()
            .pipe(this.upStreams[CC.CONTROL]);

        this.communicationHandler.addMonitoringHandler(RunnerMessageCode.PING, async (message) => {
            await this.handleHandshake(message);

            return null;
        });

        this.communicationHandler.addMonitoringHandler(RunnerMessageCode.PANG, async (message) => {
            const pangData = message[1];

            if (pangData.provides) {
                this.provides ||= pangData.provides;
            } else if (pangData.requires) {
                this.requires ||= pangData.requires;
                if (pangData.requires !== "") {
                    this.apiInputEnabled = false;
                }
            }
            this.emit("pang", message[1]);
        });

        this.communicationHandler.addMonitoringHandler(RunnerMessageCode.MONITORING, async message => {
            message[1] = await this.instanceAdapter.stats(message[1]);
            return message;
        }, true);

        this.communicationHandler.addControlHandler(
            RunnerMessageCode.KILL,
            (message) => this.handleKillCommand(message)
        );

        this.communicationHandler.addMonitoringHandler(
            RunnerMessageCode.ALIVE,
            (message) => this.handleKeepAliveCommand(message)
        );

        this.communicationHandler.addMonitoringHandler(
            RunnerMessageCode.SEQUENCE_STOPPED,
            message => this.handleSequenceStopped(message)
        );

        this.communicationHandler.addMonitoringHandler(
            RunnerMessageCode.SEQUENCE_COMPLETED,
            message => this.handleSequenceCompleted(message)
        );

        this.communicationHandler.addControlHandler(
            RunnerMessageCode.STOP,
            async message => this.handleStop(message)
        );

        this.upStreams[CC.MONITORING].resume();
    }

    async handleHandshake(message: EncodedMessage<RunnerMessageCode.PING>) {
        this.logger.debug("PING received", message);

        if (!message[1].ports) {
            this.logger.trace("Received a PING message but didn't receive ports config");
        }

        this.info.ports = message[1].ports;

        if (this.controlDataStream) {
            const pongMsg: HandshakeAcknowledgeMessage = {
                msgCode: RunnerMessageCode.PONG,
                appConfig: this.appConfig,
                args: this.sequenceArgs
            };

            await this.controlDataStream.whenWrote(MessageUtilities.serializeMessage<RunnerMessageCode.PONG>(pongMsg));
        } else {
            throw new CSIControllerError("UNINITIALIZED_STREAM", "control");
        }

        if (this.config.noDocker) {
            await (this.instanceAdapter as ProcessInstanceAdapter)
                .sendSequenceToRunner(this.downStreams?.[CC.STDIN]!);
        }

        this.startResolver?.res();

        this.info.started = new Date();
        this.logger.info("Instance started", this.info);
    }

    async handleInstanceConnect(streams: DownstreamStreamsConfig) {
        try {
            this.hookupStreams(streams);
            this.createInstanceAPIRouter();

            this.initResolver?.res();
        } catch (e: any) {
            this.initResolver?.rej(e);
        }
    }

    createInstanceAPIRouter() {
        if (!this.upStreams) {
            throw new AppError("UNATTACHED_STREAMS");
        }

        this.router = getRouter();

        this.router.get("/", () => {
            return this.getInfo();
        });

        this.router.upstream("/stdout", this.upStreams[CC.STDOUT]);
        this.router.upstream("/stderr", this.upStreams[CC.STDERR]);
        this.router.downstream("/stdin", this.upStreams[CC.STDIN], { end: true });

        this.router.upstream("/log", this.upStreams[CC.LOG]);

        if (development()) {
            this.router.upstream("/monitoring", this.upStreams[CC.MONITORING]);
        }

        this.router.upstream("/output", this.upStreams[CC.OUT]);

        let inputHeadersSent = false;

        this.router.downstream("/input", (req) => {
            if (this.apiInputEnabled) {
                const stream = this.downStreams![CC.IN];
                const contentType = req.headers["content-type"];

                // @TODO: Check if subsequent requests have the same content-type.
                if (!inputHeadersSent) {
                    if (contentType === undefined) {
                        throw new Error("Content-Type must be defined");
                    }

                    stream.write(`Content-Type: ${contentType}\r\n`);
                    stream.write("\r\n");

                    inputHeadersSent = true;
                }

                return stream;
            }

            return { opStatus: 406, error: "Input provided in other way." };
        }, { checkContentType: false, end: true, encoding: "utf-8" });

        // monitoring data
        this.router.get("/health", RunnerMessageCode.MONITORING, this.communicationHandler);

        // We are not able to obtain all necessary information for this endpoint yet, disabling it for now
        // router.get("/status", RunnerMessageCode.STATUS, this.communicationHandler);

        const localEmitter = Object.assign(
            new EventEmitter(),
                { lastEvents: {} } as { lastEvents: { [evname: string]: any } }
        );

        this.communicationHandler.addMonitoringHandler(RunnerMessageCode.EVENT, (data) => {
            const event = data[1];

            if (!event.eventName) return;
            localEmitter.lastEvents[event.eventName] = event;
            localEmitter.emit(event.eventName, event);
        });

        this.router.upstream("/events/:name", async (req: ParsedMessage, res: ServerResponse) => {
            const name = req.params?.name;

            if (!name) {
                throw new HostError("EVENT_NAME_MISSING");
            }

            const out = new DataStream();
            const handler = (data: any) => out.write(data);
            const clean = () => {
                this.logger.debug(`Event stream "${name}" disconnected`);

                localEmitter.off(name, handler);
            };

            this.logger.debug("Event stream connected", name);

            localEmitter.on(name, handler);

            res.on("error", clean);
            res.on("end", clean);

            return out.JSONStringify();
        });

        const awaitEvent = async (req: ParsedMessage): Promise<unknown> => new Promise(res => {
            const name = req.params?.name;

            if (!name) {
                throw new HostError("EVENT_NAME_MISSING");
            }

            localEmitter.once(name, res);
        });

        this.router.get("/event/:name", async (req) => {
            if (req.params?.name && localEmitter.lastEvents[req.params.name]) {
                return localEmitter.lastEvents[req.params.name];
            }

            return awaitEvent(req);
        });
        this.router.get("/once/:name", awaitEvent);

        // operations
        this.router.op("post", "/_monitoring_rate", RunnerMessageCode.MONITORING_RATE, this.communicationHandler);
        this.router.op("post", "/_event", RunnerMessageCode.EVENT, this.communicationHandler);
        this.router.op("post", "/_stop", RunnerMessageCode.STOP, this.communicationHandler);
        this.router.op("post", "/_kill", RunnerMessageCode.KILL, this.communicationHandler);
    }

    async getInfo() {
        await this.startPromise;

        return {
            ...this.info,
            sequenceId: this.sequence.id,
            appConfig: this.appConfig,
            args: this.sequenceArgs
        };
    }

    getOutputStream(): ReadableStream<any> {
        return this.upStreams![CC.OUT];
    }

    getInputStream(): WritableStream<any> {
        return this.downStreams![CC.IN];
    }

    getLogStream(): Readable {
        return this.upStreams![CC.LOG];
    }

    async confirmInputHook(): Promise<void> {
        await this.controlDataStream?.whenWrote(
            [RunnerMessageCode.INPUT_CONTENT_TYPE, { connected: true }]
        );
    }

    // @TODO discuss this
    async handleSequenceCompleted(message: EncodedMessage<RunnerMessageCode.SEQUENCE_COMPLETED>) {
        this.logger.trace("Got message: SEQUENCE_COMPLETED.");

        // TODO: we are ready to ask Runner to exit.
        // TODO: this needs to send a STOP request with canKeepAlive and timeout.
        //       host would get those in `create` request.
        await this.communicationHandler.sendControlMessage(RunnerMessageCode.KILL, {});

        try {
            await promiseTimeout(this.endOfSequence, stopTimeout);

            this.logger.trace("Sequence terminated itself");
        } catch {
            await this.instanceAdapter.remove();

            this.logger.trace("Sequence doesn't terminated itself in expected time", stopTimeout);

            process.exitCode = 252;
        }

        return message;
    }

    // TODO: move this to Host like handleSequenceCompleted.
    async handleSequenceStopped(message: EncodedMessage<RunnerMessageCode.SEQUENCE_STOPPED>) {
        this.logger.trace("Sequence ended, sending kill");

        try {
            await promiseTimeout(this.endOfSequence, stopTimeout);

            this.logger.trace("Instance terminated itself");
        } catch {
            this.logger.warn("Instance failed to terminate within timeout, sending kill");

            await this.communicationHandler.sendControlMessage(RunnerMessageCode.KILL, {});

            try {
                await promiseTimeout(this.endOfSequence, stopTimeout);

                this.logger.trace("Terminated with kill");
            } catch {
                this.logger.error("Sequence unresponsive, killing");

                await this.instanceAdapter.remove();
                process.exitCode = 253;
            }
        }

        return message;
    }

    // TODO: move this to host (it's needed for both Stop and Complete signals)
    handleKeepAliveCommand(message: EncodedMessage<RunnerMessageCode.ALIVE>) {
        this.logger.trace("Got keep-alive message from sequence");

        this.keepAliveRequested = true;

        return message;
    }

    private async kill() {
        await this.communicationHandler.sendControlMessage(RunnerMessageCode.KILL, {});
    }

    private async handleKillCommand(message: EncodedMessage<RunnerMessageCode.KILL>) {
        // wait for this before cleanups
        // handle errors there
        await promiseTimeout(this.endOfSequence, stopTimeout)
            .catch(() => this.instanceAdapter.remove());

        return message;
    }

    private async handleStop(message: EncodedMessage<RunnerMessageCode.STOP>):
        Promise<EncodedMessage<RunnerMessageCode.STOP>> {
        const [, { timeout }] = message;

        this.keepAliveRequested = false;

        await defer(timeout);

        if (!this.keepAliveRequested) {
            await this.kill();
        }

        return message;
    }
}
