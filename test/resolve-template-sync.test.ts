import { test } from "node:test";
import assert from "node:assert";
import { resolveTemplateObjectSync } from "../src/lib/resolve-template-sync";

test("sync template with literal", () => {
  const resolved = resolveTemplateObjectSync("simple string");
  assert.deepStrictEqual(resolved, "simple string");
});

test("sync template with number", () => {
  const resolved = resolveTemplateObjectSync(41);
  assert.deepStrictEqual(resolved, 41);
});

test("sync template with boolean", () => {
  const resolved = resolveTemplateObjectSync(true);
  assert.deepStrictEqual(resolved, true);
});

test("sync template with boolean false", () => {
  const resolved = resolveTemplateObjectSync(false);
  assert.deepStrictEqual(resolved, false);
});

test("sync template with null", () => {
  const resolved = resolveTemplateObjectSync(null);
  assert.deepStrictEqual(resolved, null);
});

test("sync template with escaped template", () => {
  // eslint-disable-next-line
  const resolved = resolveTemplateObjectSync("\${}");
  assert.deepStrictEqual(resolved, "${}");
});

test("sync template with undefined", () => {
  const resolved = resolveTemplateObjectSync(undefined);
  assert.deepStrictEqual(resolved, undefined);
});

test("sync template with env variable", () => {
  process.env.TEST = "test";
  const resolved = resolveTemplateObjectSync("${env:TEST}");
  assert.deepStrictEqual(resolved, "test");
});

test("sync template with env variables", () => {
  process.env.TEST = "test";
  const resolved = resolveTemplateObjectSync("${env:TEST}-thing");
  assert.deepStrictEqual(resolved, "test-thing");
});

test("sync template with wrong function variables", () => {
  try {
    resolveTemplateObjectSync({ a: "${myfunc}-thing" }, {}, "path-to-object");
  } catch (e: any) {
    assert.deepStrictEqual(
      e.message,
      "Unsupported template literal 'path-to-object.a': 'myfunc'",
    );
  }
});

test("sync template with simple object", () => {
  process.env.TEST = "test";
  const resolved = resolveTemplateObjectSync({
    a: "b",
    c: "${func:stage}",
    d: "${env:TEST}",
  });

  assert.deepStrictEqual(resolved, {
    a: "b",
    c: "local",
    d: "test",
  });
});

test("sync template keep only resolved", () => {
  process.env.TEST = "test";
  const resolved = resolveTemplateObjectSync(
    {
      a: "b",
      c: "${func:stage}",
      d: "${env:TEST}",
    },
    {
      resolve: "only",
    },
  );

  assert.deepStrictEqual(resolved, {
    c: "local",
    d: "test",
  });
});

test("sync template ignore resolved", () => {
  process.env.TEST = "test";
  const resolved = resolveTemplateObjectSync(
    {
      a: "b",
      d: "${env:TEST}",
    },
    {
      resolve: "ignore",
    },
  );

  assert.deepStrictEqual(resolved, {
    a: "b",
    d: "${env:TEST}",
  });
});

test("sync template remove resolved", () => {
  process.env.TEST = "test";
  const resolved = resolveTemplateObjectSync(
    {
      a: "b",
      d: "${env:TEST}",
    },
    {
      resolve: "remove",
    },
  );

  assert.deepStrictEqual(resolved, {
    a: "b",
  });
});

test("sync template with array - only resolved", () => {
  process.env.TEST = "test";
  const resolved = resolveTemplateObjectSync(
    {
      a: ["a", "b", "c"],
      c: "${func:stage}",
      d: "${env:TEST}",
    },
    {
      resolve: "only",
    },
  );

  assert.deepStrictEqual(resolved, {
    c: "local",
    d: "test",
  });
});

test("sync template with single property", () => {
  process.env.TEST = "test";

  const tree = {
    a1: {
      b2: {
        c3: {
          d4: "e",
          f4: ["a", "b", "c"],
        },
      },
    },
    g1: "r",
    p: "${myfunc}", // should not be resolved
  };

  assert.deepStrictEqual(
    resolveTemplateObjectSync(tree, {}, "a1.dd"),
    undefined,
  );
  assert.deepStrictEqual(resolveTemplateObjectSync(tree, {}, "g1"), "r");
  assert.deepStrictEqual(
    resolveTemplateObjectSync(tree, {}, "a1.b2"),
    tree.a1.b2,
  );
  assert.deepStrictEqual(
    resolveTemplateObjectSync(tree, {}, "a1.b2.c3"),
    tree.a1.b2.c3,
  );
  assert.deepStrictEqual(
    resolveTemplateObjectSync(tree, {}, "a1.b2.c3.d4"),
    "e",
  );
  assert.deepStrictEqual(resolveTemplateObjectSync(tree, {}, "a1.b2.c3.f4"), [
    "a",
    "b",
    "c",
  ]);
});
