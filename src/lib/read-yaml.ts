

export async function readYaml(content: string): Promise<any> {
    const yaml = await import("yaml");
    return yaml.parse(content);
}