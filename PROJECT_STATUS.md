# PROJECT_STATUS.md — fwber v2.3.61

**Date:** 2026-11-12
**Version:** 2.3.61 "Unified Social Graph & Production Synchronization"
**Status:** 🚀 **PHASE 13 COMPLETE — LIVE ON `fwber.online` (ALL-HETZNER STACK)**

---

## 🎯 Current Platform Snapshot
fwber runs as a full-stack TypeScript + Next.js 16 + Rust monorepo hosted on Hetzner (`5.161.250.43`) under canonical domain `https://fwber.online`:

- **Frontend (`fwber-frontend`, port `3000`, PM2)**: Next.js `16.4.3` + React `19.3.1` standalone build, 10-category high-value dashboard (131 tooltip-documented FeatureTiles, 135 linked routes, 0 dead links), Solana Phantom/Solflare wallet-nonce auth, Sentry Replay with privacy masking, and explicit-tap Block/Report/Friend controls.
- **Backend (`fwber-backend-ts`, port `4003`, PM2)**: Express 5 + TypeScript 6 ESM + Prisma (`MySQL`) + Socket.io (`ws.fwber.online`), canonical bare-array friend search (`GET /api/friends/search`) with bidirectional block exclusions, ActivityPub/WebFinger federation with DNS-level SSRF protection, OkCupid geometric-mean matching engine (108 questions), and shared local Ollama LLM (`gemma-4-heretic`, `AI_PREFER_LOCAL=true`).
- **Spatial Microservice (`fwber-geo`, port `8081`, systemd)**: Rust `2024` edition Actix-Web + `h3o` hexagonal proximity screener (`v0.99.1`).
- **Client Crypto & Mobile (`fwber-wasm`, `mobile`)**: Rust/WASM AES-GCM E2EE module (`v0.1.0`) and Expo 55 / React Native 0.83 mobile client (`v1.0.0`) with NFC peer tap support.

## ✅ What v2.3.54–v2.3.61 Delivered
1. **End-to-End Friend Search & Block Enforcement**: Implemented and reconciled `GET /api/friends/search`, profile Add Friend / Block / Report controls, Safety page Blocked Users management, and 8/8 regression suite (`FriendsSearchBlocks.test.ts`).
2. **Crash & Migration Hardening**: Guarded remaining `.map()` async holes across 269 audited sites, verified zero stale upload URLs on production DB, and protected `image-url-migration-journal.json` during dry-runs.
3. **Repository & Build Governance (`v2.3.61`)**: Audited recent multi-agent merges, restored dropped changelog/TODO history, hardened `.gitignore` to track AI session archives and operational docs, wired `build.bat` Prisma client generation + `fwber-geo` Rust compilation, and unified `2.3.61` version propagation across all packages and UI badges.

## 🚀 Next Up
1. **Direct Messaging UX Policy**: Decide and wire non-match direct message initiation (e.g., mutual friends) on `/profile/[id]`.
2. **Dashboard Telemetry Polish**: Unify Dashboard Network `"Syncing"` indicator with the header `"Connected"` socket badge and replace fresh-account placeholder stats (`7 Chats` / `17% Compatibility`).
3. **Operator-Gated Infrastructure**: Off-site backup replication target for `/var/backups/fwber/`, production Stripe live keys, and Resend email DNS records.
