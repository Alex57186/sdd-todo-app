// T032 — US3 View the list (UI, happy-dom): spec.md US3 scenarios 1–3, FR-012 – FR-014, FR-021.
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Todo } from "../src/shared/types";
import { EMPTY_MESSAGE, renderError, renderList } from "../src/client/render";
import { loadTodos } from "../src/client/main";

const todo = (overrides: Partial<Todo>): Todo => ({
  id: 1,
  description: "Buy milk",
  status: "pending",
  createdAt: "2026-11-10T09:00:00.000Z",
  completedAt: null,
  ...overrides,
});

let container: HTMLElement;

beforeEach(() => {
  document.body.innerHTML = "";
  container = document.createElement("div");
  document.body.append(container);
});

const items = () => [...container.querySelectorAll("li")];

describe("renderList", () => {
  it("shows a friendly empty-state message when there are no items (scenario 1, FR-013)", () => {
    renderList(container, []);
    expect(container.textContent).toContain(EMPTY_MESSAGE);
    expect(items()).toHaveLength(0);
  });

  it("renders items in the order given by the API (newest first, scenario 2)", () => {
    renderList(container, [
      todo({ id: 3, description: "C" }),
      todo({ id: 2, description: "B" }),
      todo({ id: 1, description: "A" }),
    ]);
    expect(items().map((li) => li.querySelector(".todo__text")?.textContent)).toEqual([
      "C",
      "B",
      "A",
    ]);
  });

  it("labels each status in text, not by colour alone (scenario 3, FR-012)", () => {
    renderList(container, [
      todo({ id: 2, status: "completed", completedAt: "2026-11-10T10:00:00.000Z" }),
      todo({ id: 1, status: "pending" }),
    ]);
    const [completed, pending] = items();
    expect(completed?.querySelector(".todo__status")?.textContent).toBe("✓ Completed");
    expect(pending?.querySelector(".todo__status")?.textContent).toBe("Pending");
    expect(completed?.classList.contains("todo--completed")).toBe(true);
    expect(pending?.classList.contains("todo--pending")).toBe(true);
  });

  it("renders descriptions as literal text, never as markup (FR-014)", () => {
    renderList(container, [todo({ description: '<b>hi</b><img src=x onerror="alert(1)">' })]);
    const text = container.querySelector(".todo__text");
    expect(text?.textContent).toBe('<b>hi</b><img src=x onerror="alert(1)">');
    expect(container.querySelector("b")).toBeNull();
    expect(container.querySelector("img")).toBeNull();
  });

  it("replaces previous content on re-render", () => {
    renderList(container, [todo({ id: 1 })]);
    renderList(container, [todo({ id: 2 }), todo({ id: 3 })]);
    expect(items()).toHaveLength(2);
  });
});

describe("renderError", () => {
  it("shows the message as an alert (FR-021)", () => {
    renderError(container, "Could not load your list.");
    const alert = container.querySelector('[role="alert"]');
    expect(alert?.textContent).toBe("Could not load your list.");
  });
});

describe("loadTodos", () => {
  it("fetches GET /api/todos and renders the items", async () => {
    const fetchFn = vi.fn(async () =>
      Response.json({ items: [todo({ description: "From server" })] }),
    );
    await loadTodos(container, fetchFn);
    expect(fetchFn).toHaveBeenCalledWith("/api/todos");
    expect(container.textContent).toContain("From server");
  });

  it.each([
    ["a server error", async () => new Response("boom", { status: 500 })],
    [
      "a network failure",
      async () => {
        throw new TypeError("Failed to fetch");
      },
    ],
  ])("shows an error and no items on %s (FR-021)", async (_label, impl) => {
    await loadTodos(container, vi.fn(impl));
    expect(container.querySelector('[role="alert"]')?.textContent).toMatch(/could not load/i);
    expect(items()).toHaveLength(0);
  });
});
