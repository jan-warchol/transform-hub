import { strict as assert } from "assert";
import { ChildProcess, spawn } from "child_process";

import { SIGTERM } from "constants";
import { StringDecoder } from "string_decoder";

const hostExecutableFilePath = "../dist/host/bin/start.js";

export class HostUtils {
    hostProcessStopped = false;
    host: ChildProcess;

    async stopHost() {
        await new Promise<void>(async (resolve, reject) => {
            if (this.host.kill(SIGTERM)) {
                resolve();
            } else {
                reject();
            }
        });
    }

    async spawnHost() {
        return new Promise<void>((resolve) => {
            const command: string[] = ["node", hostExecutableFilePath];

            this.host = spawn("/usr/bin/env", command);

            this.hostProcessStopped = false;
            //for debugging purposes
            //StringStream.from(this.host.stdout).pipe(stdout);
            //StringStream.from(this.host.stderr).pipe(stdout);

            const decoder = new StringDecoder();

            this.host.stdout.on("data", (data) => {
                const decodedData = decoder.write(data);

                if (decodedData.match(/API listening on port/)) {
                    resolve();
                }
            });

            this.host.on("exit", (code, signal) => {
                console.log("sequence process exited with code: ", code, " and signal: ", signal);
                this.hostProcessStopped = true;

                if (code === 1) {
                    assert.fail();
                }
            });
        });
    }
}
