import { existsSync, readFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import { parseYaml } from "./plugin-yaml";
import { parseEnv } from "./plugin-env";
import { resolveAwsArn } from "./plugin-aws";
import { PlainType, PlainNestedType } from "./types";

export const templateRegex = /\$(?<mutator>[a-z]+)?\{(?<value>[^}]+)\}/g;

function getFromPath(obj: Record<string, any> | undefined, dottedPath: string): any {
  if (obj === undefined || obj === null || dottedPath === "") {
    return undefined;
  }
  let cur: any = obj;
  for (const part of dottedPath.split(".")) {
    if (cur === undefined || cur === null || typeof cur !== "object") {
      return undefined;
    }
    cur = cur[part];
  }
  return cur;
}

/**
 * Mutates a literal string based on the specified mutator type by
 *  replacing or resolving matched substrings
 *
 * @param {string} mutator - The type of mutator to use. Supports "object" or undefined.
 * @param {string} input - The input string to mutate.
 * @param {string} matched - The substring within the input to match and potentially replace.
 * @param {any} resolved - The resolved value used as a replacement for the matched substring.
 * @param {string} path - The path used for error reporting when mutator type is unsupported.
 * @return {string} The mutated literal as a string after applying the specified mutator logic.
 * @throws {Error} If the mutator type is unsupported.
 */
export function mutateLiteral(mutator: string, input: string, matched: string, resolved: any, path: string) {
  switch (mutator) {
    case "object": {
      if (input === matched) {
        return resolved ? JSON.parse(resolved) : "";
      } else {
        return input.replace(matched, resolved ? JSON.parse(resolved) : "");
      }
    }
    case undefined: {
      if (input === matched) {
        return resolved;
      } else {
        return input.replace(matched, resolved ?? "");
      }
    }
    default:
      throw new Error(`Unsupported mutator '${mutator}' in '${path}'`);
  }
}

export function resolveTemplateLiteral(
  value: string,
  context?: Record<string, any>,
  path?: string,
  cache?: Map<string, any>,
  async?: boolean | null,
) {
  if (value === undefined || value === null || value === "") {
    return value;
  }
  if (cache?.has(value)) {
    return cache.get(value);
  }
  let result: any;
  const [command, ...args] = value.trim().split(":");
  switch (command) {
    case "env": {
      const key = args.join(":");
      const fromEnv = process.env[key];
      result = fromEnv !== undefined ? fromEnv : getFromPath(context, key);
      break;
    }
    case "context": {
      const keyPath = args.join(":").trim();
      if (!keyPath) {
        throw new Error(`Missing argument '${path}' context`);
      }
      result = getFromPath(context, keyPath);
      break;
    }
    case "func": {
      if (!args) {
        throw new Error(`Missing argument '${path}' func`);
      }
      switch (args.join(":").trim()) {
        case "stage":
          result = context?.stage;
          break;
        case "timestamp":
          return new Date().toISOString();
        default:
          throw new Error(`Unsupported function '${path}': ${value}`);
      }
      break;
    }
    case "arn":
      if (async) {
        return resolveAwsArn(value.trim(), context?.aws).then((r) => {
          cache?.set(value, r);
          return r;
        });
      }
      throw new Error(`Can not resolve async '${path}': ${value}`);
    default:
      throw new Error(`Unsupported template literal '${path}': '${value}'`);
  }
  if (cache) {
    cache.set(value, result);
  }
  return result;
}

export function resolveTemplateContent(options: {
  stage?: string | null;
  module?: string | null;
  content?: string | any | null;
  cwd?: string | null;
  context?: Record<string, any> | null;
  ignoreEmpty?: boolean | null;
  path?: string | null;
  format?: string | null;
}):
  | {
      tree: PlainType;
      stage: string;
      path?: string;
    }
  | undefined {
  const stage = options.stage || process.env.STAGE || "local";
  const mod = options.module || "local";
  let content: string;
  let path: string | undefined;
  if (options.content) {
    if (typeof options.content !== "string" && typeof options.content !== "object") {
      throw new Error("Content must be a string or object");
    }
    content = options.content;
    path = undefined;
  } else {
    const cwd = options.cwd || process.cwd();
    if (options.path) {
      path = resolve(cwd, options.path);
    } else {
      path = resolve(`${cwd}/.config/${stage}.${mod}`);

      if (!options.format) {
        // try all possible formats
        for (const format of ["json", "yml", "yaml", "env"]) {
          if (existsSync(`${path}.${format}`)) {
            options.format = format;
            path += `.${format}`;
            break;
          } else if (existsSync(`${path}.template.${format}`)) {
            options.format = format;
            path += `.template.${format}`;
            break;
          }
        }
      } else {
        path += `.${options.format}`;
      }
    }

    if (!existsSync(path)) {
      if (options.ignoreEmpty) {
        return undefined;
      }
      throw new Error(`Configuration file '${path}' not found`);
    }

    content = readFileSync(path, "utf8");
  }

  let tree: PlainNestedType = {};
  if (typeof content === "string") {
    if (!options.format && path === undefined) {
      throw new Error("Format is required when path is not provided");
    }
    const extension = path?.split(".").pop();
    const name = basename(path ?? "");
    let format = options.format;
    if (!format) {
      if (["json", "yml", "yaml", "env"].includes(extension ?? "")) {
        format = extension;
      } else if (name.startsWith(".env")) {
        format = "env";
      } else {
        throw new Error(`Unsupported format: ${extension}`);
      }
    }

    if (content.trim() !== "") {
      switch (format) {
        case "env":
          tree = parseEnv(content);
          break;
        case "json":
          tree = JSON.parse(content);
          break;
        case "yml":
        case "yaml":
          tree = parseYaml(content);
          break;
        default:
          throw new Error(`Unsupported format: ${format}`);
      }
    } else {
      tree = null as any;
    }

    if (tree === null || tree === undefined) {
      if (options.ignoreEmpty) {
        return undefined;
      }
      throw new Error(`Template file '${path ?? "(inline content)"}' is empty`);
    }
  } else {
    tree = content;
  }
  return {
    tree,
    path,
    stage,
  };
}

/**
 * Load a JSON, YAML, or env file as a plain object for use as resolution context.
 * Path is resolved relative to cwd. Empty or comment-only files resolve to {}.
 */
export function loadContextFile(cwd: string, relativePath: string): PlainNestedType {
  const path = resolve(cwd, relativePath);
  if (!existsSync(path)) {
    throw new Error(`Context file '${path}' not found`);
  }
  const content = readFileSync(path, "utf8");
  const extension = path.split(".").pop()?.toLowerCase();
  let format = extension;
  if (!["json", "yml", "yaml", "env"].includes(format ?? "")) {
    const name = basename(path);
    if (name.startsWith(".env")) {
      format = "env";
    }
  }
  if (content.trim() === "") {
    return {};
  }
  switch (format) {
    case "env":
      return parseEnv(content) ?? {};
    case "json":
      return JSON.parse(content) ?? {};
    case "yml":
    case "yaml":
      return parseYaml(content) ?? {};
    default:
      throw new Error(`Unsupported context file format for '${path}' (use .json, .yml, .yaml, or .env)`);
  }
}
