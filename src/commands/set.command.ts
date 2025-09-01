import * as z from "zod/mini";
import { getArgs } from "src/helpers/args";
import { setTemplate } from "../lib/set-template";
import { mergeIntoTree } from "../lib/merge";

const schema = z.object({
  stage: z.nullable(z.optional(z.string())),
  cwd: z.nullable(z.optional(z.string())),
  module: z.nullable(z.optional(z.string())),
  path: z.nullable(z.optional(z.string())),
  format: z.nullable(z.optional(z.string())),

  property: z.nullable(z.optional(z.string())),
  value: z.nullable(z.optional(z.string())),
  json: z.nullable(z.optional(z.string())),
  replace: z.nullable(z.optional(z.boolean())),

  verbose: z.nullable(z.optional(z.boolean())),
});

export async function setCommand(argv: string[]) {
  let args;
  try {
    args = getArgs(argv, {
      config: schema,
      envs: {
        stage: "STAGE",
      },
    });
    await setCommandHelper(args);
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
 * Set value in local yml
 */
export async function setCommandHelper(args: {
  stage?: string | null;
  cwd?: string | null;
  module?: string | null;
  path?: string | null;
  format?: string | null;

  property?: string | null;
  value?: string | null;
  json?: string | null;
  replace?: boolean | null;

  verbose?: boolean | null;
}) {
  if (!args.property && !args.json) {
    throw new Error("Either --property or --json must be specified");
  }

  setTemplate({
    stage: args.stage,
    cwd: args.cwd,
    module: args.module,
    path: args.path,
    format: args.format,
    data: args.json
      ? JSON.parse(args.json)
      : mergeIntoTree({}, args.property!, args.value),
    replace: args.replace,
  });
}
