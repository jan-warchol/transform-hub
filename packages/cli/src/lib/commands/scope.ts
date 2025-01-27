import { CommandDefinition } from "../../types";
import { listScopes, deleteScope, getScope, scopeExists } from "../scope";
import { displayObject } from "../output";
import { globalConfig, sessionConfig } from "../config";
import { isDevelopment } from "../../utils/isDevelopment";

/**
 * Initializes `scope` command.
 *
 * @param {Command} program Commander object.
 */
export const scope: CommandDefinition = (program) => {
    const scopeCmd = program
        .command("scope")
        .addHelpCommand(false)
        .alias("s")
        .usage("[command] [options...]")
        .description("Manage scopes that store pairs of spaces and Hubs used when working");

    scopeCmd.command("list").alias("ls").description("List all created scopes").action(listScopes);

    scopeCmd
        .command("print")
        .argument("<name>")
        .description("See json file under the scope")
        .action((name: string) => {
            const scopeConfig = getScope(name);

            if (!scopeConfig) {
                // eslint-disable-next-line no-console
                console.error(`Couldn't find scope: ${name}`);
                return;
            }

            displayObject(scopeConfig);
        });

    if (isDevelopment())
        scopeCmd
            .command("add")
            .option("--hub <name> <id>", "Add a Hub to specified scope")
            .option("--space <name> <apiUrl>", "Add space to specified scope")
            .description("TO BE IMPLEMENTED / Add a Hub or space to specified scope")
            .action(() => {
            // FIXME: implement me
                throw new Error("Implement me");
            });

    if (isDevelopment())
        scopeCmd
            .command("save")
            .argument("<name>")
            .description("TO BE IMPLEMENTED / Save current chosen space and Hub under a scope")
            .action(() => {
            // FIXME: implement me
                throw new Error("Implement me");
            });

    scopeCmd
        .command("use")
        .argument("<name>")
        .description("Work on the selected scope")
        .action((name: string) => {
            if (!scopeExists(name)) {
                // eslint-disable-next-line no-console
                console.error(`Couldn't find scope: ${name}`);
                return;
            }
            sessionConfig.setScope(name);
        });

    scopeCmd
        .command("delete")
        .argument("<name>")
        .description("Delete specific scope")
        .action((name: string) => {
            if (globalConfig.getConfig().scope === name) {
                // eslint-disable-next-line no-console
                console.error(`WARN: can't remove scope ${name} set in configuration.`);
                return;
            }
            if (sessionConfig.getConfig().scope === name) {
                // eslint-disable-next-line no-console
                console.error(`WARN: can't remove currently used scope ${name}`);
                return;
            }
            deleteScope(name);
        });
};
