
import { generateDotEnv } from "./plugin-dotenv";
import { dumpYaml } from "./plugin-yaml";

/**
 * Render a configuration file
 * 
 * @param options 
 * @param options.output - The output format (json, yml, env)
 */
export async function renderTemplate( tree: any, options: {

    output?: string,
}): Promise<any> {
    switch (options.output) {
        case 'json':
            return JSON.stringify(tree, null, 2);
        case 'yaml':
            return await dumpYaml(tree);
        case 'env':
        default:
            return generateDotEnv(tree);
    }

}
