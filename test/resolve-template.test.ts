import { test } from "node:test";
import assert from "node:assert";
import { resolveTemplateObject } from "../src/lib/resolve-template";

test("template with literal", async () => {
  const resolved = await resolveTemplateObject("simple string");
  assert.deepStrictEqual(resolved, "simple string");
});

test("template with number", async () => {
  const resolved = await resolveTemplateObject(41);
  assert.deepStrictEqual(resolved, 41);
});

test("template with boolean", async () => {
  const resolved = await resolveTemplateObject(true);
  assert.deepStrictEqual(resolved, true);
});

test("template with boolean false", async () => {
  const resolved = await resolveTemplateObject(false);
  assert.deepStrictEqual(resolved, false);
});

test("template with null", async () => {
  const resolved = await resolveTemplateObject(null);
  assert.deepStrictEqual(resolved, null);
});

test("template with escaped template", async () => {
  // eslint-disable-next-line
  const resolved = await resolveTemplateObject("\${}");
  assert.deepStrictEqual(resolved, "${}");
});

test("template with undefined", async () => {
  const resolved = await resolveTemplateObject(undefined);
  assert.deepStrictEqual(resolved, undefined);
});

test("template with env variable", async () => {
  process.env.TEST = "test";
  const resolved = await resolveTemplateObject("${env:TEST}");
  assert.deepStrictEqual(resolved, "test");
});

test("template with env variables", async () => {
  process.env.TEST = "test";
  const resolved = await resolveTemplateObject("${env:TEST}-thing");
  assert.deepStrictEqual(resolved, "test-thing");
});

test("template with wrong function variables", async () => {
  await resolveTemplateObject(
    { a: "${myfunc}-thing" },
    {},
    "path-to-object",
  ).catch((e) => {
    assert.deepStrictEqual(
      e.message,
      "Unsupported template literal 'path-to-object.a': 'myfunc'",
    );
  });
});

test("template with simple object", async () => {
  process.env.TEST = "test";
  const resolved = await resolveTemplateObject({
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

test("template keep only resolved", async () => {
  process.env.TEST = "test";
  const resolved = await resolveTemplateObject(
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

  assert.deepStrictEqual(resolved, {
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

  assert.deepStrictEqual(resolved, {
    a: "b",
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
    p: "${myfunc}", // should not be resolved
  };

  assert.deepStrictEqual(
    await resolveTemplateObject(tree, {}, "a1.dd"),
    undefined,
  );
  assert.deepStrictEqual(await resolveTemplateObject(tree, {}, "g1"), "r");
  assert.deepStrictEqual(
    await resolveTemplateObject(tree, {}, "a1.b2"),
    tree.a1.b2,
  );
  assert.deepStrictEqual(
    await resolveTemplateObject(tree, {}, "a1.b2.c3"),
    tree.a1.b2.c3,
  );
  assert.deepStrictEqual(
    await resolveTemplateObject(tree, {}, "a1.b2.c3.d4"),
    "e",
  );
  assert.deepStrictEqual(await resolveTemplateObject(tree, {}, "a1.b2.c3.f4"), [
    "a",
    "b",
    "c",
  ]);
});

const isSSMRunning = fetch("http://localhost:4566")
  .then((res) => res.status === 200)
  .catch(() => false);

test("template with aws ssm", async (t) => {
  // test if ssm is running locally, if not, skip the test
  if (!(await isSSMRunning)) {
    t.skip("SSM is not running locally");
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

  assert.deepStrictEqual(resolved, {
    a: '{"feature1": true, "feature2": false}',
  });
});
