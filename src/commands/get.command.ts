import * as z from "zod/v4-mini";
import { getArgs } from "src/helpers/args";
import { resolveConfig } from "../lib/resolve-config";

const schema = z.object({
  stage: z.nullable(z.optional(z.string())),
  cwd: z.nullable(z.optional(z.string())),
  module: z.nullable(z.optional(z.string())),
  path: z.nullable(z.optional(z.string())),
  target: z.string(),

  // Return only value or subtree of a resolved config
  property: z.nullable(z.optional(z.string())),

  // Override the returning format. Options: `yml`, `json`, or `env`
  outputFormat: z.nullable(z.optional(z.string())),

  verbose: z.nullable(z.optional(z.boolean())),
});

export async function getCommand(argv: string[]) {
  let args;
  try {
    args = getArgs(argv, {
      config: schema,
      shorthand: /(?<stage>[^.]+)\.(?<module>[^.]+)\.(?<target>[^.]+)/,
      envs: {
        stage: "STAGE",
      },
    });
    const { output } = await getCommandHelper(args);
    if (output) {
      console.log(output);
    }
  } catch (error: any) {
    if (error.name === "$ZodError") {
      console.error(z.prettifyError(error));
    } else {
      console.error(`✖ ${error.message || error.toString()}`);
    }
    if (args?.verbose) {
      console.error(error);
    }
    process.exit(1);
  }
}

/**
 * Resolve a configuration
 *  - returns the result in stdout as json
 */
export async function getCommandHelper(args: {
  stage?: string | null;
  cwd?: string | null;
  module?: string | null;
  path?: string | null;
  target?: string | null;
  property?: string | null;
  outputFormat?: string | null;
  verbose?: boolean | null;
}) {
  // todo shorthand

  const configs = await resolveConfig({
    stage: args.stage,
    cwd: args.cwd,
    module: args.module,
    path: args.path,
    target: args.target,
    apply: false,
    verbose: args.verbose,
  });

  const target = args.target || "default";

  if (args.property) {
    const property = args.property.split(/\.|__/);
    let result = configs[target];
    for (const key of property) {
      if (result[key] === undefined) {
        return { output: undefined };
      }
      result = result[key];
    }
    return { output: result };
  }

  return { output: configs[target] };
}
