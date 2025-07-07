import { test } from "node:test";
import { resolveConfigSync } from "../src/lib/resolve-config-sync";

const cwd = __dirname;

test("resolve sync config", () => {
  process.env.DATABASE_HOST = "localhost";
  resolveConfigSync({
    stage: "dev",
    cwd,
    module: "deploy",
    target: "api",
  });
});

test("resolve sync config async error", async () => {
  try {
    resolveConfigSync({
      stage: "dev",
      cwd,
      module: "deploy",
      target: "aws",
    });
  } catch (e: any) {
    if (!e.message.includes("Can not resolve async")) {
      throw e;
    }
  }
});
