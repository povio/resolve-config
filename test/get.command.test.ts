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
