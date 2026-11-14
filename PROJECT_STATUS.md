# PROJECT_STATUS.md — fwber v2.3.85

**Date:** 2026-11-14
**Version:** 2.3.85 "Federation Discovery, Realtime & Hardening Loop"
**Status:** LIVE ON `fwber.online` (ALL-HETZNER STACK) — backend suite 132/132, prod error budget ~0.07% 5xx

---

## Current Platform Snapshot
fwber runs as a full-stack TypeScript + Next.js 16 + Rust monorepo hosted on Hetzner (`5.161.250.43`) under canonical domain `https://fwber.online`:

- **Frontend (`fwber-frontend`, port `3000`, PM2)**: Next.js `16.4.3` + React `19.3.1` standalone build, single-page high-value dashboard (130 FeatureTiles, 100% tooltip coverage, 179 routes / 133 linked / 17 intentional, 0 dead links), strict CSP served (fixed v2.3.83), unified realtime connection badge, Solana wallet-nonce auth (live), Sentry with privacy masking, explicit-tap Block/Report/Friend controls.
- **Backend (`fwber-backend-ts`, port `4003`, PM2)**: Express 5 + TypeScript 6 ESM + Prisma (`MySQL`, pool 20 since v2.3.84) + Socket.io (`ws.fwber.online`), friend search + bidirectional block enforcement, direct messaging incl. friends, Audio Rooms with WebRTC signaling + live presence (v2.3.70–72), ActivityPub federation with **inbound WebFinger + NodeInfo discovery** (v2.3.78–79), OkCupid geometric-mean matching (105 questions), shared local Ollama LLM (`gemma-4-heretic`, `AI_PREFER_LOCAL=true`).
- **Spatial Microservice (`fwber-geo`, port `8081`, systemd)**: Rust `2024` edition Actix-Web + `h3o` hexagonal proximity screener (crate `2.3.81`).
- **Client Crypto & Mobile (`fwber-wasm`, `mobile`)**: Rust/WASM AES-GCM E2EE module (`v0.1.0`) and Expo 55 / React Native 0.83 mobile client (`v1.0.0`) with NFC peer tap support.

## What v2.3.62–v2.3.85 Delivered
1. **Social graph completion**: honest dashboard stats, friend/profile direct messaging, block hardening (14/14 messaging tests), wallet-nonce login proven live.
2. **Realtime unification**: one connection-status source for header + dashboard; Audio Rooms signaling relay + ParticipantJoined/Left presence; TURN-ready ICE config.
3. **Federation discovery**: served `/.well-known/webfinger` + `/.well-known/nodeinfo` + `/nodeinfo/2.1` (remote servers can now discover fwber users; full WebFinger→actor→outbox chain proven live).
4. **Security & reliability hardening**: strict CSP actually served (duplicate-header bug), API header dedupe, Prisma pool 3→20 (register 500s under load fixed, stress-proven 5/5 at load 93), photo-upload JSON error contract, tray watch-parent orphan fix, rewrite-target audit tool (`tools/check_rewrites.py`).
5. **Verification depth**: backend suite 132/132 (×2 consecutive), full API battery + socket presence proof + page battery (26/26) on prod, TLS/backups/error-budget all measured green. Deploys are always-deploy with server-local rollback tags.

## Next Up
1. **Bobbi visual-layer pass** (muse.ai, after Nov 14 18:38 usage reset): badge states, compat bars, map render, onboarding UX — API layer already fully proven.
2. **Operator decisions**: TURN provisioning (coturn vs hosted) for strict-NAT voice; off-site backup target; Stripe keys (none configured); Resend email DNS (unconfigured); AI key cleanup (inert under local LLM); `/tmp` sweep (6.2G); delete 6 fully-merged remote branches.
3. **External**: live Mastodon/Pleroma node interop test (contract surface fully covered locally).
