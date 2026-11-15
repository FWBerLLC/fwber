# FWBer

Open-source, privacy-first social and dating platform. Built around proximity-based
discovery and value-based matching instead of swipe-based dating: AI avatars in place
of profile photos until reveal, fuzzy location instead of exact GPS, and a
personality-question compatibility engine.

Live site: https://fwber.online

## Status

**Active development.** Current version: **2.3.94** (synced across the repo
2026-11-15). Live on Hetzner (`https://fwber.online`) with `37/37` backend Jest
suites (`178/178` tests passing offline), `0` TypeScript errors across backend and frontend,
`112/112` verified frontend-to-backend API contracts across `91` Express prefixes (`tools/check_api_contracts.py`),
and Rust `fwber-geo` H3 spatial service active on `:8081`.

## What it is

- **Discovery & matching** — compatibility scoring from personality questions,
  proximity-based Local Pulse feed, recommendations.
- **Communication** — messaging (gated on matching, by design), chatrooms,
  bulletin boards.
- **Privacy & safety** — AI avatar mode, ghost mode, block/report, geo-spoof
  detection via a Rust H3 service.
- **Economy** — token system, premium tiers via Stripe, boosts, gifts, referrals.
- **Federation** — ActivityPub work in progress.

## What's working

- Full-stack Express 5 + Prisma (`fwber-backend-ts`, `:4003`), Next.js 16 standalone (`fwber-frontend`, `.standalone-live` `:3000`), and Rust H3 spatial sidecar (`fwber-geo`, `:8081`) run unified on Hetzner (`https://fwber.online`) with zero-downtime atomic frontend swaps and post-deploy smoke/rewrite gates (`tools/check_rewrites.py`).
- Friend search, Add Friend, bidirectional block/unblock, direct messaging, TOTP 2FA login challenges, 1-on-1 WebRTC video calls & Audio Rooms signaling, Community Council Merkle governance, AI Avatar Studio, Wallet P2P/Bridge/Bounties, ZK proximity proofs, and inbound/outbound ActivityPub federation are live and covered by `37/37` Jest suites (`178/178` tests) and `112/112` static API-contract checks.

## What's not / known gaps

- Optional external operator credentials (`NEXT_PUBLIC_SENTRY_DSN` / `SENTRY_DSN`, OAuth contact-sync keys for Google/Microsoft/Facebook, live Stripe keys, and a dedicated `coturn`/managed TURN relay for strict symmetric carrier NATs) remain unset until provisioned by the operator; unconfigured integrations degrade cleanly in the UI.
- No paying users; no revenue. FWBer is a rebuild of the original 2011 PHP
  app (archived under `ARCHIVE_v1_8_php_legacy/`), which was test-marketed in
  Austin, TX and then shelved. The biggest historical blocker was marketing,
  not engineering.

## Stack

| Layer | Technology |
|-------|-----------|
| Backend API | Node.js 24, Express 5, TypeScript 6, Prisma ORM |
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS |
| Geo service | Rust (2024 edition), Actix-Web, H3 spatial indexing |
| Database | MySQL 8 + Redis (production) |
| Real-time | Socket.io (`ws.fwber.online`) + WebRTC |
| Mobile | React Native 0.83 / Expo 55 (in `mobile/`) |
| Payments | FWB Internal Ledger, Solana Wallet Sign-In, Stripe |

## Layout

```
fwber/
├── fwber-backend-ts/     Node.js + Express + TypeScript API (:4003)
├── fwber-frontend/       Next.js 16 + React 19 web app (:3000)
├── fwber-geo/            Rust microservice — H3 spatial indexing (:8081)
├── fwber-wasm/           WebAssembly E2E encryption module
├── mobile/               React Native + Expo mobile app
├── ops/                  Deployment scripts, nginx configs, systemd units
├── tools/                System tray controller, contract/nav/rewrite verifiers
├── docs/                 Architecture and design docs
└── ARCHIVE_v1_8_php_legacy/  Archived Laravel/PHP codebase
```

## Getting started (development)

Prerequisites: Node.js 24+, MySQL, Redis. Rust toolchain optional
(for the geo service).

```bash
# Backend
cd fwber-backend-ts && npm install
cp .env.example .env   # edit with your database credentials
npx prisma generate && npx prisma db push
npm run dev            # http://127.0.0.1:4003

# Frontend
cd fwber-frontend && npm install
cp .env.example .env.local
npm run dev            # http://127.0.0.1:3000
```

See `SETUP_GUIDE.md` and `DEPLOY.md` for full setup and deployment details.

## Last significant activity

- **2026-11-15** — v2.3.94 full-stack parity, TOTP 2FA enforcement, ordered WebRTC video negotiation, Community Council Merkle governance, AI Avatar Studio, ZK proximity proofs, zero-downtime `.standalone-live` deploys, and `112/112` CI contract gates (`37/37` suites, `178/178` tests).
- **2026-11-12** — v2.3.61 sync across VERSION, package.json files, and docs;
  friend-search/block fix batch merged into main.
- **2026-11-11** — `fix/friend-search-block-actions` merged (friend search,
  Add Friend, block actions).
- **2026-11-06** — multi-account QA pass on production found friend search,
  Add Friend, and block actions broken; fixed on a branch the same day.

## Links

- Live site: https://fwber.online
- Source repo (this repo): FWBerLLC/fwber — active fork of fwber-code/fwber
- License: MIT (see `LICENSE`)
