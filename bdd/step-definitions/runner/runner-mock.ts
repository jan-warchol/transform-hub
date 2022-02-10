import { Given, When, Then, After } from "@cucumber/cucumber";
import { strict as assert } from "assert";
import { ChildProcess, spawn } from "child_process";
import { StringStream } from "scramjet";
import { defer } from "../../lib/utils";
import { runnerMessages } from "../../data/runner-messages";

const mockRunnerExec = "../packages/runner/src/index.ts";

let runner: ChildProcess;
let runnerProcessStopped: boolean;

function runRunner(withMonitoring: boolean): void {
    let command: string[] = ["npx", "ts-node", mockRunnerExec];

    if (withMonitoring) {
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

When("a message {string} is sent", (message: string) => {
    runner.stdin?.write(runnerMessages.get(message) + "\n");
    runner.stdin?.end();
});

Then("a message {string} is received", async (message: string) => {
    if (!runner.stdout) {
        assert.fail("No stdout from runner");
    }

    const data = await StringStream.from(runner.stdout).lines().slice(0, 1).whenRead();

    assert.equal(data, runnerMessages.get(message));
});

Then("mock runner is not running", async () => {
    await defer(2000);
    assert.equal(runnerProcessStopped, true);
});

After({ tags: "@mockRunner" }, async function () {
    if (!runnerProcessStopped) {
        runner.kill(9);
    }
});
