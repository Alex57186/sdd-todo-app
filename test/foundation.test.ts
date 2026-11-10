// T017 — foundation: schema applied, API 404 contract, security headers.
// All requests send authHeaders() so these tests keep passing once US1 (T023) adds auth.
import { env } from "cloudflare:workers";
import { beforeEach, describe, expect, it } from "vitest";
import { authHeaders, call, resetDb, seedTodo } from "./helpers";

describe("foundation", () => {
  beforeEach(resetDb);

  it("applies the todos migration", async () => {
    const table = await env.DB.prepare(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'todos'",
    ).first<{ name: string }>();
    expect(table?.name).toBe("todos");
  });

  it("enforces the status/completed_at integrity rule from data-model.md", async () => {
    await expect(
      env.DB.prepare(
        "INSERT INTO todos (description, status, created_at, completed_at) VALUES ('x', 'completed', '2026-01-01T00:00:00.000Z', NULL)",
      ).run(),
    ).rejects.toThrow(/CHECK constraint failed/);
  });

  it("rejects whitespace-only descriptions at the database level", async () => {
    await expect(seedTodo({ description: "   " })).rejects.toThrow(/CHECK constraint failed/);
  });

  it("returns a JSON 404 for unknown /api routes", async () => {
    const res = await call("/api/does-not-exist", { headers: authHeaders() });
    expect(res.status).toBe(404);
    expect(res.headers.get("Content-Type")).toMatch(/application\/json/);
    expect(await res.json()).toEqual({ error: { code: "NOT_FOUND", message: "Not found." } });
  });

  it.each(["/api/does-not-exist", "/"])(
    "sets security headers on %s (research R9)",
    async (path) => {
      const res = await call(path, { headers: authHeaders() });
      const csp = res.headers.get("Content-Security-Policy") ?? "";
      expect(csp).toContain("default-src 'self'");
      expect(csp).toContain("frame-ancestors 'none'");
      expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
    },
  );

  it("serves the frontend shell from static assets", async () => {
    const res = await call("/", { headers: authHeaders() });
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toMatch(/text\/html/);
    expect(await res.text()).toContain("<h1>TODO</h1>");
  });
});
