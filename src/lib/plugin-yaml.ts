import { parse, stringify } from "yaml";

export function parseYaml(content: string) {
  return parse(content);
}

export function dumpYaml(obj: any) {
  return stringify(obj);
}
