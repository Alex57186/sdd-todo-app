---

description: "Task list for 001-todo-app — Personal TODO List"
---

# Tasks: Personal TODO List

**Input**: Design documents from `/specs/001-todo-app/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md),
[data-model.md](./data-model.md), [contracts/openapi.yaml](./contracts/openapi.yaml),
[quickstart.md](./quickstart.md)

**Tests**: REQUIRED. Constitution principle III mandates an automated test for every
acceptance scenario, run against a real local D1. Tests are written in the same phase as
the implementation (not strict test-first), and a phase is not done until its tests pass.

**Organization**: One phase = one Jira issue = one branch = one pull request (see
[Jira mapping](#jira-mapping)). User-story phases carry `[USn]` labels matching spec.md.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: User story from spec.md (US1–US4)
- **[manual]**: Needs a human with account access (Cloudflare, GitHub settings); the AI
  agent prepares commands/instructions but cannot complete it alone

## Path Conventions

Single project at repository root: `src/worker/`, `src/shared/`, `src/client/`,
`migrations/`, `test/`, `.github/` — as defined in plan.md.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Empty but buildable TypeScript project with all tooling configured.

- [X] T001 Create `package.json` (`"private": true`, `"type": "module"`, `"engines": { "node": ">=22.12" }`) with the npm scripts from plan.md: `dev`, `build`, `test`, `lint`, `format:check`, `format`, `typecheck`, `db:migrate:local`, `deploy` in package.json
- [X] T002 Install dependencies, pinning majors per research R11: runtime `hono@^4.13`; dev `wrangler@^4`, `vite@^8`, `vitest@~4.1`, `@cloudflare/vitest-plugin@^1.6` (replaces deprecated `vitest-pool-workers`, research R10), `happy-dom`, `typescript@~6.0`, `@cloudflare/workers-types`, `eslint@^10`, `@eslint/js`, `typescript-eslint@^8.72`, `prettier@^3` — commit package-lock.json
- [X] T003 [P] Create `tsconfig.json` (strict, `noEmit`, ES2022, `moduleResolution: bundler`, types `@cloudflare/workers-types`; includes `src/worker`, `src/shared`, `test`) and `src/client/tsconfig.json` (extends root, `lib: ["ES2022","DOM","DOM.Iterable"]`, no workers types; includes `src/client`, `src/shared`); make `typecheck` script check both
- [X] T004 [P] Create `eslint.config.js` (flat config: `@eslint/js` recommended + `typescript-eslint` recommended; ignore `dist`, `.wrangler`, `node_modules`), `.prettierrc` and `.prettierignore` (ignore `dist`, `.wrangler`, `specs`, `.specify`, `.claude`, `package-lock.json`)
- [X] T005 [P] Create `wrangler.jsonc`: `name: "todo-app"`, `main: "src/worker/index.ts"`, recent `compatibility_date`, `d1_databases: [{ binding: "DB", database_name: "todo-db", database_id: "<placeholder until T027>", migrations_dir: "migrations" }]`, `assets: { directory: "./dist/client", binding: "ASSETS", run_worker_first: true }`, `observability: { enabled: true }`
- [X] T006 [P] Create `vite.config.ts` with `root: "src/client"`, `build.outDir: "../../dist/client"`, `build.emptyOutDir: true`
- [X] T007 [P] Create `vitest.config.ts` with two projects: `worker` (Cloudflare Workers pool using `wrangler.jsonc`, D1 migrations from `migrations/` exposed to tests, test bindings `AUTH_USERNAME=test-user`, `AUTH_PASSWORD=test-password-1234567890`; includes `test/**/*.test.ts` except `test/ui*.test.ts`) and `ui` (environment `happy-dom`; includes `test/ui*.test.ts`)
- [X] T008 [P] Create `.dev.vars.example` with `AUTH_USERNAME=` and `AUTH_PASSWORD=` and a comment explaining FR-003a (≥ 20 random characters, e.g. `openssl rand -base64 30`)
- [X] T009 [P] Create `CLAUDE.md`: project purpose, pointers to `.specify/memory/constitution.md` and `specs/001-todo-app/`, commands (`npm run dev/test/lint/typecheck/build`), branch/commit/PR conventions with Jira keys (constitution V), and the rule "implement only what tasks.md and spec.md specify"

**Checkpoint**: `npm ci && npm run lint && npm run typecheck` succeed on the empty project.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Database schema, Worker skeleton, shared types, test harness — needed by every story.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T010 Create `migrations/0001_create_todos.sql` exactly per data-model.md: `id INTEGER PRIMARY KEY AUTOINCREMENT`; `description TEXT NOT NULL` with `CHECK (length(trim(description)) > 0)`; `status TEXT NOT NULL DEFAULT 'pending'` with `CHECK (status IN ('pending','completed'))`; `created_at TEXT NOT NULL`; `completed_at TEXT NULL`; table check `(status = 'pending' AND completed_at IS NULL) OR (status = 'completed' AND completed_at IS NOT NULL)`
- [X] T011 [P] Create `src/worker/env.ts` exporting `Env` type: `DB: D1Database`, `ASSETS: Fetcher`, `AUTH_USERNAME: string`, `AUTH_PASSWORD: string`
- [X] T012 [P] Create `src/shared/types.ts` with `Todo` (`id: number`, `description: string`, `status: 'pending' | 'completed'`, `createdAt: string`, `completedAt: string | null`) and `ApiError` (`{ error: { code: 'VALIDATION_ERROR' | 'NOT_FOUND' | 'UNAUTHORIZED' | 'INTERNAL_ERROR'; message: string } }`) matching contracts/openapi.yaml
- [X] T013 [P] Create `src/worker/todos.ts` exporting an empty Hono router `todos` (typed with `Env`) and a `toTodo(row)` mapper from snake_case columns to the `Todo` type
- [X] T014 Create `src/worker/index.ts`: Hono app with `secureHeaders` (CSP `default-src 'self'`, `frame-ancestors 'none'`, no inline scripts; `X-Content-Type-Options: nosniff`) on all routes; mount `todos` at `/api/todos`; any other `/api/*` → `404` `{"error":{"code":"NOT_FOUND",...}}`; `onError` → `500` `INTERNAL_ERROR` with `console.error` that never logs descriptions or credentials; all non-API requests → `c.env.ASSETS.fetch(c.req.raw)`
- [X] T015 [P] Create minimal UI shell: `src/client/index.html` (title "TODO", `<main id="app">`, loads `./main.ts` as module, links `./styles.css`, no inline script), `src/client/main.ts` (entry point, no behaviour yet), `src/client/render.ts` (empty module for pure, testable DOM-building functions), `src/client/styles.css` (readable system-font base, phone-width friendly)
- [X] T016 Create `test/helpers.ts`: `resetDb(env)` (deletes all rows from `todos`), `seedTodo(env, { description, status?, createdAt? })` for list/complete tests, and `authHeaders()` returning `Authorization: Basic` for the test credentials from T007
- [X] T017 Create `test/foundation.test.ts`: migrations applied (table `todos` exists); `GET /api/does-not-exist` → `404` JSON `NOT_FOUND`; responses carry the `Content-Security-Policy` header. **All requests send `authHeaders()` from T016** so these tests keep passing once US1 (T023) adds authentication

**Checkpoint**: `npm test` and `npm run build` pass; `npm run dev` serves the shell page locally.

---

## Phase 3: CI & AI Review (Delivery Infrastructure, part 1)

**Purpose**: Every later PR is automatically checked and AI-reviewed, and `main` requires human approval (constitution: Development Workflow & Quality Gates).

- [X] T018 Create `.github/workflows/ci.yml`: triggers `pull_request` and `push` to `main`; job `ci` on `ubuntu-latest`, Node 22 with npm cache; steps `npm ci` → `npm run lint` → `npm run format:check` → `npm run typecheck` → `npm test` → `npm run build`; `concurrency` cancels superseded runs per ref; `permissions: contents: read`
- [X] T019 [P] Create `.github/pull_request_template.md`: Jira issue key + link, spec refs (`specs/001-todo-app/...`, FR/US ids), task ids (`T0xx`), checklist (CI green, tests cover the acceptance scenarios touched, nothing outside FR-022 scope, no secrets committed)
- [X] T020 [P] Create `.github/workflows/ai-review.yml` using the Claude Code GitHub Action on `pull_request` (`opened`, `synchronize`, `ready_for_review`) with `permissions: contents: read, pull-requests: write, id-token: write`; review prompt instructs the reviewer to read `.specify/memory/constitution.md`, the referenced spec/plan/tasks, and report on correctness, security (auth on all routes, parameterised SQL, text-only rendering, no secrets), code quality, test coverage of acceptance scenarios, and scope creep beyond the spec; posts findings as PR review comments; never approves or merges; Anthropic credential read from a repository secret
- [X] T021 [manual] Create the public GitHub repository, push `main` and the feature branch, add the Anthropic secret for T020 (via `/install-github-app` or repo settings), and protect `main`: require a pull request, required status check `ci` (strict), resolved conversations, no force pushes/deletions, rules enforced for admins; 0 required approvals — the human merge is the approval (constitution v1.0.1: GitHub forbids self-approval and the agent uses the owner's account)

**Checkpoint**: Opening a PR triggers `ci` and the AI review; merge is blocked until CI is green, and only a human merges.

---

## Phase 4: User Story 1 — Private access (Priority: P1) 🎯 MVP

**Goal**: Nobody without the owner's credentials can see the UI or touch any data (FR-001–FR-003a).

**Independent Test**: Request `/`, a static asset, and every API endpoint with no / wrong / correct credentials; only correct credentials succeed.

### Tests for User Story 1

- [X] T022 [P] [US1] Create `test/auth.test.ts` covering US1 scenarios 1–4: `GET /` without credentials → `401` with `WWW-Authenticate: Basic realm="TODO"` (research R3 amendment) and no app HTML in the body; wrong password → `401`; wrong username → `401`; correct credentials → `200` HTML; `GET /api/todos`, `POST /api/todos`, `POST /api/todos/1/complete` without credentials → `401` and row count in `todos` unchanged; a static asset path without credentials → `401`; repeated failed attempts each → `401` (no lockout, FR-003a)

### Implementation for User Story 1

- [X] T023 [US1] Add Hono `basicAuth` middleware in `src/worker/index.ts` on all routes, after `secureHeaders` and before `/api` routes and the assets fallback; read `username`/`password` from `c.env.AUTH_USERNAME` / `c.env.AUTH_PASSWORD` per request; realm `TODO`; 401 body is a short plain-text message revealing no data
- [X] T024 [US1] Fail closed (FR-001): if `AUTH_USERNAME` or `AUTH_PASSWORD` is missing/empty, respond `500 INTERNAL_ERROR` for every request (never serve unauthenticated); add a test case for it in `test/auth.test.ts`

**Checkpoint**: US1 is fully functional — the app shell is reachable only with valid credentials.

---

## Phase 5: Deployment Pipeline (Delivery Infrastructure, part 2)

**Purpose**: First public deployment (now protected by US1) and automatic deploy on every merge to `main` (FR-020, SC-004).

- [ ] T025 [manual] Create a Cloudflare API token with permissions *Workers Scripts: Edit* and *D1: Edit* (account-scoped); add GitHub Actions secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`
- [ ] T026 [manual] Run `npx wrangler login` and `npx wrangler d1 create todo-db`; note the returned `database_id`
- [ ] T027 Replace the placeholder `database_id` in `wrangler.jsonc` with the real id from T026 (not a secret)
- [ ] T028 [manual] Generate a password (`openssl rand -base64 30`) and set Worker secrets with `npx wrangler secret put AUTH_USERNAME` and `npx wrangler secret put AUTH_PASSWORD`; store the password in a password manager
- [ ] T029 Create `.github/workflows/deploy.yml`: trigger `push` to `main` (and `workflow_dispatch`); `concurrency: deploy-production` without cancel-in-progress; Node 22; `npm ci` → `npm run build` → `npx wrangler d1 migrations apply todo-db --remote` → `npx wrangler deploy`; env `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` from secrets; GitHub `environment: production` with the deployed URL
- [ ] T030 After merge, verify the public `*.workers.dev` URL with quickstart.md scenarios 1 and 2 (401 without / with wrong credentials) and a successful sign-in; record the URL in the PR and Jira issue

**Checkpoint**: Merging to `main` deploys automatically; the public URL demands credentials.

---

## Phase 6: User Story 3 — View the list (Priority: P1)

> Implemented **before** US2 (both P1): viewing works on its own with seeded data, and
> US2's acceptance scenario "appears at the top of the list" needs the list to exist.

**Goal**: The owner sees all items newest first, each with a clear status, or a friendly empty state (FR-010–FR-014a).

**Independent Test**: Seed items of mixed status in the DB; sign in; verify order, labels, literal text and empty state.

### Tests for User Story 3

- [ ] T031 [P] [US3] Create `test/api.list.test.ts`: empty DB → `200 {"items":[]}`; seeded "A","B","C" → order C,B,A; two items with identical `created_at` ordered by `id DESC`; item shape exactly `{id, description, status, createdAt, completedAt}` per openapi; a completed item keeps its position (US3 scenarios 1–2, US4 scenario 6); 500 seeded items are all returned (SC-007 volume; timing checked manually in T048)
- [ ] T032 [P] [US3] Create `test/ui.list.test.ts` (happy-dom) for `src/client/render.ts`: empty list renders the empty-state message; items render in the given order; each item shows the text label "Pending" or "Completed" plus a ✓ symbol for completed (not colour alone, FR-012); description `<b>hi</b>` appears literally in `textContent` with no `<b>` element created (FR-014); a load failure renders an error message (FR-021)

### Implementation for User Story 3

- [ ] T033 [US3] Implement `GET /api/todos` in `src/worker/todos.ts` with exactly `SELECT id, description, status, created_at, completed_at FROM todos ORDER BY created_at DESC, id DESC`, returning `{ items: Todo[] }`
- [ ] T034 [US3] Implement `renderList(container, todos)` and `renderError(container, message)` in `src/client/render.ts` using only `document.createElement` and `textContent` (never `innerHTML` with data); empty-state text e.g. "Nothing to do yet — add your first item."
- [ ] T035 [US3] In `src/client/main.ts`, on page load fetch `GET /api/todos` (same-origin, browser reuses Basic Auth) and render the list or an error; no polling or live updates (FR-014a)
- [ ] T036 [P] [US3] Style statuses in `src/client/styles.css`: completed items struck through with muted text; status label always visible as text

**Checkpoint**: US1 + US3 work — a signed-in owner sees seeded items correctly.

---

## Phase 7: User Story 2 — Add a TODO (Priority: P1)

**Goal**: The owner adds an item that appears immediately as pending; invalid input is rejected with a clear message (FR-004–FR-009, FR-021).

**Independent Test**: Sign in, add valid and invalid descriptions, verify list and messages.

### Tests for User Story 2

- [ ] T037 [P] [US2] Create `test/validation.test.ts` for `src/shared/validation.ts`: `"  Call Bob  "` → `"Call Bob"`; `""` and `"   "` → error "Description is required."; 200 × "a" valid, 201 × "a" invalid; 200 × "🍞" valid, 201 × "🍞" invalid; "👍🏽" counts as 1; "Купить хлеб 🍞" valid; internal spaces preserved; non-string input → error
- [ ] T038 [P] [US2] Create `test/api.create.test.ts`: valid → `201` with `status: "pending"`, ISO `createdAt`, `completedAt: null`; stored value trimmed; `<b>hi</b>` stored verbatim; duplicate descriptions both created; empty/whitespace/201 chars/non-string/missing field/malformed JSON → `400 VALIDATION_ERROR` with the messages from data-model.md and **no row created** (US2 scenarios 1–5, SC-005)
- [ ] T039 [P] [US2] Create `test/ui.add.test.ts` (happy-dom, `fetch` stubbed): successful submit re-fetches and renders the new item at the top as Pending without reload; client-side validation shows the same messages and sends no request; submit button disabled while a request is in flight (double-submit edge case); server/network error shows a message and the list is unchanged (FR-021); input cleared only on success

### Implementation for User Story 2

- [ ] T040 [US2] Implement `normalizeDescription(input: unknown): { ok: true; value: string } | { ok: false; message: string }` in `src/shared/validation.ts` per data-model.md rules 1–5: trim; grapheme count via `Intl.Segmenter(undefined, { granularity: "grapheme" })`; `0` → "Description is required."; `> 200` → "Description must be 200 characters or fewer."
- [ ] T041 [US2] Implement `POST /api/todos` in `src/worker/todos.ts`: parse JSON safely (malformed → 400), validate with `normalizeDescription`, insert with `INSERT INTO todos (description, status, created_at) VALUES (?1, 'pending', ?2) RETURNING *` using `new Date().toISOString()`, respond `201` with the `Todo`
- [ ] T042 [US2] Add the add-form to `src/client/index.html` (labelled text input, "Add" button, message area with `aria-live="polite"`) and its handler in `src/client/main.ts`: validate with the shared function, disable button during request, `POST /api/todos`, on success clear input and re-fetch + re-render the list, on failure show the server's message

**Checkpoint**: US1 + US3 + US2 work — the owner can capture and review items.

---

## Phase 8: User Story 4 — Mark as completed (Priority: P2)

**Goal**: The owner completes a pending item; the change is one-way, idempotent and persistent (FR-015–FR-019).

**Independent Test**: Seed a pending item, complete it in the UI and via API twice, check 404 for unknown ids.

### Tests for User Story 4

- [ ] T043 [P] [US4] Create `test/api.complete.test.ts`: pending → `200` with `status: "completed"` and ISO `completedAt`; second call → `200` with the **same** `completedAt` (FR-018); id `999999`, `0`, `-1`, `abc` → `404 NOT_FOUND`, no rows changed (FR-019); other items unchanged; list order unchanged after completion (FR-011); no endpoint exists to revert status (FR-017)
- [ ] T044 [P] [US4] Create `test/ui.complete.test.ts` (happy-dom, `fetch` stubbed): "Complete" button rendered only for pending items (none for completed, FR-017); click → button disabled during request → list re-fetched and item shown as Completed; failure → error message and item still Pending (FR-021)

### Implementation for User Story 4

- [ ] T045 [US4] Implement `POST /api/todos/:id/complete` in `src/worker/todos.ts`: parse id as positive integer (otherwise 404); `UPDATE todos SET status = 'completed', completed_at = ?2 WHERE id = ?1 AND status = 'pending'`; then `SELECT ... WHERE id = ?1`; no row → `404 NOT_FOUND`; else `200` with the `Todo`
- [ ] T046 [US4] Add a "Complete" button (with accessible name including the description) to pending items in `src/client/render.ts` and its click handler in `src/client/main.ts`: disable during request, `POST /api/todos/{id}/complete`, re-fetch and re-render on success, show error on failure

**Checkpoint**: All four user stories work independently and together.

---

## Phase 9: Polish & Cross-Cutting Concerns

- [ ] T047 [P] Create `README.md`: what the app is, public URL, local setup (link quickstart.md), how the SDD/Jira/CI/AI-review workflow is used, link to docs/
- [ ] T048 Run every scenario in quickstart.md against the public URL (including SC-004 persistence across a redeploy and SC-007 with 500 seeded items locally); record results in the PR description
- [ ] T049 [P] Write the learning guide `docs/learning-guide.md` (architecture, Spec Kit, Jira, GitHub Actions, AI-assisted development, end-to-end walkthrough, cheatsheet, lessons learned) reflecting the setup actually implemented

---

## Dependencies & Execution Order

### Phase Dependencies

```text
Setup (1) → Foundational (2) → CI & AI Review (3) → US1 (4) → Deploy (5) → US3 (6) → US2 (7) → US4 (8) → Polish (9)
```

- **CI (3) before features**: every feature PR gets CI + AI review. It needs Phase 2 so
  `npm test` has real tests to run.
- **Deploy (5) after US1 (4)**: the first public deployment must already require
  authentication (constitution IV). From then on each merge deploys automatically.
- **US3 → US2 → US4**: US2's acceptance check and US4's button both render inside the
  list built in US3. Each remains independently testable via seeded data.

### Within Each Phase

- [P] test tasks and [P] implementation tasks touching different files may run in parallel.
- Implementation tasks in the same file (`src/worker/todos.ts`, `src/client/main.ts`,
  `src/client/render.ts`) are sequential.
- A phase is complete only when its tests and the whole CI pipeline pass.

### Parallel Example: User Story 2

```bash
# Tests in parallel (different files):
Task: "T037 test/validation.test.ts"
Task: "T038 test/api.create.test.ts"
Task: "T039 test/ui.add.test.ts"
# Then sequentially: T040 (validation.ts) → T041 (todos.ts) → T042 (index.html + main.ts)
```

---

## Implementation Strategy

### MVP

Phases 1–5: a deployed, protected, CI-checked application with an automatic pipeline —
proves the entire delivery chain before any TODO functionality exists. Phases 6–8 then
each ship as a reviewed PR that auto-deploys on merge.

### Per-phase loop (the AI-assisted workflow)

1. Move the phase's Jira issue to **In Progress**; create branch `<JIRA-KEY>-<slug>` from `main`.
2. AI agent implements the phase's tasks, ticking them off in this file.
3. Commits `type(<JIRA-KEY>): ...`; push; AI agent opens the PR (template filled).
4. CI + AI review run; issue → **In Review**; findings addressed.
5. Human approves and merges → deploy runs → issue → **Done**.
6. Notable setup decisions, commands and gotchas from the phase are appended to
   `docs/learning-guide.md` (constitution workflow item 7); T049 finalises it.

---

## Jira Mapping

Epic: **[TODO-1](https://papilaualiaksandr.atlassian.net/browse/TODO-1) Personal TODO List (001-todo-app)**. Phase issues are children of the epic and linked in order with "blocks".

| Phase | Jira type | Summary | Tasks | Key |
|-------|-----------|---------|-------|-----|
| 1 | Task | Project setup & tooling | T001–T009 | [TODO-2](https://papilaualiaksandr.atlassian.net/browse/TODO-2) |
| 2 | Task | Foundation: schema, Worker skeleton, test harness | T010–T017 | [TODO-3](https://papilaualiaksandr.atlassian.net/browse/TODO-3) |
| 3 | Task | CI pipeline, AI code review, branch protection | T018–T021 | [TODO-4](https://papilaualiaksandr.atlassian.net/browse/TODO-4) |
| 4 | Story | US1 — Private access | T022–T024 | [TODO-5](https://papilaualiaksandr.atlassian.net/browse/TODO-5) |
| 5 | Task | Deployment pipeline & first deploy | T025–T030 | [TODO-6](https://papilaualiaksandr.atlassian.net/browse/TODO-6) |
| 6 | Story | US3 — View the list | T031–T036 | [TODO-7](https://papilaualiaksandr.atlassian.net/browse/TODO-7) |
| 7 | Story | US2 — Add a TODO | T037–T042 | [TODO-8](https://papilaualiaksandr.atlassian.net/browse/TODO-8) |
| 8 | Story | US4 — Mark as completed | T043–T046 | [TODO-9](https://papilaualiaksandr.atlassian.net/browse/TODO-9) |
| 9 | Task | Polish, quickstart validation & learning guide | T047–T049 | [TODO-10](https://papilaualiaksandr.atlassian.net/browse/TODO-10) |

---

## Notes

- Task IDs, story labels, and FR/US references are the traceability links used in
  commits, PRs, and Jira issues.
- Anything not listed here or in spec.md is out of scope (constitution I, FR-022).
