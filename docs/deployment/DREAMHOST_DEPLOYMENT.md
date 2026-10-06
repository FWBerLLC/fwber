# Deploying fwber to DreamHost (Legacy Reference)

> **Status:** Legacy reference only. Do not treat this as the preferred production path for the active fwber stack.

fwber originally carried DreamHost-oriented deployment guidance, but the current restored architecture now includes:
- realtime websockets
- Redis-backed queues/sessions/cache
- Stripe billing
- merchant commerce
- Rust geo service

Because of that, the preferred deployment recommendation is now:
- **Frontend:** Vercel
- **Backend/Realtime/Geo/Data:** Hetzner VPS

## Current Recommendation
Use the following docs instead:
- `DEPLOY.md`
- `docs/ai/deployment/hetzner-vercel-production.md`
- `docs/deployment/HETZNER_VERCEL_DEPLOYMENT.md`

## Why This Was Deprecated
DreamHost shared/VPS guidance is no longer the best operational fit for the active fwber stack because production now benefits from:
- systemd-managed workers and websocket services
- Redis as the primary production cache/session/queue layer
- stronger process control for Reverb and Rust geo runtime
- cleaner reverse proxy control for `api.fwber.site`, `ws.fwber.site`, and `geo.fwber.site`

The old DreamHost notes may still be useful historically, but should not drive new production decisions.
