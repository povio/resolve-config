import { existsSync, readFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import { parseYaml } from "./plugin-yaml";
import { parseEnv } from "./plugin-env";
import { resolveAwsArn } from "./plugin-aws";
import { PlainType, PlainNestedType } from "./types";

export const templateRegex = /\$(?<mutator>[a-z]+)?\{(?<value>[^}]+)\}/g;

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
export function mutateLiteral(
  mutator: string,
  input: string,
  matched: string,
  resolved: any,
  path: string,
) {
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
      result = process.env[args.join(":")];
      break;
    }
    case "func": {
      if (!args) {
        throw new Error(`Missing argument '${path}' func`);
      }
      switch (args.join(":").trim()) {
        case "stage":
          result = context?.stage ?? "local";
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
    if (
      typeof options.content !== "string" &&
      typeof options.content !== "object"
    ) {
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
    tree = content;
  }
  return {
    tree,
    path,
    stage,
  };
}
