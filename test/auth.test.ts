// T022 / T024 — US1 Private access: spec.md User Story 1 scenarios 1–4, FR-001–FR-003a, SC-001.
import { createExecutionContext } from "cloudflare:test";
import { env } from "cloudflare:workers";
import { beforeEach, describe, expect, it } from "vitest";
import app from "../src/worker/index";
import type { TodoRow } from "../src/worker/todos";
import { authHeaders, call, countTodos, resetDb, seedTodo } from "./helpers";

const SECRET_ITEM = "Secret plan: buy milk";

/** Every way a request can lack valid credentials. */
const invalidCredentials: [string, Record<string, string>][] = [
  ["no credentials", {}],
  ["wrong password", authHeaders(env.AUTH_USERNAME, "wrong-password-0000000000")],
  ["wrong username", authHeaders("intruder", env.AUTH_PASSWORD)],
  ["malformed Basic header", { Authorization: "Basic !!!not-base64!!!" }],
  ["non-Basic scheme", { Authorization: `Bearer ${env.AUTH_PASSWORD}` }],
];

/**
 * Every operation that reads or changes TODO data, plus UI paths (FR-001, FR-002).
 * `:id` is replaced with the seeded item's real id (AUTOINCREMENT never reuses ids).
 */
const protectedRequests: [string, string, RequestInit?][] = [
  ["UI page", "/"],
  ["static asset", "/assets/app.js"],
  ["list todos", "/api/todos"],
  [
    "add todo",
    "/api/todos",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description: "Injected" }),
    },
  ],
  ["complete todo", "/api/todos/:id/complete", { method: "POST" }],
];

function withHeaders(init: RequestInit | undefined, headers: Record<string, string>): RequestInit {
  return { ...init, headers: { ...(init?.headers as Record<string, string>), ...headers } };
}

describe("US1 — private access", () => {
  let seeded: TodoRow;

  beforeEach(async () => {
    await resetDb();
    seeded = await seedTodo({ description: SECRET_ITEM });
  });

  describe.each(invalidCredentials)("with %s", (_label, headers) => {
    it.each(protectedRequests)(
      "refuses %s with 401, reveals nothing and changes nothing",
      async (_name, path, init) => {
        const target = path.replace(":id", String(seeded.id));
        const res = await call(target, withHeaders(init, headers));
        const body = await res.text();

        expect(res.status).toBe(401);
        expect(res.headers.get("WWW-Authenticate")).toBe('Basic realm="TODO"');
        expect(body).not.toContain(SECRET_ITEM);
        expect(body).not.toContain("<h1>");
        // Nothing created, and the seeded item is untouched (still pending).
        expect(await countTodos()).toBe(1);
        const after = await env.DB.prepare("SELECT * FROM todos WHERE id = ?1")
          .bind(seeded.id)
          .first<TodoRow>();
        expect(after).toEqual(seeded);
      },
    );
  });

  it("serves the app to the owner with correct credentials (scenario 3)", async () => {
    const res = await call("/", { headers: authHeaders() });
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("<h1>TODO</h1>");
  });

  it("adds security headers to 401 responses too", async () => {
    const res = await call("/");
    expect(res.status).toBe(401);
    expect(res.headers.get("Content-Security-Policy")).toContain("default-src 'self'");
  });

  it("refuses repeated failed attempts the same way, without lockout (FR-003a)", async () => {
    for (let i = 0; i < 10; i++) {
      const res = await call("/", { headers: authHeaders(env.AUTH_USERNAME, `guess-${i}`) });
      expect(res.status).toBe(401);
    }
    const owner = await call("/", { headers: authHeaders() });
    expect(owner.status).toBe(200);
  });

  describe("fails closed when credentials are not configured (T024, FR-001)", () => {
    it.each([
      ["AUTH_USERNAME", { AUTH_USERNAME: "" }],
      ["AUTH_PASSWORD", { AUTH_PASSWORD: "" }],
    ])("returns 500 and serves nothing when %s is empty", async (_name, override) => {
      const brokenEnv = { ...env, ...override };
      const req = new Request("https://todo.test/", { headers: authHeaders("", "") });
      const res = await app.fetch(req, brokenEnv, createExecutionContext());
      const body = await res.text();

      expect(res.status).toBe(500);
      expect(body).toContain("INTERNAL_ERROR");
      expect(body).not.toContain("<h1>");
    });
  });
});
