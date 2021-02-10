import { Given, When, Then, After } from "cucumber";
import { strict as assert } from "assert";
import { spawn } from "child_process";
import { StringStream } from "scramjet";

let runner;
let runnerProcessStopped;

function runRunner(withMonnitioring: boolean): void {
    let command: string[] = ["npx", "ts-node", "../src/runner/index.ts"];
    if (withMonnitioring) {
        command = ["MONITORING_INTERVAL=1000"].concat(command);
    }
    runner = spawn("/usr/bin/env", command);
    runnerProcessStopped = false;
    runner.on("exit", () => {
        runnerProcessStopped = true;
    });
}

Given("mock runner is running with monitoring", () => {
    runRunner(true);
    assert.equal(runnerProcessStopped, false);
});

Given("mock runner is running", () => {
    runRunner(false);
    assert.equal(runnerProcessStopped, false);
});

When("message {string} is sent", (message) => {
    runner.stdin.write(`${message}\n`);
    runner.stdin.end();
});

Then("message {string} is received", async(message) => {
    const data = await StringStream.from(runner.stdout).lines().slice(0, 1).whenRead();
    assert.equal(data, message);
});

Then("mock runner is not running", async() => {
    await new Promise(resolve => setTimeout(() => resolve(1), 2000));
    assert.equal(runnerProcessStopped, true);
});

After(async() => {
    if (!runnerProcessStopped) {
        runner.kill(9);
    }
});