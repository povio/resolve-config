import { test } from "node:test";
import assert from "node:assert";
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
  assert.partialDeepStrictEqual(response.output, {
    mysection: { myparameter: "myvalue" },
    customsection: { myparameter: "dev" },
  });
});

test("get config as env", async () => {
  const response = await getCommandHelper({
    ...configOptions,
    outputFormat: "env",
  });
  assert.strictEqual(
    response.output,
    `mysection__myparameter="myvalue"
customsection__myparameter="dev"`,
  );
});

test("get config with keys filter", async () => {
  const response = await getCommandHelper({
    ...configOptions,
    keys: "mysection.myparameter",
    outputFormat: "json",
  });
  assert.partialDeepStrictEqual(response.output, {
    mysection: { myparameter: "myvalue" },
  });
});

test("get config with multiple keys filter", async () => {
  const response = await getCommandHelper({
    ...configOptions,
    keys: "mysection.myparameter, customsection.myparameter",
    outputFormat: "json",
  });
  assert.partialDeepStrictEqual(response.output, {
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
  assert.strictEqual(response.output, `mysection__myparameter="myvalue"`);
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
  assert.deepStrictEqual(subtree.output, {
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
  assert.strictEqual(scalar.output, "get-test");

  const keys = await getCommandHelper({
    cwd,
    stage: "staging",
    path: stagingManifestPath,
    target: "backend",
    keys: "settings.k, service.name",
    outputFormat: "json",
  });
  assert.deepStrictEqual(keys.output, {
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

  assert.match(
    output as string,
    /api='\{"version":1,"name":"demo-service"\}'/,
  );
  assert.match(output as string, /meta='\{"env":"staging"\}'/);
});

test("get rejects keys and property together", async () => {
  await assert.rejects(
    () =>
      getCommandHelper({
        cwd,
        stage: "staging",
        path: stagingManifestPath,
        target: "frontend",
        property: "api",
        keys: "api.version",
        outputFormat: "json",
      }),
    /Cannot use both --keys and --property/,
  );
});
