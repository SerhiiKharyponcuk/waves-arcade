import { trackEvent } from "./analytics";

export function initializeErrorTracking() {
  window.addEventListener("error", (event) => {
    trackEvent("client_error", { type: "error", name: event.error instanceof Error ? event.error.name : "Error", route: window.location.pathname });
  });
  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason;
    trackEvent("client_error", { type: "unhandledrejection", name: reason instanceof Error ? reason.name : "PromiseRejection", route: window.location.pathname });
  });

  // VITE_SENTRY_DSN is reserved for the official browser SDK. The local
  // endpoint provides privacy-gated error counts without transmitting secrets.
}
