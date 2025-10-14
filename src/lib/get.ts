import { PlainType } from "./types";

export function getPlain(
  tree: PlainType,
  path: string | string[],
): PlainType | undefined {
  if (typeof path === "string") {
    path = path.split(".");
  }
  let node = tree;
  for (const key of path) {
    if (node === null || tree === undefined || typeof node !== "object") {
      return undefined;
    }
    if (Array.isArray(node)) {
      return undefined; // todo, array support?
    }
    node = node[key];
  }
  return node;
}

export function getString(
  tree: PlainType,
  path: string | string[],
): string | undefined {
  const value = getPlain(tree, path);
  return value ? value.toString() : undefined;
}

export function getNumber(
  tree: PlainType,
  path: string | string[],
): number | undefined {
  const value = getPlain(tree, path);
  if (typeof value === "number") {
    return value;
  }
  if (typeof value !== "string") {
    return undefined;
  }
  try {
    return value ? parseInt(value, 10) : undefined;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (_e: any) {
    return undefined;
  }
}

export function getBoolean(
  tree: PlainType,
  path: string | string[],
): boolean | undefined {
  const value = getPlain(tree, path);
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value !== "string") {
    return undefined;
  }
  switch (value.toLowerCase().trim()) {
    case "true":
    case "yes":
      return true;
    case "false":
    case "no":
      return false;
    default:
      return undefined;
  }
}
