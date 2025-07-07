import {
  mutateLiteral,
  resolveTemplateContent,
  resolveTemplateLiteral,
  templateRegex,
} from "./template";

/**
 * Resolve a configuration file .config/${stage}.${module}.template.[yml|json]
 *
 * @param options
 * @param options.stage - The stage (e.g. "dev", "prod") to resolve
 * @param options.cwd - The path to the module, we search for files inside `${path}/.config/`
 * @param options.path - Override the path to the template file
 * @param options.module - The module to resolve
 * @param options.format - Format of the configuration file (json, yml, env), autodetected from the extension
 * @param options.content - Override the content of the configuration file (needs format to be specified) or object
 * @param options.property - Return only the value of the property, dot notation (e.g. "my.property")
 * @param options.resolve - What to resolve
 * @param options.ignoreEmpty - Ignore empty values
 */
export async function resolveTemplate(options: {
  stage?: string | null;
  cwd?: string | null;
  module?: string | null;
  path?: string | null;
  format?: string | null;
  content?: string | any | null;
  property?: string | null;
  context?: Record<string, any> | null;
  resolve?: "only" | "ignore" | "all" | "remove" | null;
  ignoreEmpty?: boolean | null;
}) {
  const resolvedTemplateContent = resolveTemplateContent(options);

  if (!resolvedTemplateContent) {
    return undefined;
  }

  return resolveTemplateObject(
    resolvedTemplateContent?.tree,
    {
      ...(options.context ?? {}),
      stage: resolvedTemplateContent.stage,
      resolve: options.resolve ?? "all",
    },
    options.property,
    resolvedTemplateContent.path,
    new Map(),
  );
}

export async function resolveTemplateObject(
  obj: any,
  context?: Record<string, any>,
  property?: string | null,
  path: string = "",
  cache: Map<string, any> = new Map(),
): Promise<any> {
  if (property) {
    // filter down to a single property

    if (obj === undefined || obj === null) {
      return obj;
    }
    if (typeof obj !== "object" || Array.isArray(obj)) {
      throw new Error(`Property '${path}.${property}' is not an object`);
    }
    const [key, ...subPath] = property.split(".");
    if (!(key in obj)) {
      return undefined;
    }
    return resolveTemplateObject(
      obj[key],
      context,
      subPath.join("."),
      `${path}.${key}`,
      cache,
    );
  }

  if (typeof obj === "object" && obj !== null) {
    // sub-tree

    if (Array.isArray(obj)) {
      const array = (await Promise.all(
        obj.map(async (item, i) =>
          resolveTemplateObject(
            item,
            context,
            undefined,
            `${path}[${i}]`,
            cache,
          ),
        ),
      )).filter((item) => item !== undefined);
      return array.length > 0 ? array : undefined;
    }

    const resolvedObject: any = {};
    for (const [key, value] of Object.entries(obj)) {
      const resolvedValue = await resolveTemplateObject(
        value,
        context,
        undefined,
        `${path}.${key}`,
        cache,
      );
      if (resolvedValue !== undefined) {
        resolvedObject[key] = resolvedValue;
      }
    }
    if (Object.keys(resolvedObject).length === 0) {
      return undefined;
    }
    return resolvedObject;
  }

  if (typeof obj === "string") {
    // resolved values

    // Use regex to find all template literals and resolve them
    const matches = [...obj.matchAll(templateRegex)];
    if (matches.length > 0) {
      if (context?.resolve === "ignore") {
        return obj;
      } else if (context?.resolve === "remove") {
        return undefined;
      }

      let result = obj;
      for (const match of matches) {
        const { mutator, value } = match.groups as any;
        const resolvedValue = await resolveTemplateLiteral(
          value,
          context,
          path,
          cache,
          true,
        );
        result = mutateLiteral(mutator, result, match[0], resolvedValue, path);
      }
      return result;
    }
  }

  // primitives

  if (context?.resolve === "only") {
    return undefined;
  }

  return obj;
}
