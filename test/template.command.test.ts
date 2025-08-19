import { test } from "node:test";
import assert from "node:assert";
import { templateCommandHandler } from "../src/commands/template.command";

const cwd = __dirname;

test("resolve single template file", async () => {
  const response = await templateCommandHandler({
    stage: "dev",
    cwd,
    module: "api",
    outputFormat: "json",
  });
  assert.partialDeepStrictEqual(JSON.parse(response.output), {
    mysection: {
      myparameter: "myvalue",
    },
  });
});

test("resolve single template file as yml", async () => {
  const response = await templateCommandHandler({
    stage: "dev",
    cwd,
    module: "api",
    outputFormat: "yml",
  });
  assert.partialDeepStrictEqual(
    response.output,
    `mysection:
  myparameter: myvalue
customsection:
  myparameter: dev
`,
  );
});

test("resolve single template file as yml", async () => {
  const response = await templateCommandHandler({
    stage: "dev",
    cwd,
    module: "api",
    outputFormat: "env-json",
  });
  assert.partialDeepStrictEqual(
    response.output,
    `mysection='{"myparameter":"myvalue"}'
customsection='{"myparameter":"dev"}'`,
  );
});

test("resolve single template file as yml", async () => {
  const response = await templateCommandHandler({
    stage: "dev",
    cwd,
    module: "api",
    outputFormat: "env",
  });
  assert.partialDeepStrictEqual(
    response.output,
    `mysection__myparameter="myvalue"
customsection__myparameter="dev"`,
  );
});

test("resolve single subtree in template file", async () => {
  const response = await templateCommandHandler({
    stage: "dev",
    cwd,
    module: "api",
    property: "mysection",
  });
  assert.deepStrictEqual(JSON.parse(response.output), {
    myparameter: "myvalue",
  });
});

test("resolve single property in template file", async () => {
  const response = await templateCommandHandler({
    stage: "dev",
    cwd,
    module: "api",
    property: "mysection.myparameter",
  });
  assert.deepStrictEqual(response.output, "myvalue");
});

test("resolve single template file by path", async () => {
  const response = await templateCommandHandler({
    cwd,
    module: "api",
    path: ".config/dev.api.template.yml",
    property: "customsection.myparameter",
    resolve: "only",
  });
  assert.deepStrictEqual(response.output, "local");
});
