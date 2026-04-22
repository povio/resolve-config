import { test, expect } from "vitest";
import { templateCommandHandler } from "../src/commands/template.command";

const cwd = __dirname;

test("resolve single template file", async () => {
  const response = await templateCommandHandler({
    stage: "dev",
    cwd,
    module: "api",
    outputFormat: "json",
  });
  expect(JSON.parse(response.output)).toMatchObject({
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
  expect(response.output).toMatchObject(`mysection:\n  myparameter: myvalue\ncustomsection:\n  myparameter: dev\n`);
});

test("resolve single template file as env-json", async () => {
  const response = await templateCommandHandler({
    stage: "dev",
    cwd,
    module: "api",
    outputFormat: "env-json",
  });
  expect(response.output).toMatchObject(`mysection='{"myparameter":"myvalue"}'\ncustomsection='{"myparameter":"dev"}'`);
});

test("resolve single template file as env", async () => {
  const response = await templateCommandHandler({
    stage: "dev",
    cwd,
    module: "api",
    outputFormat: "env",
  });
  expect(response.output).toMatchObject(`mysection__myparameter="myvalue"\ncustomsection__myparameter="dev"`);
});

test("resolve single subtree in template file", async () => {
  const response = await templateCommandHandler({
    stage: "dev",
    cwd,
    module: "api",
    property: "mysection",
  });
  expect(JSON.parse(response.output)).toStrictEqual({
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
  expect(response.output).toStrictEqual("myvalue");
});

test("resolve single template file by path", async () => {
  const response = await templateCommandHandler({
    cwd,
    module: "api",
    path: ".config/dev.api.template.yml",
    property: "customsection.myparameter",
    resolve: "only",
  });
  expect(response.output).toStrictEqual("local");
});
