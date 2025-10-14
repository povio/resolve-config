import deepmerge from "deepmerge";
import { resolveTemplate } from "./resolve-template";
import { resolveTemplateLiteral } from "./template";
import { resolveResolveConfigs } from "./config";
import { applyConfigFile } from "./apply";
import { mergeIntoTree } from "./merge";
import { PlainNestedType } from "./types";

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
}): Promise<PlainNestedType> {
  const { items, stage, cwd } = resolveResolveConfigs(options);

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

    const cache = new Map();
    let tree: any = {};

    for (const value of values) {
      let resolvedValue: any;
      if (value.value) {
        resolvedValue = value.value;
      } else if (value.valueFrom) {
        resolvedValue = await resolveTemplateLiteral(
          value.valueFrom,
          deepmerge(options?.context ?? {}, context ?? {}),
          undefined,
          cache,
          true,
        );
      } else if (value.objectFrom) {
        resolvedValue = await resolveTemplateLiteral(
          value.objectFrom,
          deepmerge(options?.context ?? {}, context ?? {}),
          undefined,
          cache,
          true,
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
        tree = mergeIntoTree(tree, value.name, resolvedValue);
      }
    }

    if ((name || "default") in configs) {
      throw new Error(
        `Multiple configs with the same name '${name || "default"}'`,
      );
    }

    configs[name || "default"] = tree;

    if (destination && options.apply) {
      applyConfigFile(tree, {
        cwd,
        destination,
        destinationFormat,
      });
    }
  }

  if (options.target) {
    return configs[options.target];
  }

  return configs;
}
