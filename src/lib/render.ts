import { generateDotEnv } from "./plugin-dotenv";
import { dumpYaml } from "./plugin-yaml";
import { PlainNestedType } from "./types";

/**
 * Render a configuration file
 *
 * @param tree - The configuration tree to render
 * @param options
 * @param options.output - The output format (json, yml, env)
 */
export function renderTemplate(
  tree: PlainNestedType | string,
  options: {
    outputFormat?: string | null;
  },
) {
  if (typeof tree === "string") {
    return tree;
  }

  switch (options.outputFormat) {
    case "yaml":
    case "yml":
      return dumpYaml(tree);
    case "env-json":
      return generateDotEnv(tree, { format: "json" });
    case "env":
    case "__":
      return generateDotEnv(tree, { format: "__" });
    case "json":
    default:
      return JSON.stringify(tree, null, 2);
  }
}
