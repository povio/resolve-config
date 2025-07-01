import { z } from "zod/v4-mini";
import { getArgs } from "src/helpers/args";

const schema = z.object({
  stage: z.string().check(z.minLength(1)),
});

export async function resolveCommand(argv: string[]) {

  const args = getArgs(argv, {
    config: schema,
    envs: {
      stage: "STAGE",
    },
  });

  console.log(`Hello, ${args.stage}!`);
}
