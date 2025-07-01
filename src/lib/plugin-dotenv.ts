
export function generateDotEnv(data: Record<string, any>): string {
    // convert a dictionary to a .env file
    //  - format of the file is ${key}="${value}"
    //  - encode values into single line
    //  - escape values so that we preserve the format of the ini file
    return Object.entries(data)
        .map(([key, value]) => {
            if (value === undefined || value === null) {
                // undefined values are not allowed in .env files
                return;
            }
            if (typeof value === "object") {
                // todo, 
                return `${key}="${JSON.stringify(value)
                    .replace(/"/g, '\\"')
                    .replace(/\r?\n/g, "\\n")}"`;
            }
            return `${key}="${value
                .toString()
                // escape quotes
                .replace(/"/g, '\\"')
                //  and newlines
                .replace(/\r?\n/g, "\\n")}"`;
        })
        .filter((x) => x)
        .join("\n");
}
