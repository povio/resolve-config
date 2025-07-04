import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { basename, resolve, dirname } from "node:path";
import { parseYaml } from "./plugin-yaml";
import deepmerge from "deepmerge";
import { z } from "zod/v4-mini";
import { resolveTemplate, resolveTemplateLiteral } from "./resolve-template";
import { renderTemplate } from "./render";

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
  destination: z.string(),
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

/**
 * Resolve a configuration file using a resolve-config configuration file
 */
export async function resolveConfig(options: {
  stage?: string | null;
  cwd?: string | null;
  module?: string | null;
  path?: string | null;
  target?: string | null;
  context?: Record<string, any> | null;
  apply?: boolean | null;
}) {
  const stage = options.stage || process.env.STAGE || "local";
  let items: z.output<typeof ConfigItems>;
  const cwd = options.cwd || process.cwd();

  {
    let path: string | undefined;
    let format: string | undefined;

    if (options.path) {
      path = resolve(cwd, options.path);
    } else {
      if (!stage || !options.module) {
        throw new Error(
          "Stage and module are required when path is not provided",
        );
      }

      path = resolve(`${cwd}/.config/${stage}.${options.module}`);

      for (const f of ["yml", "yaml", "json"]) {
        if (existsSync(`${path}.${f}`)) {
          format = f;
          path += `.${f}`;
          break;
        }
      }
    }

    if (!existsSync(path)) {
      throw new Error(`Configuration file '${path}' not found`);
    }

    const content = readFileSync(path, "utf8");

    let rawConfig: any;
    switch (format) {
      case "json":
        rawConfig = JSON.parse(content);
        break;
      case "yml":
      case "yaml":
        rawConfig = await parseYaml(content);
        break;
      default:
        throw new Error(`Unsupported format: ${format}`);
    }

    items = ConfigItems.parse(rawConfig.configs);
  }

  const configs: Record<string, any> = {};

  for (const {
    name,
    values,
    context,
    destination,
    destinationFormat,
  } of items) {
    if (options.target && name !== options.target) {
      continue;
    }

    let tree: any = {};

    for (const value of values) {
      let resolvedValue: any;
      if (value.value) {
        resolvedValue = value.value;
      } else if (value.valueFrom) {
        resolvedValue = await resolveTemplateLiteral(
          value.valueFrom,
          deepmerge(options?.context ?? {}, context ?? {}),
        );
      } else if (value.objectFrom) {
        resolvedValue = await resolveTemplateLiteral(
          value.objectFrom,
          deepmerge(options?.context ?? {}, context ?? {}),
        );
        resolvedValue = JSON.parse(resolvedValue);
      } else if (value.templateModule || value.templatePath) {
        resolvedValue = await resolveTemplate({
          stage,
          cwd: options.cwd,
          module: value.templateModule,
          resolve: value.resolve,
          path: value.templatePath,
          ignoreEmpty: value.ignoreEmpty,
          context: deepmerge(options?.context ?? {}, context ?? {}),
        });
      }

      if (resolvedValue !== undefined) {
        if (value.name === "@") {
          if (typeof resolvedValue !== "object") {
            throw new Error(`Cannot set root value to "${resolvedValue}"`);
          }
          tree = deepmerge(tree, resolvedValue);
        } else {
          let edge = tree;

          // resolve __ name into tree path
          const segments = value.name.includes("__")
            ? value.name.split("__")
            : value.name.split(".");
          while (segments.length > 1) {
            const segment = segments.shift()!;
            if (!edge[segment]) {
              edge[segment] = {};
            }
            if (typeof edge[segment] !== "object") {
              throw new Error(
                `Cannot create tree path at ${value.name}, ${segment} is not an object ${edge[segment]}`,
              );
            }
            edge = edge[segment];
          }
          edge[segments[0]] = resolvedValue;
        }
      }
    }

    if ((name || "default") in configs) {
      throw new Error(
        `Multiple configs with the same name '${name || "default"}'`,
      );
    }

    configs[name || "default"] = tree;

    if (options.apply) {
      applyConfigFile(tree, {
        cwd,
        destination,
        destinationFormat,
      });
    }
  }

  return configs;
}

/**
 * Write out the config file
 */
export async function applyConfigFile(
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

  const content = await renderTemplate(tree, {
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

export function loadConfig() {}
