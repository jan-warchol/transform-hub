import test from "ava";
import { ReadStream } from "fs";
import * as sinon from "sinon";
import { PassThrough } from "stream";
import { HostOne } from "@scramjet/host-one";
import * as vorpal from "vorpal";
import { DataStream } from "scramjet";

const appConfig = {
    configKey: "configValue"
};
const packageStream = new PassThrough() as unknown as ReadStream;

test("Host one creation with sequence args", async t => {
    const hostOne = new HostOne();

    await hostOne.init(packageStream, appConfig, ["arg1", "arg2"]);

    t.not(hostOne, null);
});

test("Host one creation", async t => {
    const hostOne = new HostOne();

    await hostOne.init(packageStream, appConfig);

    t.not(hostOne, null);
});

test("Vorpal should not execute controlStream when params in 'event' command are not provided", async t => {
    const hostOne = new HostOne();

    await hostOne.init(packageStream, appConfig, ["arg1", "arg2"]);

    /* eslint-disable dot-notation */
    const conStream = sinon.spy(hostOne["controlDataStream"] as DataStream, "whenWrote");

    hostOne["vorpal"] = new vorpal();
    hostOne.controlStreamsCliHandler();
    await hostOne.vorpalExec("event");
    t.is(conStream.getCall(0), null);
});

test("Vorpal should execute a controlStream with proper format, when user enter an 'event' command", async t => {
    /**
     * controlStream param should be [4005, { eventName: 'string', message: 'any'}]
     */
    const hostOne = new HostOne();

    await hostOne.init(packageStream, appConfig, ["arg1", "arg2"]);

    /* eslint-disable dot-notation */
    const conStream = sinon.spy(hostOne["controlDataStream"] as DataStream, "whenWrote");

    hostOne["vorpal"] = new vorpal();
    hostOne.controlStreamsCliHandler();
    await hostOne.vorpalExec("event fooBar ['bar']");
    t.true(conStream.getCall(0).firstArg instanceof Array);
    t.is(conStream.getCall(0).firstArg[0], 4005);
    t.is(typeof conStream.getCall(0).firstArg[1], "object");
    t.is(typeof conStream.getCall(0).firstArg[1].eventName, "string");
    t.not(conStream.getCall(0).firstArg[1].message, null);
});

test("when command 'event' with event name and message as a text is provided, Vorpal should pass proper args type to controlStream", async t => {
    const hostOne = new HostOne();
    // const conStream = sinon.spy(hostOne["controlDataStream"], "whenWrote");

    await hostOne.init(packageStream, appConfig, ["arg1", "arg2"]);
    hostOne["vorpal"] = new vorpal();
    hostOne.controlStreamsCliHandler();
    // hostOne.vorpalExec("event fooBar barFoo") | error
    // console.log(conStream.getCall(0)); | null
    t.pass();
});

test("when command 'event' with event name and message as a number is provided, Vorpal should pass proper args type to controlStream", async t => {
    const hostOne = new HostOne();

    await hostOne.init(packageStream, appConfig, ["arg1", "arg2"]);

    /* eslint-disable dot-notation */
    const conStream = sinon.spy(hostOne["controlDataStream"] as DataStream, "whenWrote");

    hostOne["vorpal"] = new vorpal();
    hostOne.controlStreamsCliHandler();
    await hostOne.vorpalExec("event fooBar 5");
    t.true(conStream.getCall(0).firstArg instanceof Array);
    t.is(conStream.getCall(0).firstArg[0], 4005);
    t.is(typeof conStream.getCall(0).firstArg[1].eventName, "string");
    t.is(typeof conStream.getCall(0).firstArg[1].message, "number");
});

test("when command 'event' with event name and message as an array is provided, Vorpal should pass proper args type to controlStream", async t => {
    const hostOne = new HostOne();

    await hostOne.init(packageStream, appConfig, ["arg1", "arg2"]);

    /* eslint-disable dot-notation */
    const conStream = sinon.spy(hostOne["controlDataStream"] as DataStream, "whenWrote");

    hostOne["vorpal"] = new vorpal();
    hostOne.controlStreamsCliHandler();
    await hostOne.vorpalExec("event fooBar ['dada']");

    t.is(conStream.getCall(0).firstArg[0], 4005);
    t.is(typeof conStream.getCall(0).firstArg[1].eventName, "string");
    t.true(conStream.getCall(0).firstArg[1].message instanceof Array);
});

test("when command 'event' with event name and message as an obj is provided, Vorpal should pass proper args type to controlStream", async t => {
    const hostOne = new HostOne();

    await hostOne.init(packageStream, appConfig, ["arg1", "arg2"]);

    /* eslint-disable dot-notation */
    const conStream = sinon.spy(hostOne["controlDataStream"] as DataStream, "whenWrote");

    hostOne["vorpal"] = new vorpal();
    hostOne.controlStreamsCliHandler();
    await hostOne.vorpalExec("event fooBar ()=>{console.log('test')}");

    t.is(conStream.getCall(0).firstArg[0], 4005);
    t.is(typeof conStream.getCall(0).firstArg[1].eventName, "string");
    t.is(typeof conStream.getCall(0).firstArg[1].message, "function");
});

test("Vorpal should execute controlStream with proper code when command 'kill' is provided", async t => {
    const hostOne = new HostOne();

    await hostOne.init(packageStream, appConfig, ["arg1", "arg2"]);

    /* eslint-disable dot-notation */
    const conStream = sinon.spy(hostOne["controlDataStream"] as DataStream, "whenWrote");

    hostOne["vorpal"] = new vorpal();
    hostOne.controlStreamsCliHandler();
    await hostOne.vorpalExec("kill");

    t.is(conStream.getCall(0).firstArg[0], 4002);
});

test("Vorpal should not execute controlStream when params in 'stop' command are not provided", async t => {
    const hostOne = new HostOne();

    await hostOne.init(packageStream, appConfig, ["arg1", "arg2"]);

    /* eslint-disable dot-notation */
    const conStream = sinon.spy(hostOne["controlDataStream"] as DataStream, "whenWrote");

    hostOne["vorpal"] = new vorpal();
    hostOne.controlStreamsCliHandler();
    await hostOne.vorpalExec("stop");

    t.is(conStream.getCall(0), null);
});

test("Vorpal should execute controlStream with proper code when command 'stop' with params is provided", async t => {
    const hostOne = new HostOne();

    await hostOne.init(packageStream, appConfig, ["arg1", "arg2"]);

    /* eslint-disable dot-notation */
    const conStream = sinon.spy(hostOne["controlDataStream"] as DataStream, "whenWrote");

    hostOne["vorpal"] = new vorpal();
    hostOne.controlStreamsCliHandler();
    await hostOne.vorpalExec("stop 200 true");

    t.is(conStream.getCall(0).firstArg[0], 4001);
    t.deepEqual(conStream.getCall(0).firstArg[1], { timeout: 200, canCallKeepalive: true });
});

test("Vorpal should not execute controlStream when proper params in 'monitor' command are not provided", async t => {
    const hostOne = new HostOne();

    await hostOne.init(packageStream, appConfig, ["arg1", "arg2"]);

    /* eslint-disable dot-notation */
    const conStream = sinon.spy(hostOne["controlDataStream"] as DataStream, "whenWrote");

    hostOne["vorpal"] = new vorpal();
    hostOne.controlStreamsCliHandler();
    await hostOne.vorpalExec("monitor");
    t.is(conStream.getCall(0), null);
});

test("Vorpal should execute controlStream when command monitor is provided", async t => {
    const hostOne = new HostOne();

    await hostOne.init(packageStream, appConfig, ["arg1", "arg2"]);

    /* eslint-disable dot-notation */
    const conStream = sinon.spy(hostOne["controlDataStream"] as DataStream, "whenWrote");

    hostOne["vorpal"] = new vorpal();
    hostOne.controlStreamsCliHandler();
    await hostOne.vorpalExec("monitor 200");

    t.is(conStream.getCall(0).firstArg[0], 4003);
    t.deepEqual(conStream.getCall(0).firstArg[1], { monitoringRate: 200 });
});
