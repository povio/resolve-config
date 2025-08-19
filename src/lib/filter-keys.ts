/**
 * Filter an object to only include specified keys while preserving nested paths
 *
 * @param obj - The object to filter
 * @param _keys - Array of key names to include (supports dot notation for nested keys)
 * @returns A new object containing only the specified keys with their full paths
 */
export function filterObjectByKeys(obj: any, _keys: string[] | string): any {
  const keys = Array.isArray(_keys)
    ? _keys
    : _keys.split(/,/).map((k) => k.trim());

  if (!obj || typeof obj !== "object" || Array.isArray(obj)) {
    return obj;
  }

  if (keys.length === 0) {
    return obj;
  }

  const result: any = {};

  // Process each key pattern
  for (const keyPattern of keys) {
    const keyParts = keyPattern.split(/\.|__/g).map((k) => k.trim());

    // Navigate to the parent object and get the final key
    let current = obj;
    let target = result;

    // Navigate through the nested path, creating structure as needed
    for (let i = 0; i < keyParts.length - 1; i++) {
      const part = keyParts[i];

      if (current[part] === undefined) {
        break; // Key doesn't exist in source
      }

      current = current[part];

      if (!target[part]) {
        target[part] = {};
      }
      target = target[part];
    }

    // Set the final key if it exists
    const finalKey = keyParts[keyParts.length - 1];
    if (current && current[finalKey] !== undefined) {
      target[finalKey] = current[finalKey];
    }
  }

  return result;
}
