import { test, expect } from "vitest";
import { resolveTemplateObject } from "../src/lib/resolve-template";

test("template with literal", async () => {
  const resolved = await resolveTemplateObject("simple string");
  expect(resolved).toStrictEqual("simple string");
});

test("template with number", async () => {
  const resolved = await resolveTemplateObject(41);
  expect(resolved).toStrictEqual(41);
});

test("template with boolean", async () => {
  const resolved = await resolveTemplateObject(true);
  expect(resolved).toStrictEqual(true);
});

test("template with boolean false", async () => {
  const resolved = await resolveTemplateObject(false);
  expect(resolved).toStrictEqual(false);
});

test("template with null", async () => {
  const resolved = await resolveTemplateObject(null);
  expect(resolved).toStrictEqual(null);
});

test("template with escaped template", async () => {
  const resolved = await resolveTemplateObject("${}");
  expect(resolved).toStrictEqual("${}");
});

test("template with undefined", async () => {
  const resolved = await resolveTemplateObject(undefined);
  expect(resolved).toStrictEqual(undefined);
});

test("template with env variable", async () => {
  process.env.TEST = "test";
  const resolved = await resolveTemplateObject("${env:TEST}");
  expect(resolved).toStrictEqual("test");
});

test("template env falls back to context when unset", async () => {
  const prev = process.env.RESOLVE_CONFIG_ENV_FALLBACK_TEST_ASYNC;
  delete process.env.RESOLVE_CONFIG_ENV_FALLBACK_TEST_ASYNC;
  try {
    const resolved = await resolveTemplateObject("${env:RESOLVE_CONFIG_ENV_FALLBACK_TEST_ASYNC}", {
      RESOLVE_CONFIG_ENV_FALLBACK_TEST_ASYNC: "from-context",
    });
    expect(resolved).toStrictEqual("from-context");
  } finally {
    if (prev !== undefined) {
      process.env.RESOLVE_CONFIG_ENV_FALLBACK_TEST_ASYNC = prev;
    }
  }
});

test("template with env variables", async () => {
  process.env.TEST = "test";
  const resolved = await resolveTemplateObject("${env:TEST}-thing");
  expect(resolved).toStrictEqual("test-thing");
});

test("template with wrong function variables", async () => {
  await expect(resolveTemplateObject({ a: "${myfunc}-thing" }, {}, null, "path-to-object")).rejects.toThrow(
    "Unsupported template literal 'path-to-object.a': 'myfunc'",
  );
});

test("template with simple object", async () => {
  process.env.TEST = "test";
  const resolved = await resolveTemplateObject(
    {
      a: "b",
      c: "${func:stage}",
      d: "${env:TEST}",
    },
    { stage: "local" },
  );

  expect(resolved).toStrictEqual({
    a: "b",
    c: "local",
    d: "test",
  });
});

test("template null missing value", async () => {
  process.env.TEST = "test";
  const resolved = await resolveTemplateObject(
    {
      a: "b",
      c: "${func:stage}",
      d: "${env:NO_VALUE}",
    },
    { stage: "local" },
  );

  expect(resolved).toStrictEqual({
    a: "b",
    c: "local",
  });
});

test("template keep only resolved", async () => {
  process.env.TEST = "test";
  const resolved = await resolveTemplateObject(
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

test("template ignore resolved", async () => {
  process.env.TEST = "test";
  const resolved = await resolveTemplateObject(
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

test("template remove resolved", async () => {
  process.env.TEST = "test";
  const resolved = await resolveTemplateObject(
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

test("template with array - only resolved", async () => {
  process.env.TEST = "test";
  const resolved = await resolveTemplateObject(
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

test("template with single property", async () => {
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

  expect(await resolveTemplateObject(tree, {}, "a1.dd")).toStrictEqual(undefined);
  expect(await resolveTemplateObject(tree, {}, "g1")).toStrictEqual("r");
  expect(await resolveTemplateObject(tree, {}, "a1.b2")).toStrictEqual(tree.a1.b2);
  expect(await resolveTemplateObject(tree, {}, "a1.b2.c3")).toStrictEqual(tree.a1.b2.c3);
  expect(await resolveTemplateObject(tree, {}, "a1.b2.c3.d4")).toStrictEqual("e");
  expect(await resolveTemplateObject(tree, {}, "a1.b2.c3.f4")).toStrictEqual(["a", "b", "c"]);
});

const isSSMRunning = fetch("http://localhost:4566")
  .then((res) => res.status === 200)
  .catch(() => false);

test("template with aws ssm", async (context) => {
  if (!(await isSSMRunning)) {
    context.skip();
    return;
  }

  const resolved = await resolveTemplateObject(
    {
      a: "${arn:aws:ssm:::parameter/myapp/feature/flags}",
    },
    {
      aws: {
        accountId: "1234567890",
        region: "us-east-1",
        endpoint: "http://localhost:4566",
        credentials: {
          accessKeyId: "test",
          secretAccessKey: "test",
          sessionToken: "test",
        },
      },
    },
  );

  expect(resolved).toStrictEqual({
    a: '{"feature1": true, "feature2": false}',
  });
});
