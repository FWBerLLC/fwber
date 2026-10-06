# fwber

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/Version-2.1.8-orange)](VERSION)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15-000000?logo=next.js)](https://nextjs.org/)
[![Prisma](https://img.sh.shields.io/badge/Prisma-6-2D3748?logo=prisma)](https://www.prisma.io/)

**Privacy-first, proximity-based social platform.** fwber replaces swipe-based dating with real-world connection — AI avatars instead of profile photos, fuzzy location instead of GPS tracking, and value-based matching instead of superficial algorithms.

---

## What Is fwber?

fwber is a dating and social platform built around a simple idea: **technology should get you off your phone and into the real world.** Instead of infinite scrolling through headshots, fwber uses AI-generated avatars, proximity-based discovery, and deep compatibility matching to facilitate genuine, intentional connections.

**The core loop:**

1. **Onboard** — Set your values, answer personality questions, define what matters to you
2. **Discover** — Browse nearby people via the Local Pulse feed, filtered by compatibility scores
3. **Connect** — Match based on shared values and proximity, not just looks
4. **Reveal** — Photos stay behind AI avatars until you choose to share them
5. **Meet** — Plan dates, find nearby events, connect in person

### What Makes It Different

- **AI Avatars by Default** — Your real photos are hidden behind AI-generated avatars until you explicitly reveal them. No more snap judgments based on a profile picture.
- **Fuzzy Location** — Your exact GPS coordinates are never shared. Location is fuzzed to a general area for proximity matching only.
- **Value-Based Matching** — An OkCupid-style compatibility engine with 95 personality questions across 7 categories (lifestyle, romance, personality, ethics, interests, intimacy, communication). Scores use a geometric-mean heuristic weighted by how important each question is to you.
- **Local Pulse** — A proximity-based discovery feed showing nearby people, events, and venues — the digital aura of your neighborhood, not a global feed of strangers.
- **End-to-End Encryption** — Messages are encrypted. Your conversations stay private.
- **Ghost Mode** — Browse invisibly. Your profile views and presence are only shared when you want them to be.

---

## Features

### Discovery & Matching
- **OkCupid-Style Matching Engine** — 95 personality questions with importance weighting and geometric-mean compatibility scoring
- **Local Pulse Feed** — Real-time proximity-based discovery of people, events, and venues
- **Recommendations** — AI-powered discovery feed combining compatibility scores, interests, and proximity
- **Who Liked You** — See who's interested, filtered by your premium tier
- **Profile View Tracking** — Know who's checking you out

### Communication
- **E2E Encrypted Messaging** — End-to-end encrypted chat with typing indicators and read receipts
- **Proximity Chatrooms** — Location-based group conversations tied to venues and events
- **Bulletin Boards** — Community posting boards for local areas
- **Audio Rooms** — Live voice rooms for group conversations
- **Ice Breakers** — AI-generated conversation starters

### Privacy & Safety
- **AI Avatar Mode** — AI-generated avatars replace photos until mutual reveal
- **ZK-Identity Verification** — Zero-knowledge identity verification (anti-catfish)
- **Geo-Spoof Detection** — Rust-powered H3 spatial indexing detects fake locations
- **Ghost Mode** — Browse without revealing your presence
- **Safe Walk** — Share your live location with trusted contacts when walking alone
- **Hardware Token API** — BLE token support for physical verified meetups
- **Block & Report** — Full blocking, reporting, and moderation tools

### AI Wingman
- **Profile Roasts** — AI-powered, humorous profile critiques
- **Cosmic Match** — AI-generated compatibility narratives
- **Date Ideas** — Location-aware date planning suggestions
- **Content Generation** — AI-assisted bio and prompt writing
- **Tone Translator** — Real-time chat tone adjustment

### Economy & Premium
- **FWB Token System** — Platform tokens for boosts, gifts, and premium features
- **5-Tier Premium Plans** — Trial, Weekly, Silver, Gold, and Platinum subscriptions via Stripe
- **Boosts** — Increase your visibility in the discovery feed
- **Gifts** — Send virtual gifts to other users
- **Referral Program** — Earn tokens for inviting friends, with vouch-based trust scoring

### Merchant & Commerce
- **Merchant Marketplace** — Local businesses can list deals and promotions
- **Merchant Profiles** — Dedicated storefront pages for local venues
- **Nearby Deals** — Proximity-filtered local offers
- **Stripe Integration** — Full payment processing for subscriptions and marketplace purchases

### Social & Community
- **Groups** — Create and join interest-based groups
- **Events** — Discover and attend local events with live attendance maps
- **Topics** — Discussion threads for shared interests
- **Leaderboard** — Token and activity rankings
- **Achievements** — Gamified progression with unlockable badges
- **Trust Scores** — Algorithmic trust scoring based on verification, vouching, and behavior
- **Friends & Vouching** — Add friends and vouch for people you know

### Federation (In Progress)
- **ActivityPub** — WebFinger discovery, inbox/outbox, and cross-instance following
- **HTTP Signatures** — RSA-SHA256 signed federation requests with SSRF protection
- **Federated Follows** — Track local-to-remote relationships across instances

---

## Architecture

```
fwber/
├── fwber-backend-ts/     Node.js + Express + TypeScript API (port 4000)
├── fwber-frontend/       Next.js 15 + React 19 web app (port 3000)
├── fwber-geo/            Rust microservice — H3 spatial indexing (port 8081)
├── fwber-wasm/           WebAssembly E2E encryption module
├── mobile/               React Native + Expo mobile app
├── ops/                  Deployment scripts, nginx configs, systemd units
├── docs/                 Architecture, design, and AI development docs
└── ARCHIVE_v1_8_php_legacy/  Archived Laravel/PHP codebase (pre-migration)
```

### Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend API** | Node.js, Express, TypeScript, Prisma ORM |
| **Frontend** | Next.js 15, React 19, TypeScript, Tailwind CSS |
| **Real-time** | Socket.io (WebSocket) |
| **Database** | MySQL (production) / PostgreSQL (compatible) |
| **Geo Service** | Rust, Actix-Web, H3o (H3 spatial indexing) |
| **Caching** | Redis, Redis Bloom Filters |
| **Encryption** | WASM-compiled Rust crypto, E2E message encryption |
| **Mobile** | React Native, Expo |
| **Payments** | Stripe (subscriptions + marketplace) |
| **AI** | Multi-provider failover (OpenRouter → OpenAI → NVIDIA NIM) |
| **Federation** | ActivityPub, WebFinger, HTTP Signatures |
| **Monitoring** | PM2, Winston, Morgan, Sentry |

### Scale

| Metric | Count |
|--------|-------|
| Prisma Models | 131 |
| Database Tables | 144 |
| API Route Handlers | 414 |
| Frontend Pages | 180 |
| Frontend Components | 180 |
| Frontend Hooks | 65 |
| Matching Questions | 95 |

---

## Getting Started

### Prerequisites

- **Node.js** 20+ (LTS recommended)
- **MySQL** or **PostgreSQL**
- **Redis** (for caching, sessions, and queues)
- **Rust** toolchain (optional, for building the geo service)

### Quick Start (Development)

Use the included launcher script:

```bat
start.bat
```

This starts both services:
- **Backend**: http://localhost:4000
- **Frontend**: http://localhost:3000

### Manual Setup

#### Backend

```bash
cd fwber-backend-ts
npm install
cp .env.example .env
# Edit .env with your database credentials
npx prisma generate
npx prisma db push
npm run dev
```

#### Frontend

```bash
cd fwber-frontend
npm install
cp .env.example .env.local
# Edit .env.local with your API URL
npm run dev
```

#### Geo Service (Optional)

```bash
cd fwber-geo
cargo run --release
# Serves on http://localhost:8081
```

### Environment Variables

**Backend** (`fwber-backend-ts/.env`):

```env
DATABASE_URL=mysql://user:password@localhost:3306/fwber
REDIS_HOST=127.0.0.1
JWT_SECRET=your-secret
GEO_SCREENER_URL=http://localhost:8081
# Optional AI providers:
OPENROUTER_API_KEY=sk-or-...
# Optional payments:
STRIPE_SECRET_KEY=sk_test_...
# Optional email:
RESEND_API_KEY=re_...
```

**Frontend** (`fwber-frontend/.env.local`):

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_REVERB_HOST=localhost
NEXT_PUBLIC_REVERB_SCHEME=http
```

---

## Deployment

fwber deploys to a **Hetzner VPS + Vercel** topology:

- **Frontend** (`fwber.site`) → Vercel
- **Backend API** (`api.fwber.site`) → Hetzner VPS
- **WebSocket** (`ws.fwber.site`) → Hetzner VPS
- **Geo Service** (`geo.fwber.site`) → Hetzner VPS

Deployment scripts, nginx configs, and systemd service files are in `ops/hetzner/`.

GitHub Actions workflows handle automated deploys on push to `main`.

See [DEPLOY.md](DEPLOY.md) for the full deployment guide.

---

## Project History

fwber originated in 2011 as a PHP/MySQL dating application and evolved through Laravel into a feature-rich platform. In 2026, the entire backend was migrated from PHP/Laravel to a unified TypeScript/Node.js stack (the "Great Migration," v2.0.0-ts). The legacy PHP codebase is archived in `ARCHIVE_v1_8_php_legacy/`.

The license changed from AGPL-v3 (legacy PHP) to MIT (modern TypeScript rewrite).

---

## Documentation

| Doc | Purpose |
|-----|---------|
| [VISION.md](VISION.md) | Product philosophy and feature horizon |
| [ROADMAP.md](ROADMAP.md) | Release history and upcoming phases |
| [TODO.md](TODO.md) | Immediate action items |
| [CHANGELOG.md](CHANGELOG.md) | Full version history |
| [DEPLOY.md](DEPLOY.md) | Production deployment guide |
| [SETUP_GUIDE.md](SETUP_GUIDE.md) | External service setup (email, AI, Stripe) |
| [PROJECT_STATUS.md](PROJECT_STATUS.md) | Current release status |
| [HANDOFF.md](HANDOFF.md) | Session-to-session agent handoff log |
| [MEMORY.md](MEMORY.md) | Architectural observations and learnings |
| [IDEAS.md](IDEAS.md) | Feature ideation and analysis |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Contribution guidelines |
| [SECURITY.md](SECURITY.md) | Security policy |

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines. This project uses AI-assisted development — see [AGENTS.md](AGENTS.md) for the multi-agent protocol.

---

## License

MIT License — see [LICENSE](LICENSE). The legacy PHP codebase (pre-migration, archived) was under AGPL-v3. The modern TypeScript rewrite is MIT-licensed.

---

**Built for privacy, safety, and genuine human connection.**
