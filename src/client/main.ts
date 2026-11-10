// Frontend entry point. Same-origin fetch() reuses the browser's Basic Auth credentials.
// No polling or live updates: data is fetched on page load (FR-014a).
import type { Todo } from "../shared/types";
import { renderError, renderList } from "./render";

type FetchFn = (input: string, init?: RequestInit) => Promise<Response>;

const LOAD_ERROR = "Could not load your list. Please reload the page.";

/** T035 — loads all items and renders them, or an error (FR-021). */
export async function loadTodos(container: HTMLElement, fetchFn: FetchFn = fetch): Promise<void> {
  try {
    const res = await fetchFn("/api/todos");
    if (!res.ok) throw new Error(`GET /api/todos failed: ${res.status}`);
    const body = (await res.json()) as { items: Todo[] };
    renderList(container, body.items);
  } catch {
    renderError(container, LOAD_ERROR);
  }
}

const listContainer = document.getElementById("list");
if (listContainer) void loadTodos(listContainer);
