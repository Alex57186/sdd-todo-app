// Single Worker: security headers → (auth, added in US1/T023) → /api/todos → static assets.
// See plan.md "Request flow" and research R1, R2, R9.
import { Hono } from "hono";
import { secureHeaders } from "hono/secure-headers";
import type { Env } from "./env";
import { todos } from "./todos";
import type { ApiError } from "../shared/types";

const app = new Hono<{ Bindings: Env }>();

// Research R9: strict CSP (no inline scripts), nosniff, no framing — on every response.
app.use(
  "*",
  secureHeaders({
    contentSecurityPolicy: {
      defaultSrc: ["'self'"],
      frameAncestors: ["'none'"],
    },
  }),
);

app.route("/api/todos", todos);

// Any other /api/* path is a JSON 404 (never falls through to static assets).
app.all("/api/*", (c) =>
  c.json<ApiError>({ error: { code: "NOT_FOUND", message: "Not found." } }, 404),
);

// Everything else is the static frontend (research R1).
// ASSETS returns a Response with immutable headers; re-wrap it so the secureHeaders
// middleware can add CSP etc. after this handler runs.
app.all("*", async (c) => {
  const asset = await c.env.ASSETS.fetch(c.req.raw);
  return new Response(asset.body, asset);
});

app.onError((err, c) => {
  // Never log request bodies, descriptions or credentials (research R13).
  console.error("Unhandled error:", err.name, err.message);
  return c.json<ApiError>(
    { error: { code: "INTERNAL_ERROR", message: "Something went wrong. Please try again." } },
    500,
  );
});

export default app;
