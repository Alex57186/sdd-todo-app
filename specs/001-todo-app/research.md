# Research: Personal TODO List

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Date**: 2026-11-10

Each entry records a decision, why it was made, and what was rejected. Versions were
checked against the npm registry on 2026-11-10.

---

## R1. Deployment shape: one Worker serving API and static frontend

- **Decision**: A single Cloudflare Worker. The frontend is built to static files and
  served through **Workers Static Assets** (`assets` binding in `wrangler.jsonc`); the
  API is handled by the same Worker under `/api/*`.
- **Rationale**: One deploy, one URL, one config, one log stream (constitution II). No
  CORS because UI and API share an origin; Basic Auth credentials cached by the browser
  are reused automatically by same-origin `fetch()` calls.
- **Alternatives considered**:
  - Cloudflare Pages for frontend + Worker for API — two deploy targets, CORS or routing
    glue; rejected as unnecessary.
  - Server-rendered HTML from the Worker (no frontend build) — fewer tools, but the
    constitution fixes Vite + TypeScript for the frontend, and a client script is still
    needed for add/complete without reload (FR-009, FR-016).

## R2. Protecting static assets with authentication

- **Decision**: Set `assets.run_worker_first = true` so **every** request (including
  `index.html`, JS, CSS) enters the Worker, passes the auth middleware, and only then is
  forwarded to `env.ASSETS.fetch(request)`.
- **Rationale**: By default Workers Static Assets serves matching files *without*
  invoking the Worker, which would expose the UI shell to anonymous visitors and violate
  FR-001 ("before revealing any part of the application").
- **Alternatives considered**: Cloudflare Access (Zero Trust) in front of the Worker —
  stronger, but needs a Zero Trust account setup and moves auth outside the repo/spec
  (not testable in CI); rejected for this project.

## R3. Authentication mechanism

- **Decision**: HTTP Basic Auth via Hono's built-in `basicAuth` middleware, applied to
  all routes. Credentials come from Worker secrets `AUTH_USERNAME` and `AUTH_PASSWORD`
  (local: `.dev.vars`, untracked). Unauthenticated responses are `401` with
  `WWW-Authenticate: Basic realm="TODO", charset="UTF-8"` and a body that reveals no data.
- **Rationale**: Fixed by the constitution (IV). Browser shows a native credential
  prompt; no login page, session store, or cookies to build. Hono's middleware compares
  credentials using hashed, timing-safe comparison.
- **Password policy (FR-003a)**: ≥ 20 random characters, generated once by the operator
  (e.g. `openssl rand -base64 30`). No throttling/lockout in the app (Clarification Q1).
- **Alternatives considered**: hand-written Basic Auth parsing — more code to get wrong;
  JWT/session login — out of scope per constitution.

## R4. Backend framework

- **Decision**: **Hono 4.x** (latest 4.13.x).
- **Rationale**: Tiny, Workers-native router with typed bindings (`Hono<{ Bindings: Env }>`),
  built-in `basicAuth` and `secureHeaders` middleware — covers routing, auth, and security
  headers with one dependency.
- **Alternatives considered**: no framework (raw `fetch` handler with `URLPattern`) —
  zero deps but re-implements auth/headers/routing; itty-router — smaller but lacks the
  built-in auth/secure-headers middleware.

## R5. Database and access pattern

- **Decision**: **Cloudflare D1** (binding `DB`, database `todo-db`). Direct SQL with
  `env.DB.prepare(...).bind(...)` — no ORM, no repository layer. Schema managed by
  versioned Wrangler migrations in `migrations/`.
- **Rationale**: Persistent, managed, free-tier SQLite native to Workers (FR-020). `bind()`
  gives parameterised queries (constitution IV). Three queries total — an ORM would be
  pure overhead (constitution II).
- **Alternatives considered**: Workers KV — no ordering/queries, eventually consistent
  (a just-added item might not appear on reload); Durable Objects — overkill; external
  Postgres (Neon/Supabase) — extra account, network hop, secrets; Drizzle ORM — unneeded
  abstraction for three statements.

## R6. Item identifiers and ordering

- **Decision**: `INTEGER PRIMARY KEY AUTOINCREMENT` ids. List ordered by
  `created_at DESC, id DESC`.
- **Rationale**: Single user behind auth, so guessable ids are not a risk. `AUTOINCREMENT`
  guarantees ids are never reused. `id DESC` is a deterministic tie-breaker when two items
  share the same millisecond timestamp. Completing an item does not touch either column,
  so its position never changes (FR-011).
- **Alternatives considered**: UUIDs — no benefit for a single-user app, harder to read in
  tests and logs.

## R7. "User-perceived characters" for the 200-character limit

- **Decision**: Count grapheme clusters with `Intl.Segmenter` (granularity `grapheme`),
  after `String.prototype.trim()`. One shared function in `src/shared/validation.ts` is
  used by both the Worker (authoritative) and the browser (instant feedback).
- **Rationale**: Spec edge case: "🍞" and "Купить хлеб" must count as the user sees them.
  `string.length` counts UTF-16 code units (🍞 = 2) and the HTML `maxlength` attribute has
  the same flaw, so neither is used as the source of truth. `Intl.Segmenter` is available
  in the Workers runtime and in all modern browsers.
- **Alternatives considered**: `Array.from(str).length` (code points) — miscounts
  combined emoji such as 👍🏽 or family emoji; `maxlength` only — wrong unit and
  client-side only.

## R8. Frontend

- **Decision**: **Vite 8** + vanilla TypeScript, one HTML page, one `main.ts`, one CSS
  file. DOM built with `document.createElement` and `textContent` only (never
  `innerHTML` with user data). Build output: `dist/client`.
- **Rationale**: The UI has one form and one list — a framework adds nothing (constitution
  II). `textContent` satisfies FR-014 by construction.
- **Behaviour decisions**:
  - Data is fetched on page load and the list re-rendered from the server response after
    each add/complete (no optimistic updates) → FR-014a, FR-021 (never show unsaved
    changes).
  - Submit button disabled while a request is in flight → double-submit edge case.
  - Status shown as a text label ("Pending"/"Completed") plus a checkmark symbol and
    strike-through → FR-012 (not colour alone).
  - Completed items render no "Complete" button → FR-017.
- **Alternatives considered**: Preact / Lit / React — unnecessary for one view;
  `@cloudflare/vite-plugin` (runs the Worker inside Vite) — nicer dev server, but couples
  the Worker build to Vite; plain `wrangler` bundling of the Worker is simpler to explain.

## R9. Security headers

- **Decision**: Hono `secureHeaders` middleware on all responses, with a strict
  Content-Security-Policy (`default-src 'self'`; no inline scripts) plus
  `X-Content-Type-Options: nosniff` and `frame-ancestors 'none'`.
- **Rationale**: Defence-in-depth for FR-014 — even if an XSS bug slipped in, inline
  script injection would be blocked. One line of configuration.

## R10. Testing strategy

- **Decision**:
  - **Vitest 4.1.x** (pinned: `@cloudflare/vitest-pool-workers` 0.23 requires
    `vitest ^4.1.0`; Vitest 5 is not yet supported).
  - **API/integration tests** run inside the real Workers runtime via
    `@cloudflare/vitest-pool-workers`, with a local D1 database and migrations applied
    before tests — no DB mocks (constitution III).
  - **Validation unit tests** for `src/shared/validation.ts` (boundaries 200/201, emoji,
    trimming).
  - **UI tests** for the frontend render/interaction logic with Vitest + **happy-dom**
    (lightweight DOM), covering empty state, ordering as rendered, literal text,
    status labels, absence of "Complete" on completed items, disabled button during
    submit, error message on failure.
- **Rationale**: Every acceptance scenario in the spec maps to at least one automated test
  that runs in CI in seconds.
- **Alternatives considered**: Playwright E2E — most realistic, but adds browsers to CI
  and minutes per run; deferred (could be added later against the deployed URL).

## R11. Tooling versions

| Tool | Version | Note |
|------|---------|------|
| Node.js | ≥ 22.12 (local: 26) | Wrangler requirement; CI uses Node 22 LTS |
| TypeScript | 6.0.x | **Not 7.x**: `typescript-eslint` 8.72 supports `<6.1.0` |
| Hono | 4.13.x | |
| Wrangler | 4.x (4.159) | dev dependency, never global |
| Vite | 8.x | |
| Vitest | 4.1.x | pinned by Workers pool peer dependency |
| @cloudflare/vitest-pool-workers | 0.23.x | |
| happy-dom | latest | UI tests only |
| ESLint + typescript-eslint | 10.x + 8.72.x | flat config |
| Prettier | 3.x | format check in CI |

Package manager: **npm** (lockfile `package-lock.json`, `npm ci` in CI).

## R12. CI/CD and secrets

- **Decision**: Two GitHub Actions workflows:
  - `ci.yml` — on `pull_request` and `push` to `main`: `npm ci` → lint → format check →
    type-check → test → build.
  - `deploy.yml` — on `push` to `main` (after merge): build → `wrangler d1 migrations
    apply todo-db --remote` → `wrangler deploy`.
  - A third workflow for **AI code review** (Claude Code GitHub Action) on pull requests —
    configured as part of delivery infrastructure, not app code.
- **Secrets**:
  - GitHub Actions secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, and the
    Anthropic credential for the AI reviewer.
  - Worker secrets `AUTH_USERNAME`, `AUTH_PASSWORD`: set once by the operator with
    `wrangler secret put` (they live in Cloudflare, never in GitHub or the repo).
  - D1 `database_id` is not a secret and is committed in `wrangler.jsonc`.
- **Rationale**: Deployment only from CI on `main` (constitution); migrations run before
  the new code so the schema is always ready.
- **Alternatives considered**: Cloudflare Workers Builds (Cloudflare's own Git
  integration) — works, but hides the pipeline outside GitHub Actions, which the project
  explicitly wants to demonstrate.

## R13. Observability

- **Decision**: Rely on Cloudflare Workers built-in logs (`observability.enabled = true`
  in `wrangler.jsonc`) and `wrangler tail` for live debugging. Log unexpected server
  errors with `console.error`; never log credentials or item descriptions.
- **Rationale**: Deferred clarification item; platform logging needs no code or service.
