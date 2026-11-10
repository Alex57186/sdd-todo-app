# Learning Guide (work in progress)

> Running notes captured phase by phase (constitution, Development Workflow item 7).
> Task T049 turns these into the final Technical Report / Learning Guide / Cheatsheet.

## Phase 1 — Project setup & tooling (TODO-2)

### Spec Kit installation (before Phase 1)

- Installed with `uvx --from git+https://github.com/github/spec-kit.git specify init --here --force --integration claude --script sh --non-interactive`.
- The current CLI uses `--integration claude` (older docs say `--ai claude`), and the commands
  are Claude Code **skills** with hyphens: `/speckit-specify`, `/speckit-plan`, … (older docs:
  `/speckit.specify`).
- `.gitattributes` with `* text=auto eol=lf` keeps the Spec Kit bash scripts runnable on Windows.

### Gotchas found while implementing

| Problem                                                   | Symptom                                                                                                          | Fix                                                                                                                                                                                     |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| npm ≥ 11.20 blocks dependency install scripts by default  | `npm warn install-scripts esbuild… workerd…`; Wrangler/Vitest cannot start because platform binaries are missing | `npm install-scripts approve esbuild workerd` → writes a pinned `allowScripts` block into `package.json`, which `npm ci` (and CI) honours. Re-approve when those packages are upgraded. |
| `@cloudflare/vitest-pool-workers` is deprecated (renamed) | `npm view … deprecated` → "renamed to `@cloudflare/vitest-plugin`"                                               | Switched to `@cloudflare/vitest-plugin` 1.6 (`cloudflareTest()` Vite plugin). Plan amended first (research R10) in its own commit — SDD: plan before code.                              |
| TypeScript 7 vs typescript-eslint                         | typescript-eslint 8.72 peer range is `typescript <6.1`                                                           | Pinned TypeScript `~6.0` (found during `/speckit-plan` research).                                                                                                                       |
| TypeScript 6 no longer auto-loads `@types/*`              | Workers globals not found                                                                                        | List them explicitly: `"types": ["@cloudflare/workers-types", "@cloudflare/vitest-plugin/types"]`.                                                                                      |
| Windows `EBUSY` during `npm ci`                           | `rmdir … node_modules/@cloudflare/workers-types` busy                                                            | A shell had its working directory inside `node_modules`; move out and rerun.                                                                                                            |
| `tsc -p src/client` with no files                         | `TS18003: No inputs were found`                                                                                  | Empty `src/client/main.ts` entry module created early.                                                                                                                                  |
| npm audit: 10 moderate                                    | `minimatch` ReDoS via typescript-eslint (dev/lint only)                                                          | Accepted: not shipped to the Worker; npm's "fix" would downgrade ESLint. Revisit when typescript-eslint updates.                                                                        |

### Two TypeScript configs, why

The Worker runs in the Workers runtime (no DOM; `@cloudflare/workers-types`), the frontend
runs in the browser (DOM lib). One tsconfig cannot describe both correctly, so:

- `tsconfig.json` → `src/worker`, `src/shared`, Worker-pool tests.
- `src/client/tsconfig.json` → `src/client`, `src/shared`, `test/ui*.test.ts` (happy-dom).
- `npm run typecheck` runs both.
