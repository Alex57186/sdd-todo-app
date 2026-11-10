// T031 — US3 View the list (API): spec.md US3 scenarios 1–2, US4 scenario 6,
// FR-010, FR-011, SC-007 (volume); contract: GET /api/todos.
import { env } from "cloudflare:workers";
import { beforeEach, describe, expect, it } from "vitest";
import type { Todo } from "../src/shared/types";
import { authHeaders, call, resetDb, seedTodo } from "./helpers";

async function listTodos(): Promise<{ status: number; items: Todo[] }> {
  const res = await call("/api/todos", { headers: authHeaders() });
  const body = (await res.json()) as { items: Todo[] };
  return { status: res.status, items: body.items };
}

const at = (minute: number) => `2026-11-10T09:${String(minute).padStart(2, "0")}:00.000Z`;

describe("US3 — GET /api/todos", () => {
  beforeEach(resetDb);

  it("returns an empty list when there are no items (scenario 1)", async () => {
    const res = await call("/api/todos", { headers: authHeaders() });
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toMatch(/application\/json/);
    expect(await res.json()).toEqual({ items: [] });
  });

  it("lists items newest first (scenario 2, FR-011)", async () => {
    await seedTodo({ description: "A", createdAt: at(1) });
    await seedTodo({ description: "B", createdAt: at(2) });
    await seedTodo({ description: "C", createdAt: at(3) });

    const { status, items } = await listTodos();
    expect(status).toBe(200);
    expect(items.map((t) => t.description)).toEqual(["C", "B", "A"]);
  });

  it("breaks creation-time ties by id, newest id first (research R6)", async () => {
    const first = await seedTodo({ description: "first", createdAt: at(5) });
    const second = await seedTodo({ description: "second", createdAt: at(5) });

    const { items } = await listTodos();
    expect(items.map((t) => t.id)).toEqual([second.id, first.id]);
  });

  it("returns exactly the contract shape for each item", async () => {
    const pending = await seedTodo({ description: "Buy milk", createdAt: at(1) });
    const done = await seedTodo({ description: "Call Bob", status: "completed", createdAt: at(2) });

    const { items } = await listTodos();
    expect(items).toEqual([
      {
        id: done.id,
        description: "Call Bob",
        status: "completed",
        createdAt: at(2),
        completedAt: at(2),
      },
      {
        id: pending.id,
        description: "Buy milk",
        status: "pending",
        createdAt: at(1),
        completedAt: null,
      },
    ]);
  });

  it("keeps a completed item in its creation-time position (US4 scenario 6)", async () => {
    await seedTodo({ description: "A", createdAt: at(1) });
    await seedTodo({ description: "B", status: "completed", createdAt: at(2) });
    await seedTodo({ description: "C", createdAt: at(3) });

    const { items } = await listTodos();
    expect(items.map((t) => `${t.description}:${t.status}`)).toEqual([
      "C:pending",
      "B:completed",
      "A:pending",
    ]);
  });

  it("returns descriptions exactly as stored (HTML is data, FR-014)", async () => {
    await seedTodo({ description: "<b>hi</b>" });
    const { items } = await listTodos();
    expect(items[0]?.description).toBe("<b>hi</b>");
  });

  it("returns all 500 items (SC-007 volume)", async () => {
    const statements = Array.from({ length: 500 }, (_, i) =>
      env.DB.prepare(
        "INSERT INTO todos (description, status, created_at) VALUES (?1, 'pending', ?2)",
      ).bind(`Item ${i}`, new Date(Date.UTC(2026, 0, 1, 0, 0, i)).toISOString()),
    );
    await env.DB.batch(statements);

    const { status, items } = await listTodos();
    expect(status).toBe(200);
    expect(items).toHaveLength(500);
    expect(items[0]?.description).toBe("Item 499");
  });
});
