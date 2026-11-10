// Types for `env` / `exports` from "cloudflare:workers" inside the Worker test project.
import type { D1Migration } from "cloudflare:test";
import type { Env as WorkerEnv } from "../src/worker/env";

declare global {
  namespace Cloudflare {
    interface Env extends WorkerEnv {
      /** Migration SQL read by vitest.config.ts, applied in test/apply-migrations.ts. */
      TEST_MIGRATIONS: D1Migration[];
    }
    interface GlobalProps {
      mainModule: typeof import("../src/worker/index");
    }
  }
}
