

export async function parseYaml(content: string): Promise<any> {
    const yaml = await import("yaml");
    return yaml.parse(content);
}

export async function dumpYaml(obj: any): Promise<string> {
    const yaml = await import("yaml");
    return yaml.stringify(obj);
}