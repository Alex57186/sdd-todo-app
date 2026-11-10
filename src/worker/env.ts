// Worker bindings (wrangler.jsonc + Worker secrets). See plan.md "Source Code".
export interface Env {
  /** D1 database `todo-db` (research R5). */
  DB: D1Database;
  /** Workers Static Assets: the Vite-built frontend in dist/client (research R1). */
  ASSETS: Fetcher;
  /** Owner credentials — Worker secrets, never in source (FR-003, research R3). */
  AUTH_USERNAME: string;
  AUTH_PASSWORD: string;
}
