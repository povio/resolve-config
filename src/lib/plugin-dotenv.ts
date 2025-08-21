/**
 * Convert a dictionary to an array env value pairs
 *  - in the format [[${key},"${value}"]]
 *  - encode values into single line
 *  - escape values so that we preserve the format of the ini file
 */
export function generateDotEnvPairs(
  data: Record<string, any>,
  options?: {
    format?: "json" | "__";
    prefix?: string;
    escaped?: boolean; // default true
  },
): string[][] {
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
            return generateDotEnvPairs(value, {
              format: "__",
              prefix: `${key}__`,
              escaped: options?.escaped ?? true,
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
            ? value
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
  data: Record<string, any>,
  options?: {
    format?: "json" | "__";
    prefix?: string;
    escaped?: boolean; // default true
  },
): string[] {
  return generateDotEnvPairs(data, options).map(([k, v]) => `${k}=${v}`);
}

/**
 * Generate dotenv file
 */
export function generateDotEnv(
  data: Record<string, any>,
  options?: {
    format?: "json" | "__";
    prefix?: string;
    escaped?: boolean; // default true
  },
): string {
  return generateDotEnvArray(data, options).join("\n");
}
