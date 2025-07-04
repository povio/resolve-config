import { test } from "node:test";
import { resolveConfig } from "../src/lib/resolve-config";

const cwd = __dirname;

test("resolve config", async () => {
  process.env.DATABASE_HOST = "localhost";
  const resolved = await resolveConfig({
    stage: "dev",
    cwd,
    module: "deploy",
    target: "api",
  });
});

const isSSMRunning = fetch("http://localhost:4566")
  .then((res) => res.status === 200)
  .catch(() => false);

test("resolve config with ssm", async (t) => {
  // test if ssm is running locally, if not, skip the test
  if (!(await isSSMRunning)) {
    t.skip("SSM is not running locally");
    return;
  }

  const resolved = await resolveConfig({
    stage: "dev",
    cwd,
    module: "deploy",
    target: "aws",
  });
});
