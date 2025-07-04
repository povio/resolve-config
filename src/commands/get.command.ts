import { z } from "zod/v4-mini";
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
});

export async function getCommand(argv: string[]) {
  try {
    await getCommandHelper(argv);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

/**
 * Resolve a configuration
 *  - returns the result in stdout as json
 */
export async function getCommandHelper(argv: string[]) {
  // todo shorthand

  const args = getArgs(argv, {
    config: schema,
    envs: {
      stage: "STAGE",
    },
  });

  const configs = await resolveConfig({
    stage: args.stage,
    cwd: args.cwd,
    module: args.module,
    path: args.path,
    target: args.target,
    apply: false,
    // todo, property
  });

  const target = args.target || "default";

  return configs[target];
}
