import { basename, resolve, dirname } from "node:path";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { renderTemplate } from "./render";

/**
 * Write out the config file
 */
export function applyConfigFile(
  tree: any,
  options: {
    cwd?: string;
    destination: string;
    destinationFormat?: string | null;
  },
) {
  let format = options.destinationFormat;
  if (!format) {
    const extension = options.destination?.split(".").pop() ?? "";
    const name = basename(options.destination ?? "");
    if (["json", "yml", "yaml", "env"].includes(extension)) {
      format = extension;
    } else if (name.startsWith(".env")) {
      format = "env";
    } else {
      throw new Error(`Unsupported format: ${extension}`);
    }
  }

  const content = renderTemplate(tree, {
    outputFormat: format,
  });

  const destinationPath = resolve(
    options.cwd ?? process.cwd(),
    options.destination,
  );

  // check if destination directory exists
  const dir = dirname(destinationPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  writeFileSync(destinationPath, content);
}
