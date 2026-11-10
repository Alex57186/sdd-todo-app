// Shared helpers for Worker-project tests (T016).
import { env, exports } from "cloudflare:workers";
import type { TodoStatus } from "../src/shared/types";
import type { TodoRow } from "../src/worker/todos";

/** Basic Auth header for the test credentials configured in vitest.config.ts. */
export function authHeaders(
  username: string = env.AUTH_USERNAME,
  password: string = env.AUTH_PASSWORD,
): Record<string, string> {
  return { Authorization: `Basic ${btoa(`${username}:${password}`)}` };
}

/** Sends a request through the real Worker entry point (same path as production traffic). */
export function call(path: string, init?: RequestInit): Promise<Response> {
  return exports.default.fetch(new Request(`https://todo.test${path}`, init));
}

/** Removes all TODO items. */
export async function resetDb(): Promise<void> {
  await env.DB.prepare("DELETE FROM todos").run();
}

/** Counts TODO items — used to prove that refused/invalid requests change nothing. */
export async function countTodos(): Promise<number> {
  const row = await env.DB.prepare("SELECT COUNT(*) AS n FROM todos").first<{ n: number }>();
  return row?.n ?? 0;
}

/** Inserts a TODO item directly into D1 (for list/complete tests). */
export async function seedTodo(input: {
  description: string;
  status?: TodoStatus;
  createdAt?: string;
}): Promise<TodoRow> {
  const status = input.status ?? "pending";
  const createdAt = input.createdAt ?? new Date().toISOString();
  const completedAt = status === "completed" ? createdAt : null;
  const row = await env.DB.prepare(
    "INSERT INTO todos (description, status, created_at, completed_at) VALUES (?1, ?2, ?3, ?4) RETURNING *",
  )
    .bind(input.description, status, createdAt, completedAt)
    .first<TodoRow>();
  if (!row) throw new Error("seedTodo: insert returned no row");
  return row;
}
