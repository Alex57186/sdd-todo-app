// Two test projects (research R10):
//  - "worker": runs inside the real Workers runtime (workerd) with a local D1 database.
//  - "ui":     runs browser code against a lightweight DOM (happy-dom).
import { defineConfig } from "vitest/config";
import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-plugin";

export default defineConfig({
  test: {
    projects: [
      {
        plugins: [
          cloudflareTest(async () => ({
            wrangler: { configPath: "./wrangler.jsonc" },
            miniflare: {
              bindings: {
                // Test-only credentials (FR-003a length respected); real ones are Worker secrets.
                AUTH_USERNAME: "test-user",
                AUTH_PASSWORD: "test-password-1234567890",
                // Migration SQL read in Node.js, applied inside the runtime by test setup.
                TEST_MIGRATIONS: await readD1Migrations("./migrations"),
              },
            },
          })),
        ],
        test: {
          name: "worker",
          include: ["test/**/*.test.ts"],
          exclude: ["test/ui*.test.ts"],
        },
      },
      {
        test: {
          name: "ui",
          environment: "happy-dom",
          include: ["test/ui*.test.ts"],
        },
      },
    ],
  },
});
