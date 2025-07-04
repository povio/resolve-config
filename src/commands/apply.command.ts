import { z } from "zod/v4-mini";
import { getArgs } from "src/helpers/args";
import { resolveConfig } from "../lib/resolve-config";

const schema = z.object({
  stage: z.nullable(z.optional(z.string())),
  cwd: z.nullable(z.optional(z.string())),
  module: z.nullable(z.optional(z.string())),
  path: z.nullable(z.optional(z.string())),
  target: z.nullable(z.optional(z.string())),
});

export async function applyCommand(argv: string[]) {
  try {
    await applyCommandHelper(argv);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

/**
 * Resolve a configuration
 *  - returns the result in stdout as json
 */
export async function applyCommandHelper(argv: string[]) {
  const args = getArgs(argv, {
    config: schema,
    envs: {
      stage: "STAGE",
    },
  });

  await resolveConfig({
    stage: args.stage,
    cwd: args.cwd,
    module: args.module,
    path: args.path,
    target: args.target,
    apply: true,
  });
}
