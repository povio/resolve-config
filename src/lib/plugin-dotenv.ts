import { PlainNestedType, PlainType } from "./types";

/**
 * Convert a dictionary to an array env value pairs
 *  - in the format [[${key},"${value}"]]
 *  - encode values into single line
 *  - escape values so that we preserve the format of the ini file
 */
export function generateDotEnvPairs(
  data: PlainType,
  options?: {
    format?: "json" | "__" | ".";
    prefix?: string | null;
    escaped?: boolean; // default true
  },
): string[][] {
  if (typeof data !== "object" || data === null) {
    return [];
  }
  return Object.entries(data)
    .flatMap(([_key, value]) => {
      if (value === undefined || value === null) {
        // undefined values are not allowed in .env files
        return [];
      }
      const key = options?.prefix ? `${options.prefix}${_key}` : _key;
      if (typeof value === "object") {
        switch (options?.format) {
          case "__":
          case ".":
            if (Array.isArray(data)) {
              return [
                [
                  key,
                  options?.escaped === false
                    ? JSON.stringify(data)
                    : `'${JSON.stringify(data).replace(/\r?\n/g, "\\n")}'`,
                ],
              ];
            }
            return generateDotEnvPairs(value, {
              format: options.format,
              prefix: `${key}${options.format}`,
              escaped: options.escaped ?? true,
            });
          case "json":
          default:
            return [
              [
                key,
                options?.escaped === false
                  ? JSON.stringify(value)
                  : `'${JSON.stringify(value).replace(/\r?\n/g, "\\n")}'`,
              ],
            ];
        }
      }
      return [
        [
          key,
          options?.escaped === false
            ? value.toString()
            : `"${value
                .toString()
                //  and newlines
                .replace(/\r?\n/g, "\\n")}"`,
        ],
      ];
    })
    .filter((x) => x[1] !== undefined);
}

/**
 * Convert a dictionary to a .env file
 *  - format of the file is ${key}="${value}"
 *  - encode values into single line
 *  - escape values so that we preserve the format of the ini file
 */
export function generateDotEnvArray(
  data: PlainNestedType,
  options?: {
    format?: "json" | "__" | ".";
    prefix?: string | null;
    escaped?: boolean; // default true
  },
): string[] {
  return generateDotEnvPairs(data, options).map(([k, v]) => `${k}=${v}`);
}

/**
 * Generate dotenv file
 */
export function generateDotEnv(
  data: PlainNestedType,
  options?: {
    format?: "json" | "__" | ".";
    prefix?: string | null;
    escaped?: boolean; // default true
  },
): string {
  return generateDotEnvArray(data, options).join("\n");
}
