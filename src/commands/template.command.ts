import * as z from "zod/v4-mini";
import { getArgs } from "src/helpers/args";
import { resolveTemplate } from "src/lib/resolve-template";
import { renderTemplate } from "src/lib/render";

const schema = z.object({
  stage: z.nullable(z.optional(z.string())),

  // override working directory
  cwd: z.nullable(z.optional(z.string())),
  module: z.nullable(z.optional(z.string())),

  path: z.nullable(z.optional(z.string())),

  // Override template format
  format: z.nullable(z.optional(z.string())),

  // Return only value or subtree of a resolved template
  property: z.nullable(z.optional(z.string())),

  // - ignore: return unresolved values as is
  // - remove: do not return resolved values
  // - only: do not return non-resolved values
  // - all: resolve all
  resolve: z.nullable(z.optional(z.enum(["ignore", "remove", "only", "all"]))),

  // do not throw if file not found
  ignoreEmpty: z.nullable(z.optional(z.boolean())),

  // Override the returning format. Options: `yml`, `json`, or `env`
  outputFormat: z.nullable(z.optional(z.string())),

  verbose: z.nullable(z.optional(z.boolean())),
});

export async function templateCommand(argv: string[]) {
  let args;
  try {
    args = getArgs(argv, {
      config: schema,
      envs: {
        stage: "STAGE",
      },
    });

    const { output } = await templateCommandHandler(args);
    console.log(output);
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
export async function templateCommandHandler(args: {
  stage?: string | null;
  cwd?: string | null;
  module?: string | null;
  path?: string | null;
  format?: string | null;
  property?: string | null;
  resolve?: "ignore" | "remove" | "only" | "all" | null;
  ignoreEmpty?: boolean | null;
  outputFormat?: string | null;
}) {
  const tree = await resolveTemplate({
    stage: args.stage,
    cwd: args.cwd,
    module: args.module,
    path: args.path,
    format: args.format,
    property: args.property,
    resolve: args.resolve,
    ignoreEmpty: args.ignoreEmpty,
  });

  const outputFormat = args.outputFormat || "json";

  const output = await renderTemplate(tree, {
    outputFormat,
  });

  return { output };
}
