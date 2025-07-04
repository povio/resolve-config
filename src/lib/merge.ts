import deepmerge from "deepmerge";

export function mergeIntoTree(tree: any, name: string, resolvedValue: any) {
  if (name === "@") {
    if (typeof resolvedValue !== "object") {
      throw new Error(`Cannot set root value to "${resolvedValue}"`);
    }
    tree = deepmerge(tree, resolvedValue);
  } else {
    let edge = tree;

    // resolve __ name into tree path
    const segments = name.includes("__") ? name.split("__") : name.split(".");
    while (segments.length > 1) {
      const segment = segments.shift()!;
      if (!edge[segment]) {
        edge[segment] = {};
      }
      if (typeof edge[segment] !== "object") {
        throw new Error(
          `Cannot create tree path at ${name}, ${segment} is not an object ${edge[segment]}`,
        );
      }
      edge = edge[segment];
    }
    edge[segments[0]] = resolvedValue;
  }
  return tree;
}
