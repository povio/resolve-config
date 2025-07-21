import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseYaml } from "./plugin-yaml";
import * as z from "zod/mini";

export const ConfigItemValue = z.object({
  name: z.string(),
  valueFrom: z.nullable(z.optional(z.string())),
  objectFrom: z.nullable(z.optional(z.string())),
  templateModule: z.nullable(z.optional(z.string())),
  templatePath: z.nullable(z.optional(z.string())),
  value: z.nullable(z.optional(z.string())),

  optional: z.nullable(z.optional(z.boolean())),
  resolve: z.nullable(z.optional(z.enum(["ignore", "remove", "only", "all"]))),
  ignoreEmpty: z.nullable(z.optional(z.boolean())),
});

export const ConfigItem = z.object({
  name: z.nullable(z.optional(z.string())),
  destination: z.nullable(z.optional(z.string())),
  destinationFormat: z.nullable(z.optional(z.string())),
  template: z.nullable(z.optional(z.string())),
  values: z.array(ConfigItemValue),
  context: z.nullable(z.optional(z.record(z.string(), z.any()))),
});

export const ConfigItems = z.pipe(
  z.union([
    z.array(ConfigItem),
    z.extend(ConfigItem, { name: z.nullable(z.optional(z.string())) }),
  ]),
  z.transform((val) => {
    if (Array.isArray(val)) {
      return val;
    } else {
      return [{ name: "default", ...val }];
    }
  }),
);

export function resolveResolveConfigs(options: {
  stage?: string | null;
  cwd?: string | null;
  module?: string | null;
  configs?: z.input<typeof ConfigItems> | null;
  path?: string | null;
  apply?: boolean | null;
}) {
  const cwd = options.cwd || process.cwd();
  const mod = options.module || "config";
  let rawConfigs: z.input<typeof ConfigItems>;
  const stage = options.stage || process.env.STAGE || "local";
  let path: string | undefined;
  if (options.configs) {
    rawConfigs = options.configs;
  } else {
    path = options.path
      ? resolve(cwd, options.path)
      : resolve(`${cwd}/.config/${stage}.${mod}`);
    let format: string | undefined;

    for (const f of ["yml", "yaml", "json"]) {
      if (existsSync(`${path}.${f}`)) {
        format = f;
        path += `.${f}`;
        break;
      }
    }

    if (!existsSync(path)) {
      throw new Error(`Configuration file '${path}' not found`);
    }

    const content = readFileSync(path, "utf8");

    switch (format) {
      case "json":
        rawConfigs = JSON.parse(content).configs;
        break;
      case "yml":
      case "yaml":
        rawConfigs = parseYaml(content).configs;
        break;
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }
  try {
    return { items: ConfigItems.parse(rawConfigs), stage, module: mod, cwd };
  } catch (e: any) {
    throw new Error(`Invalid configuration file ${path}`, { cause: e });
  }
}
