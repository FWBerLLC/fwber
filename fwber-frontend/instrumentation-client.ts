import * as Sentry from '@sentry/nextjs'

// Sentry v10: Session Replay moved to its own package (@sentry/replay).
// Declared in package.json; loaded optionally so type-checks and local builds
// keep working before npm install brings the package in (npm dies silently
// on some dev boxes - see TODO). When present, replays capture interaction
// shape only (privacy-first: all text/inputs masked, all media blocked).
let replayIntegrationFn: any = null
try {
  replayIntegrationFn = require('@sentry/replay').replayIntegration
} catch {
  replayIntegrationFn = null
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tunnel: '/api/sentry-tunnel',
  tracesSampleRate: 1,
  debug: false,
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
  integrations: [
    // PRIVACY-FIRST POSTURE (dating app): replays capture interaction shape
    // only - all text and form inputs masked, all media blocked. If this is
    // ever relaxed it must be a deliberate, documented privacy decision.
    ...(replayIntegrationFn
      ? [
          replayIntegrationFn({
            maskAllText: true,
            maskAllInputs: true,
            blockAllMedia: true,
          }),
        ]
      : []),
  ],
})
