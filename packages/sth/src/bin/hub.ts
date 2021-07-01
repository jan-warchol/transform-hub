#!/usr/bin/env ts-node

import { Command } from "commander";
import { configService } from "@scramjet/sth-config";
import { resolve } from "path";

const program = new Command();
const options = program
    // .version(version) // TODO: replace with find-package-json
    .option("-L, --log-level <level>", "Specify log level", "debug")
    .option("-S, --socket-path <socket>", "CSI socket location")
    .option("-P, --port <port>", "API port")
    .option("-H, --hostname <IP>", "API IP")
    .option("-E, --identify-existing", "Index existing volumes as sequences", false)
    .option("-C, --cpm-url <host:ip>")
    .option("--runner-image <image name>", "Image used by runner")
    .option("--runner-max-mem <mb>", "Maximum mem used by runner")
    .option("--prerunner-image <image name>", "Image used by prerunner")
    .option("--prerunner-max-mem <mb>", "Maximum mem used by prerunner")
    .parse(process.argv)
    .opts()
;

configService.update({
    cpmUrl: options.cpmUrl,
    docker: {
        prerunner: {
            image: options.prerunnerImage
        },
        runner: {
            image: options.runnerImage
        }
    },
    host: {
        apiBase: "/api/v1",
        socketPath: options.socketPath ? resolve(process.cwd(), options.socketPath) : undefined,
        port: options.port,
        hostname: options.hostname
    }
});

// before here we actually load the host and we have the config imported elsewhere
// so the config is changed before compile time, not in runtime.
require("@scramjet/host").startHost({}, configService.getConfig().host.socketPath, {
    identifyExisting: options.identifyExisting as boolean
})
    .catch((e: Error & { exitCode?: number }) => {
        console.error(e.stack);
        process.exitCode = e.exitCode || 1;
        process.exit();
    });

