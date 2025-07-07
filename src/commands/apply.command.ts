import * as z from "zod/v4-mini";
import { getArgs } from "src/helpers/args";
import { resolveConfig } from "../lib/resolve-config";

const schema = z.object({
  stage: z.nullable(z.optional(z.string())),
  cwd: z.nullable(z.optional(z.string())),
  module: z.nullable(z.optional(z.string())),
  path: z.nullable(z.optional(z.string())),
  target: z.nullable(z.optional(z.string())),
  verbose: z.nullable(z.optional(z.boolean())),
});

export async function applyCommand(argv: string[]) {
  let args;
  try {
    args = getArgs(argv, {
      config: schema,
      shorthand: /(?<stage>[^.]+)\.(?<module>[^.]+)/,
      envs: {
        stage: "STAGE",
      },
    });
    await applyCommandHelper(args);
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
 * Apply a configuration
 */
export async function applyCommandHelper(args: {
  stage?: string | null;
  cwd?: string | null;
  module?: string | null;
  path?: string | null;
  target?: string | null;
  verbose?: boolean | null;
}) {
  await resolveConfig({
    stage: args.stage,
    cwd: args.cwd,
    module: args.module,
    path: args.path,
    target: args.target,
    apply: true,
    verbose: args.verbose,
  });
}
