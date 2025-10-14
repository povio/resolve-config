import { test } from "node:test";
import assert from "node:assert";
import { getBoolean, getNumber, getString, getPlain } from "../src";

const tree = {
  mysection: { myparameter: "myvalue" },
  customsection: { myparameter: `dev with ' " quotes` },
  plainnumber: 2,
  textnumber: 2,
  booleanfalse: false,
  booleantrue: true,
  texttrue: "true",
  textfalse: "false",
};

test("get", () => {
  assert.deepStrictEqual(getNumber(tree, "plainnumber"), 2);
  assert.deepStrictEqual(getNumber(tree, "textnumber"), 2);
  assert.deepStrictEqual(getBoolean(tree, "booleanfalse"), false);
  assert.deepStrictEqual(getBoolean(tree, "booleantrue"), true);
  assert.deepStrictEqual(getBoolean(tree, "texttrue"), true);
  assert.deepStrictEqual(getBoolean(tree, "textfalse"), false);
  assert.deepStrictEqual(getPlain(tree, "mysection"), {
    myparameter: "myvalue",
  });
  assert.deepStrictEqual(getString(tree, "mysection.myparameter"), "myvalue");
  assert.deepStrictEqual(
    getString(tree, "customsection.myparameter"),
    `dev with ' " quotes`,
  );
});
