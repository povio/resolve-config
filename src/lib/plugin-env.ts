/**
 * Parse .env file content into a data structure
 * @param content - The .env file content as a string
 * @returns Object with key-value pairs from the .env file
 */
export function parseEnv(content: string): Record<string, string> {
  const result: Record<string, string> = {};

  // Split content into lines and process each line
  const lines = content.split("\n");

  for (const line of lines) {
    // Skip empty lines and comments
    const trimmedLine = line.trim();
    if (!trimmedLine || trimmedLine.startsWith("#")) {
      continue;
    }

    // Find the first equals sign
    const equalsIndex = trimmedLine.indexOf("=");
    if (equalsIndex === -1) {
      continue; // Skip lines without equals sign
    }

    // Extract key and value
    const key = trimmedLine.substring(0, equalsIndex).trim();
    let value = trimmedLine.substring(equalsIndex + 1).trim();

    // Remove surrounding quotes if present
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    // Skip if key is empty
    if (key) {
      result[key] = value;
    }
  }

  return result;
}
