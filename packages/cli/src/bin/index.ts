#!/usr/bin/env ts-node
/* eslint-disable no-console */

import commander from "commander";
import completionMixin, { Command } from "commander-completion";
import { ClientError, ClientUtils } from "@scramjet/client-utils";

import { commands } from "../lib/commands/index";
import { setPlatformDefaults } from "../lib/platform";
import { globalConfig } from "../lib/config";
import { initPaths } from "../lib/paths";

const CommandClass = completionMixin(commander).Command;

const getExitCode = (_err: ClientError) => 1;
const program = new CommandClass() as Command;
const errorHandler = (err: ClientError) => {
    process.exitCode = getExitCode(err);
    const { format, debug } = globalConfig.getConfig();

    if (globalConfig.isJsonFormat(format)) {
        console.log(
            JSON.stringify({
                error: true,
                code: err?.code,
                stack: debug ? err?.stack : undefined,
                message: err?.message,
                reason: err?.reason?.message,
            })
        );
    } else {
        console.error(err.stack);
        if (err.reason) {
            console.error("Caused by:");
            console.error(err.reason.stack);
        }
    }
    process.exit();
};

/**
 * Start commander using defined config {@link Apple.seeds}
 */
(async () => {
    initPaths();
    const { token, env, middlewareApiUrl } = globalConfig.getConfig();

    if (token && globalConfig.isProductionEnv(env) && middlewareApiUrl) {
        ClientUtils.setDefaultHeaders({
            Authorization: `Bearer ${token}`,
        });

        await setPlatformDefaults();
    }

    for (const command of Object.values(commands)) command(program);

    program
        .description("https://github.com/scramjetorg/scramjet-sequence-template#dictionary")
        .version(`${process.env.npm_package_version}`, "-v, --version", "show current version")
        .addHelpCommand(false)
        .parse(process.argv);

    await new Promise((res) => program.hook("postAction", res));
})().catch(errorHandler);

process.on("uncaughtException", errorHandler);
process.on("unhandledRejection", errorHandler);
