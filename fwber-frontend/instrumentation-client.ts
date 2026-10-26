import * as Sentry from '@sentry/nextjs'
// Sentry v10: Session Replay moved to its own package — `replayIntegration` is
// no longer re-exported from `@sentry/nextjs` (it must come from
// `@sentry/replay`). v2.3.41 wrongly concluded Replay was "removed in v10"
// from a partial node_modules tree; agent review (Muse) flagged it, and a
// clean install showed the package present at 10.76.2. Fixed in v2.3.43.
import { replayIntegration } from '@sentry/replay'

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
    // only — all text and form inputs masked, all media blocked. If this is
    // ever relaxed it must be a deliberate, documented privacy decision.
    replayIntegration({
      maskAllText: true,
      maskAllInputs: true,
      blockAllMedia: true,
    }),
  ],
})
