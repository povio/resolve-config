import { test, expect } from "vitest";
import { generateDotEnvArray, generateDotEnvPairs } from "../src/lib/plugin-dotenv";
import { parseEnv } from "../src";

const tree = {
  mysection: { myparameter: "myvalue" },
  customsection: { myparameter: `dev with ' " quotes` },
  simplevalue: 2,
  booleanfalse: false,
  booleantrue: true,
};

test("underscores", () => {
  const env = generateDotEnvArray(tree, {
    format: "__",
  });
  expect(env).toStrictEqual([
    'mysection__myparameter="myvalue"',
    `customsection__myparameter="dev with ' " quotes"`,
    'simplevalue="2"',
    'booleanfalse="false"',
    'booleantrue="true"',
  ]);
  const config = parseEnv(env.join("\n"));
  expect(config).toStrictEqual({
    booleanfalse: "false",
    booleantrue: "true",
    customsection__myparameter: `dev with ' " quotes`,
    mysection__myparameter: "myvalue",
    simplevalue: "2",
  });
});

test("json", () => {
  const env = generateDotEnvArray(tree, {
    format: "json",
  });
  expect(env).toStrictEqual([
    `mysection='{"myparameter":"myvalue"}'`,
    `customsection='{"myparameter":"dev with ' \\" quotes"}'`,
    'simplevalue="2"',
    'booleanfalse="false"',
    'booleantrue="true"',
  ]);
});

test("json and back", () => {
  const env = generateDotEnvArray(tree, {
    format: "json",
  });

  const config = parseEnv(env.join("\n"));

  config.customsection = JSON.parse(config.customsection);
  config.mysection = JSON.parse(config.mysection);

  expect(config).toStrictEqual({
    mysection: { myparameter: "myvalue" },
    customsection: { myparameter: `dev with ' " quotes` },
    simplevalue: "2",
    booleanfalse: "false",
    booleantrue: "true",
  });
});

test("generateDotEnvArray unquoted", () => {
  const env = generateDotEnvArray(tree, {
    format: "__",
    escaped: false,
  });

  expect(env).toStrictEqual([
    "mysection__myparameter=myvalue",
    `customsection__myparameter=dev with ' " quotes`,
    "simplevalue=2",
    "booleanfalse=false",
    "booleantrue=true",
  ]);
});

test("generateDotEnvPairs unquoted", () => {
  const env = generateDotEnvPairs(tree, {
    format: "__",
    escaped: false,
  });

  expect(env).toStrictEqual([
    ["mysection__myparameter", "myvalue"],
    ["customsection__myparameter", `dev with ' " quotes`],
    ["simplevalue", "2"],
    ["booleanfalse", "false"],
    ["booleantrue", "true"],
  ]);
});
