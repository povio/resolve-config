import { test } from "node:test";
import assert from "node:assert";
import { getCommandHelper } from "../src/commands/get.command";

const cwd = __dirname;

test("get config as json", async () => {
  const response = await getCommandHelper({
    stage: "dev",
    cwd,
    module: "deploy",
    target: "api",
    outputFormat: "json",
  });
  assert.partialDeepStrictEqual(response.output, {
    mysection: { myparameter: "myvalue" },
    customsection: { myparameter: "dev" },
  });
});

test("get config as env", async () => {
  const response = await getCommandHelper({
    stage: "dev",
    cwd,
    module: "deploy",
    target: "api",
    outputFormat: "env",
  });
  assert.strictEqual(
    response.output,
    `mysection__myparameter="myvalue"
customsection__myparameter="dev"`,
  );
});
