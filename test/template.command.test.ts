import { test } from "node:test";
import assert from "node:assert";
import { templateCommandHandler } from "../src/commands/template.command";

const cwd = __dirname;

test("resolve single template file", async () => {
  const response = await templateCommandHandler(
    `--stage dev --cwd ${cwd} --module api --outputFormat json`.split(" "),
  );
  assert.partialDeepStrictEqual(JSON.parse(response.output), {
    mysection: {
      myparameter: "myvalue",
    },
  });
});

test("resolve single subtree in template file", async () => {
  const response = await templateCommandHandler(
    `--stage dev --cwd ${cwd} --module api --property mysection`.split(" "),
  );
  assert.deepStrictEqual(JSON.parse(response.output), {
    myparameter: "myvalue",
  });
});

test("resolve single property in template file", async () => {
  const response = await templateCommandHandler(
    `--stage dev --cwd ${cwd} --module api --property mysection.myparameter`.split(
      " ",
    ),
  );
  assert.deepStrictEqual(response.output, "myvalue");
});

test("resolve single template file by path", async () => {
  const response = await templateCommandHandler(
    `--cwd ${cwd} --path .config/dev.api.template.yml --property customsection.myparameter --resolve only`.split(
      " ",
    ),
  );
  assert.deepStrictEqual(response.output, "local");
});
