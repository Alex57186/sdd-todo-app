# CLAUDE.md

Guidance for AI agents (Claude Code) working in this repository.

## What this is

A deliberately small, single-user TODO web app whose real purpose is to demonstrate
**Spec-Driven Development** with GitHub Spec Kit, Jira traceability, GitHub Actions CI/CD
and AI-assisted pull requests and reviews.

## Source of truth — read before changing anything

1. `.specify/memory/constitution.md` — non-negotiable project rules (simplicity, tests,
   security, traceability, workflow).
2. `specs/001-todo-app/spec.md` — what to build (user stories, FR-xxx, SC-xxx).
3. `specs/001-todo-app/plan.md`, `research.md`, `data-model.md`,
   `contracts/openapi.yaml` — how to build it.
4. `specs/001-todo-app/tasks.md` — the ordered task list (T001…) and the Jira mapping.

**Implement only what `tasks.md` and `spec.md` specify.** Anything listed in FR-022
(edit, delete, un-complete, due dates, priorities, multi-user, filtering, search) is out of
scope. If the spec or plan is wrong or incomplete, update the spec/plan first (in its own
commit), then the code.

## Architecture in one breath

One Cloudflare Worker (`src/worker/`, Hono) authenticates every request with HTTP Basic
Auth, serves `/api/todos` backed by D1 (`migrations/`), and serves the Vite-built vanilla
TypeScript frontend (`src/client/` → `dist/client`) via Workers Static Assets with
`run_worker_first`. Shared validation lives in `src/shared/`.

## Commands

```bash
npm ci                    # install (install scripts allow-listed in package.json "allowScripts")
npm run dev               # build client + wrangler dev (needs .dev.vars, see .dev.vars.example)
npm run db:migrate:local  # apply D1 migrations locally
npm test                  # Vitest: "worker" project (workerd + D1) and "ui" project (happy-dom)
npm run lint              # ESLint
npm run format:check      # Prettier (npm run format to fix)
npm run typecheck         # tsc for worker/shared/tests and for src/client
npm run build             # vite build + wrangler deploy --dry-run
```

All of lint, format:check, typecheck, test and build must pass before opening a PR.

## Workflow conventions (constitution V)

- One `tasks.md` phase = one Jira issue = one branch = one PR.
- Branch: `<JIRA-KEY>-<short-slug>`, e.g. `TODO-7-view-list`.
- Commits: Conventional Commits with the Jira key as scope, e.g. `feat(TODO-7): list todos newest first`.
- PR title starts with the Jira key; the body links the Jira issue and cites spec/task ids.
- Tick completed tasks (`- [X]`) in `tasks.md` in the same PR.
- Jira status: In Progress when the branch is created, In Review when the PR is opened,
  Done after merge. Jira site: https://papilaualiaksandr.atlassian.net, project `TODO`.
- Never approve or merge PRs and never push to `main` (branch protection enforces PR + green
  `ci`); only a human merges — that merge is the human approval (constitution v1.0.1).

## Rules of thumb

- Direct SQL with `.prepare().bind()` only — no string-built SQL, no ORM.
- Render user text with `textContent`, never `innerHTML`.
- Never log descriptions or credentials. Never commit secrets (`.dev.vars` is gitignored).
- Tests run against a real local D1, not mocks.
