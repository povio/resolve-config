export function generateDotEnv(
  data: Record<string, any>,
  options?: {
    format?: "json" | "__";
    prefix?: string;
  },
): string {
  return generateDotEnvArray(data, options).join("\n");
}

/**
 * Convert a dictionary to a .env file
 *  - format of the file is ${key}="${value}"
 *  - encode values into single line
 *  - escape values so that we preserve the format of the ini file
 * @param data
 * @param options
 */
export function generateDotEnvArray(
  data: Record<string, any>,
  options?: {
    format?: "json" | "__";
    prefix?: string;
  },
): string[] {
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
            return generateDotEnvArray(value, {
              format: "__",
              prefix: `${key}__`,
            });
          case "json":
          default:
            return [
              `${key}='${JSON.stringify(value)
                .replace(/'/g, "'")
                .replace(/\r?\n/g, "\\n")}'`,
            ];
        }
      }
      return [
        `${key}="${value
          .toString()
          // escape quotes
          .replace(/"/g, '"')
          //  and newlines
          .replace(/\r?\n/g, "\\n")}"`,
      ];
    })
    .filter((x) => x !== undefined);
}
