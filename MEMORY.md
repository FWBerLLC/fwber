# MEMORY.md — fwber Internal Architectural Observations

## Current Version: 2.3.89 "Council Governance API, Unified Hubs, Scanner Hardening & Atomic Frontend Deploy"
**Last Updated:** 2026-11-14

### Observations (2026-11-14 session, v2.3.89)
- **Catch-all `/api` scanner hazard & Governance gap**: Terminal `app.use('/api', ...)` returning `200 []` both invited follow-up fuzzing storms from automated vulnerability scanners probing `/api/v1/namespaces/default/secrets` + `/api/v3/.env` AND masked the fact that `/api/governance` was never mounted in `fwber-backend-ts` even though `governance_proposals`, `governance_votes`, and `governance_appeals` existed in MySQL! `src/lib/scanner-guard.ts` now returns `404` for scanner probes, and `src/routes/governance.ts` implements the full Community Council + SHA-256 Merkle proof API matching `VoteVerifier.tsx`'s WebCrypto SHA-256 tree format.
- **Zero-downtime Next.js standalone swap**: Running `next build` in-place wipes `.next/standalone/fwber-frontend/server.js` for ~75s. `ops/hetzner/scripts/deploy-frontend.sh` isolates live PM2 `fwber-frontend` inside `.standalone-live/fwber-frontend/server.js` and atomically swaps `.standalone-next` into `.standalone-live` via `mv` (`<5ms`) after `next build` + `copy-standalone-assets.mjs` succeed. Do NOT override Next's `distDir` for staging swaps because `next build` bakes `distDir` into `server.js`.
- **Windows System Tray handle safety**: Calling `& taskkill.exe /PID <id> /T /F` directly in PowerShell when child processes have `-RedirectStandardOutput` handles can hang waiting on inherited pipe closure. `Invoke-BoundedTaskkill` in `tools/fwber-tray.ps1` uses `Process.Start` + `WaitForExit(4000)` + `Process.Kill()` fallback so `Stop-AllServices` / Quit never blocks.

### Observations (2026-11-14 session, v2.3.88)
- **Honest `/api/health` contract**: `src/index.ts` mounts a catch-all `app.use('/api', ...)` returning `200 []` for unmounted GET routes so legacy frontend stubs don't crash. That also masked unmounted `GET /api/health` (`src/routes/health.ts` previously only defined `GET /metrics`)! Always assert payload shape (`status === 'ok'`, non-array JSON) in health probes (`tools/check_rewrites.py`), and read centralized `VERSION` via `src/lib/version.ts` (`getAppVersion()`) across `/health`, `/api/health`, `/api/health/metrics`, `/`, and `/nodeinfo/2.1`.
- **Deploy script migration-safety**: Both `.github/workflows/deploy-backend.yml` and `ops/hetzner/scripts/deploy-backend-ts.sh` are now sanitized to never invoke `git clean -fd` or `git stash --include-untracked` (protecting untracked server-side `prisma/migrations/` and `uploads/`), always create a `rollback/pre-deploy-*` tag before `git reset --hard`, and run full TypeScript installs/builds under `nice -n 10`.
- **Nginx `/api/` carve-outs**: On Hetzner, nginx proxies `location /api/` directly to `:4003` before Next.js sees it, with two exact-match carve-outs (`location = /api/oembed` and `location = /api/sentry-tunnel`) routed to `:3000`. Note: `NEXT_PUBLIC_SENTRY_DSN` is currently unset in `fwber-frontend/.env.production`, so Sentry remains intentionally dark until supplied by the operator.

### Observations (2026-11-13 session, v2.3.63–v2.3.87)
- **Realtime single-source rule**: header + dashboard connection badges must only ever read `PresenceContext` (fed by `AuthenticatedRealtimeProvider` from the singleton Socket.io in `use-socket-logic.ts`). Any new surface that spins its own socket state will resurrect the "Disconnected vs Connected" split. Echo/Reverb listeners remain legacy fallbacks only — the TS backend emits on Socket.io (`user:{id}` rooms; events `AudioRoomSignal`, `ParticipantJoined/Left`).
- **Discovery completeness rule**: every `next.config.js` rewrite target under `/.well-known/*` must exist in the backend. WebFinger (v2.3.78) and NodeInfo (v2.3.79) were both rewrite-to-404 until implemented; audit rewrites against `src/index.ts` mounts whenever either side changes.
- **Version-write hazard**: PowerShell `Set-Content -Encoding UTF8` writes a BOM that breaks Node JSON parsing. All version/manifest writes must use `UTF8Encoding($false)` (learned v2.3.63, fixed same turn).
- **Shared-Edge hazard**: Edge CDP 9222 is shared across lanes/tenants — tab focus can switch mid-automation (a click landed on another tenant's tab once). Verify the target tab's URL before every send/click batch; prefer per-target WebSocket evaluates over global active-tab drivers.
- **Deploy**: always-deploy authorized 2026-11-13. Manual path (fetch + `reset --hard`, nice -n 10 builds, PM2 restarts) — never `deploy-backend-ts.sh` blindly (its `--include-untracked` stash endangers server-side untracked Prisma migrations). Keep repo VERSION == prod version; deploy records don't bump.

## Current Version: 2.3.61 "Unified Social Graph & Production Synchronization"
**Last Updated:** 2026-11-12

### Architectural Observations: All-Hetzner Topology, Social Graph Safety & Version Governance (v2.3.61)
- **Production Hosting**: 100% hosted on Hetzner VPS `5.161.250.43` (`/var/www/fwber/repo`) serving canonical domain `fwber.online` (`api.fwber.online`, `ws.fwber.online`, `geo.fwber.online`; `fwber.me` retired 2026-10-22). Managed via PM2 (`fwber-frontend` on `:3000`, `fwber-backend-ts` on `:4003`) and `systemd` (`fwber-geo` Rust H3 service on `:8081`), plus shared local Ollama (`gemma-4-heretic`, `AI_PREFER_LOCAL=true`). All server builds use `nice -n 10` to respect co-hosted workloads.
- **Friends & Safety Contract**: `GET /api/friends/search` returns a bare JSON array (matching `GET /api/user/search` and the Friends UI `Array.isArray` consumer) while excluding self, bidirectional blocks, existing friends, and pending friend requests (`tests/FriendsSearchBlocks.test.ts`). Safety actions (`Block` / `Report` / `Unblock`) strictly follow the explicit-tap-only UX rule (never proactive popups).
- **Single Source of Truth Versioning**: `fwber-frontend/next.config.js` and `fwber-frontend/app/layout.tsx` read root `VERSION` first so build-time `NEXT_PUBLIC_PROJECT_VERSION` and `NEXT_PUBLIC_FRONTEND_VERSION` never drift from root `VERSION`.
- **Local Build Nuance**: Always run `npx prisma generate` in `fwber-backend-ts` before `tsc` (`build.bat` now automates this), and avoid running `npm install` blindly inside `fwber-frontend` on Windows when `node_modules` already exists.

### Architectural Shift: Unified High-Value Dashboard & Tooltip Standards (v2.3.53)
- The user dashboard at fwber-frontend/app/dashboard/page.tsx serves as the consolidated single pane of glass for all 10 platform domains.
- Every interactive FeatureTile enforces an explicit tooltip attribute explaining the workflow and purpose.
- Legacy or duplicate migration tools are categorized in tools/legacy/, maintaining non-destructive backups.
- Process control and server cleanup are managed through tools/fwber-tray.ps1 with port scoping (Backend 4003, Frontend 3000) and verified via tools/fwber-tray-check.py.

### Architectural Shift: Production Federation (v2.2.1)
The ActivityPub layer is now production-ready for external discovery and real-time interaction.
- **WebFinger**: Handles resolution of `@user@domain` handles to internal actor URIs.
- **Security Hardening**: DNS-level SSRF protection (`ssrf.ts`) for all outbound federation requests and XSS sanitization (`sanitize.ts`) for remote content.
- **Federated Interactions**: Support for outbound `Like` and `Announce` (Boost) activities, correctly targeting remote object URIs.
- **Activity Stream Ingestion**: `FederationService` now processes inbound `Create` activities for future global feed integration.

### Architectural Shift: Narrative Compatibility (v2.1.9)
The matching engine now produces "Narrative Reports" via `NarrativeService.ts`. This moves the platform away from raw percentages toward a more immersive "Cyber-Noir" discovery experience.
- **Signal Unification**: Compatibility scores are no longer just about question answers. They now incorporate real-time proximity (80/20 split) via `MatchingHeuristicService.ts`.

### Project Memory: Matching Engine (v2.1.5 - v2.1.8)
- The project implements an OkCupid-style matching engine using a geometric-mean compatibility heuristic: `Score = (Satisfaction A * Satisfaction B) ^ (1/2)`.
- It includes importance weighting: Irrelevant (0), A Little Important (1), Somewhat Important (10), Very Important (50), and Mandatory (250).
- The matching question frontend interface is at `/settings/matching`.
- As of v2.1.8, the dataset contains 95 broad personality questions. (v2.1.9: 108 questions including Cyber-Noir ethics).

### Federation Protocol (v2.0.11+)
- ActivityPub implementation with WebFinger support.
- Routes: `/api/federation/actors/:id`, `/api/federation/users/:id/inbox`, `/api/federation/users/:userId/outbox`.
- (Fixed v2.1.9): The actor detail route now handles non-numeric IDs gracefully.

### UI Standards
- High-fidelity "Cyber-Noir" aesthetic.
- Every backend feature must be comprehensively wired to the frontend with detailed tooltips and descriptions.

[... Historical observations ...]
