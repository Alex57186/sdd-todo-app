// /api/todos routes. Endpoints are added per user story: GET (T033), POST (T041),
// POST /:id/complete (T045). SQL lives here, parameterised with .bind() only (constitution IV).
import { Hono } from "hono";
import type { Env } from "./env";
import type { Todo, TodoStatus } from "../shared/types";

/** A row of the `todos` table as returned by D1 (snake_case columns). */
export interface TodoRow {
  id: number;
  description: string;
  status: TodoStatus;
  created_at: string;
  completed_at: string | null;
}

/** Maps a D1 row to the API shape defined in contracts/openapi.yaml. */
export function toTodo(row: TodoRow): Todo {
  return {
    id: row.id,
    description: row.description,
    status: row.status,
    createdAt: row.created_at,
    completedAt: row.completed_at,
  };
}

export const todos = new Hono<{ Bindings: Env }>();

// T033 — US3: list all items, newest first (FR-010, FR-011; research R6 tie-breaker).
todos.get("/", async (c) => {
  const { results } = await c.env.DB.prepare(
    "SELECT id, description, status, created_at, completed_at FROM todos ORDER BY created_at DESC, id DESC",
  ).all<TodoRow>();
  return c.json({ items: results.map(toTodo) });
});
