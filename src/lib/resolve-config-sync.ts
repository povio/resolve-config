import deepmerge from "deepmerge";
import { resolveTemplateLiteral } from "./template";
import { resolveResolveConfigs } from "./config";
import { applyConfigFile } from "./apply";
import { resolveTemplateSync } from "./resolve-template-sync";
import { mergeIntoTree } from "./merge";

/**
 * Resolve a configuration file using a resolve-config configuration file
 */
export function resolveConfigSync(options: {
  stage?: string | null;
  cwd?: string | null;
  module?: string | null;
  path?: string | null;
  target?: string | null;
  context?: Record<string, any> | null;
  apply?: boolean | null;
}) {
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
        resolvedValue = resolveTemplateLiteral(
          value.valueFrom,
          deepmerge(options?.context ?? {}, context ?? {}),
          value.name,
          cache,
          false,
        );
      } else if (value.objectFrom) {
        resolvedValue = resolveTemplateLiteral(
          value.objectFrom,
          deepmerge(options?.context ?? {}, context ?? {}),
          value.name,
          cache,
          false,
        );
        resolvedValue = JSON.parse(resolvedValue);
      } else if (value.templateModule || value.templatePath) {
        resolvedValue = resolveTemplateSync({
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

  return configs;
}
