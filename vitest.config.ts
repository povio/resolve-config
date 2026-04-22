import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: ["src/sh.ts"],
      reporter: ["text", "lcov"],
    },
    environment: "node",
    testTimeout: 30000,
  },
});
