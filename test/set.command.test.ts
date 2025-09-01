import { test } from "node:test";
import assert from "node:assert";
import { join } from "node:path";
import { existsSync, readFileSync, unlinkSync } from "node:fs";
import { setCommandHelper } from "../src/commands/set.command";

function cleanupFile(filepath: string) {
  if (existsSync(filepath)) {
    unlinkSync(filepath);
  }
}

test("set simple property in new file", async () => {
  const testFile = join(".config", "tmp-test-set.yml");
  const testFilePath = join(__dirname, testFile);

  // Ensure file doesn't exist
  cleanupFile(testFilePath);

  try {
    // create
    await setCommandHelper({
      cwd: __dirname,
      path: testFile,
      property: "database.host",
      value: "localhost",
    });

    assert.ok(
      existsSync(testFilePath),
      `File ${testFilePath} should be created`,
    );

    assert.match(
      readFileSync(testFilePath, "utf8"),
      /database:\s*host:\s*localhost/,
      "Should contain the set property",
    );

    // update
    await setCommandHelper({
      cwd: __dirname,
      path: testFile,
      property: "database.name",
      value: "remote",
    });

    assert.match(
      readFileSync(testFilePath, "utf8"),
      /database:\s*host:\s*localhost\s*name:\s*remote/,
      "Should contain the set property",
    );
  } finally {
    cleanupFile(testFilePath);
  }
});

test("set simple property for config set", async () => {
  const testFile = join(".config", "test.api.override.yml");
  const testFilePath = join(__dirname, testFile);

  // Ensure file doesn't exist
  cleanupFile(testFilePath);

  try {
    // create
    await setCommandHelper({
      cwd: __dirname,
      stage: "test",
      module: "api.override",
      property: "database.user",
      value: "admin",
    });

    assert.ok(
      existsSync(testFilePath),
      `File ${testFilePath} should be created`,
    );

    assert.match(
      readFileSync(testFilePath, "utf8"),
      /database:\s*user:\s*admin/,
      "Should contain the set property",
    );

    // update
    await setCommandHelper({
      cwd: __dirname,
      stage: "test",
      module: "api.override",
      property: "database.password",
      value: "hidden",
    });

    assert.match(
      readFileSync(testFilePath, "utf8"),
      /database:\s*user:\s*admin\s*password:\s*hidden/,
      "Should contain the set property",
    );
  } finally {
    cleanupFile(testFilePath);
  }
});
