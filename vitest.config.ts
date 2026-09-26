import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Unit tests only: no DOM, no network. DB/API-bound tests use mocks.
    environment: "node",
    include: ["lib/**/*.test.ts", "components/**/*.test.ts"],
  },
});
