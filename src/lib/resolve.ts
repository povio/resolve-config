import { existsSync, readFileSync } from "node:fs";
import { basename } from "node:path";
import { readYaml } from "./read-yaml";
import { readEnv } from "./read-env";
import { resolveAwsArn } from "./resolve-aws";


/**
 * Resolve a configuration file .config/${stage}.${module}.template.[yml|json]
 * 
 * @param options 
 * @param options.stage - The stage (e.g. "dev", "prod") to resolve
 * @param options.cwd - The path to the module, we search for files inside `${path}/.config/`
 * @param options.path - Override the path to the template file
 * @param options.module - The module to resolve 
 * @param options.format - Format of the configuration file (json, yml, env), autodetected from the extension
 * @param options.content - Override the content of the configuration file (needs format to be specified) or object
 * @param options.property - Return only the value of the property, dot notation (e.g. "my.property")
 */
export async function resolveTemplate(options: {
    stage?: string,
    cwd?: string,
    module?: string,
    path?: string,
    format?: string,
    content?: string | any,
    property?: string,
    context?: Record<string, any>,
}): Promise<any> {
    let stage = options.stage || process.env.STAGE || 'local';
    let content: string;
    let context = { ...options.context ?? {}, stage };
    let path: string | undefined;
    if (options.content) {
        if (typeof options.content !== 'string' && typeof options.content !== 'object') {
            throw new Error('Content must be a string or object');
        }
        content = options.content;
        path = undefined;
    } else {
        if (options.path) {
            path = options.path;
        } else {
            if (!stage || !options.module) {
                throw new Error('Stage and module are required when path is not provided');
            }
            const cwd = options.cwd || process.cwd();
            path = `${cwd}/.config/${stage}.${options.module}.template.json`;
        }
        if (!existsSync(path)) {
            throw new Error(`Configuration file '${path}' not found`);
        }
        content = readFileSync(path, 'utf8');
    }

    let tree: any = {};
    if (typeof content === 'string') {

        if (!options.format && path === undefined) {
            throw new Error('Format is required when path is not provided');
        }
        const extension = path?.split('.').pop();
        const name = basename(path ?? '');
        let format = options.format;
        if (!format) {
            if (['json', 'yml', 'yaml', 'env'].includes(extension ?? '')) {
                format = extension;
            } else if (name.startsWith('.env')) {
                format = 'env';
            } else {
                throw new Error(`Unsupported format: ${extension}`);
            }
        }

        switch (format) {
            case 'env':
                tree = readEnv(content);
                break;
            case 'json':
                tree = JSON.parse(content);
                break;
            case 'yml':
            case 'yaml':
                tree = await readYaml(content);
                break;
            default:
                throw new Error(`Unsupported format: ${format}`);
        }

    } else {
        tree = content;
    }

    // Return the tree, with each leaf either returning the value or a promise that resolves to the value
    // The promise is lazy loaded, so it will only be resolved when the value is accessed
    return resolveObject(tree, context, options.property, path ? `${path}>` : '', new Map());
}

const templateRegex = /\$\{([^}]+)\}/g;

export async function resolveObject(obj: any, context?: Record<string, any>, property?: string, path: string = '', cache: Map<string, any> = new Map()): Promise<any> {

    console.error('resolveObject', obj, property, path);

    if (property) {
        if (obj === undefined || obj === null) {
            return obj;
        }
        if (typeof obj !== 'object' || Array.isArray(obj)) {
            throw new Error(`Property '${path}.${property}' is not an object`);
        }
        const [key, ...subPath] = property.split('.');
        console.error({property, key, subPath});
        if (!(key in obj)) {
            return undefined;
        }
        return resolveObject(obj[key], context, subPath.join('.'), `${path}.${key}`, cache);
    }

    if (typeof obj !== 'object' || obj === null) {
        if (typeof obj === 'string') {
            if (obj.includes("${")) {
                // Use regex to find all template literals and resolve them
                let result = obj;
                const matches = obj.match(templateRegex);
                if (matches) {
                    for (const match of matches) {
                        const templateContent = match.slice(2, -1); // Remove ${ and }
                        const resolvedValue = await resolveTemplateLiteral(templateContent, context, path, cache);
                        result = result.replace(match, resolvedValue ?? '');
                    }
                }
                return result;
            }
        }

        // return primitive values as is
        return obj;
    }

    if (Array.isArray(obj)) {
        return await Promise.all(obj.map(async (item, i) => resolveObject(item, context, undefined, `${path}[${i}]`, cache)));
    }


    const resolvedObject: any = {};
    for (const [key, value] of Object.entries(obj)) {
        resolvedObject[key] = await resolveObject(value, context, undefined, `${path}.${key}`, cache);
    }
    return resolvedObject;
}

async function resolveTemplateLiteral(value: string, context?: Record<string, any>, path?: string,  cache?: Map<string, any>) {
    if (value === undefined || value === null || value === '') {
        return value;
    }
    if (cache?.has(value)) {
        return cache.get(value);
    }
    let result: any;
    const [command, ...args] = value.trim().split(':');
    switch (command) {
        case 'env': {
            result = process.env[args.join(':')];
            break;
        }
        case 'func': {
            if (!args) {
                throw new Error(`Missing argument '${path}' func`); 
            }
            switch (args.join(':').trim()) {
                case 'stage':
                    result = context?.stage ?? 'local';
                    break;
                default:
                    throw new Error(`Unsupported function '${path}': ${value}`);
            }
            break;
        }
        case 'arn':
            result = await resolveAwsArn(args, context?.aws);
            break;
        default:
            throw new Error(`Unsupported template literal '${path}': '${value}'`);
    }
    if (cache) {
        cache.set(value, result);
    }
    return result;
}