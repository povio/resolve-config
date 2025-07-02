import { z } from "zod/v4-mini";
import { getArgs } from "src/helpers/args";
import { resolveTemplate } from "src/lib/resolve-template";
import { renderTemplate } from "src/lib/render";

const schema = z.object({
  stage: z.nullable(z.optional(z.string())),
  cwd: z.nullable(z.optional(z.string())),
  module: z.nullable(z.optional(z.string())),
  path: z.nullable(z.optional(z.string())),
  format: z.nullable(z.optional(z.string())),

  config: z.nullable(z.optional(z.string())),
  target: z.nullable(z.optional(z.string())),

  property: z.nullable(z.optional(z.string())),
  onlyResolved: z.nullable(z.optional(z.boolean())),
  ignoreEmpty: z.nullable(z.optional(z.boolean())),

  // output file
  output: z.nullable(z.optional(z.string())),
  outputFormat: z.nullable(z.optional(z.string())),
});


export async function resolveCommand(argv: string[]) {
  try {
    const { output } = await resolveCommandHandler(argv);
    console.log(output);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

/**
 * Resolve a configuration
 */
export async function resolveCommandHandler(argv: string[]) {

  const args = getArgs(argv, {
    config: schema,
    envs: {
      stage: "STAGE",
    },
  });

  const tree = await resolveTemplate(args);

  const outputFormat = args.outputFormat || args.output?.split('.').pop() || 'json';

  const output = await renderTemplate(tree, {
    outputFormat 
  });

  return { output };
}


