import { parse, parseDocument, stringify, Document } from "yaml";
import { generateDotEnvPairs } from "./plugin-dotenv";
import { PlainType } from "./types";

export function parseYaml(content: string) {
  return parse(content);
}

export function dumpYaml(obj: any) {
  return stringify(obj);
}

/**
 * Update a property in a yml file keeping the existing values and comments
 * Accepts either a deep object or a record with dot-path keys
 */
export function updateYaml(content: string, data: PlainType): string {
  const yaml = parseDocument(content, {
    prettyErrors: true,
    merge: true,
    keepSourceTokens: true,
  });

  for (const [k, v] of generateDotEnvPairs(data, {
    format: ".",
    escaped: false,
  })) {
    if (!yaml.hasIn(k.split("."))) {
      yaml.addIn(k.split("."), v);
    } else if (yaml.getIn(k.split(".")) !== v) {
      yaml.deleteIn(k.split("."));
      yaml.addIn(k.split("."), v);
    }
  }

  return yaml.toString();
}
