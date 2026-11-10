# Implementation Plan: Personal TODO List

**Branch**: `001-todo-app` | **Date**: 2026-11-10 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-todo-app/spec.md`

## Summary

A single-user, password-protected TODO list on the web: add items, see them newest
first with a pending/completed status, and mark items completed (one-way). Data must
survive reloads, devices and redeploys.

Technical approach: one Cloudflare Worker (TypeScript + Hono) that authenticates every
request with HTTP Basic Auth, serves a three-endpoint JSON API backed by Cloudflare D1,
and serves a Vite-built vanilla-TypeScript page through Workers Static Assets. GitHub
Actions runs lint/type-check/tests/build on PRs and deploys (migrations + Worker) on
merge to `main`. See [research.md](./research.md) for every decision and rejected
alternative.

## Technical Context

**Language/Version**: TypeScript 6.0.x (strict), running on the Cloudflare Workers
runtime (server) and modern browsers (client); Node.js ≥ 22.12 for tooling

**Primary Dependencies**: Hono 4.13.x (runtime, only production dependency).
Dev: Wrangler 4.x, Vite 8.x, Vitest 4.1.x, @cloudflare/vitest-pool-workers 0.23.x,
happy-dom, ESLint 10 + typescript-eslint 8.72, Prettier 3, @cloudflare/workers-types

**Storage**: Cloudflare D1 (`todo-db`, binding `DB`), schema via Wrangler migrations

**Testing**: Vitest — API tests inside the Workers runtime against local D1; unit tests
for validation; UI tests with happy-dom

**Target Platform**: Cloudflare Workers (public `*.workers.dev` URL); evergreen desktop
and mobile browsers

**Project Type**: Web application — single deployable (API + static frontend in one Worker)

**Performance Goals**: Add/complete reflected in UI ≤ 1 s (SC-002, SC-003); list usable
≤ 2 s with 500 items (SC-007) — trivially met by a single indexed-by-PK table

**Constraints**: All routes behind auth (FR-001); no background polling (FR-014a);
no optimistic UI (FR-021); one production dependency; Workers free tier

**Scale/Scope**: 1 user, hundreds of items, 1 page, 3 API endpoints, 1 table

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Pre-research | Post-design |
|-----------|------|:---:|:---:|
| I. Spec is source of truth | Every endpoint/UI element traces to an FR; nothing beyond FR-022 scope | ✅ | ✅ 3 endpoints ↔ FR-004/010/015; no edit/delete/uncomplete anywhere |
| II. Simplicity first | 1 Worker, 1 DB, justified deps, no speculative layers | ✅ | ✅ 1 runtime dep (Hono); no ORM/repository/service layers; vanilla TS UI |
| III. Tested behaviour | Each acceptance scenario has an automated test; real D1 in tests; CI gates merge | ✅ | ✅ Workers-pool tests on local D1 + happy-dom UI tests (R10) |
| IV. Secure by default | Auth on all routes incl. assets; secrets not in code; parameterised SQL; text rendering | ✅ | ✅ `run_worker_first` (R2), Worker secrets (R3), `.bind()` only (R5), `textContent` + CSP (R8, R9) |
| V. Traceability | Work maps to Jira; keys in branches/commits/PRs | ✅ | ✅ Enforced in `/speckit-tasks` → Jira mapping and PR template |
| Tech constraints | Workers, TS, Hono, D1, Vite + vanilla TS, Vitest, GH Actions, npm, ESLint + Prettier | ✅ | ✅ Exactly this stack |
| Workflow gates | PR CI, AI review, human approval, deploy on merge | ✅ | ✅ `ci.yml`, AI review workflow, branch protection, `deploy.yml` (R12) |

**Result**: PASS — no violations, Complexity Tracking not required.

Notes:
- `happy-dom` is a dev-only dependency justified by constitution III (UI acceptance
  scenarios such as literal-text rendering and status labels must be tested).
- The AI code-review workflow and CI/CD are delivery infrastructure required by the
  constitution's workflow section, not application features.

## Project Structure

### Documentation (this feature)

```text
specs/001-todo-app/
├── spec.md              # Requirements (/speckit-specify, /speckit-clarify)
├── plan.md              # This file
├── research.md          # Phase 0: decisions & alternatives
├── data-model.md        # Phase 1: todos table, validation, state machine
├── quickstart.md        # Phase 1: run & validation scenarios
├── contracts/
│   └── openapi.yaml     # Phase 1: HTTP API contract
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── tasks.md             # Phase 2 (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

```text
src/
├── worker/
│   ├── index.ts          # Hono app: secureHeaders, basicAuth, mounts /api, assets fallback
│   ├── todos.ts          # /api/todos routes + the three SQL statements
│   └── env.ts            # Env bindings type (DB, ASSETS, AUTH_USERNAME, AUTH_PASSWORD)
├── shared/
│   ├── validation.ts     # normalizeDescription(), grapheme counting (used by both sides)
│   └── types.ts          # Todo / ApiError types matching contracts/openapi.yaml
└── client/
    ├── index.html        # Single page
    ├── main.ts           # entry: fetch API, wire form + complete handlers
    ├── render.ts         # pure DOM-building functions (textContent only), unit-tested
    └── styles.css

migrations/
└── 0001_create_todos.sql

test/
├── helpers.ts            # resetDb, seedTodo, authHeaders
├── foundation.test.ts    # migrations applied, API 404, security headers
├── auth.test.ts          # US1: 401 on API and static assets, wrong/correct creds, fail closed
├── api.list.test.ts      # US3: Workers pool + local D1: ordering, shape, 500 items
├── api.create.test.ts    # US2: 201/400 cases, no row on invalid input
├── api.complete.test.ts  # US4: 200 idempotent, 404 cases, order unchanged
├── validation.test.ts    # US2: trim, empty, 200/201, emoji/Cyrillic
├── ui.list.test.ts       # US3 (happy-dom): empty state, literal text, status labels
├── ui.add.test.ts        # US2 (happy-dom): add flow, disabled button, errors
└── ui.complete.test.ts   # US4 (happy-dom): complete button, errors

.github/
├── workflows/
│   ├── ci.yml            # PR + main: lint, format, typecheck, test, build
│   ├── deploy.yml        # main: D1 migrations --remote + wrangler deploy
│   └── ai-review.yml     # PR: Claude Code AI review
└── pull_request_template.md   # Jira key, spec/task refs, checklist

wrangler.jsonc            # Worker name, D1 binding, assets (run_worker_first), observability
vite.config.ts            # root src/client → dist/client
vitest.config.ts          # Workers pool project + happy-dom project
tsconfig.json             # strict; workers-types for worker, DOM lib for client
eslint.config.js
.prettierrc
.dev.vars.example         # AUTH_USERNAME= / AUTH_PASSWORD= (template, committed)
package.json
CLAUDE.md                 # Runtime guidance for the AI agent (points to constitution & specs)
```

**Structure Decision**: Single project (not the frontend/backend split), because there
is one deployable unit. `src/worker`, `src/client` and `src/shared` separate the two
runtimes while letting validation be shared. Tests live in one `test/` folder with one
file per concern.

### Request flow

```text
Browser ──HTTPS──▶ Worker (run_worker_first)
                    │ secureHeaders
                    │ basicAuth ──✗──▶ 401 + WWW-Authenticate
                    ├─ /api/todos*  ──▶ todos.ts ──▶ D1 (todos)
                    └─ everything else ──▶ env.ASSETS.fetch() ──▶ dist/client (index.html, JS, CSS)
```

### npm scripts (contract for CI and contributors)

| Script | Command |
|--------|---------|
| `dev` | `vite build && wrangler dev` |
| `build` | `vite build && wrangler deploy --dry-run --outdir dist/worker` |
| `test` | `vitest run` |
| `lint` | `eslint .` |
| `format:check` | `prettier --check .` |
| `format` | `prettier --write .` |
| `typecheck` | `tsc --noEmit` |
| `db:migrate:local` | `wrangler d1 migrations apply todo-db --local` |
| `deploy` | `wrangler deploy` (CI only) |

## Delivery Order (input for /speckit-tasks)

1. **Setup**: package.json, TS/ESLint/Prettier config, wrangler.jsonc, Vite/Vitest config,
   `.dev.vars.example`, CLAUDE.md.
2. **Foundation**: D1 migration, Env types, Hono app skeleton with secureHeaders + assets
   fallback, shared validation.
3. **US1 Private access** (P1) — auth middleware + tests.
4. **US2 Add** (P1) — POST endpoint, form UI + tests.
5. **US3 View** (P1) — GET endpoint, list/empty state UI + tests.
6. **US4 Complete** (P2) — complete endpoint, button UI + tests.
7. **Delivery**: ci.yml, deploy.yml, ai-review.yml, PR template, Cloudflare D1 creation,
   Worker secrets, first deploy; quickstart validation on the public URL.

(CI may be pulled forward to just after Setup so every subsequent PR is checked —
decided in `/speckit-tasks`.)

## Complexity Tracking

No constitution violations — section intentionally empty.
