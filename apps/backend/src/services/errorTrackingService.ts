import { env } from "../config/env.js";

export function captureServerError(error: unknown, context: { method: string; path: string; requestId?: string }) {
  const value = error instanceof Error ? error : new Error("Unknown server error");
  console.error(JSON.stringify({
    level: "error",
    service: "waves-backend",
    environment: env.SENTRY_ENVIRONMENT,
    name: value.name,
    message: value.message.slice(0, 500),
    method: context.method,
    path: context.path,
    requestId: context.requestId
  }));

  // SENTRY_DSN is reserved for the official @sentry/node adapter. Structured
  // Render logs remain the safe fallback until that dependency is enabled.
}
