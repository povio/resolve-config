import * as z from "zod/mini";
import { getArgs } from "src/helpers/args";
import { resolveConfig } from "../lib/resolve-config";
import { generateDotEnv } from "../lib/plugin-dotenv";
import { dumpYaml } from "../lib/plugin-yaml";
import { filterObjectByKeys } from "../lib/filter-keys";
import { PlainNestedType, PlainType } from "../lib/types";

const schema = z.object({
  stage: z.nullable(z.optional(z.string())),
  cwd: z.nullable(z.optional(z.string())),
  module: z.nullable(z.optional(z.string())),
  path: z.nullable(z.optional(z.string())),
  target: z.string(),

  // Return only value or subtree of a resolved config
  property: z.nullable(z.optional(z.string())),

  // Return only specified keys while preserving paths (comma-separated list)
  keys: z.nullable(z.optional(z.string())),

  // Override the returning format. Options: `yml`, `json`, `env-json`, or `env`
  outputFormat: z.nullable(z.optional(z.string())),

  prefix: z.nullable(z.optional(z.string())),

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
  keys?: string | string[] | null;
  outputFormat?: string | null;
  prefix?: string | null;
  verbose?: boolean | null;
}) {
  let config = await resolveConfig({
    stage: args.stage,
    cwd: args.cwd,
    module: args.module,
    path: args.path,
    target: args.target,
    apply: false,
  });

  if (!args.target) {
    config = config["default"] as PlainNestedType;
  }

  if (args.keys && args.property) {
    throw new Error("Cannot use both --keys and --property at the same time");
  }

  if (args.keys) {
    config = filterObjectByKeys(config, args.keys);
  } else if (args.property) {
    const property = args.property.split(/\.|__/);
    let result: PlainType = config;
    for (const key of property) {
      if (
        !result ||
        typeof result !== "object" ||
        Array.isArray(result) || // todo - handle arrays
        !(key in result)
      ) {
        return { output: undefined };
      }
      result = result[key as keyof typeof result];
    }
    return { output: result };
  }

  switch (args.outputFormat) {
    case "yaml":
    case "yml":
      return { output: dumpYaml(config) };
    case "env-json":
      return {
        output: generateDotEnv(config, { format: "json", prefix: args.prefix }),
      };
    case "env":
    case "__":
      return {
        output: generateDotEnv(config, { format: "__", prefix: args.prefix }),
      };
    case "json":
    default: {
      return { output: config };
    }
  }
}
