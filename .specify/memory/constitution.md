# Simple TODO App Constitution

## Core Principles

### I. Spec Is the Source of Truth

- Every behaviour of the application MUST be traceable to a requirement in an approved
  specification under `specs/`.
- Code, tests, or UI elements that implement unspecified behaviour MUST NOT be merged.
- When implementation reveals a gap or error in the spec, the spec MUST be updated (and
  re-approved) first; code follows the spec, never the other way around.
- Workflow order is fixed: specify → (clarify) → plan → tasks → (analyze) → implement.

**Rationale**: The project exists to demonstrate Spec-Driven Development. Specs constrain
the AI agent and make every change reviewable against an explicit intent.

### II. Simplicity First (YAGNI)

- The system MUST be a single Cloudflare Worker serving both the API and the static
  frontend, backed by a single database. No microservices, queues, or extra services.
- Every runtime dependency MUST be justified in the plan; prefer the platform and the
  standard library. A UI framework is not required and MUST NOT be added without a
  documented reason.
- No speculative abstractions (repositories, service layers, DI containers, generic
  helpers) until the same need appears at least twice.
- The whole codebase MUST remain understandable by one developer in one sitting.

**Rationale**: This is a learning vehicle; complexity in the app distracts from the
process being learned and increases review burden for humans and AI alike.

### III. Tested Behaviour

- Every acceptance scenario in a spec MUST be covered by at least one automated test.
- API behaviour MUST be tested against a real local database (Workers test runtime with
  D1), not mocks of the database.
- Lint, type-check, tests, and build MUST pass locally and in CI before a PR can merge.
- Tests MAY be written alongside the implementation within the same task, but a task is
  not complete until its tests pass.

**Rationale**: Automated checks are the objective gate that lets AI-written code be
trusted and lets CI deploy on merge without manual verification.

### IV. Secure by Default

- All application routes (API and UI) MUST require authentication. HTTP Basic Auth with
  a single configured user is the accepted mechanism; credentials MUST come from Worker
  secrets, never from source code.
- Secrets (API tokens, passwords, account IDs used for deploys) MUST live only in
  Cloudflare secrets, GitHub Actions secrets, or untracked local files (`.dev.vars`).
- All database access MUST use parameterised queries; all request input MUST be
  validated server-side.
- User-supplied text MUST be rendered as text (never as raw HTML) in the UI.

**Rationale**: The app is publicly reachable; a minimal but non-negotiable baseline
prevents the most common web vulnerabilities, and gives the AI reviewer clear rules to
check against.

### V. End-to-End Traceability

- Every unit of work MUST map to a Jira issue. User stories map to Jira Stories; Spec Kit
  tasks map to Jira Tasks/Sub-tasks.
- The Jira issue key (e.g. `TODO-12`) MUST appear in the branch name, in every commit
  message, and in the PR title.
- Each PR description MUST link the Jira issue and the relevant spec/task IDs (e.g.
  `specs/001-todo-app/tasks.md T007`).
- Jira status MUST reflect reality: In Progress when a branch is opened, In Review when
  a PR is opened, Done when merged.

**Rationale**: Traceability from requirement → spec → task → commit → PR → deployment is
a core deliverable of this project and makes AI-produced changes auditable.

## Technology & Platform Constraints

- **Runtime/Hosting**: Cloudflare Workers (with Workers Static Assets for the frontend).
- **Language**: TypeScript (strict mode) for both backend and frontend.
- **Backend**: Hono as the HTTP router.
- **Database**: Cloudflare D1; schema changes MUST be applied via versioned Wrangler
  migrations committed to the repository.
- **Frontend**: Vite + vanilla TypeScript; minimal, accessible, no CSS framework.
- **Testing**: Vitest with the Cloudflare Workers pool.
- **CI/CD**: GitHub Actions; deployment to Cloudflare happens only from CI on `main`.
- **Tooling**: npm as the package manager; ESLint + Prettier (or an equivalent single
  tool) for linting/formatting.

Changing any item above requires a constitution amendment.

## Development Workflow & Quality Gates

1. **Specify before building**: new or changed behaviour starts with `/speckit-specify`
   (or an update to an existing spec) and requires human approval of the spec.
2. **Plan and tasks**: `/speckit-plan` and `/speckit-tasks` produce the plan and task list;
   both are reviewed by a human before implementation starts.
3. **Branching**: work happens on short-lived branches named
   `<JIRA-KEY>-<short-description>` (e.g. `TODO-12-mark-complete`). `main` is protected;
   direct pushes are not allowed.
4. **Commits**: Conventional Commits style with the Jira key, e.g.
   `feat(TODO-12): mark todo as completed`.
5. **Pull requests**: may be opened by the AI agent or a human. Every PR MUST:
   - pass CI (lint, type-check, test, build);
   - receive an automated AI code review covering correctness, security, code quality,
     and compliance with the spec and this constitution;
   - be **merged by a human** after reviewing the diff, CI and the AI review. AI agents
     MUST NOT approve or merge PRs, and AI review never substitutes for the human decision.
     The human merge is the approval: the agent opens PRs under the owner's GitHub account
     and GitHub forbids approving one's own PR, so `main` protection requires a PR, a green
     `ci` check and resolved conversations rather than a formal approving review. If the
     agent gets its own GitHub account, ≥ 1 approving review MUST be required instead.
6. **Deployment**: merging to `main` triggers automatic deployment (including D1
   migrations) to Cloudflare Workers via GitHub Actions.
7. **Documentation**: setup and workflow knowledge is captured under `docs/` as it is
   learned, culminating in the final learning guide.

## Governance

- This constitution supersedes other project conventions. Spec Kit commands
  (`/speckit-plan`, `/speckit-analyze`, etc.) and the AI code reviewer MUST check work
  against it, and any violation MUST be either fixed or explicitly justified in the
  plan's Complexity Tracking section.
- Amendments are made via a PR that edits this file, states the rationale, and bumps
  the version:
  - MAJOR — removing or redefining a principle;
  - MINOR — adding a principle or section, or materially expanding guidance;
  - PATCH — wording and clarification only.
- Amendments require human approval like any other PR.
- Runtime guidance for AI agents lives in `CLAUDE.md` and MUST stay consistent with
  this constitution.

**Version**: 1.0.1 | **Ratified**: 2026-11-10 | **Last Amended**: 2026-11-10
