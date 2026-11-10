-- Migration 0001: TODO items table.
-- Source of truth: specs/001-todo-app/data-model.md (FR-005 – FR-008, FR-011, FR-015, FR-017).
-- The 200-character upper bound is enforced in the application (grapheme count, research R7),
-- because SQLite length() counts code points, not user-perceived characters.

CREATE TABLE todos (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  description  TEXT    NOT NULL CHECK (length(trim(description)) > 0),
  status       TEXT    NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
  created_at   TEXT    NOT NULL,
  completed_at TEXT    NULL,
  CHECK (
    (status = 'pending'   AND completed_at IS NULL) OR
    (status = 'completed' AND completed_at IS NOT NULL)
  )
);
