// Vitest setup file (worker project): applies migrations/ to the local test D1 database,
// so tests run against the real schema (constitution III — no DB mocks).
import { applyD1Migrations } from "cloudflare:test";
import { env } from "cloudflare:workers";

await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
