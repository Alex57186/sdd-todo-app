// Pure DOM-building functions. User text is only ever assigned via textContent —
// never innerHTML — so descriptions can never become markup or script (FR-014).
import type { Todo } from "../shared/types";

export const EMPTY_MESSAGE = "Nothing to do yet — add your first item.";

const STATUS_LABEL: Record<Todo["status"], string> = {
  pending: "Pending",
  completed: "✓ Completed",
};

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/** T034 — renders the list (or the empty state) into `container`, replacing its content. */
export function renderList(container: HTMLElement, todos: Todo[]): void {
  if (todos.length === 0) {
    container.replaceChildren(el("p", "empty", EMPTY_MESSAGE));
    return;
  }

  const list = el("ul", "todo-list");
  for (const todo of todos) {
    const item = el("li", `todo todo--${todo.status}`);
    item.dataset.id = String(todo.id);
    // Status as text + symbol, so it is distinguishable without colour (FR-012).
    item.append(el("span", "todo__status", STATUS_LABEL[todo.status]));
    item.append(el("span", "todo__text", todo.description));
    list.append(item);
  }
  container.replaceChildren(list);
}

/** T034 — replaces `container` content with an error message announced to assistive tech. */
export function renderError(container: HTMLElement, message: string): void {
  const alert = el("p", "error", message);
  alert.setAttribute("role", "alert");
  container.replaceChildren(alert);
}
