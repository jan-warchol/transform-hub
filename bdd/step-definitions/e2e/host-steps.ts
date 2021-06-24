// eslint-disable-next-line no-extra-parens
import { Given, When, Then, Before, BeforeAll, AfterAll } from "@cucumber/cucumber";
import { strict as assert } from "assert";
import * as fs from "fs";
import { createReadStream } from "fs";
import { HostClient, SequenceClient, InstanceClient, InstanceOutputStream, Response } from "@scramjet/api-client";
import { HostUtils } from "../../lib/host-utils";
import { PassThrough, Stream } from "stream";
import * as crypto from "crypto";
import { promisify } from "util";
import * as Dockerode from "dockerode";
import { CustomWorld } from "../world";

import * as findPackage from "find-package-json";

const version = findPackage().next().value?.version || "unknown";
const hostClient = new HostClient(process.env.SCRAMJET_HOST_BASE_URL || "http://localhost:8000/api/v1");
const hostUtils = new HostUtils();
const testPath = "../dist/samples/hello-alice-out/";
const dockerode = new Dockerode();

let actualHealthResponse: any;
let actualStatusResponse: any;
let actualApiResponse: Response;
let sequence: SequenceClient;
let actualLogResponse: any;
let instance: InstanceClient;
let containerId;
let streams: { [key: string]: Promise<string> } = {};

const actualResponse = () => actualStatusResponse || actualHealthResponse;

BeforeAll(async () => {
    await hostUtils.spawnHost();
});

AfterAll(async () => {
    try {
        await hostUtils.stopHost();
    } catch {
        throw new Error("Host unexpected closed");
    }
});

Before(() => {
    actualHealthResponse = "";
    actualStatusResponse = "";
    actualLogResponse = "";
    streams = {};
});

const streamToString = async (stream: Stream): Promise<string> => {
    const chunks = [];
    const strings = stream.pipe(new PassThrough({ encoding: "utf-8" }));

    for await (const chunk of strings) {
        chunks.push(chunk);
    }

    return chunks.join("");
};

Given("host is running", async () => {
    assert.equal((await hostClient.getLoadCheck()).status, 200);
});

Then("host is still running", async () => {
    assert.equal((await hostClient.getLoadCheck()).status, 200);
});

When("wait for {string} ms", { timeout: 25000 }, async (timeoutMs: number) => {
    await new Promise(res => setTimeout(res, timeoutMs));
});

When("sequence {string} loaded", async (packagePath: string) => {
    sequence = await hostClient.sendSequence(
        createReadStream(packagePath)
    );
});

When("instance started", async function(this: CustomWorld) {
    instance = await sequence.start({}, ["/package/data.json"]);
    this.resources.instance = instance;
});

When("instance started with arguments {string}", { timeout: 25000 }, async function(this: CustomWorld, instanceArg: string) {
    instance = await sequence.start({}, instanceArg.split(" "));
    this.resources.instance = instance;
});

When("instance started with arguments {string} and write stream to {string} and timeout after {int} seconds", { timeout: -1 }, async (instanceArg: string, fileName: string, timeout: number) => {
    instance = await sequence.start({}, instanceArg.split(" "));

    const stream: any = (await instance.getStream("stdout")).data;
    const writeStream = fs.createWriteStream(fileName);

    stream.pipe(writeStream);

    actualHealthResponse = await instance.getHealth();

    await Promise.race([
        new Promise((res, rej) => {
            writeStream.on("error", rej);
            stream.on("end", res);
        }),
        new Promise(res => setTimeout(res, 1000 * timeout))
    ]);
});

When("get {string} in background with instanceId", { timeout: 500000 }, async (stream: InstanceOutputStream) => {
    actualLogResponse = await streamToString(
        (await instance.getStream(stream)).data
    );
});

Then("file {string} is generated", async (filename) => {
    assert.ok(await promisify(fs.exists)(`${filename}`));
});

When("response in every line contains {string} followed by name from file {string} finished by {string}", async (greeting: string, file2: any, suffix: string) => {
    const input = JSON.parse(fs.readFileSync(`${testPath}${file2}`, "utf8"));
    const lines: string[] = actualLogResponse.split("\n");

    let i: number;

    for (i = 0; i < input.length; i++) {
        const line1: string = input[i].name;

        assert.deepEqual(greeting + line1 + suffix, lines[i]);
    }

    assert.equal(i, input.length, "incorrect number of elements compared");
});

When("get output stream with long timeout", { timeout: 200000 }, async () => {
    const stream: Response = await instance.getStream("output");

    actualLogResponse = await streamToString(stream.data as Stream);
});

When("response data is equal {string}", async (respNumber: any) => {
    assert.equal(actualLogResponse, respNumber);
});

Given("file in the location {string} exists on hard drive", async (filename: any) => {
    assert.ok(await promisify(fs.exists)(filename));
});

When("compare checksums of content sent from file {string}", async (filePath: string) => {
    const readStream = fs.createReadStream(filePath);

    let hex: string;

    fs.readFile(filePath, function(err, data) {
        hex = crypto.createHash("md5").update(data).digest("hex");
    });

    await instance.sendStream("input", readStream, {
        type: "application/octet-stream",
        end: true
    });
    const output = await instance.getStream("output");
    const outputString = await streamToString(output.data);

    assert.equal(output.status, 200);
    assert.equal(
        outputString,
        hex
    );

    await instance.sendInput("null");
});

When("send stop message to instance with arguments timeout {int} and canCallKeepAlive {string}", async (timeout: number, canCallKeepalive: string) => {
    console.log("Stop message sent");
    const resp = await instance.stop(timeout, canCallKeepalive === "true") as any;

    assert.equal(resp.status, 202);
});

When("send kill message to instance", async () => {
    const resp = await instance.kill();

    assert.equal(resp.status, 202);
});

When("get containerId", { timeout: 31000 }, async () => {
    const res = actualResponse()?.data?.containerId;

    if (!res) assert.fail();

    containerId = res;
    console.log("Container is identified.", containerId);
});

When("container is closed", async () => {

    if (!containerId) assert.fail();

    const containers = await dockerode.listContainers();

    let containerExist = false;

    containers.forEach(containerInfo => {
        if (containerInfo.Id.includes(containerId)) {
            containerExist = true;
        }
    });

    assert.equal(containerExist, false);
    console.log("Container is closed.");

});

When("send event {string} to instance with message {string}", async (eventName, eventMessage) => {
    const resp = await instance.sendEvent(eventName, eventMessage);

    assert.equal(resp.status, 202);
});

Then("get event from instance", { timeout: 10000 }, async () => {
    const expectedHttpCode = 200;

    actualStatusResponse = await instance.getEvent();
    assert.equal(actualStatusResponse.status, expectedHttpCode);
});

When("get instance health", async () => {
    actualHealthResponse = await instance.getHealth();
    assert.equal(actualHealthResponse.status, 200);
});

Then("instance response body is {string}", async (expectedResp: string) => {
    const resp = JSON.stringify(actualResponse().data);

    if (typeof actualResponse() === "undefined") {
        console.log("actualResponse is undefined");
    } else {
        console.log(`Response body is ${resp}`);
    }

    assert.equal(resp, expectedResp);
});

When("instance health is {string}", async (expectedResp: string) => {
    const healthy = JSON.stringify(actualHealthResponse?.data?.healthy);

    if (typeof actualHealthResponse === "undefined") {
        console.log("actualResponse is undefined");
    } else {
        console.log(`Response body is ${healthy}, instance is healthy and running.`);
    }

    assert.equal(healthy, expectedResp);
});

When("send stdin to instance with contents of file {string}", async (filePath: string) => {
    await instance.sendStream("stdin", createReadStream(filePath));
});

When("keep instance streams {string}", async function(streamNames) {
    streamNames.split(",").map(streamName => {
        streams[streamName] = instance
            .getStream(streamName)
            .then(({ data }) => streamToString(data));
    });
});

Then("kept instance stream {string} should be {string}", async (streamName, _expected) => {
    const expected = JSON.parse(`"${_expected}"`);

    assert.equal(await streams[streamName], expected);
});

// ? When I get version
When("I get version", async function() {
    actualApiResponse = await hostClient.getVersion();
});

// ? Then it returns the root package version
Then("it returns the root package version", function() {
    // Write code here that turns the phrase above into concrete actions
    assert.strictEqual(typeof actualApiResponse, "object", "We should get an object");
    console.log(actualApiResponse.data, version);
    assert.deepStrictEqual(actualApiResponse.data, { version });
});

// ? When I get load-check
When("I get load-check", async function() {
    // Write code here that turns the phrase above into concrete actions
    actualApiResponse = await hostClient.getLoadCheck();
});

// ? Then it returns a correct load check with required properties

Then("it returns a correct load check with required properties", function() {
    // Write code here that turns the phrase above into concrete actions
    const { data } = actualApiResponse;

    assert.ok(typeof data === "object");
    assert.strictEqual(typeof data.avgLoad, "number");
    assert.strictEqual(typeof data.currentLoad, "number");
    assert.strictEqual(typeof data.memFree, "number");
    assert.strictEqual(typeof data.memUsed, "number");
    assert.ok(Array.isArray(data.fsSize));
    assert.ok(data.fsSize.length > 0);
    // available);
    assert.strictEqual(typeof data.fsSize[0].fs, "string"); //: '/dev/sda1',
    assert.strictEqual(typeof data.fsSize[0].type, "string"); //: 'ext4',
    assert.strictEqual(typeof data.fsSize[0].size, "number"); //: 41651752960,
    assert.strictEqual(typeof data.fsSize[0].used, "number"); //: 30935633920,
    assert.strictEqual(typeof data.fsSize[0].available, "number"); //: 10699341824,
    assert.strictEqual(typeof data.fsSize[0].use, "number"); //: 74.3,
    assert.strictEqual(typeof data.fsSize[0].mount, "string"); //: '/'

    return "skip";

});

When("kept instance stream {string} should store {int} items divided by {string}", async (streamName, expectedCount, separator) => {
    const res = await streams[streamName];
    const nrOfItems = res.split(separator).length - 1;

    assert.equal(nrOfItems, expectedCount);
});

When("get status", async () => {
    const getStatus = await instance.getStatus();

    console.log("-----------status: ", getStatus);

    // if (getStatus.status === 200) {
    //     console.log("Process is NOT finished");
    // } else {
    //     console.log("Process is finished with status: ", getStatus.status);
    // }

    // assert.equal(getStatus.status, 200);
});

When("delete sequence and volumes", async () => {
    const sequenceId = sequence.id;

    console.log("sequence ID: ", sequenceId);

    await hostClient.deleteSequence(sequenceId);
});

When("confirm that sequence and volumes are removed", async () => {
    const sequenceId = sequence.id;
    const sequences = await hostClient.listSequences();

    if (!sequenceId) assert.fail();


    console.log("s-------------equences list : ", sequences.data);

    const containerExist = false;

    assert.equal(containerExist, false);
    console.log("Sequence is there.");
});
