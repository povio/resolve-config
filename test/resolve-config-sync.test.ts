import { test, expect } from "vitest";
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

test("resolve sync config async error", () => {
  expect(() =>
    resolveConfigSync({
      stage: "dev",
      cwd,
      module: "deploy",
      target: "aws",
    }),
  ).toThrow(/Can not resolve async/);
});
