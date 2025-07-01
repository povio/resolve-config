import { ZodMiniType, output } from "zod/v4-mini";
import { parseArgs } from "node:util";

export function getArgs<T extends ZodMiniType<any, any, any>>(argv: string[], options: {
    config: T, 
    envs: Record<keyof output<T>, string>
}): output<T> {
    const { values } = parseArgs({
        args: argv,
        options: {
            stage: { type: "string" },
        },
    });

    const env = process.env;

    if (options.envs) {

        for (const [key, name] of Object.entries(options.envs)) {
            if (name in env) {
                values[key] = env[name];
            }
        }
    }

    // throws ZodError if invalid
    return options.config.parse(values);
}