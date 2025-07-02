import { ZodMiniType, output } from "zod/v4-mini";
import { parseArgs } from "node:util";

export function getArgs<T extends ZodMiniType<any, any, any>>(argv: string[], options: {
    config: T,
    envs: Partial<Record<keyof output<T>, string>>
}): output<T> { 

    const { values } = parseArgs({
        args: argv,
        // convert zod types to parseArgs option
        options: Object.fromEntries(
            Object.entries((options.config as any).shape).map(([key, value]) => {
                let def = (value as any).def as any
                let type = def.type;
                let node = def;
                while (!['boolean', 'string', 'number'].includes(type)) {
                    if (node.innerType?.def?.type) { 
                        node = node.innerType.def; 
                        type = node.type;
                    } else {
                        break;
                    } 
                }
                return [key, {
                    type: type === 'boolean' ? 'boolean' : 'string',
                    default: def.default,
                }]
            })
        )
    });

    const env = process.env;

    if (options.envs) {
        for (const [key, name] of Object.entries(options.envs)) {
            if (name && name in env) {
                (values as any)[key] = env[name];
            }
        }
    }

    // throws ZodError if invalid
    return options.config.parse(values);
}