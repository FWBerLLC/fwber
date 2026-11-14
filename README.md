# FWBer

Open-source, privacy-first social and dating platform. Built around proximity-based
discovery and value-based matching instead of swipe-based dating: AI avatars in place
of profile photos until reveal, fuzzy location instead of exact GPS, and a
personality-question compatibility engine.

Live site: https://fwber.online

## Status

**Active development.** Current version: **2.3.86** (synced across the repo
2026-11-14). Commits land most days. The codebase is large and in flux; some
documented features are implemented, some are partial, and some exist only as
scaffolding. Treat any feature list here as aspirational unless you verify it
in the code.

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

- Friend search, Add Friend, and block/unblock flows were fixed and merged
  2026-11-11 after a multi-account QA pass (2026-11-06) found them broken.
  Backend tests: 91 passed, 5 pre-existing Prisma-client failures (as of the
  2026-11-11 merge).
- Frontend deploys to production regularly (v2.3.55–2.3.60 deploy records
  in November 2026).

## What's not / known gaps

- End-to-end verification of the latest production deploy is still pending —
  the homepage has returned 200 while failing to render in the past, so a
  green deploy record is not proof the site works.
- Backend test suite has 5 pre-existing Prisma-client failures; the frontend
  had pre-existing type errors in untouched files at last check.
- No paying users; no revenue. FWBer is a rebuild of the original 2011 PHP
  app (archived under `ARCHIVE_v1_8_php_legacy/`), which was test-marketed in
  Austin, TX and then shelved. The biggest historical blocker was marketing,
  not engineering.

## Stack

| Layer | Technology |
|-------|-----------|
| Backend API | Node.js, Express, TypeScript, Prisma ORM |
| Frontend | Next.js 15, React 19, TypeScript, Tailwind CSS |
| Geo service | Rust, Actix-Web, H3 spatial indexing |
| Database | MySQL (production) |
| Real-time | Socket.io |
| Mobile | React Native / Expo (in `mobile/`) |
| Payments | Stripe |

## Layout

```
fwber/
├── fwber-backend-ts/     Node.js + Express + TypeScript API
├── fwber-frontend/       Next.js 15 + React 19 web app
├── fwber-geo/            Rust microservice — H3 spatial indexing
├── fwber-wasm/           WebAssembly E2E encryption module
├── mobile/               React Native + Expo mobile app
├── ops/                  Deployment scripts, nginx configs, systemd units
├── docs/                 Architecture and design docs
└── ARCHIVE_v1_8_php_legacy/  Archived Laravel/PHP codebase
```

## Getting started (development)

Prerequisites: Node.js 20+, MySQL or PostgreSQL, Redis. Rust toolchain optional
(for the geo service).

```bash
# Backend
cd fwber-backend-ts && npm install
cp .env.example .env   # edit with your database credentials
npx prisma generate && npx prisma db push
npm run dev            # http://localhost:4000

# Frontend
cd fwber-frontend && npm install
cp .env.example .env.local
npm run dev            # http://localhost:3000
```

See `SETUP_GUIDE.md` and `DEPLOY.md` for full setup and deployment details.

## Last significant activity

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
