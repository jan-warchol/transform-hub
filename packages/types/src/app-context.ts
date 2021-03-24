import { MaybePromise } from "./utils";
import { AppError, AppErrorConstructor } from "./app-error";
import { AppConfig } from "./application";
import { MonitoringMessage, FunctionDefinition } from "./runner";


/**
 * Object of this interface is passed to Application context and allows it to communicate
 * with the Platform to ensure that it's in operation and should be kept alive without
 * interruption.
 *
 *
 */

export interface AutoAppContext<AppConfigType extends AppConfig, State extends any> {
    /**
     * This method should be overridden by the Sequence if auto detection of the Sequence
     * state is not precise enough.
     *
     * The Runner will call this message periodically to obtain information on the
     * condition of the Sequence.
     *
     * If not provided, a monitoring function will be determined based on the
     * return value from the Sequence.
     *
     * @param resp passed if the system was able to determine monitoring message by itself.
     * @returns the monitoring information
     */
    monitor?: (resp?: MonitoringMessage) => MaybePromise<MonitoringMessage>;

    /**
     * This method can be overridden to handle the stop signal from the Runner and perform
     * a graceful shutdown. The platform will provide a grace period in order to save current
     * work and provide.
     *
     * This method can be called under two conditions:
     * * the instance will be terminated for extraneous reasons
     * * the instance was not able to confirm if the Sequence is alive
     *
     * The method can call @{see this.state} as many times as it likes, the valkue from the
     * last call will be made sure to be saved before the process will be terminated.
     *
     * @param timeout the number of seconds before the operation will be killed
     * @param canCallKeepalive informs if keepAlive can be called to prolong the operation
     * @returns the returned value can be a promise, once it's resolved the system will
     *          assume that it's safe to terminate the process.
     */
    stopHandler?: (timeout: number, canCallKeepalive: boolean) => MaybePromise<void>;

    /**
     * This method can be overridden to handle the kill signal from the Runner and perform
     * the final cleanup. This method is synchroneous and once it's exits the process will be
     * synchronously terminated.
     *
     * The method can call @{see this.state} as many times as it likes, the valkue from the
     * last call will be made sure to be saved before the process will be terminated.
     *
     * If this methods fails to exit within `100 ms` the process will be forcefully terminated
     * and the data will be lost.
     */
    killHandler?: () => void;

    /**
     * The Sequence may call this process in order to confirm continued operation and provide
     * an information on how long the Sequence should not be considered stale.
     *
     * Sequences that expose read or write functions do not need to call this when the data
     * is flowing.
     *
     * If the platform finds no indication that the Sequence is still alive it will attempt to
     * stop it.
     *
     * @param milliseconds provides information on how long the process should wait before
     */
    keepAlive(milliseconds?: number): this;

    /**
     * Calling this method will inform the Instance that the Sequence has completed the
     * operation and can be gracefully terminated.
     *
     * If the Sequence is Writable or Inert then it will call the stopHandler immediatelly.
     * If the Sequence is Readable of Transform then it will call the stopHandler when all the
     * data is passed to the neighours.
     *
     * This method will be called automatically when the readable side of the sequence ends.
     */
    end(): this;
    /**
     * Calling this method will inform the Instance that the Sequence has enountered a fatal
     * exception and should not be kept alive.
     *
     * If the Sequence is Writable or Inert then it will call the stopHandler immediatelly.
     * If the Sequence is Readable of Transform then it will call the stopHandler when any
     * error occurs on the readable side or it reaches end and all the data is passed to the
     * neighours.
     *
     * This method will be called automatically when the readable side of the sequence errors
     * out.
     *
     * @param error optional error object for inspection
     */
    destroy(error?: AppError): this;

    /**
     * This method can be used to ensure that the data is passed here will be stored for
     * another process. The operation is synchroneous and blocking.
     *
     * You can call the method as many times as you want, the last state will be safely
     * passed to the process that will take over after this one is terminated.
     *
     * @param state any serializable value
     */
    save(state: State): this;

    /**
     * Holds the previous state if there was a previous process in existance and it called the
     * {@link this#save}.
     */
    initialState?: State;

    /**
     * Receives events sent by the Instance that can be triggered via CLI and configured
     * actions.
     *
     * @param ev
     * @param handler
     */
    on(ev: string, handler: (message?: any) => void): this;
    on(ev: "error", handler: (message: Error) => void): this;

    /**
     * Sends events to the Instance that can be received by CLI and configured actions
     *
     * @param ev event name
     * @param message any serializable object
     */
    emit(ev: string, message?: any): this;
    emit(ev: "error", message: AppError): this;

    /**
     * Provides automated definition as understood by
     */
    definition?: FunctionDefinition[];

    readonly config: AppConfigType;
    readonly AppError: AppErrorConstructor;
}
/**
 * Object of this interface is passed to Application context and allows it to communicate
 * with the Platform to ensure that it's in operation and should be kept alive without
 * interruption.
 */
interface FullAppContext<
    AppConfigType extends AppConfig,
    State extends any
    > extends AutoAppContext<AppConfigType, State> {
    /**
     * This method must be overridden by the Sequence if definition is not
     * providing the correct outcome.
     *
     * The Runner will call this message periodically to obtain information on the
     * condition of the Sequence.
     *
     * If not provided, a monitoring function will be determined based on the
     * return value from the Sequence.
     *
     * @param resp passed if the system was able to determine monitoring message by itself.
     * @returns the monitoring information
     */
    monitor: (resp?: MonitoringMessage) => MaybePromise<MonitoringMessage>;
    /**
     * This method should be overridden by the sequence if auto detection of the Sequence
     * definition is not providing the correct outcome.
     */
    describe: () => FunctionDefinition[];
}
/**
 * Application context
 *
 * @interface
 */

export type AppContext<AppConfigType extends AppConfig, State extends any> =
    AutoAppContext<AppConfigType, State> | FullAppContext<AppConfigType, State>;