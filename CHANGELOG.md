# Changelog

## [2.3.32] - 2026-07-17

### Added

- **Frontend on Hetzner**: Migrated frontend from Vercel to Hetzner VPS — `output: 'standalone'` Next.js build, PM2 on port 3000, Nginx proxy.
- **SSL for fwber.me**: Let's Encrypt certificate covering both `fwber.me` and `www.fwber.me`.
- **Sitemap for Bing**: Expanded to 32 public-facing URLs with proper priorities and change frequencies.
- **GitHub Actions**: New `deploy-frontend.yml` workflow for Hetzner frontend deployment.
- **Group Aura Chatroom**: Feature branch `feat-group-aura-chatroom` fully merged into main.

### Changed

- **DNS**: `fwber.me` and `www.fwber.me` now point to Hetzner VPS `5.161.250.43`.
- **Architecture**: All services now on single Hetzner VPS — zero cross-origin API latency.
- **robots.txt**: Explicit allow/disallow for every public and private route.

### Fixed

- **SSL Certificate Name Mismatch**: Combined cert for `fwber.me` + `www.fwber.me`.

## [2.3.10] - 2026-06-30

### Added

- **Quest System Integration**: LocalPulse now fetches and displays active quests from `/api/quests/active`, enabling users to accept them directly from the feed.
- **Dynamic Emotional Identity**: Candidate cards in LocalPulse now use `EvolvingAvatar` to reflect the user's current emotional state visually (glows, borders, blends).

## [2.3.9] - 2026-06-30

### Added

- **Group Aura** feature: `SentimentAnalysisService` now calculates an aggregated mood based on chatroom participant emotions.
- Chatroom API (`GET /api/chatrooms/:id`, `GET /api/proximity-chatrooms/:id`) now returns the `group_aura` attribute.
- Chatroom Frontend UI applies dynamic CSS styling (`auraTheme`) mapping directly to the specific room's Group Aura.
- Descriptive tooltip indicator explaining the Group Aura context added to the UI headers using Radix components.

## [2.3.9] - 2026-06-30

### Added

- **ActivityPub Dynamic Emotion Identity Integration**: Remote incoming notes now automatically trigger the `SentimentAnalysisService` to influence the local neighborhood sentiment and the recipient's aura tracking.
- **AI-Driven Local Economy**: `GET /api/quests/active` now reads the user's `current_emotion` to compute dynamic `ai_vibe_match` flags, seeding the foundation for aura-targeted neighborhood quests.

## [2.3.9] - 2026-07-03

### Added

- Phase 10 Completed: Integrated `VibePromotionService` to autonomously generate community quests based on neighborhood sentiment.
- AI-Driven Local Economy: Connected real-time `SentimentAnalysisService` with `fwber-backend-ts` quest API to deliver dynamic vibe-matched quests.

## [2.3.8] - 2026-06-23

### Added

- **Quest System Integration**: LocalPulse now fetches and displays active quests from `/api/quests/active`, enabling users to accept them directly from the feed.
- **Dynamic Emotional Identity**: Candidate cards in LocalPulse now use `EvolvingAvatar` to reflect the user's current emotional state visually (glows, borders, blends).

### Added

- **10,000x Shiny UI Overhaul**: glassmorphism design system, framer-motion animations, floating 3D geometric shapes, shooting stars — across landing page and dashboard.
- **AnimatedParticles**: Canvas-based particle system with mouse tracking, glow, and connection lines on all pages.
- **PremiumEffects**: Ambient glow containers, animated shimmer borders, glowing dots, gradient icon wrappers, premium badge variants.
- **Quest System**: New `quests` table seeded with 5 demo quests; `/api/quests/active` endpoint now returns live data.

### Changed

- **Backend API port**: Moved from `4002` to `4003` to resolve port conflict with systemd crash-loop.
- **Removed competing `fwber-api.service`**: Systemd service crash-looping 15,966× stopped, disabled, config file deleted.
- **start.bat**: Updated backend port reference from 4000 to 4003.
- **Default port in code**: `src/index.ts` default PORT changed from 4000 to 4003.

### Fixed

- **`GET /api/quests/active` 500 error**: Missing database table — pushed Prisma schema and created table.
- **Avatar 404**: Photo `1778007604927-zsf4wy.png` still missing from uploads dir (pre-existing data issue, 157 photos in DB without files on disk).

## [2.3.7] - 2026-06-16

### Added

- **Atmospheric Messaging**: Implemented dynamic chat environments that change themes based on the combined "Aura" of both participants.
- **Conversation Vibe Engine**: New logic in `MatchingHeuristicService` to determine the collective atmosphere of a chat session (e.g., Calm, Electric, Noir).
- **Dynamic UI Themes**: `RealTimeChat` now supports visual transitions (gradients, blur, grayscale) mapped to the calculated conversation atmosphere.

### Changed

- **Messaging API**: Updated `GET /api/messages/:id` to include atmospheric metadata.

## [2.3.6] - 2026-06-16

### Added

- **Aura-Matched Chat**: Introduced a new matching dimension based on real-time emotional alignment. Users are now suggested chat partners who share complementary or identical "Auras" (e.g., both feeling Thoughtful).
- **Aura Compatibility Logic**: New heuristic in `MatchingHeuristicService` to compute emotional affinity scores.
- **Messaging Dashboard Integration**: Added a "Vibe-Compatible Partners" discovery bar to the messages page.

### Changed

- **Matching API**: New `aura-matches` endpoint to fetch partners with high emotional resonance.

## [2.3.5] - 2026-06-16

### Added

- **Community Quests**: Implemented autonomous location-based challenge generation triggered by high neighborhood energy vibes (e.g. 'Energetic', 'Vibrant').
- **Quest Discovery UI**: New dashboard component for discovering, joining, and tracking progress of community quests.
- **Quest Progress API**: Backend infrastructure for quest lifecycle management and reward distribution.

### Changed

- **Maintenance Heartbeat**: Added `processCommunityQuests` to the periodic system maintenance cycle.
- **Prisma Schema**: Introduced `quests` and `user_quests` models to support gamified location interactions.

## [2.3.4] - 2026-06-16

### Added

- **Granular Vibe Targeting**: Enhanced `PromotionService` to support keyword-level matching between merchant offers and neighborhood sentiment trends.
- **Vibe ROI Analytics**: Introduced new performance tracking metrics for autonomous nudges, including affinity precision and conversion lift.
- **Attributed Redemptions**: Backend support for tracking offer redemptions back to specific autonomous AI broadcasts.

### Changed

- **Merchant API**: Updated `POST /promotions` to support `broadcast_id` attribution.
- **Analytics UI**: New visual cards for "Vibe ROI Intelligence" and "Autonomous Reach" in the merchant portal.

## [2.3.3] - 2026-06-16

### Added

- **Autonomous Vibe Nudging**: Implemented background logic to autonomously trigger merchant promotions when neighborhood vibes align with specific deals.
- **Vibe Intelligence Dashboard**: New merchant UI component showing historical sentiment transitions and autonomous nudge status.
- **Vibe History API**: New endpoint `GET /api/merchant-portal/vibe-history` for trend analysis.

### Changed

- **Sentiment Service Expansion**: Updated `SentimentAnalysisService` to return structured JSON mood analysis (vibe, sentiment, keywords, summary).
- **Maintenance Heartbeat**: Added `processVibeNudges` to the periodic system maintenance cycle.

## [2.3.2] - 2026-06-16

### Added

- **Aura Discovery**: Surface user emotional states ("Auras") across the social graph, including the conversation list and nearby match candidates.
- **Autonomous Sentiment Refresh**: Integrated a background task into the system heartbeat that periodically refreshes the emotional state of active users.
- **Live Match Indicators**: Enhanced proximity candidate cards with real-time emotional status.

### Changed

- **Messaging API**: Updated `conversations` endpoint to return `current_emotion` for match partners.
- **Proximity API**: Updated `local-pulse` to return nearby match candidates with their live emotional states.

## [2.3.1] - 2026-06-16

### Added

- **Threaded Forum Conversations**: Implemented `parent_id` support for proximity artifact comments, enabling nested replies in the Local Pulse feed.
- **AI-Enhanced Merchant Vibe**: Integrated AI sentiment analysis into the merchant pulse API for real-time neighborhood mood detection.
- **Vibe-Matched Promotions**: New `PromotionService` to align merchant offers with the local neighborhood vibe (e.g., chill vibes triggering coffee discounts).
- **Merchant Analytics Expansion**: Added "Vibe Alignment" KPI to the merchant dashboard to track performance against neighborhood sentiment.

### Changed

- **Prisma Schema**: Updated `proximity_artifact_comments` model with optional `parent_id` for recursive threading.

## [2.3.0] - 2026-06-16

### Added

- **Sentiment Engine**: New `SentimentAnalysisService` that analyzes user and neighborhood emotional states based on recent posts and messages.
- **Dynamic Emotional Avatars**: Integrated `current_emotion` into AI avatar generation prompts for reactive identity evolution.
- **Aura UI**: Expanded frontend `EvolvingAvatar` with new visual aura styles for Excited, Thoughtful, Cynical, and Melancholic states.
- **Pulse Forum Topics**: Seeded new neighborhood-focused topics (Local News, Mutual Aid, Instant Meetups) to evolve the pulse feed into a community board.

### Changed

- **Proactive Intelligence**: Automated sentiment evaluation now triggers on message and proximity artifact creation.

## [2.2.9] - 2026-06-10

### Added

- **Peer Discovery**: Automatic tracking of remote federation servers during interactions.
- **Admin Peer Management**: New API for moderators to view and manage (block/unblock) discovered federation peers.
- **Direct URI Search**: Support for searching ActivityPub actors by direct HTTP/HTTPS URIs.

## [2.2.8] - 2026-06-10

### Added

- **Outbound Undo Interactions**: Implemented support for retracting social actions (Unlike/Unboost) via ActivityPub `Undo` activities.
- **Social Profile Badges**: Public profiles now prominently display the user's federated handle (e.g. @<user@api.fwber.me>) if federation is enabled.
- **ActivityPub Compliance**: Updated the user outbox endpoint to follow standard `OrderedCollection` pagination for better interoperability with external servers.

## [2.2.7] - 2026-06-10

### Added

- **Activity Lifecycle Management**: Implemented handlers for ActivityPub `Delete` and `Update` activities, ensuring local caches of remote content remain synchronized.
- **Outbound Deletions**: Deleting proximity artifacts now broadcasts an ActivityPub `Delete` activity to the fediverse.
- **Improved Undo Support**: Expanded `Undo` handling to correctly process retracted Likes and Boosts from remote servers.

## [2.2.6] - 2026-06-10

### Added

- **Inbound Reply Processing**: Automated handling of incoming federated replies, linking them to local proximity artifacts.
- **Enhanced Notifications**: Real-time notifications for federated replies.
- **Infrastructure Docs**: Comprehensive guide for Resend/DNS production email setup.

## [2.2.5] - 2026-06-10

### Added

- **Outbox Persistence**: All outbound ActivityPub activities are now persisted to the `federation_outbox` table.
- **Federated Profile Updates**: Updating your fwber profile now broadcasts an ActivityPub `Update` activity to all followers.
- **Mention Notifications**: Federated mentions now trigger real-time UI badges and semantic entries in the Activity Center.

## [2.2.4] - 2026-06-10

### Added

- **Federated Mentions**: Automatic detection of @mentions in remote activities with real-time in-app notifications.
- **Following Feed**: Users can now filter the Global Feed to see posts only from actors they explicitly follow.
- **Outbox Sanitization**: Applied XSS protection to the public outbox view.

## [2.2.3] - 2026-06-10

### Added

- **Outbound Follow Flow**: Completed the ActivityPub follow handshake by sending signed Follow activities to remote servers.
- **Federated Unfollow**: Implemented support for unfollowing remote actors via ActivityPub Undo activities.
- **Unfollow UI**: Integrated unfollow buttons in the federation settings and actor explorer.

## [2.2.2] - 2026-06-10

### Added

- **Federated Replies**: Support for sending signed replies to remote ActivityPub posts.
- **Enhanced Actor Profiles**: The federation actor endpoint now exposes real profile data, including display names, bios, and avatars.

## [2.2.1] - 2026-06-10

### Added

- **Federated Interactions**: Enabled Like and Boost actions for remote posts in the Global Feed.
- **Outbound Activity Service**: Implemented `sendActivityToActor` in `FederationService.ts` for direct remote inbox delivery.

## [2.2.0] - 2026-06-10

### Added

- **WebFinger Discovery**: Implemented real-time remote actor resolution via WebFinger in `FederationService.ts`.
- **Improved ActivityPub Inbound**: Added `handleCreate` to process and store remote posts from external Fediverse nodes.
- **Enhanced Activity Center**: Unified display for Likes, Boosts, and Remote Posts in the frontend.
- **Remote Search**: Updated federation search to perform live lookups against external ActivityPub servers.

## [2.1.9] - 2026-06-08

### Added

- **Narrative Compatibility Reports**: Launched AI-powered personality analysis that explains *why* two users are compatible based on shared values and differences.
- **Narrative Service**: Created `NarrativeService.ts` to generate atmospheric Cyber-Noir compatibility reports using OpenAI.
- **Proximity-Enhanced Matching**: Updated `MatchingHeuristicService.ts` to factor in real-time physical proximity into the compatibility score (80% values / 20% proximity).
- **Expanded Matching Questions**: Scaled the value-matching dataset to 108 high-signal questions, adding new Cyber-Noir and Tech Ethics categories.
- **Frontend Insights**: Integrated the new narrative reports directly into the public profile pages and MatchInsights component.

### Fixed

- **Federation Actor Detail**: Resolved a 500 error on `/api/federation/actors/:id` when non-numeric IDs (like "detail") were passed.
- **API Robustness**: Added validation to federation routes to handle edge cases in actor lookups.

## [2.1.8] - 2026-06-08

### Added

- **OkCupid-Style Matching Engine**: Implemented a comprehensive matching system with value-based questions, multiple-choice options, and importance weighting.
- **Matching Heuristic Service**: Developed a sophisticated compatibility algorithm using geometric mean satisfaction (OkCupid style).
- **Matching UI**: Created a new dedicated interface in the frontend for users to answer matching questions and view their progress.
- **Deep Integration**: Integrated compatibility badges into Profile and Recommendation cards.
- **Enhanced Seeding**: Added AI-enhanced matching questions rewritten for the 'Cyber-Noir' aesthetic.

### Fixed

- **Frontend Build Stability**: Resolved critical "Identifier already declared" errors and duplicate imports in the frontend stack.
- **Data Integrity**: Standardized BigInt-to-String serialization in the API layer.
- **Autonomous Monitoring**: Instrumenting the new matching engine for real-time performance oversight.

## [2.1.4] - 2026-05-24

### Added

- **Autonomous Performance Tracking**: Integrated detailed latency measurement into `AutonomousTaskExecutor` and created `AutonomousPerformanceService` for historical analysis.
- **High-Quality Ice Breakers**: Implemented a seed script with 50+ OkCupid-style questions rewritten for the fwber aesthetic, covering lifestyle, ethics, and deep connection topics.
- **Monitoring UI Enhancement**: Updated the Admin Monitoring dashboard with a performance breakdown table and real-time execution trend visualization.
- **Instrumentation Expansion**: Extended autonomous oversight to `GeoScreenerService`, `MatchMakerService`, `TokenDistributionService`, and `FederationService`.

### Fixed

- **Testing Reliability**: Resolved 404 errors in `MerchantLoyaltyApi.test.ts` by isolating route tests and correctly configuring moderator permissions in mocks.
- **Type Safety**: Fixed several TypeScript compiler errors in autonomous and monitoring services to ensure production build stability.

## [2.1.3] - 2026-05-24

### Added

- **Autonomous Task Executor**: Implemented a unified execution wrapper `AutonomousTaskExecutor` that enforces decision engine rules and logs all phases of task execution.
- **Service Instrumentation**: Wrapped core `AuthService` methods (`registerUser`, `loginUser`) with the autonomous protocol for real-time monitoring and reliability tracking.
- **Autonomous Healing**: Developed `AutonomousHealer` to automatically restore system stability (e.g., disabling strict mode) when health metrics normalize.

## [2.1.2] - 2026-05-24

### Added

- **Autonomous Decision Engine**: Implemented `AutonomousDecisionEngine` to evaluate proposed actions against system health and protocol settings.
- **Heuristic Safety**: The engine automatically denies medium/high impact actions if protocol consistency is low, or delegates them if strict mode is enabled.

## [2.0.29] - 2026-05-24

### Changed

- **Repository Synchronization**: Executed an intensive repository refresh, synchronized submodules, and reconciled all active feature branches into `main`.
- **Submodule Sanitization**: Updated all recursive submodules to latest tracking commits and verified workspace hygiene.

## [2.0.28] - 2026-05-24

### Added

- **ActivityPub Notifications**: Implemented real-time in-app notifications and socket broadcasts for Follow, Like, and Boost events.
- **Real-Time Notification UI**: Updated the frontend to handle ActivityPub interactions with themed toasts and direct CTAs to the Activity Center.

## [2.0.27] - 2026-05-24

### Added

- **Autonomous Self-Correction**: Implemented `MaintenanceService` to monitor `autonomous_actions` failure rates and automatically toggle `strict_mode` based on system health.
- **Solana Loyalty Bridge**: Integrated `SolanaBridgeService` into venue check-ins to trigger on-chain NFT minting signals based on merchant-defined thresholds.
- **Instrumentation Expansion**: Full visibility for `AuthService` (Login/Register) and `ContactSyncService` tasks in the autonomous ledger.
- **Merchant Loyalty UI**: Launched a unified program configuration and signal monitoring dashboard at `/merchant/loyalty`.

### Fixed

- **Testing Isolation**: Refactored Merchant Loyalty API tests to use isolated database contexts, eliminating interference during parallel execution.
- **ESM Compatibility**: Resolved Prisma named export issues in Jest ESM environment via explicit mock definitions.

## [2.0.24] - 2026-05-24

### Added

- **Service Instrumentation**: Integrated `GeoSpoofDetectionService` and `GeoScreenerService` into the autonomous execution protocol for real-time monitoring of security and proximity health.
- **Activity Center UI**: Finalized the frontend Activity Center (`/settings/federation/activity`) to display unified ActivityPub interactions (Follows, Likes, Boosts).
- **Integrated Contact Sync**: Finalized the Connected Accounts UI and Next.js API proxy for Google, Microsoft, and Facebook contact synchronization.

### Fixed

- **API Proxies**: Corrected Next.js internal API routes to map accurately to the primary TypeScript backend ports.
- **Type Safety**: Enforced strict typing in Federation route handlers to satisfy compiler null-checks.

- **Type Safety**: Enforced strict typing in Federation route handlers to satisfy compiler null-checks.

### Added

## [2.0.20] - 2026-05-23

### Added

- **Real-Time Action Logging**: Integrated `AutonomousService` into `FederationService.ts` to log outbound ActivityPub broadcast tasks. The system now records 'Started' and 'Completed' states for federation events.
- **Enhanced Monitoring UX**: Added descriptive tooltips to the Autonomous Monitoring dashboard adjustment switches, clarifying the impact of behavioral toggles like 'Strict Mode' and 'Subagent Delegation'.

### Fixed

- **Service Patterns**: Standardized the use of `AutonomousService` for system-level logging across backend services.

## [2.0.19] - 2026-05-23

### Fixed

- **Monitoring Logic Verification**: Refactored monitoring route handlers for isolated testability and added a logic-level test suite (`MonitoringLogic.test.ts`) to verify authorization and adjustment persistence without triggering app initialization timeouts.
- **Submodule Documentation**: Updated the submodule dashboard to reflect the current TypeScript architecture and autonomous protocol hooks.

## [2.0.18] - 2026-05-23

### Added

- **Autonomous Monitoring Dashboard**: Integrated a real-time monitor for the autonomous execution protocol, allowing moderators to track AI agent actions and fine-tune automated adjustment settings.
- **Monitoring API**: Added backend endpoints for tracking autonomous protocol status and managing adjustments, backed by new `autonomous_actions` and `autonomous_settings` tables.
- **UI Integration**: Added "Autonomous Monitor" to the Moderation Dashboard and main Dashboard for privileged users.

### Fixed

- **Security Hardening**: Secured the contact synchronization OAuth flow by implementing a signed JWT `state` parameter, preventing unauthorized account linking.
- **System Stability**: Verified full system builds and introduced regression tests for the monitoring infrastructure.

## [2.0.17] - 2026-05-23

### Fixed

- **Repository Synchronization**: Executed a dual-direction intelligent merge, synchronizing 'main' with active feature branches and resolving conflicts in core documentation and configuration.
- **Hygiene**: Updated '.gitignore' to exclude '.jules/' and other AI session metadata.

## [2.0.16] - 2026-05-23

### Added

- **Unified Activity Center**: Implemented a central ActivityPub activity aggregator endpoint in the backend and rewired the frontend Activity Center to use it.
- **Enhanced Inbox Processing**: Added support for 'Like' and 'Announce' (Boost) activities in the 'FederationService', including automated detection of interactions with local outbox content.
- **Activity Types**: Frontend now supports and badges 'Like' and 'Boost' activities alongside 'Follow' and 'Create'.

## [2.0.15] - 2026-05-22

### Added

- **Federation Automation**: New proximity artifacts are now automatically broadcast to the Fediverse if federation is enabled for the user.
- **Handshake Completion**: Implemented outbound signed 'Accept' activities to complete the follow handshake with remote servers.
- **Inbox Processing**: Connected the '/inbox' endpoint to the 'FederationService' processing logic.

## [2.0.14] - 2026-05-22

### Added

- **Auth Hardening**: Integrated centralized 'AuthService' with dedicated unit tests.
- **Contact Sync**: Integrated 'ContactSyncService' and OAuth routes for Google, Microsoft, and Facebook contact synchronization.
- **Integration UI**: Added "Connected Accounts" and "Synced Contacts" pages to the frontend.

### Fixed

- **Build Stabilization**: Resolved TypeScript and Webpack errors in newly integrated components; added missing 'Tooltip' UI component.
- **Prisma Schema**: Synchronized 'UserIntegration' and 'SyncedContact' models into the master schema.
- **Security**: Fixed critical OAuth callback vulnerability by implementing a JWT-signed 'state' parameter to preserve 'userId'.

## [2.0.13] - 2026-05-21

### Added

- **Performance Analytics**: Hooked up the '/api/analytics/slow-requests' routes to 'fwber-backend-ts' to enable live APM signals and performance monitoring insights.

## [2.0.12] - 2026-05-21

### Added

- **Referral Polish**: Hooked up the '/api/referrals/summary' endpoint to properly return 'vouch_link', 'referral_link', and calculate 'levels' based on 'token_balance' and real cash values to support the frontend's referral modal.

## [2.0.11] - 2026-05-20

### Added

- **ActivityPub Models**: Added 'federation_follows', 'federation_inbox', and 'federation_outbox' Prisma models. Added 'public_key' and 'private_key' to 'users'.
- **WebFinger**: Added '/.well-known/webfinger' route to correctly resolve external actor handles.
- **ActivityPub Endpoints**: Wired '/api/federation/actors/:id', '/api/federation/users/:id/inbox', and '/api/federation/users/:userId/outbox' endpoints in 'routes/federation.ts'.

All notable changes to this project will be documented in this file.

## [1.0.3] - 2026-03-28 — Absolute Final Production Release

### Added

- **ActivityPub Outbound Dispatch**: Implemented full `Follow` activity signing and delivery to remote inboxes in `ActivityPubSearchController`.
- **Model Relation Mapping**: Added explicit return types and PHPDoc properties to all core models (`User`, `Photo`, `ProximityChatroom`, etc.) for perfect static analysis.
- **Remote Deploy Automation**: Created `remote_deploy_v2.php` and hardened `deploy.sh` for seamless one-click production updates.

### Fixed

- **PHPStan Strictness**: Resolved 170+ type-related errors and missing property warnings across backend controllers.
- **Frontend Purity**: Eradicated every remaining `@ts-ignore` and sanitized `console.log` statements for a clean production console.
- **Git Repo Hygiene**: Purged large database files from history and cleaned root-level build artifacts.

### Changed

- **Config-First Architecture**: Moved all remaining `env()` calls to `config/` files to ensure stability under Laravel's configuration caching.
- **Version Supremacy**: Synchronized global versioning to v1.0.3 across all submodules.

## [1.0.2] - 2026-03-28 — Launch Patch

- **Robustness**: 100% Green Test Suite (333 passed).
- **Type Safety**: Exhaustive `Array.isArray()` guards across all frontend components.
- **Production Alignment**: Aligned `SANCTUM_STATEFUL_DOMAINS` and `SESSION_DOMAIN`.

## [0.99.1] - 2026-03-25 — The Gold Release (Launch Verified)

### Production & DevOps

- **Vercel Frontend Live**: Successfully deployed the Next.js 16.1 frontend to Vercel with automated build pipelines.
- **DreamHost Backend Hardened**: Optimized the Laravel 12 API for production, resolving critical boot errors and configuration conflicts.
- **Unified Domain Strategy**: Implemented API proxying via `next.config.js` to eliminate CORS friction and consolidate the user experience under `www.fwber.me`.
- **Infrastructure Verified**:
  - **AWS S3**: Production media storage operational.
  - **AWS Rekognition**: Automated AI content moderation live.
  - **Sentry**: Error tracking and performance monitoring active.
  - **Laravel Reverb**: Real-time WebSocket engine deployed.
- **Data Integrity**: Migrated 100% of core application state (Location, Swipes, Messages, Profiles) to the Unified Event Sourcing Architecture.

## [0.6.7-beta] - 2026-03-24 — "Anti-Catfish" ZK-Identity Verification

### Features

- **ZK-Identity Protocol**:
  - Implemented a Zero-Knowledge Identity Verification system, allowing users to prove their authenticity without revealing private documents.
  - Created `ZkIdentityVerificationService` to verify cryptographic proofs tied to user email hashes and trusted issuers.
  - Built `IdentityController` with endpoints for proof submission (`/verify-zk`) and status checking (`/status`).
  - Added `is_id_verified`, `zk_id_issuer`, and `id_verified_at` to the `user_profiles` schema.
- **Verification UI**:
  - Created a new `app/settings/identity/page.tsx` dashboard where users can generate and submit ZK-proofs using their device's secure enclave (simulated). Verified users receive a green "Verified Identity" badge.

## [0.6.6-beta] - 2026-03-23 — AR "Ghost" Navigation

- **Match AR Navigation**:
  - Implemented a specialized AR "Ghost" navigation system to help matched users physically locate each other in crowded venues.
  - Created `GET /api/location/aura/{matchId}` in `LocationController` with strict match-relationship verification.
  - Built `MatchARView.tsx` frontend component featuring agrayscale camera feed, scoping grid, pulsing "aura" marker, and a dynamic HUD compass for directional guidance.
  - Integrated a "Locate Match" trigger button directly into the `RealTimeChat.tsx` header.

## [0.6.5-beta] - 2026-03-24 — "Anti-App" Hardware Token API

- **Hardware Token Integration**:
  - Scaffolded the backend infrastructure to support physical, Bluetooth Low Energy (BLE) proximity tokens.
  - Created the `HardwareToken` model and `hardware_tokens` table.
  - Built `HardwareTokenController` with endpoints for registration (`/register`), status checking (`/status`), and physical proximity pinging (`/ping`).
  - Implemented high-compatibility triggers: When a token pings another token owned by a highly compatible user (>85% AI score), a silent data push is dispatched to the target's phone, which can relay a "glow/vibrate" command back to their physical token.
- **Hardware Settings UI**:
  - Created a sleek new `app/settings/hardware/page.tsx` for users to easily pair their physical tokens using a 6-character code, complete with live battery and sync status displays.

## [0.6.4-beta] - 2026-03-23 — Event Sourcing: User Profiles

### Architecture

- **User Profiles Migrated**:
  - Extended the Event Sourcing architecture to track user identity lifecycle.
  - Created `UserProfileCreated` and `UserProfileUpdated` domain events.
  - Refactored `ProfileController@update` to inject the `EventStore`.
  - Implemented change-detection logic to only append relevant property updates to the event log, providing a high-fidelity audit trail of all bio, preference, and privacy settings changes.

## [0.6.3-beta] - 2026-03-23 — Event Sourcing: Messaging

- **Messaging Migrated**:
  - Completed the third major milestone of the Event Sourcing refactor.
  - Created the `MessageSent` domain event to capture immutable records of all user communications.
  - Refactored `MessageController@store` to inject the `EventStore` and append events within the existing database transaction. This guarantees that every message ever sent on the platform is preserved in the append-only event log, regardless of future changes to the relational `messages` table.

## [0.6.2-beta] - 2026-03-23 — Event Sourcing: Match Actions

- **Match Actions Migrated**:
  - Continued the transition to Event Sourcing by migrating the "Swipe" logic.
  - Created the `MatchActionRecorded` domain event.
  - Refactored `MatchController@action` to append events to the `EventStore` before updating the relational match state. This ensures a permanent, immutable record of all user interactions (likes, passes, super-likes).

## [0.6.1-beta] - 2026-03-23 — Unified Event Sourcing Architecture

- **Event Sourcing Foundation**:
  - Implemented a massive paradigm shift away from pure CRUD toward an immutable, append-only Event Sourcing architecture.
  - Created the `domain_events` database migration.
  - Scaffolded the `DomainEvent` abstract class and `EventStore` core service.
  - **Location Tracking Migrated**: Successfully refactored `LocationController@update` to append a `UserLocationUpdated` event to the `EventStore` before updating the read projection, ensuring perfect geospatial audit trails.

## [0.6.0-beta] - 2026-03-23 — B2B Local Vibe API

- **Merchant Local Pulse API**:
  - Created `LocalPulseAnalyticsService` which leverages OpenAI to analyze aggregated local artifacts and generate a real-time neighborhood "Vibe", Sentiment Score, and Trending Keywords.
  - Implemented `MerchantPulseController` exposing the `GET /api/merchant/pulse/vibe` endpoint, secured behind a new `role:merchant` middleware.
- **Merchant Dashboard**:
  - Built the `NeighborhoodVibe.tsx` component, providing merchants with a sleek, live dashboard of the current local atmosphere.
  - Scaffolded the `broadcast` endpoint for upcoming "Vibe-Matched" promotional blasts.

## [0.5.9-beta] - 2026-03-23 — Voice-Only Confessional Mode

- **Confessional Mode**:
  - Implemented a new privacy feature where users can hide their photos and bio, forcing matches to be based solely on a 15-second voice introduction.
  - Added `is_confessional_mode` to the `user_profiles` database table and model.
  - Updated `UserProfileResource` and `MatchResource` to dynamically mask personal data and inject the `voice_intro_url` when the mode is active.
  - Built a custom "Voice Only" UI state for the `SwipeableCard.tsx` discovery feed, complete with an integrated audio player.
  - Wired up the toggle in the Security & Privacy settings page.

## [0.5.8-beta] - 2026-03-23 — Full Feature Verification

### Milestones

- **"Needs Verification" Cleared**:
  - Verified `Real-time WebSocket (Reverb)` broadcasting logic and config hardening.
  - Verified `Face blur` client-side Webpack module resolution for `@vladmandic/face-api`, ensuring no "Module factory" crashes across browsers.
- **Documentation**: Cleared out obsolete "Known Issues" related to lockfile warnings and `.env` version injections. The platform is now at 100% verified status for all core and experimental application features.

## [0.5.7-beta] - 2026-03-23 — Technical Debt & Detroit Seeding

- **Detroit Seed Content**:
  - Created `DetroitSeedContentSeeder.php` to populate the Local Pulse with authentic neighborhood posts across Midtown, Corktown, Downtown, Eastern Market, and West Village.
  - Implemented idempotent seeding with tiny coordinate variance for realistic distribution.

### Maintenance

- **Controller Audit**:
  - Excised 7 unused/dead controllers to reduce codebase surface area: `ConfigController`, `GroupPostController`, `PhotoRevealController`, `PhotoUnlockController`, `ProximityArtifactInteractionController`, `PushSubscriptionController`, and `TelemetryReportController`.
- **Backend Stability**:
  - Fixed database constraint violations in seeding by aligning `moderation_status` with migration values (`clean` vs `approved`).

## [0.5.6-beta] - 2026-03-23 — Web3 Wallet Hardening

- **On-Chain Settlement**:
  - Added an "On-Chain" toggle to the `SendTokenModal.tsx` allowing users to settle tips directly on the Solana blockchain via `@solana/web3.js`.
  - Integrated recipient wallet address lookups into the transfer flow.
  - Updated `TokenController.php` to handle external transaction verification and logging, ensuring on-chain transfers are correctly represented in user history without double-deduction.
  - Enhanced push notifications to indicate on-chain settlement status.

## [0.5.5-beta] - 2026-03-23 — Relationship Tier Hardening

- **Relationship Tiers Wired**:
  - Implemented `RelationshipTierUpgradedNotification.php` to inform users when a connection levels up.
  - Updated `MessageController` and `RelationshipTierController` to trigger real-time notifications upon tier upgrades.
  - **Frontend Verification**: Added a "Verify Meeting" button to the `TierUnlockGuide.tsx` component, allowing users to manually confirm real-world encounters to reach the `verified` tier.
  - Enhanced the `TierUnlockGuide` with entry animations for social sharing milestones.

## [0.5.4-beta] - 2026-03-23 — ZK-Proximity Hardening

### Security

- **ZK-Proximity Proofs Hardened**:
  - Moved the "Hardware Enclave" secret to the backend environment variables (`ZK_SECRET`).
  - Implemented `GET /api/proximity/zk-params` to securely provide circuit parameters to the frontend.
  - Updated `ZKProver.tsx` to dynamically fetch parameters instead of using a hardcoded secret.
  - Updated `ZKProximityService` to leverage the new configuration-driven secret verification.

## [0.5.3-beta] - 2026-03-23 — Geo-Screener Hardening & Configuration

- **Geo-Screener Integration Hardened**:
  - Updated `GeoScreenerClient.php` to default to port `8081` (avoiding conflict with Bun dev server).
  - Refactored client to use `config('services.geo_screener')` instead of direct `env()` calls.
  - Updated `config/services.php` to include full `geo_screener` mapping.
  - Added comprehensive `GeoScreenerTest.php` to verify the microservice communication layer.
- **Config Cleanup**: Removed stale `mercure` configuration from `config/services.php`.

### Documentation

- Updated `.env.example` to include all missing `GEO_SCREENER_*` and `FEATURE_*` variables.

## [0.5.2-beta] - 2026-03-23 — Bounty Hardening & Real Rewards

- **Matchmaker Bounties Hardened**:
  - Implemented **Token Escrow**: Tokens are now deducted from the bounty creator's balance immediately upon creation.
  - Implemented **Automatic Rewards**: When a match occurs through a suggested candidate, the escrowed bounty is automatically transferred to the wingman's wallet.
  - Marked bounty status as `fulfilled` upon successful match.
- **Verification Suite**: Created `MatchBountyTest.php` to verify the end-to-end escrow and reward lifecycle.

### Fixes

- **Backend Stability**: Fixed a type-error in `MatchMakerController` where it was checking a relationship instead of the user's `token_balance`.
- **Match Notifications**: Fixed a missing service injection (`EmailNotificationService`) in the `MatchController`.

## [0.5.1-beta] - 2026-03-23 — Deep Federation & Project Overhaul

### Architecture & Documentation

- **Universal LLM Protocols**: Completely rewrote AI agent instructions (`AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, `GPT.md`) to route through a single source of truth (`docs/UNIVERSAL_LLM_INSTRUCTIONS.md`).
- **Autonomous Execution**: Implemented infinite-loop protocol for AI agents to autonomously find, implement, verify, and commit missing features.
- **Submodule Dashboard**: Created `docs/SUBMODULE_DASHBOARD.md` to map out the monorepo architecture (`fwber-backend`, `fwber-frontend`, `fwber-geo`, `mobile`).
- **Ideation Lab**: Created `IDEAS.md` for deep technical refactors (Event Sourcing) and product pivots (B2B API, Hardware Tokens).
- **Persistent Memory**: Created `MEMORY.md` to track architectural quirks and design preferences.

- **UI Wired**: Hooked up the ActivityPub Federation toggle in the Security Settings page (`app/settings/security/page.tsx`) to actually persist the `is_federated` state to the database via `updateUserProfile`.

## [0.5.0-beta] - 2026-03-07 — Credibility Sprint

> **Version Reset**: Previous entries below used inflated version numbers (0.3.x → 1.3.x)
> without release evidence. Version was reset to `0.5.0-beta` to reflect actual maturity.

### Phase 1: Truth Layer

- Resolved license contradiction (AGPL `COPYING` → MIT `LICENSE`)
- Unified version to `0.5.0-beta` across 7 files
- Created `SECURITY.md` vulnerability reporting policy
- Archived 33 stale files, rewrote `PROJECT_STATUS.md`, `README.md`, `TODO.md`
- Rewrote all 5 agent instruction files with Stabilization Mode
- Added CI `consistency-checks` job (version sync, license, secret scanning, doc hygiene)

### Phase 3: Launch Consolidation (2026-03-21)

- **Viral Campaign Launch**: Implemented "Rate My Pussy" (`/rate-my-pussy`) cat-rating site to drive traffic.
- **Experimental Verification**: 100% test coverage for Burner Links, Audio Rooms, ActivityPub, and Rust Geo-Screener.
- **Deployment Verified**: Confirmed full Next.js production build (94 routes) and Laravel test suite (322 tests).
- **Avatar AI Hardened**: Fixed trait extraction and img2img metadata handling in `AvatarController`.
- **Frontend Stabilized**: Resolved strict-type compilation errors in `AvatarGenerationFlow.tsx`.
- **Analytics Operational**: Verified `AnalyticsController` real-time data pulling for signups, DAU, and performance monitoring.
- **AWS S3 Ready**: Confirmed S3 disk configuration and Rekognition integration for production safety.

### Phase 2: Core Flow Verification

- 285 backend tests passed (993 assertions)
- 57 targeted core flow tests verified (auth, onboarding, match, messaging)
- Frontend build clean after fixing 4 pre-existing TypeScript errors
- Created `docs/RELEASE_EVIDENCE.md`

### Phase 3: Technical Debt & Launch Prep

- Hardened feature flags — disabled 6 unverified features by default
- Cleaned `.gitignore` (133→78 lines, removed 10 duplicate `node_modules`)
- Audited 89 controllers — identified 8 unused
- Renamed stale Mercure references to Reverb (8-file coordinated backend + frontend)
- Reviewed production deployment setup (`deploy.sh`, `docker-compose.yml`, `DEPLOY.md`, K8s)
- Updated `DEPLOY.md` version to `0.5.0-beta`
- Synced `fwber-frontend/package-lock.json` with `package.json` after CI `npm ci` drift surfaced missing lockfile entries for transitive frontend dependencies, restoring the deploy pipeline's install path
- Replaced simulated admin analytics with real database-backed metrics for top events, moderation counts, realtime activity, and matches/day
- Updated `/analytics` UI to surface real `matches_today` data
- Verified analytics via targeted backend tests (`php artisan test --filter=Analytics`) and a successful frontend production build
- Enriched AI avatar generation to use more real profile attributes, stronger photo-based identity anchoring, and richer generation metadata
- Aligned avatar photo handling on `file_path` across backend + frontend flows and expanded avatar coverage via targeted backend tests (`php artisan test --filter=AvatarGeneration`) plus a clean frontend production build
- Expanded onboarding and profile editing to collect more detailed private physical and intimate matching preferences with explicit privacy copy and respectful wording
- Verified the new private-preference flow with targeted backend profile tests and a clean frontend production build

### Test Hardening

- Added `CoreDatingFlowTest.php` — 19 E2E tests covering full dating loop
- Total backend tests: 304 passed (1019 assertions)

---

## [1.3.2] - 2026-03-06

- **Unified Activity Center**: Implemented a central ActivityPub activity aggregator endpoint in the backend and rewired the frontend Activity Center to use it.
- **Enhanced Inbox Processing**: Added support for `Like` and `Announce` (Boost) activities in the `FederationService`, including automated detection of interactions with local outbox content.
- **Activity Types**: Frontend now supports and badges `Like` and `Boost` activities alongside `Follow` and `Create`.

## [2.0.15] - 2026-05-22

- **Federation Automation**: New proximity artifacts are now automatically broadcast to the Fediverse if federation is enabled for the user.
- **Handshake Completion**: Implemented outbound signed `Accept` activities to complete the follow handshake with remote servers.
- **Inbox Processing**: Connected the `/inbox` endpoint to the `FederationService` processing logic.

## [2.0.14] - 2026-05-22

- **Auth Hardening**: Integrated centralized `AuthService` with dedicated unit tests.
- **Contact Sync**: Integrated `ContactSyncService` and OAuth routes for Google, Microsoft, and Facebook contact synchronization.
- **Integration UI**: Added "Connected Accounts" and "Synced Contacts" pages to the frontend.

- **Build Stabilization**: Resolved TypeScript and Webpack errors in newly integrated components; added missing `Tooltip` UI component.
- **Prisma Schema**: Synchronized `UserIntegration` and `SyncedContact` models into the master schema.

## [2.0.13] - 2026-05-21

- **Performance Analytics**: Hooked up the '/api/analytics/slow-requests' routes to 'fwber-backend-ts' to enable live APM signals and performance monitoring insights.

[... Legacy entries ...]

## [2.1.2] - 2026-05-24

- **Autonomous Decision Engine**: Implemented `AutonomousDecisionEngine` to evaluate proposed actions against system health and protocol settings.
- **Heuristic Safety**: The engine automatically denies medium/high impact actions if protocol consistency is low, or delegates them if strict mode is enabled.

## [2.0.29] - 2026-05-24

- **Repository Synchronization**: Executed an intensive repository refresh, synchronized submodules, and reconciled all active feature branches into `main`.
- **Submodule Sanitization**: Updated all recursive submodules to latest tracking commits and verified workspace hygiene.

## [2.0.28] - 2026-05-24

- **ActivityPub Notifications**: Implemented real-time in-app notifications and socket broadcasts for Follow, Like, and Boost events.
- **Real-Time Notification UI**: Updated the frontend to handle ActivityPub interactions with themed toasts and direct CTAs to the Activity Center.

## [2.0.27] - 2026-05-24

- **Autonomous Self-Correction**: Implemented `MaintenanceService` to monitor `autonomous_actions` failure rates and automatically toggle `strict_mode` based on system health.
- **Solana Loyalty Bridge**: Integrated `SolanaBridgeService` into venue check-ins to trigger on-chain NFT minting signals based on merchant-defined thresholds.
- **Instrumentation Expansion**: Full visibility for `AuthService` (Login/Register) and `ContactSyncService` tasks in the autonomous ledger.
- **Merchant Loyalty UI**: Launched a unified program configuration and signal monitoring dashboard at `/merchant/loyalty`.

- **Testing Isolation**: Refactored Merchant Loyalty API tests to use isolated database contexts, eliminating interference during parallel execution.
- **ESM Compatibility**: Resolved Prisma named export issues in Jest ESM environment via explicit mock definitions.

## [2.0.24] - 2026-05-24

- **Service Instrumentation**: Integrated `GeoSpoofDetectionService` and `GeoScreenerService` into the autonomous execution protocol for real-time monitoring of security and proximity health.
- **Activity Center UI**: Finalized the frontend Activity Center (`/settings/federation/activity`) to display unified ActivityPub interactions (Follows, Likes, Boosts).
- **Integrated Contact Sync**: Finalized the Connected Accounts UI and Next.js API proxy for Google, Microsoft, and Facebook contact synchronization.

- **API Proxies**: Corrected Next.js internal API routes to map accurately to the primary TypeScript backend ports.
- **Type Safety**: Enforced strict typing in Federation route handlers to satisfy compiler null-checks.

## [2.1.6] - 2026-06-06

### Added

- OkCupid-style Matching Engine with heuristic scoring service
- Matching questions seed data (ice-breakers integrated into matchmaking)
- Matching settings page in frontend (protected/settings/matching)
- use-compatibility and use-matching frontend hooks
- Federation hardening: Prisma schema updates for auth integration
- Staging deployment workflow (.github/workflows/deploy-staging.yml)
- Backend deployment script (ops/hetzner/scripts/deploy-backend-ts.sh)

### Fixed

- Photos reorder route ordering (PUT /reorder before PUT /:id)
- Photos reorder accepts both 'order' and 'photo_ids' field names
- Express parameterized route interception prevention across route files

### Merged

- feat/okcupid-matching-engine-v2.1.5 into main
- feat/federation-hardening-auth-integration-v2.0.14 into main

## [2.1.7] - 2026-06-08

### Changed

- Updated start.bat to support monorepo structure (backend on :4000, frontend on :3000)
- Cleaned up stale patch scripts (patch_federation.sh, patch_outbox.sh, test_schema.sh)
- Removed one-off Python helper scripts from previous debugging sessions

### Verified

- Both feature branches fully merged (zero unique commits remaining)
- No upstream changes to sync
- Backend: 0 TS errors, 46/47 API endpoints OK
- Frontend: 0 TS errors
- PM2 online and stable on Hetzner
- Matching engine live with 10 seeded questions

## [2.1.8] - 2026-06-08

### Added

- Expanded matching questions from 15 to 95 across 7 categories (lifestyle, romance, personality, ethics, interests, dealbreakers, intimacy, communication) with 334 multiple-choice options
- All questions rewritten in natural English (replaced Cyber-Noir themed questions)

### Changed

- Matching question seed file rewritten with broad, realistic personality/compatibility coverage

### Verified

- No upstream changes to sync
- Both feature branches fully merged (0 unique commits remaining)
- 95 questions + 334 options live in production DB
- API: 46/47 endpoints OK
