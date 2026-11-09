# Data Model: Personal TODO List

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

## Entity: TODO Item

Stored in Cloudflare D1 table `todos`. The **Owner** entity from the spec has no table:
it exists only as the `AUTH_USERNAME` / `AUTH_PASSWORD` Worker secrets (FR-003).

| Field | Column | Type (SQLite) | Rules | Source |
|-------|--------|---------------|-------|--------|
| id | `id` | `INTEGER PRIMARY KEY AUTOINCREMENT` | Server-assigned, never reused | Key Entities |
| description | `description` | `TEXT NOT NULL` | Trimmed; 1–200 grapheme clusters | FR-005–FR-007 |
| status | `status` | `TEXT NOT NULL DEFAULT 'pending'` | `CHECK (status IN ('pending','completed'))` | FR-008, FR-015 |
| createdAt | `created_at` | `TEXT NOT NULL` | ISO 8601 UTC with ms, e.g. `2026-11-10T09:15:02.123Z`; set by server on insert | FR-008, FR-011 |
| completedAt | `completed_at` | `TEXT NULL` | ISO 8601 UTC; set exactly once on completion; NULL while pending | Key Entities |

Table-level integrity rule:

```sql
CHECK ((status = 'pending'   AND completed_at IS NULL) OR
       (status = 'completed' AND completed_at IS NOT NULL))
```

> The database also enforces `length(trim(description)) > 0`. It does **not** enforce
> the 200 limit, because SQLite `length()` counts code points, not graphemes; the
> application-level validator is authoritative for the upper bound (see research R7).

**Index**: none needed beyond the primary key at the expected scale (≤ hundreds of rows,
SC-007). The list query sorts in memory cheaply.

## Validation rules (application layer)

Implemented once in `src/shared/validation.ts`, used by Worker and browser:

1. Input must be a JSON string; any other type → `VALIDATION_ERROR`.
2. `value = input.trim()`.
3. `graphemes(value) === 0` → `VALIDATION_ERROR`, message "Description is required."
4. `graphemes(value) > 200` → `VALIDATION_ERROR`, message
   "Description must be 200 characters or fewer."
5. Otherwise store `value`. Internal whitespace and any characters (HTML, emoji,
   Cyrillic) are stored unchanged.

## State transitions

```text
            create (POST /api/todos)
                    │
                    ▼
              ┌───────────┐   complete (POST /api/todos/{id}/complete)   ┌─────────────┐
              │  pending  │ ───────────────────────────────────────────▶ │  completed  │
              └───────────┘                                              └─────────────┘
                                                                            │      ▲
                                                                            └──────┘
                                                              complete again: no-op (FR-018)
```

- There is **no** transition from `completed` back to `pending` (FR-017) — no endpoint,
  no UI control, and the SQL update only matches `status = 'pending'`.
- No delete transition exists (FR-022).

## Queries (complete list)

| Operation | SQL (parameterised) |
|-----------|---------------------|
| List | `SELECT id, description, status, created_at, completed_at FROM todos ORDER BY created_at DESC, id DESC` |
| Create | `INSERT INTO todos (description, status, created_at) VALUES (?1, 'pending', ?2) RETURNING *` |
| Complete | `UPDATE todos SET status = 'completed', completed_at = ?2 WHERE id = ?1 AND status = 'pending'` then `SELECT ... WHERE id = ?1` (no row → 404) |

## Migration

`migrations/0001_create_todos.sql` creates the table above. Applied locally with
`wrangler d1 migrations apply todo-db --local` and in CI with `--remote` before deploy.
