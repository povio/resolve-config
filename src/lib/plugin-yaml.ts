import importSync from "import-sync";

export function parseYaml(content: string) {
  const yaml = importSync("yaml");
  return yaml.parse(content);
}

export function dumpYaml(obj: any) {
  const yaml = importSync("yaml");
  return yaml.stringify(obj);
}
