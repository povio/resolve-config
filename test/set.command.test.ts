import { test, expect } from "vitest";
import { join } from "node:path";
import { existsSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { parse as parseYaml } from "yaml";
import { setCommandHelper } from "../src/commands/set.command";

function cleanupFile(filepath: string) {
  if (existsSync(filepath)) {
    unlinkSync(filepath);
  }
}

test("set simple property in new file", async () => {
  const testFile = join(".config", "tmp-test-set.yml");
  const testFilePath = join(__dirname, testFile);

  cleanupFile(testFilePath);

  try {
    await setCommandHelper({
      cwd: __dirname,
      path: testFile,
      property: "database.host",
      value: "localhost",
    });

    expect(existsSync(testFilePath), `File ${testFilePath} should be created`).toBe(true);
    expect(readFileSync(testFilePath, "utf8")).toMatch(/database:\s*host:\s*localhost/);

    await setCommandHelper({
      cwd: __dirname,
      path: testFile,
      property: "database.name",
      value: "remote",
    });

    expect(readFileSync(testFilePath, "utf8")).toMatch(/database:\s*host:\s*localhost\s*name:\s*remote/);
  } finally {
    cleanupFile(testFilePath);
  }
});

test("set simple property for config set", async () => {
  const testFile = join(".config", "test.api.override.yml");
  const testFilePath = join(__dirname, testFile);

  cleanupFile(testFilePath);

  try {
    await setCommandHelper({
      cwd: __dirname,
      stage: "test",
      module: "api.override",
      property: "database.user",
      value: "admin",
    });

    expect(existsSync(testFilePath), `File ${testFilePath} should be created`).toBe(true);
    expect(readFileSync(testFilePath, "utf8")).toMatch(/database:\s*user:\s*admin/);

    await setCommandHelper({
      cwd: __dirname,
      stage: "test",
      module: "api.override",
      property: "database.password",
      value: "hidden",
    });

    expect(readFileSync(testFilePath, "utf8")).toMatch(/database:\s*user:\s*admin\s*password:\s*hidden/);
  } finally {
    cleanupFile(testFilePath);
  }
});

test("set deep-merges into existing yaml when replace is not set", async () => {
  const testFile = join(".config", "tmp-set-merge.yml");
  const testFilePath = join(__dirname, testFile);
  cleanupFile(testFilePath);
  writeFileSync(testFilePath, "root:\n  a: 1\n", "utf8");
  try {
    await setCommandHelper({
      cwd: __dirname,
      path: testFile,
      property: "root.b",
      value: "2",
    });
    const doc = parseYaml(readFileSync(testFilePath, "utf8")) as {
      root: { a: number; b: string };
    };
    expect(doc.root).toStrictEqual({ a: 1, b: "2" });
  } finally {
    cleanupFile(testFilePath);
  }
});
