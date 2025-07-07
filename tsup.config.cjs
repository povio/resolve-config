import fs from "fs";

const version = JSON.parse(fs.readFileSync('package.json', "utf-8")).version;

import {defineConfig} from 'tsup'

export default defineConfig(() => {
    return [
        {
            entry: ['src/index.ts'],
            splitting: false,
            sourcemap: false,
            clean: true,
            keepNames: true,
            platform: 'node',
            format: ['cjs'],
            bundle: true,
            target: 'node22',
            treeshake: true,
            dts: true,
            minify: false,
        },
        {
            entry: ['src/sh.ts'],
            splitting: false,
            sourcemap: false,
            clean: true,
            keepNames: true,
            platform: 'node',
            format: 'cjs',
            bundle: true,
            target: 'node22',
            treeshake: true,
            minify: true,
            define: {
                "process.env.RESOLVE_CONFIG_VERSION": `"${version}"`,
            }
        }
    ]
})
