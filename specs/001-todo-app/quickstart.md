# Quickstart & Validation Guide: Personal TODO List

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) |
**API**: [contracts/openapi.yaml](./contracts/openapi.yaml) | **Data**: [data-model.md](./data-model.md)

This guide proves the feature works. It is a run/validation guide, not an
implementation guide.

## Prerequisites

- Node.js ≥ 22.12, npm
- (For deploy only) Cloudflare account, `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`

## Local setup

```bash
npm ci
cp .dev.vars.example .dev.vars        # then set AUTH_USERNAME / AUTH_PASSWORD
npm run db:migrate:local              # wrangler d1 migrations apply todo-db --local
npm run dev                           # builds the client, starts wrangler dev on :8787
```

## Automated validation (what CI runs)

```bash
npm run lint          # ESLint
npm run format:check  # Prettier
npm run typecheck     # tsc --noEmit
npm test              # Vitest: API tests in Workers runtime + validation + UI tests
npm run build         # vite build → dist/client; wrangler deploy --dry-run
```

Expected: all commands exit 0.

## Manual validation scenarios

Use `USER` / `PASS` from `.dev.vars`; `BASE=http://localhost:8787` (or the public URL).

| # | Scenario (spec ref) | Action | Expected |
|---|---------------------|--------|----------|
| 1 | No credentials (US1-1, FR-001) | `curl -i $BASE/` | `401`, `WWW-Authenticate: Basic ...`, no HTML app |
| 2 | Wrong credentials (US1-2) | `curl -i -u $USER:wrong $BASE/api/todos` | `401`, no item data |
| 3 | Empty state (US3-1) | Open `$BASE` in browser, sign in | Friendly "no items" message |
| 4 | Add (US2-1) | Add "Buy milk" | Appears at top as **Pending**, no reload |
| 5 | Validation (US2-2/3) | Add "   " ; add 201 chars | Error message; nothing added |
| 6 | Trim + literal text (US2-4/5) | Add `  <b>hi</b>  ` | Shown exactly as `<b>hi</b>`, not bold |
| 7 | Emoji length (Edge) | Add 200 × "🍞" | Accepted; 201 × "🍞" rejected |
| 8 | Ordering (US3-2) | Add "A", "B", "C" | Order C, B, A |
| 9 | Complete (US4-1/3/6) | Click Complete on "B" | **Completed** label + ✓, no Complete button, stays in place |
| 10 | Idempotent (US4-4) | `curl -u $USER:$PASS -X POST $BASE/api/todos/<id>/complete` twice | Both `200`, same `completedAt` |
| 11 | Not found (US4-5) | `curl -u $USER:$PASS -X POST $BASE/api/todos/999999/complete` | `404` `NOT_FOUND` |
| 12 | Persistence (US3-4, US4-2, SC-004) | Reload; open on phone; redeploy | Same items and statuses |
| 13 | Multi-tab (FR-014a) | Complete in tab 1, look at tab 2 | Tab 2 unchanged until reload |

## Deployment validation

After merge to `main`, the `deploy` workflow applies D1 migrations and deploys. Repeat
scenarios 1, 2, 4, 9 and 12 against the public `*.workers.dev` URL.
