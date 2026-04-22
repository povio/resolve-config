import { test, expect } from "vitest";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";
import { resolveConfig } from "../src/lib/resolve-config";
import { resolveConfigSync } from "../src/lib/resolve-config-sync";
import { applyCommandHelper } from "../src/commands/apply.command";

const cwd = __dirname;

const stagingManifestPath = ".config/staging.app";
const stagingOutDir = join(cwd, "out");

function cleanupStagingOutDir() {
  if (existsSync(stagingOutDir)) {
    rmSync(stagingOutDir, { recursive: true, force: true });
  }
}

test("resolve config", async () => {
  process.env.DATABASE_HOST = "localhost";
  const resolved = await resolveConfig({
    stage: "dev",
    cwd,
    module: "deploy",
    target: "api",
  });

  expect(resolved).toStrictEqual({
    customsection: {
      myparameter: "dev",
    },
    database: {
      host: "localhost",
    },
    mysection: {
      myparameter: "myvalue",
    },
  });
});

const isSSMRunning = fetch("http://localhost:4566")
  .then((res) => res.status === 200)
  .catch(() => false);

test("resolve config with ssm and secret", async (context) => {
  if (!(await isSSMRunning)) {
    context.skip();
    return;
  }

  await resolveConfig({
    stage: "dev",
    cwd,
    module: "deploy",
    target: "aws",
  });
});

test("resolve all targets from manifest without apply", async () => {
  process.env.USECASE_SERVICE_NAME = "payments-api";
  process.env.USECASE_JSON_BLOB = JSON.stringify({ ttl: 30, retries: 3 });

  const all = await resolveConfig({
    cwd,
    stage: "staging",
    path: stagingManifestPath,
    apply: false,
  });

  expect(all.frontend).toStrictEqual({
    api: { version: 1, name: "demo-service" },
    meta: { env: "staging" },
  });

  expect(all.backend).toStrictEqual({
    service: { name: "payments-api" },
    settings: { ttl: 30, retries: 3 },
  });

  expect(all.with_optional_template).toStrictEqual({
    marker: "present",
  });
});

test("resolve single named target from manifest", async () => {
  process.env.USECASE_SERVICE_NAME = "single";
  process.env.USECASE_JSON_BLOB = "{}";

  const backend = await resolveConfig({
    cwd,
    stage: "staging",
    path: stagingManifestPath,
    target: "backend",
    apply: false,
  });

  expect(backend).toStrictEqual({
    service: { name: "single" },
    settings: {},
  });
});

test("resolveConfigSync matches resolveConfig without AWS ARNs", async () => {
  process.env.USECASE_SERVICE_NAME = "sync-parity";
  process.env.USECASE_JSON_BLOB = JSON.stringify({ a: 1 });

  const syncResult = resolveConfigSync({
    cwd,
    stage: "staging",
    path: stagingManifestPath,
    target: "backend",
    apply: false,
  });

  const asyncResult = await resolveConfig({
    cwd,
    stage: "staging",
    path: stagingManifestPath,
    target: "backend",
    apply: false,
  });

  expect(syncResult).toStrictEqual(asyncResult);
});

test("missing template with ignoreEmpty still merges other values", async () => {
  const resolved = await resolveConfig({
    cwd,
    stage: "staging",
    path: stagingManifestPath,
    target: "with_optional_template",
    apply: false,
  });

  expect(resolved).toStrictEqual({ marker: "present" });
  expect("from_missing" in (resolved as object)).toBe(false);
});

test("apply writes JSON and YAML under destination paths", async () => {
  cleanupStagingOutDir();
  try {
    process.env.USECASE_SERVICE_NAME = "apply-test";
    process.env.USECASE_JSON_BLOB = JSON.stringify({ region: "eu-west-1" });

    await applyCommandHelper({
      cwd,
      stage: "staging",
      path: stagingManifestPath,
      target: "frontend",
    });

    const jsonPath = join(stagingOutDir, "frontend.json");
    expect(existsSync(jsonPath), "frontend.json should exist").toBe(true);
    expect(JSON.parse(readFileSync(jsonPath, "utf8"))).toStrictEqual({
      api: { version: 1, name: "demo-service" },
      meta: { env: "staging" },
    });

    await applyCommandHelper({
      cwd,
      stage: "staging",
      path: stagingManifestPath,
      target: "backend",
    });

    const ymlPath = join(stagingOutDir, "backend.yml");
    expect(existsSync(ymlPath), "backend.yml should exist").toBe(true);
    const backendTree = parseYaml(readFileSync(ymlPath, "utf8"));
    expect(backendTree).toStrictEqual({
      service: { name: "apply-test" },
      settings: { region: "eu-west-1" },
    });
  } finally {
    cleanupStagingOutDir();
  }
});

test("apply without target writes every target that has a destination", async () => {
  cleanupStagingOutDir();
  try {
    process.env.USECASE_SERVICE_NAME = "all-targets";
    process.env.USECASE_JSON_BLOB = JSON.stringify({ x: 1 });

    await applyCommandHelper({
      cwd,
      stage: "staging",
      path: stagingManifestPath,
    });

    expect(existsSync(join(stagingOutDir, "frontend.json"))).toBe(true);
    expect(existsSync(join(stagingOutDir, "backend.yml"))).toBe(true);
    expect(JSON.parse(readFileSync(join(stagingOutDir, "frontend.json"), "utf8")).meta).toStrictEqual({
      env: "staging",
    });
  } finally {
    cleanupStagingOutDir();
  }
});
