import { sep, resolve } from "node:path";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import * as process from "process";
import { dumpYaml, updateYaml } from "./plugin-yaml";

/**
 * Set value in a template file .config/${stage}.${module}.template.[yml]
 *  - only supports .yaml
 *
 * @param options
 * @param options.stage - The stage (e.g. "dev", "prod") to resolve
 * @param options.cwd - The path to the module, we search for files inside `${path}/.config/`
 * @param options.module - Module name - Eq. api, 'api.resolved'
 * @param options.format - Only 'yaml' supported
 * @param options.data - Data to store
 */
export function setTemplate(options: {
  stage?: string | null;
  cwd?: string | null;
  module?: string | null;
  format?: string | null;
  path?: string | null;
  data: Record<string, any>;
  replace?: boolean | null;
  verbose?: boolean | null;
}) {
  const cwd = options.cwd || process.cwd();

  const format = options.format || "yml";
  if (format && ["yaml", "yml"].indexOf(format) === -1) {
    throw new Error(`Only 'yaml' format is supported`);
  }

  let filePath;
  if (options.path) {
    filePath = options.path;
  } else {
    if (!options.stage && !options.module) {
      throw new Error("Stage or module must be specified");
    }
    filePath = `.config${sep}${[options.stage, options.module, format].filter(Boolean).join(".")}`;
  }

  const resolvedPath = resolve(cwd, filePath);

  if (existsSync(resolvedPath) && options.replace !== true) {
    // write into the yml, keeping the existing values and comments
    writeFileSync(
      resolvedPath,
      updateYaml(readFileSync(resolvedPath, "utf8"), options.data),
    );
  } else {
    // create a new config
    if (options.verbose) console.log(`Writing ${resolvedPath}`);
    writeFileSync(resolvedPath, dumpYaml(options.data));
  }
}
