import { test, expect } from "vitest";
import { resolveTemplateObjectSync } from "../src/lib/resolve-template-sync";

test("sync template with literal", () => {
  const resolved = resolveTemplateObjectSync("simple string");
  expect(resolved).toStrictEqual("simple string");
});

test("sync template with number", () => {
  const resolved = resolveTemplateObjectSync(41);
  expect(resolved).toStrictEqual(41);
});

test("sync template with boolean", () => {
  const resolved = resolveTemplateObjectSync(true);
  expect(resolved).toStrictEqual(true);
});

test("sync template with boolean false", () => {
  const resolved = resolveTemplateObjectSync(false);
  expect(resolved).toStrictEqual(false);
});

test("sync template with null", () => {
  const resolved = resolveTemplateObjectSync(null);
  expect(resolved).toStrictEqual(null);
});

test("sync template with escaped template", () => {
  const resolved = resolveTemplateObjectSync("${}");
  expect(resolved).toStrictEqual("${}");
});

test("sync template with undefined", () => {
  const resolved = resolveTemplateObjectSync(undefined);
  expect(resolved).toStrictEqual(undefined);
});

test("sync template with context literal", () => {
  const resolved = resolveTemplateObjectSync("${context:foo}", { foo: "bar" });
  expect(resolved).toStrictEqual("bar");
});

test("sync template with nested context literal", () => {
  const resolved = resolveTemplateObjectSync("${context:a.b}", { a: { b: 2 } });
  expect(resolved).toStrictEqual(2);
});

test("sync template with env variable", () => {
  process.env.TEST = "test";
  const resolved = resolveTemplateObjectSync("${env:TEST}");
  expect(resolved).toStrictEqual("test");
});

test("sync template env falls back to context when unset", () => {
  const prev = process.env.RESOLVE_CONFIG_ENV_FALLBACK_TEST;
  delete process.env.RESOLVE_CONFIG_ENV_FALLBACK_TEST;
  try {
    const resolved = resolveTemplateObjectSync("${env:RESOLVE_CONFIG_ENV_FALLBACK_TEST}", {
      RESOLVE_CONFIG_ENV_FALLBACK_TEST: "from-context",
    });
    expect(resolved).toStrictEqual("from-context");
  } finally {
    if (prev !== undefined) {
      process.env.RESOLVE_CONFIG_ENV_FALLBACK_TEST = prev;
    }
  }
});

test("sync template env prefers process.env over context", () => {
  process.env.RESOLVE_CONFIG_ENV_FALLBACK_TEST2 = "from-env";
  try {
    const resolved = resolveTemplateObjectSync("${env:RESOLVE_CONFIG_ENV_FALLBACK_TEST2}", {
      RESOLVE_CONFIG_ENV_FALLBACK_TEST2: "from-context",
    });
    expect(resolved).toStrictEqual("from-env");
  } finally {
    delete process.env.RESOLVE_CONFIG_ENV_FALLBACK_TEST2;
  }
});

test("sync template env falls back to nested context path", () => {
  const key = "a.b";
  const prev = process.env[key];
  delete process.env[key];
  try {
    const resolved = resolveTemplateObjectSync("${env:a.b}", { a: { b: "nested" } });
    expect(resolved).toStrictEqual("nested");
  } finally {
    if (prev !== undefined) {
      process.env[key] = prev;
    }
  }
});

test("sync template with env variables", () => {
  process.env.TEST = "test";
  const resolved = resolveTemplateObjectSync("${env:TEST}-thing");
  expect(resolved).toStrictEqual("test-thing");
});

test("sync template with wrong function variables", () => {
  expect(() => resolveTemplateObjectSync({ a: "${myfunc}-thing" }, {}, null, "path-to-object")).toThrow(
    "Unsupported template literal 'path-to-object.a': 'myfunc'",
  );
});

test("sync template with simple object", () => {
  process.env.TEST = "test";
  const resolved = resolveTemplateObjectSync(
    {
      a: "b",
      c: "${func:stage}",
      d: "${env:TEST}",
    },
    {
      stage: "local",
    },
  );

  expect(resolved).toStrictEqual({
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
      stage: "local",
      resolve: "only",
    },
  );

  expect(resolved).toStrictEqual({
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

  expect(resolved).toStrictEqual({
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

  expect(resolved).toStrictEqual({
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
      stage: "local",
      resolve: "only",
    },
  );

  expect(resolved).toStrictEqual({
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
    p: "${myfunc}",
  };

  expect(resolveTemplateObjectSync(tree, {}, "a1.dd")).toStrictEqual(undefined);
  expect(resolveTemplateObjectSync(tree, {}, "g1")).toStrictEqual("r");
  expect(resolveTemplateObjectSync(tree, {}, "a1.b2")).toStrictEqual(tree.a1.b2);
  expect(resolveTemplateObjectSync(tree, {}, "a1.b2.c3")).toStrictEqual(tree.a1.b2.c3);
  expect(resolveTemplateObjectSync(tree, {}, "a1.b2.c3.d4")).toStrictEqual("e");
  expect(resolveTemplateObjectSync(tree, {}, "a1.b2.c3.f4")).toStrictEqual(["a", "b", "c"]);
});
