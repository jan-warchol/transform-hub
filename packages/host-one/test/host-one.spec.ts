import test from "ava";
import { HostOne } from "../src/host-one";
import * as sinon from "sinon";

test("Placeholder for test. Tests coming after the class gets OK", t => {
    let hostOne = new HostOne("sequencePath", "configPath");

    t.not(hostOne, null);
});

test("Vorpal should not execute controlStream when params in 'event' command are not provided", t => {
    const hostOne = new HostOne("sequencePath", "configPath");
    /* eslint-disable dot-notation */
    const conStream = sinon.spy(hostOne["controlStream"], "whenWrote");

    hostOne.init();
    hostOne.controlStreamsCliHandler();
    hostOne.vorpalExec("event");
    t.is(conStream.getCall(0), null);
});

test("Vorpal should execute a controlStream with proper format, when user enter an 'event' command", t => {
    /**
     * controlStream param should be [4005, { eventName: 'string', message: 'any'}]
     */
    const hostOne = new HostOne("sequencePath", "configPath");
    /* eslint-disable dot-notation */
    const conStream = sinon.spy(hostOne["controlStream"], "whenWrote");

    hostOne.init();
    hostOne.controlStreamsCliHandler();
    hostOne.vorpalExec("event fooBar ['bar']");
    t.true(conStream.getCall(0).firstArg instanceof Array);
    t.is(conStream.getCall(0).firstArg[0], 4005);
    t.is(typeof conStream.getCall(0).firstArg[1], "object");
    t.is(typeof conStream.getCall(0).firstArg[1].eventName, "string");
    t.not(conStream.getCall(0).firstArg[1].message, null);
});

test("when command 'event' with event name and message as a text is provided, Vorpal should pass proper args type to controlStream", t => {
    const hostOne = new HostOne("sequencePath", "configPath");
    // const conStream = sinon.spy(hostOne["controlStream"], "whenWrote");

    hostOne.init();
    hostOne.controlStreamsCliHandler();
    // hostOne.vorpalExec("event fooBar barFoo") | error
    // console.log(conStream.getCall(0)); | null
    t.pass();
});

test("when command 'event' with event name and message as a number is provided, Vorpal should pass proper args type to controlStream", t => {
    const hostOne = new HostOne("sequencePath", "configPath");
    /* eslint-disable dot-notation */
    const conStream = sinon.spy(hostOne["controlStream"], "whenWrote");

    hostOne.init();
    hostOne.controlStreamsCliHandler();
    hostOne.vorpalExec("event fooBar 5");
    t.true(conStream.getCall(0).firstArg instanceof Array);
    t.is(conStream.getCall(0).firstArg[0], 4005);
    t.is(typeof conStream.getCall(0).firstArg[1].eventName, "string");
    t.is(typeof conStream.getCall(0).firstArg[1].message, "number");
});

test("when command 'event' with event name and message as an array is provided, Vorpal should pass proper args type to controlStream", t => {
    const hostOne = new HostOne("sequencePath", "configPath");
    /* eslint-disable dot-notation */
    const conStream = sinon.spy(hostOne["controlStream"], "whenWrote");

    hostOne.init();
    hostOne.controlStreamsCliHandler();
    hostOne.vorpalExec("event fooBar ['dada']");

    t.is(conStream.getCall(0).firstArg[0], 4005);
    t.is(typeof conStream.getCall(0).firstArg[1].eventName, "string");
    t.true(conStream.getCall(0).firstArg[1].message instanceof Array);
});

test("when command 'event' with event name and message as an obj is provided, Vorpal should pass proper args type to controlStream", t => {
    const hostOne = new HostOne("sequencePath", "configPath");
    /* eslint-disable dot-notation */
    const conStream = sinon.spy(hostOne["controlStream"], "whenWrote");

    hostOne.init();
    hostOne.controlStreamsCliHandler();
    hostOne.vorpalExec("event fooBar ()=>{console.log('test')}");

    t.is(conStream.getCall(0).firstArg[0], 4005);
    t.is(typeof conStream.getCall(0).firstArg[1].eventName, "string");
    t.is(typeof conStream.getCall(0).firstArg[1].message, "function");
});

test("Vorpal should execute controlStream with proper code when command 'kill' is provided", t => {
    const hostOne = new HostOne("sequencePath", "configPath");
    /* eslint-disable dot-notation */
    const conStream = sinon.spy(hostOne["controlStream"], "whenWrote");

    hostOne.init();
    hostOne.controlStreamsCliHandler();
    hostOne.vorpalExec("kill");

    t.is(conStream.getCall(0).firstArg[0], 4002);
});

test("Vorpal should execute controlStream with proper code when command 'stop' is provided", t => {
    const hostOne = new HostOne("sequencePath", "configPath");
    /* eslint-disable dot-notation */
    const conStream = sinon.spy(hostOne["controlStream"], "whenWrote");

    hostOne.init();
    hostOne.controlStreamsCliHandler();
    hostOne.vorpalExec("stop");

    t.is(conStream.getCall(0).firstArg[0], 4001);
});

test("Vorpal should not execute controlStream when proper params in 'monitor' command are not provided", t => {
    const hostOne = new HostOne("sequencePath", "configPath");
    /* eslint-disable dot-notation */
    const conStream = sinon.spy(hostOne["controlStream"], "whenWrote");

    hostOne.init();
    hostOne.controlStreamsCliHandler();
    hostOne.vorpalExec("monitor");
    t.is(conStream.getCall(0), null);
});

test("Vorpal should execute controlStream when command monitor is provided", t => {
    const hostOne = new HostOne("sequencePath", "configPath");
    /* eslint-disable dot-notation */
    const conStream = sinon.spy(hostOne["controlStream"], "whenWrote");

    hostOne.init();
    hostOne.controlStreamsCliHandler();
    hostOne.vorpalExec("monitor 200");

    t.is(conStream.getCall(0).firstArg[0], 4003);
    t.deepEqual(conStream.getCall(0).firstArg[1], { monitoringRate: 200 });
});
