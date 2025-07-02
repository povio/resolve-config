import { existsSync, readFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import { parseYaml } from "./plugin-yaml";
import { parseEnv } from "./plugin-env";
import { resolveAwsArn } from "./plugin-aws";


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
 * @param options.onlyResolved - Return only the resolved values in the tree (template + resolved = config)
 * @param options.ignoreEmpty - Ignore empty values
 */
export async function resolveTemplate(options: {
    stage?: string | null,
    cwd?: string | null,
    module?: string | null,
    path?: string | null,
    format?: string | null,
    content?: string | any | null,
    property?: string | null,
    context?: Record<string, any> | null,
    onlyResolved?: boolean | null,
    ignoreEmpty?: boolean | null,
}): Promise<any> {
    let stage = options.stage || process.env.STAGE || 'local';
    let content: string;
    let context = { ...options.context ?? {}, stage, onlyResolved: options.onlyResolved ?? false };
    let path: string | undefined;
    if (options.content) {
        if (typeof options.content !== 'string' && typeof options.content !== 'object') {
            throw new Error('Content must be a string or object');
        }
        content = options.content;
        path = undefined;
    } else {
        const cwd = options.cwd || process.cwd();
        if (options.path) {
            path = resolve(cwd, options.path);
        } else {
            if (!stage || !options.module) {
                throw new Error('Stage and module are required when path is not provided');
            }
            
            path = resolve(`${cwd}/.config/${stage}.${options.module}`);

            if (!options.format) {
                // try all possible formats
                for (const format of [
                    'json', 'yml', 'yaml', 'env'
                ]) {
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
                tree = parseEnv(content);
                break;
            case 'json':
                tree = JSON.parse(content);
                break;
            case 'yml':
            case 'yaml':
                tree = await parseYaml(content);
                break;
            default:
                throw new Error(`Unsupported format: ${format}`);
        }

    } else {
        tree = content;
    }

    return resolveTemplateObject(tree, context, options.property, path ? `${path}>` : '', new Map());
}

const templateRegex = /\$(?<mutator>[a-z]+)?\{(?<value>[^}]+)\}/g;

export async function resolveTemplateObject(obj: any, context?: Record<string, any>, property?: string | null, path: string = '', cache: Map<string, any> = new Map()): Promise<any> {

    if (property) {
        if (obj === undefined || obj === null) {
            return obj;
        }
        if (typeof obj !== 'object' || Array.isArray(obj)) {
            throw new Error(`Property '${path}.${property}' is not an object`);
        }
        const [key, ...subPath] = property.split('.');
        if (!(key in obj)) {
            return undefined;
        }
        return resolveTemplateObject(obj[key], context, subPath.join('.'), `${path}.${key}`, cache);
    }

    if (typeof obj !== 'object' || obj === null) {
        if (typeof obj === 'string') {
            if (obj.includes("$")) {
                // Use regex to find all template literals and resolve them
                let result = obj;
                const matches = obj.matchAll(templateRegex);
                if (matches) {
                    for (const match of [...matches]) {
                        const { mutator, value } = match.groups as any; 
                        const resolvedValue = await resolveTemplateLiteral(value, context, path, cache);
                        switch (mutator) {
                            case 'object':
                                if (result === match[0]) {
                                    result = resolvedValue ? JSON.parse(resolvedValue) : '';
                                } else {
                                    result = result.replace(match[0], resolvedValue ? JSON.parse(resolvedValue) : '');
                                }
                                break;
                            case undefined:
                                if (result === match[0]) {
                                    result = resolvedValue;
                                } else {
                                    result = result.replace(match[0], resolvedValue ?? '');
                                }
                                break;
                            default:
                                throw new Error(`Unsupported mutator '${mutator}' in '${path}'`);
                        }
                    }
                }
                return result;
            }
        }

        if (context?.onlyResolved) {
            return undefined;
        }

        // return primitive values as is
        return obj;
    }

    if (Array.isArray(obj)) {
        return await Promise.all(obj.map(async (item, i) => resolveTemplateObject(item, context, undefined, `${path}[${i}]`, cache)));
    }


    const resolvedObject: any = {};
    for (const [key, value] of Object.entries(obj)) {
        const resolvedValue = await resolveTemplateObject(value, context, undefined, `${path}.${key}`, cache);
        if (resolvedValue !== undefined) {
            resolvedObject[key] = resolvedValue;
        }
    }
    if (Object.keys(resolvedObject).length === 0) {
        return undefined;
    }
    return resolvedObject;
}

export async function resolveTemplateLiteral(value: string, context?: Record<string, any>, path?: string,  cache?: Map<string, any>) {
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
                case "timestamp":
                    return new Date().toISOString();
                default:
                    throw new Error(`Unsupported function '${path}': ${value}`);
            }
            break;
        }
        case 'arn':
            result = await resolveAwsArn(value.trim(), context?.aws);
            break;
        default:
            throw new Error(`Unsupported template literal '${path}': '${value}'`);
    }
    if (cache) {
        cache.set(value, result);
    }
    return result;
}