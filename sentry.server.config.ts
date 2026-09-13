import * as Sentry from "@sentry/nextjs";

// Left unset (no SENTRY_DSN) this is a safe no-op — nothing is sent
// anywhere until a DSN is configured.
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,
});
