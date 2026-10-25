import * as Sentry from '@sentry/nextjs'

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart

// NOTE (v2.3.41): Sentry v10 REMOVED `replayIntegration` entirely (verified —
// absent from both the v10 type exports and the runtime module). The former
// Session Replay config is dropped here; the DSN + tunnel stay. If Replay
// returns as a supported v10+ feature, re-add it here and in package.json.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tunnel: '/api/sentry-tunnel',
  tracesSampleRate: 1,
  debug: false,
})
