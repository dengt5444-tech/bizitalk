import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";

const nextConfig: NextConfig = {
  /* config options here */
};

// Wraps the build to upload source maps to Sentry for readable stack
// traces — a safe no-op locally/in CI without SENTRY_AUTH_TOKEN set (it
// just skips the upload and logs nothing is configured).
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: true,
  webpack: {
    treeshake: { removeDebugLogging: true },
  },
});
