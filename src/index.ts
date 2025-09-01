export { resolveTemplateSync } from "./lib/resolve-template-sync";
export { resolveTemplate } from "./lib/resolve-template";

export { resolveConfig } from "./lib/resolve-config";
export { resolveConfigSync } from "./lib/resolve-config-sync";

export { renderTemplate } from "./lib/render";

export { mergeIntoTree } from "./lib/merge";

export { filterObjectByKeys } from "./lib/filter-keys";

export {
  generateDotEnvArray,
  generateDotEnv,
  generateDotEnvPairs,
} from "./lib/plugin-dotenv";

export { parseEnv, applyEnv } from "./lib/plugin-env";
export { parseYaml, updateYaml, dumpYaml } from "./lib/plugin-yaml";

export { setTemplate } from "./lib/set-template";

export {
  mutateLiteral,
  resolveTemplateLiteral,
  resolveTemplateContent,
} from "./lib/template";
