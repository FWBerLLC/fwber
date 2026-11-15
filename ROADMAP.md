# ROADMAP.md — fwber Project Trajectory

> **Current Version:** 2.3.90
> **Last Updated:** 2026-11-15

---

## 🗺️ High-Level Trajectory

### Phase 16: Token Economy Bridge, Matchmaker Bounties, Unlocks & Merchant Promotions Unification (COMPLETED - v2.3.90)
Full-stack contract reconciliation across the FWB token bridge, viral/paid content unlocks, matchmaker bounties, local deals, and merchant promotion CRUD—eliminating five production crash/silent-drop surfaces found via automated frontend<->backend route scanning.

**Key Achievements:**
- **Token Economy & Cross-Chain Bridge (`v2.3.90`)**: Created `/api/economy` (`GET /rates`, `GET /swaps`, atomic `POST /swaps/initiate` writing `swap_transactions` + `wallet_transactions` with `402` balance guard), resolving the `/wallet` -> `Bridge` tab crash and wiring live wallet balance refresh.
- **Canonical `content_unlocks` Unification (`v2.3.90`)**: Migrated broken `share-unlocks.ts` off a non-existent `share_unlocks` SQL table onto live `prisma.content_unlocks`, mounted both `/api/share-unlocks` and `/api/share-unlock` (`GET /:targetId`), created idempotent atomic `/api/content-unlocks` for `ContentUnlockGate`, and wired `/share-unlock` to persist shares and cross-link to `/unlocks`.
- **Matchmaker Bounties Hub & Merchant Promotions (`v2.3.90`)**: Shipped public `GET /api/matchmaker/bounty/:slug`, `POST /api/bounties/:slug/suggest` (`match_assists` + bidirectional block check), a 2-tab `/bounties` hub (*Community Bounties* + *My Bounties*) with `CreateBountyModal` and `/friends/search` fallback on `/bounty/[slug]`, nested `merchant` payloads on `/api/deals`, `POST /api/promotions/:id/track` (`promotion_events`), full `/api/merchant-portal/promotions` CRUD, `wallet-and-bounties` `/help` manual, and `EconomyBountiesUnlocks.test.ts` (`34/34` suites, `151/151` tests green).

### Phase 15: Full-Stack Governance, Hub Consolidation, Scanner Hardening & Zero-Downtime Deploys (COMPLETED - v2.3.89)
End-to-end completion of the Community Council & Merkle verification API, unified multi-tab frontend hubs (`/council`, `/integrations`, `/photos`), production scanner/pool resilience, atomic Next.js standalone swaps, and root System Tray operations.

**Key Achievements:**
- **Community Council & Merkle Governance Engine (`v2.3.89`)**: Ported `/api/governance` (`proposals`, `vote`, SHA-256 Merkle `proof`, and `appeals`) against live MySQL tables (`governance_proposals`, `governance_votes`, `governance_appeals`), paired with client-side WebCrypto Merkle verification in `VoteVerifier` and a unified 3-tab `/council` hub.
- **Unified Frontend Hubs & Bug Elimination (`v2.3.89`)**: Consolidated OAuth Providers + Synced Contacts into `/integrations` (fixing `:4000` port bug, unauthenticated `401` fetches, hardcoded mock state, and `first_name` mapping, plus Microsoft 365 callback & provider disconnect); fixed counterparty display bug in `/photos/reveals` (`user1_id === user.id ? user2 : user1`) and unified `/photos`, `/photos/reveals`, and `/settings/vault` navigation; expanded `/help` manual coverage (`council-governance`, `connected-contacts`).
- **Production Log Hardening & Zero-Downtime Deploys (`v2.3.89`)**: Added `isScannerProbePath()` returning `404` on `.env`/k8s/SQL/CMS probes, guarded `MaintenanceService` against secondary DB writes during transient MySQL pool saturation, created `ops/hetzner/scripts/deploy-frontend.sh` (`.standalone-live` atomic `mv` swap), and upgraded root `tray.bat` + `tools/fwber-tray.ps1` with dynamic `VERSION`, bounded process-tree teardown, and live Hetzner health checks (`33/33` backend test suites, `143/143` tests green).

### Phase 14: Realtime Voice, Fediverse Discovery & Production Hardening (COMPLETED - v2.3.88)
Full-stack completion of live Audio Room WebRTC signaling, inbound ActivityPub/WebFinger discovery, security/CSP/pool hardening, honest health/rewrite observability, and user-manual parity on `fwber.online`.

**Key Achievements:**
- **Social Graph, Wallet Auth & Realtime Unification (`v2.3.62`–`v2.3.72`)**: Honest fresh-account stats, friend + mutual-match direct messaging with bidirectional block enforcement (`14/14` tests), `fwber_auth` session-presence cookie (`PR #42`), unified `PresenceContext` WebSocket status badge, live Socket.io `AudioRoomSignal` WebRTC signaling relay + `ParticipantJoined`/`ParticipantLeft` broadcasts (`9/9` tests), and TURN-ready ICE configuration.
- **Inbound Fediverse Discovery (`v2.3.78`–`v2.3.81`)**: Shipped RFC 7033 `GET /.well-known/webfinger`, `GET /.well-known/nodeinfo`, and `GET /nodeinfo/2.1` so Mastodon/Pleroma instances can resolve `@username@fwber.online` handles directly to signed ActivityPub actors; added `tools/check_rewrites.py` to verify every Next.js rewrite destination.
- **Security, Pool & Observability Hardening (`v2.3.82`–`v2.3.88`)**: Multer upload JSON `400` error handling, duplicate `frame-ancestors *` CSP header bug removed (`v2.3.83`), Prisma MySQL connection pool raised `3 -> 20` eliminating P2024 registration 500s under load (`v2.3.84`), nginx exact-match carve-outs for `/api/oembed` (host-allowlisted) and `/api/sentry-tunnel`, real MySQL + centralized `VERSION` checks on `GET /api/health` (replacing silent `200 []` catch-all fallthrough, `v2.3.88`), deploy script migration-safety hardening, Event Detail UX/tooltips, and complete `/help` manuals for Audio Rooms, Events, and Fediverse discovery.

### Phase 13: Multi-Account Live QA Hardening, Social Graph Safety & Monorepo Synchronization (COMPLETED - v2.3.61)
Live production verification, end-to-end friend/block workflow completion, crash-surface elimination, and repository-wide version/build synchronization on `fwber.online`.

**Key Achievements:**
- **Canonical Friend Discovery & Block Safety (`v2.3.55`–`v2.3.58`, `b13c4cf9a`, `c9ea14d6e`)**: Shipped bare-array `GET /api/friends/search` with bidirectional block/friend/pending exclusions (`FriendsSearchBlocks.test.ts` 8/8), explicit-tap Block/Report actions in `ProfileViewModal` and `/profile/[id]`, and Blocked Users management on `/safety` and `/settings/blocked`.
- **Runtime Crash & Data Hygiene (`v2.3.59`–`v2.3.60`)**: Swept 269 `.map()` sites and guarded remaining async crash holes (`NemesisFinder`, Privacy groups); verified production image-URL cleanliness on Hetzner and protected `image-url-migration-journal.json` during dry-runs.
- **Unified Build, Version & Session Governance (`v2.3.61`)**: Synchronized centralized `VERSION` (`2.3.61`) across root, backend, and frontend manifests + `next.config.js` / `layout.tsx` badges; upgraded `build.bat` with automatic Prisma client generation and `fwber-geo` Rust release compilation; hardened `.gitignore` to preserve `.tormentnexus`, `.pi-lens`, and operational markdown session logs.

### Phase 12: Unified High-Value Dashboard & Ecosystem Consolidation (COMPLETED - v2.3.53)
Comprehensive reorganization of the dashboard into 10 high-value priority categories, wiring 100% of production hubs and full tooltip guidance coverage.

**Key Achievements:**
- **High-Value Information Architecture**: Grouped into 10 cohesive categories (Discover & Connect, Real-Time Chat & Spaces, Local Pulse & Outings, AI Wingman, Economy & Perks, Profile & Reputation, Safety & Privacy, Commerce & Merchants, Governance & Federation, Operations & Admin).
- **Consolidation**: Integrated 131 FeatureTiles with 100% explicit tooltip coverage and eliminated fragmented orphaned surfaces.
- **System Tray Operations**: Audited tools/fwber-tray.ps1 and tools/fwber-tray.bat for clean server teardown and added cross-platform health monitor tools/fwber-tray-check.py.
- **Script Housekeeping**: Consolidated duplicate migration utilities to tools/legacy/ and streamlined build/startup scripts.

### Phase 10: Dynamic Identity & Proximity Forum (COMPLETED - v2.3.9)
The next evolution focuses on making user identity alive and evolving the local pulse into a functional community layer.

**Key Goals:**
- **Dynamic Emotional Identity**: AI Avatars that reflect the user's recent sentiment and activity ("Emotional Auras").
- **Atmospheric Social Graph**: Dynamic chat environments and partner discovery based on real-time emotional alignment (Aura-Matched Chat & Messaging).
- **AI-Driven Local Economy**: Autonomous vibe-matched promotions and community quests triggered by neighborhood sentiment.

### Phase 11: 10,000x Shiny UI (COMPLETED - v2.3.8)
Complete frontend visual overhaul — glassmorphism design system, canvas particle animations, framer-motion transitions, animated 3D shapes, premium glow/ambient effects.

**Key Achievements:**
- **Design System**: globals.css completely rewritten with glass, glow, shimmer, premium shadow utilities.
- **Animation System**: 16 new Tailwind keyframe animations (float, spin-gradient, glow-pulse, shimmer-slide, etc.).
- **Animated Particles**: Canvas particle system with mouse tracking, glow radii, connection lines on all pages.
- **Premium Effects**: AmbientGlow, ShimmerBorder (animated conic gradient), GlowingDot, PremiumBadge, GradientIcon components.
- **3D Landing**: Floating geometric shapes, shooting stars, glass cards with framer-motion staggered reveals.
- **Dashboard Glass**: All metric cards, feature tiles, and navigation upgraded to glassmorphism with gradient icons.
- **Port Migration**: Backend moved from 4002 to 4003; removed crash-looping systemd service (15,966 restarts).
- **Quest System**: `quests` table created and seeded; `/api/quests/active` endpoint live.

### Phase 9: Social Velocity & Federation (COMPLETE - v2.2.9)
Transitions the platform from a pasive observer into a fully interactive and secure Fediverse node.

**Key Achievements:**
- **Interactive Social Graph**: Bi-directional ActivityPub support for Likes, Boosts, Replies, and Follows.
- **WebFinger Discovery**: Real-time handle-to-URI resolution for remote actors.
- **Security Hardening**: Implemented DNS-level SSRF protection and isomorphic XSS sanitization.
- **Social Synchronization**: Automated inbound reply loops and @mention notifications.
- **Administrative Control**: Discovered peer management and server-level blocklists.

### Phase 8: Intelligent Match Refinement (COMPLETED - v2.1.9)
The next major evolution focuses on high-fidelity personality analysis and deeper signal integration.

**Key Achievements:**
- **Narrative Compatibility**: Launched AI-powered reports explaining the "why" behind compatibility scores.
- **Signal Merging**: Unified value-matching scores with real-time proximity history (80/20 weight).
- **Scale**: Expanded the value-matching dataset to 108 high-signal questions, including new Cyber-Noir ethics.
- **Deep UI Integration**: Wired narrative reports into the profile discovery flow.

### The OkCupid Matching Engine (COMPLETED - v2.1.5)
The matching engine has been upgraded to a value-based system with importance weighting and a geometric-mean compatibility heuristic.

**Key Achievements:**
- **Geometric-Mean Heuristic**: Implemented the classic formula `(Satisfaction A * Satisfaction B) ^ (1/2)` for high-fidelity signals.
- **Value-Based Questions**: Integrated multiple-choice questions with user-defined importance levels.
- **Interactive UI**: Launched a dedicated matching dashboard at `/settings/matching`.
- **Deep Integration**: Compatibility scores are now visible across user profiles and the discovery feed.

### Matching Question Expansion (COMPLETED - v2.1.8)

Expanded the matching question dataset from 15 Cyber-Noir themed questions to 95 natural-language questions across 7 categories with 334 multiple-choice options.

**Categories:** Lifestyle (20), Romance (17), Personality (15), Ethics (13), Interests (10), Dealbreakers (8), Intimacy (6), Communication (6).

### The High-Performance Autonomous Engine (COMPLETED - v2.1.4)
The autonomous system is now fully instrumented for performance and quality, with a self-healing engine that monitors latency and system health in real-time.

**Key Achievements:**
- **SLA Visibility**: Real-time breakdown of task execution times and success trends.
- **Content Enrichment**: Integrated 50+ high-quality matching questions to drive user engagement.
- **System-Wide Oversight**: Critical paths in Matching, Tokenomics, Federation, and Geo-Discovery are now under autonomous supervision.

### The Self-Healing Autonomous Engine (COMPLETED - v2.1.3)
The autonomous system now features a self-healing engine capable of executing tasks with oversight and automatically recovering from degraded states.

### The Autonomous System Hardening (COMPLETED - v2.0.23)
The autonomous system now features real-time action logging and an enhanced management interface.

**Hardening Highlights:**
- **ActivityPub Integration**: Federation broadcast tasks are now monitored in real-time by the autonomous execution engine.
- **UX Refinement**: Descriptive tooltips in the Admin UI improve operator understanding of automated adjustment impacts.
- **Infrastructure**: `AutonomousService` provides a standardized utility for logging system tasks and checking adjustment state.

### The Autonomous System Integration (COMPLETED - v2.0.18/v2.0.19)
Integrated the autonomous execution protocol into the main system with real-time monitoring and logic-level verification.

[... Rest of file ...]
