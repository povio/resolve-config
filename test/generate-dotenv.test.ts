import {test, describe} from "node:test";
import assert from "node:assert";
import {generateDotEnvArray} from "../src/lib/plugin-dotenv";
import {parseEnv} from "../src";


const tree = {
  mysection: {myparameter: 'myvalue'},
  customsection: {myparameter: `dev with ' " quotes`},
  simplevalue: 2,
  booleanfalse: false,
  booleantrue: true
}

test("underscores", () => {
  const env = generateDotEnvArray(tree, {
    format: "__",
  });
  assert.deepStrictEqual(env, [
    'mysection__myparameter="myvalue"',
    `customsection__myparameter="dev with ' " quotes"`,
    'simplevalue="2"',
    'booleanfalse="false"',
    'booleantrue="true"'
  ]);
  const config = parseEnv(env.join('\n'));
  assert.deepStrictEqual(config, {
    booleanfalse: 'false',
    booleantrue: 'true',
    customsection__myparameter: `dev with ' " quotes`,
    mysection__myparameter: 'myvalue',
    simplevalue: '2'
  });
});

test("json", () => {
  const env = generateDotEnvArray(tree, {
    format: "json",
  });
  assert.deepStrictEqual(env, [
    `mysection='{"myparameter":"myvalue"}'`,
    `customsection='{"myparameter":"dev with ' \\" quotes"}'`,
    'simplevalue="2"',
    'booleanfalse="false"',
    'booleantrue="true"'
  ]);
});


test("json and back", () => {
  const env = generateDotEnvArray(tree, {
    format: "json",
  });

  const config = parseEnv(env.join('\n'));

  config.customsection = JSON.parse(config.customsection);
  config.mysection = JSON.parse(config.mysection);

  assert.deepStrictEqual(config, {
    mysection: {myparameter: 'myvalue'},
    customsection: {myparameter: `dev with ' " quotes`},
    simplevalue: "2",
    booleanfalse: "false",
    booleantrue: "true"
  })
});


