import { z } from "zod/v4-mini";
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
});

export async function templateCommand(argv: string[]) {
  try {
    const { output } = await templateCommandHandler(argv);
    console.log(output);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

/**
 * Resolve a configuration
 *  - returns the result in stdout as json
 */
export async function templateCommandHandler(argv: string[]) {
  const args = getArgs(argv, {
    config: schema,
    envs: {
      stage: "STAGE",
    },
  });

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
