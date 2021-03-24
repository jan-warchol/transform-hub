/* eslint-disable */
import test from "ava";
import * as sinon from "sinon";
import { CSHConnector, ICommunicationHandler, LifeCycle } from "@scramjet/types";
import { LifeCycleController } from "../src/lib/lifecycle-controller";
import { Readable } from "stream";

// let { LifeCycleController } = proxyquire("@scramjet/supervisor/src/lib/lifecycle-controller", {
//     "@scramjet/model/src/stream-handler": {
//         pipeStdio: pipeStdioStub,
//         pipeMessageStreams: pipeMessageStreamsStub
//     }
// });

let lcc: LifeCycleController;

class LCDA implements LifeCycle {
    snapshot  = sinon.stub()
    monitorRate  = sinon.stub()
    stop  = sinon.stub()
    kill  = sinon.stub()

    init = sinon.stub()
    identify = sinon.stub()
    run = sinon.stub()
    cleanup = sinon.stub()
    hookCommunicationHandler = sinon.stub()
}

const stream = new Readable();

class Client implements CSHConnector {
    PATH: string = "";
    init = sinon.stub().resolves();
    upstreamStreamsConfig = sinon.stub();
    hookCommunicationHandler = sinon.stub();
    getPackage = sinon.stub().returns(stream)
    kill = sinon.stub()
}

const streamHandlerInstance: ICommunicationHandler = {
    pipeStdio: sinon.stub(),
    pipeMessageStreams: sinon.stub(),
    hookClientStreams: sinon.stub(),
    hookLifecycleStreams: sinon.stub(),
    addMonitoringHandler: sinon.stub(),
    addControlHandler: sinon.stub(),
    pipeDataStreams: sinon.stub()
}

let lcdaInstance = new LCDA();
let clientIntance = new Client();

let config = {
    makeSnapshotOnError: false
}

test.beforeEach(() => {
    lcc = new LifeCycleController(lcdaInstance, config, clientIntance);
})

    test("When an instance of LifeCycleController is constructed with correct parameters it must not be null", t => {
    t.not(lcc, null);
});

test("Should store passed parameter in internal fields", t => {
    t.is(lcc["lifecycleAdapter"], lcdaInstance)
    t.is(lcc["lifecycleConfig"], config);
});

test("LCC main method should call sub methods", async (t) => {

    lcc["communicationHandler"] = streamHandlerInstance;

    const config = { image: "example-image" };
    lcdaInstance.identify.resolves(config);
    lcdaInstance.run.resolves();
    lcdaInstance.cleanup.resolves();

    await lcc.main();

    t.true(clientIntance.getPackage.calledOnceWithExactly());
    t.true(lcdaInstance.identify.calledOnceWith(stream));
    t.true(clientIntance.hookCommunicationHandler.calledOnceWithExactly(streamHandlerInstance))
    t.true(lcdaInstance.hookCommunicationHandler.calledOnceWithExactly(streamHandlerInstance))
    t.true(lcdaInstance.run.calledOnceWithExactly(config));
    t.true(lcdaInstance.cleanup.calledOnceWithExactly());

    // others should be called
})