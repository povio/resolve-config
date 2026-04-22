import { test, expect } from "vitest";
import { getCommandHelper } from "../src/commands/get.command";

const cwd = __dirname;

const configOptions = {
  stage: "dev",
  cwd,
  module: "deploy",
  target: "api",
};

const stagingManifestPath = ".config/staging.app";

test("get config as json", async () => {
  const response = await getCommandHelper({
    ...configOptions,
    outputFormat: "json",
  });
  expect(response.output).toMatchObject({
    mysection: { myparameter: "myvalue" },
    customsection: { myparameter: "dev" },
  });
});

test("get config as env", async () => {
  const response = await getCommandHelper({
    ...configOptions,
    outputFormat: "env",
  });
  expect(response.output).toBe(`mysection__myparameter="myvalue"\ncustomsection__myparameter="dev"`);
});

test("get config with keys filter", async () => {
  const response = await getCommandHelper({
    ...configOptions,
    keys: "mysection.myparameter",
    outputFormat: "json",
  });
  expect(response.output).toMatchObject({
    mysection: { myparameter: "myvalue" },
  });
});

test("get config with multiple keys filter", async () => {
  const response = await getCommandHelper({
    ...configOptions,
    keys: "mysection.myparameter, customsection.myparameter",
    outputFormat: "json",
  });
  expect(response.output).toMatchObject({
    mysection: { myparameter: "myvalue" },
    customsection: { myparameter: "dev" },
  });
});

test("get config with keys filter as env", async () => {
  const response = await getCommandHelper({
    ...configOptions,
    keys: "mysection__myparameter",
    outputFormat: "env",
  });
  expect(response.output).toBe(`mysection__myparameter="myvalue"`);
});

test("get subtree, scalar property, and key filter from manifest path", async () => {
  process.env.USECASE_SERVICE_NAME = "get-test";
  process.env.USECASE_JSON_BLOB = JSON.stringify({ k: "v" });

  const subtree = await getCommandHelper({
    cwd,
    stage: "staging",
    path: stagingManifestPath,
    target: "frontend",
    property: "api",
    outputFormat: "json",
  });
  expect(subtree.output).toStrictEqual({
    version: 1,
    name: "demo-service",
  });

  const scalar = await getCommandHelper({
    cwd,
    stage: "staging",
    path: stagingManifestPath,
    target: "backend",
    property: "service.name",
    outputFormat: "json",
  });
  expect(scalar.output).toBe("get-test");

  const keys = await getCommandHelper({
    cwd,
    stage: "staging",
    path: stagingManifestPath,
    target: "backend",
    keys: "settings.k, service.name",
    outputFormat: "json",
  });
  expect(keys.output).toStrictEqual({
    settings: { k: "v" },
    service: { name: "get-test" },
  });
});

test("get env-json output for nested tree", async () => {
  process.env.USECASE_SERVICE_NAME = "envjson";
  process.env.USECASE_JSON_BLOB = "{}";

  const { output } = await getCommandHelper({
    cwd,
    stage: "staging",
    path: stagingManifestPath,
    target: "frontend",
    outputFormat: "env-json",
  });

  expect(output as string).toMatch(/api='\{"version":1,"name":"demo-service"\}'/);
  expect(output as string).toMatch(/meta='\{"env":"staging"\}'/);
});

test("get rejects keys and property together", async () => {
  await expect(() =>
    getCommandHelper({
      cwd,
      stage: "staging",
      path: stagingManifestPath,
      target: "frontend",
      property: "api",
      keys: "api.version",
      outputFormat: "json",
    }),
  ).rejects.toThrow(/Cannot use both --keys and --property/);
});
