import { test, expect } from "vitest";
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
  expect(getNumber(tree, "plainnumber")).toStrictEqual(2);
  expect(getNumber(tree, "textnumber")).toStrictEqual(2);
  expect(getBoolean(tree, "booleanfalse")).toStrictEqual(false);
  expect(getBoolean(tree, "booleantrue")).toStrictEqual(true);
  expect(getBoolean(tree, "texttrue")).toStrictEqual(true);
  expect(getBoolean(tree, "textfalse")).toStrictEqual(false);
  expect(getPlain(tree, "mysection")).toStrictEqual({ myparameter: "myvalue" });
  expect(getString(tree, "mysection.myparameter")).toStrictEqual("myvalue");
  expect(getString(tree, "customsection.myparameter")).toStrictEqual(`dev with ' " quotes`);
});
