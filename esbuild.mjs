import { build } from "esbuild";
import fs from "fs";

const version = JSON.parse(fs.readFileSync('package.json', "utf-8")).version;

await build({
  entryPoints: ["./src/sh.ts"],
  bundle: true,
  sourcemap: false,
  platform: "node",
  minify: true,
  metafile: false,
  format: "cjs",
  keepNames: true,
  target: "node22",
  logLevel: "info",
  outfile: "./dist/sh.js",
  define: {
    "process.env.RESOLVE_CONFIG_VERSION": `"${version}"`,
  }
});
