import { CommandDefinition } from "../../types";

export const init: CommandDefinition = (program) => {
    const initCmd = program
        .command("init")
        .addHelpCommand(false)
        .alias("i")
        .usage("si init [command] [options...]");

    initCmd
        .command("template")
        .alias("tmpl")
        .argument("<projectName>")
        .option("--lang <ts|js|py>", "choose the language to develop the sequence")
        .description("create necessary files and start working on your sequence")
        .action((/* projectName, { lang } */) => {
            // FIXME: implement me
            throw new Error("Implement me");
        });
};