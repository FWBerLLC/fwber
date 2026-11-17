# fwber Extreme Ideation & Analysis
> **Generated on:** 2026-04-02
> **Goal:** Creative, constructive analysis of the fwber monorepo to find missing features, improvements, refactoring targets, language ports, and concept pivots.

## 2026-11-15 Addendum (from the v2.3.96 Referrals & Vouches hub, Bulletin Boards hub, BLE hardware tokens & Field Notes pass)
1. **Ephemeral Rolling BLE Beacon Nonces (`hardware_tokens` + `fwber-geo`)**: Extend paired `/settings/hardware` BLE fobs with 15-minute HMAC-derived rolling Eddystone-EID advertisement frames so two users carrying paired fobs at a crowded festival receive an encrypted mutual-interest buzz without broadcasting static MACs or UUIDs.
2. **Geofenced Event-Auto-Spawned Bulletin Boards (`events` -> `bulletin_boards`)**: Automatically provision a 48-hour hyper-local `/bulletin-boards` channel whenever a verified Venue Partner event reaches `10+` RSVPs, pre-seeded with `<PostSuggester />` icebreaker prompts for attendees checked in on-site.
3. **Multi-Hop Vouch Reputation Graph Decay (`vouches` + `referrals`)**: Weight public vouches (`vouch_score`) by the voucher's own referral retention and zero-report safety streak so organic real-world friend circles earn fast trust badges while Sybil rings gain zero lift.

## 2026-11-15 Addendum (from the v2.3.95 Venue Partner Portal, live venue check-ins, Burner Bridge chatrooms & POS redemptions pass)
1. **Cryptographic Bluetooth / NFC Venue Table Beacons (`venue_checkins` + `ZKProver`)**: Let verified Venue Partners (`/venue/dashboard`) mint signed NFC/QR table tags so guests checking into `/venues` earn a `verified_on_premise` badge + automatic merchant happy-hour FWB voucher (`inventory_redemptions`) without revealing table numbers publicly.
2. **Self-Destructing E2EE Burner Rooms with Ephemeral Key Ratchet**: Upgrade Burner Bridge 24-hour private chatrooms (`claimBurnerLinkAndCreateChatroom`) with client-generated X25519 keypairs embedded in the `#fragment` of the QR URL (never sent to the server) so IRL QR handshakes establish zero-trust forward-secret E2EE on first scan.
3. **Camera QR Scanner inside Merchant POS (`/merchant/scanner`)**: Complement manual `FWB-...` code entry on `/merchant/scanner` with `BarcodeDetector` / `getUserMedia` camera scanning so bartenders and box-office staff can redeem `DigitalReceipt` QR codes in `<300ms`.

## 2026-11-15 Addendum (from the v2.3.94 ordered WebRTC video negotiation, zero-downtime CI/CD & mobile hardening pass)
1. **SFU Simulcast Escalation (`livekit` / `mediasoup` sidecar) for Multi-Party Video**: 1-on-1 WebRTC video calls (`VideoCallModal.tsx`) and mesh Audio Rooms (`useWebRTC.ts`) now share TURN-ready ICE configuration and ordered Socket.IO signaling; adding an optional LiveKit/Mediasoup SFU adapter would let 4-8 person group dates and Speed Dating rooms add low-CPU simulcast video without `O(N^2)` client uplink scaling.
2. **Expo Native Push Token Auto-Registration Bridge (`mobile/app/index.js` -> `POST /api/notifications/subscribe`)**: Forward `Notifications.getExpoPushTokenAsync()` from the hardened React Native shell into the authenticated WebView session so incoming `video_call_incoming` rings wake backgrounded iOS/Android devices via APNs/FCM CallKit-style notifications.
3. **Playwright Two-Context WebRTC Loopback E2E Smoke**: Launch two Chromium contexts with `--use-fake-device-for-media-stream --use-fake-ui-for-media-stream` in CI to assert end-to-end `initiate -> offer -> candidate -> answer -> connected -> ended` video stream frames automatically on PRs.

## 2026-11-15 Addendum (from the v2.3.93 TOTP 2FA, WebRTC video signaling & 100% contract parity pass)
1. **WebAuthn / FIDO2 Passkey Second-Factor & Passwordless Login (`@simplewebauthn/server`)**: Now that `AuthService.loginUser()` enforces a domain-separated 5-minute 2FA challenge (`v2.3.93`), extend `/settings/two-factor` and `/two-factor-challenge` with WebAuthn hardware security keys (YubiKey, Touch ID, Windows Hello) alongside RFC 6238 TOTP and recovery codes.
2. **Ephemeral TURN REST Credentials (`RFC 5389` / `coturn` `--use-auth-secret`) for 1-on-1 Video & Audio Rooms**: Expose an authenticated `GET /api/video/ice-servers` endpoint minting short-lived (1-hour) HMAC-SHA1 TURN credentials scoped to `req.user.id` so WebRTC media traversal works across Symmetric Carrier-Grade NATs without exposing static TURN credentials in client bundles.
3. **Live SSE / Socket.IO Feature-Flag Broadcast**: Emit a `config:features_updated` Socket.IO broadcast whenever an operator toggles a flag on `/admin/settings` (`PUT /api/config/features`) so connected Next.js and Expo clients reactively toggle UI surfaces in `<100ms` without waiting for React Query's 5-minute `staleTime`.

## 2026-11-15 Addendum (from the v2.3.92 moderation, ZK proximity, federated login & CRDT sync pass)
1. **True Groth16 / Circom Browser Prover for ZK-Proximity (`fwber-wasm` / `snarkjs`)**: Upgrade `ZKProver.tsx` + `/api/proximity/zk-verify` from rotating-epoch HMAC geohash commitments to a compact Poseidon-hash Groth16 circuit compiled to WASM so a prover can demonstrate membership inside a venue polygon `(lat, lng) ∈ R` without revealing even the 150m precision-7 geohash cell to the server.
2. **ActivityPub HTTP-Signature One-Click Login (FEP-fe34 / OAuth-over-WebFinger)**: Complement the zero-setup profile-bio challenge flow (`POST /api/auth/federated/{challenge,verify}`) with Mastodon OAuth dynamic client registration (`POST /api/v1/apps` on the user's home instance) so Mastodon users can sign in with a single OAuth redirect without editing their profile summary.
3. **CRDT Vector Clocks for Multi-Device E2EE History Sync**: Extend `POST /api/messages/sync-batch` with per-device Lamport/vector cursors so users signed in simultaneously on desktop PWA and Expo mobile (`mobile/`) reconcile read receipts, reactions, and encrypted message edits deterministically offline.

## 2026-11-15 Addendum (from the v2.3.91 AI Avatar Studio, wallet/checkout, event invites & decoy security pass)
1. **Local ComfyUI / SDXL-Turbo Sidecar for Zero-Cost Photorealistic Avatars**: Now that `/api/avatar` supports cloud Flux/DALL-E with automatic fallback to deterministic local SVG studio portraits (`v2.3.91`), wire an optional `AVATAR_COMFYUI_URL` adapter so operators with spare GPU cycles can render sub-second photorealistic SDXL-Turbo portraits locally with zero API spend.
2. **QR / Solana Pay Deep-Link Integration on Hosted Merchant Checkout (`/pay/[id]`)**: Extend `GET /api/merchant/payment/:id` + `POST /confirm` with a Solana Pay `solana:<recipient>?amount=...&reference=...` QR URI so venue guests can settle tabs either via off-chain FWB balance (`POST /confirm`) or on-chain SPL wallet scan in one tap.
3. **Wire `tools/check_api_contracts.py` into GitHub Actions PR Checks**: Run `python3 tools/check_api_contracts.py` alongside `tsc` and Jest in `.github/workflows/` so unmounted sub-routes can never merge to `main`.

## 2026-11-15 Addendum (from the v2.3.90 economy, bounties, unlocks & merchant promotions pass)
1. **CI Static API-Contract Gate (`tools/check_api_contracts.py`)**: Formalize our frontend-to-backend route/payload shape scanner as a fast `<1s` CI gate so any new `api.get('/foo')` or `fetch('/api/bar')` added in `fwber-frontend` fails CI immediately if `fwber-backend-ts/src/index.ts` does not mount a matching router (preventing future silent `200 []` catch-all regressions).
2. **Automatic Matchmaker Bounty Escrow Settlement on Verified Mutual Date**: Now that `POST /api/bounties` escrows `token_reward` in `wallet_transactions` and `POST /api/bounties/:slug/suggest` records `match_assists`, hook mutual physical-meetup verification (BLE/NFC tap or QR date check-in) to auto-release the escrowed bounty + platform bonus directly to the matchmaker's `token_balance`.

## 2026-11-14 Addendum (from the v2.3.89 governance, hub consolidation & zero-downtime deploy pass)
1. **Solana Memo Anchor Cron for Finalized Council Proposals (`SOLANA_GOVERNANCE_ANCHOR_TX`)**: Now that `src/routes/governance.ts` computes deterministic SHA-256 Merkle roots (`computeProposalMerkleTree`) and `VoteVerifier.tsx` verifies inclusion proofs client-side via WebCrypto, a tiny scheduled worker in `MaintenanceService` can write a 64-byte Solana Memo transaction anchoring each newly finalized proposal's `merkle_root` to Solana mainnet/devnet and store the signature in a `merkle_anchor_tx` column.
2. **Client-Side Blinded Contact Matching (PSI / Salted SHA-256 Intersection)**: Upgrade `ContactSyncService` so users who prefer not to connect OAuth providers can hash phone numbers/emails locally in WebCrypto (`HMAC-SHA256` with a rotating epoch salt) to discover mutual opt-in friends without transmitting raw contact strings.

## 2026-11-14 Addendum (from the v2.3.88 observability & UX pass)
1. **Public OpenGraph Metadata for Shared Event Cards (`/events/[id]`)**: Now that `/api/oembed` (`v2.3.87`) and `/events/[id]` Sign-In/Share UX (`v2.3.88`) are live, add a lightweight unauthenticated `GET /api/public/events/:id/preview` endpoint returning *only* non-sensitive summary fields (`title`, `type`, `starts_at`, city-level region — never exact street coordinates or attendee names) so Next.js `generateMetadata` on `/events/[id]` can render rich per-event `og:title` / `og:description` cards on Discord, iMessage, and Mastodon without leaking member locations.
2. **Consolidate Shadowed Next `app/api/*` Stubs**: Only `/api/oembed` and `/api/sentry-tunnel` execute Next-side in production (all other `/api/*` requests route directly to `:4003` via nginx); archiving the 6 unused legacy `app/api/*` route stubs into `tools/legacy/` will shrink Next standalone build output and prevent future confusion about which runtime serves `/api/*`.

## 2026-11-13 Addendum (from the v2.3.63–v2.3.80 hardening loop)
1. **Self-hosted TURN (coturn) on Hetzner** for Audio Rooms: client is already env-ready (`NEXT_PUBLIC_TURN_URL/USERNAME/CREDENTIAL`); a coturn service beside PM2 closes strict-NAT voice. Needs Robert's go (new listening service + UDP ports on a shared box).
2. **Live fediverse interop harness**: spin an ephemeral Mastodon/Pleroma in CI (or a scheduled job) and assert the full chain — WebFinger → actor fetch → signed Follow → Accept → Create delivery — against real server software, not just contract mocks.
3. **Rewrite-target audit in CI**: a tiny check that every `next.config.js` rewrite destination answers non-404 on prod smoke. WebFinger and NodeInfo both hid as rewrite-to-404 for months; make the class unrepresentable.
4. **QA-account lifecycle**: prod proofs keep minting QA users (188–197) with no delete endpoint. Add an admin-only QA cleanup (delete user + authored rooms) so verification residue stays bounded. — **SHIPPED v2.3.109**: `POST /api/moderation/qa-cleanup` (moderator-only, pattern-locked `qa-*@example.com`, dry-run default, caller/admin excluded, 500 cap) + Moderation Dashboard card. Venue QA accounts (`venues` table) remain a follow-up.

## 🔭 Architectural Refactoring & Modernization
1. **gRPC / Cap'n Proto for Backend <-> Rust Geo-Screener:** 
   Currently, the PHP backend likely communicates with `fwber-geo` via HTTP/JSON. Transitioning this to a highly packed binary protocol like Cap'n Proto or gRPC would cut serialization overhead in high-density areas dramatically.
2. **WebAssembly (WASM) for E2E Encryption:**
   Move the client-side encryption primitives from JavaScript to a compiled WASM module (built in Rust). This will prevent browser freezing when encrypting large media payloads (e.g., videos) and provide stronger memory isolation.
3. **Database Migration (PlanetScale / CockroachDB):**
   MySQL is solid, but since `fwber` relies heavily on geographic clustering and ActivityPub federation, moving to a distributed SQL database like CockroachDB could allow the proximity dating features to run globally without a single database bottleneck.

## 🌟 New Features & "Concept Pivots"
1. **"Anon-Vibe" Mode (Zero-Knowledge Dating):**
   A feature where photos are entirely obfuscated by an AI-generated artistic silhouette. Users only see the raw interests, music taste, and `compatibilityAudit` scores. Photos only "decrypt" and fade into reality once a certain number of messages have been organically exchanged.
2. **Augmented Reality "Safe Drops":**
   Since we have `MatchARView`, users could "drop" virtual gifts or encrypted voice notes at specific physical coordinates. The other user has to walk to that physical GPS coordinate to unlock and listen to the voice note.
3. **Hardware "Touch" Protocol:**
   For the BLE physical token: If two matched users wearing the token tap their wrists together, the tokens exchange a cryptographic handshake over BLE that immediately registers a "Physical Verified Meetup" in the app, boosting their trust scores massively.

## 🏗️ Repo Restructuring
1. **Nx Monorepo Port:**
   Right now the structure is just loose folders (`fwber-backend`, `fwber-frontend`, `mobile`). Porting the repository to an `Nx` workspace would allow unified dependency management, parallel testing, and shared TypeScript interfaces between the Next.js frontend and React Native mobile app.
2. **Move "Mobile" to Expo Router:**
   The `mobile` folder uses an older React Native approach. Upgrading it to Expo Router v3 would unify the file-based routing paradigm between the Next.js web app and the mobile app.

## 🌍 Language Ports
1. **Elixir / Go backend port:**
   While Laravel is great for rapid iteration, the concurrent nature of WebSockets, ActivityPub outboxes, and real-time proximity tracking might be better served by Elixir (Phoenix) or Go. A Go microservice specifically handling the WebSocket chat presence could offload massive pressure from Laravel Reverb.
2. **Rust-based Media Processing:**
   Move all image resizing, thumbnail generation, and facial recognition blur (currently done via PHP/client) into a dedicated Rust media-processing microservice using the `image` crate.

## 🛠 Missing Micro-Features
- **Message Edit/Unsend:** Provide a 5-minute window to unsend or edit E2E encrypted messages (handling the CRDT conflict resolution).
- **Federated "Blocklists":** ActivityPub allows for importing shared blocklists (#Fediblock). Implementing a tool to import community blocklists would protect users proactively.
- **Read Receipts toggle:** Users should have the option to disable read receipts globally or per-match for privacy.
## 2026-04-04 - After Premium Restoration
- Add a unified entitlement layer that can answer "is feature X premium/verified/merchant gated?" from one backend service instead of spreading gating rules across controllers.
- Add a billing diagnostics page for admins that replays webhook payloads against a sandbox user, making Stripe rollout debugging safer after staged restorations.
- Replace hard-coded plan presentation in the frontend with a shared generated contract from `config/premium.php` so product copy and backend price definitions never drift.

## 2026-04-04 - After Smoke Report Notification Publisher
- Extend the smoke-check script with a webhook replay mode that can safely POST saved Stripe test fixtures to a staging or sandbox backend, verifying payment handling without touching live billing.
- Add a "known good baseline" mode so drift comparison can target the last explicitly approved deploy rather than merely the immediately previous report.
- Add severity-aware notification routing so critical deploy drift can hit a different webhook/channel than routine successful deploy summaries.

## 2026-04-04 - After Smoke Report Drift Diff
- Extend the smoke-check script with a webhook replay mode that can safely POST saved Stripe test fixtures to a staging or sandbox backend, verifying payment handling without touching live billing.
- Add a Slack/webhook publisher that posts the generated JSON + Markdown deploy evidence after each smoke-checked redeploy, including failing health/geodomain findings, remediation diagnostics, endpoint fingerprints, DNS mappings, and drift summaries.
- Add a "known good baseline" mode so drift comparison can target the last explicitly approved deploy rather than merely the immediately previous report.

## 2026-04-04 - After DNS Resolution Appendix & Host Mapping
- Extend the smoke-check script with a webhook replay mode that can safely POST saved Stripe test fixtures to a staging or sandbox backend, verifying payment handling without touching live billing.
- Add a Slack/webhook publisher that posts the generated JSON + Markdown deploy evidence after each smoke-checked redeploy, including failing health/geodomain findings, remediation diagnostics, endpoint fingerprints, and DNS mappings.
- Add a drift-diff mode that compares the latest smoke-check DNS/fingerprint report against the previous successful deploy report and highlights exactly what changed.

## 2026-04-04 - After Endpoint Fingerprints & Host Signals
- Add a DNS-resolution appendix to the smoke-check report so each host records A/CNAME answers alongside the current endpoint fingerprints.
- Extend the smoke-check script with a webhook replay mode that can safely POST saved Stripe test fixtures to a staging or sandbox backend, verifying payment handling without touching live billing.
- Add a Slack/webhook publisher that posts the generated JSON + Markdown deploy evidence after each smoke-checked redeploy, including failing health/geodomain findings, remediation diagnostics, and endpoint fingerprints.

## 2026-04-04 - After Smoke Check Diagnostics & Remediation Hints
- Add a small secrets-backed smoke-profile generator that rotates bearer tokens for user, merchant, and moderator smoke accounts so `smoke-check.sh` can run deeper probes without relying on long-lived manual tokens.
- Extend the smoke-check script with a webhook replay mode that can safely POST saved Stripe test fixtures to a staging or sandbox backend, verifying payment handling without touching live billing.
- Add a Slack/webhook publisher that posts the generated JSON + Markdown deploy evidence after each smoke-checked redeploy, including any failing health/geodomain findings and the remediation diagnostics.

## 2026-04-04 - After Smoke Check Report Artifacts
- Add a small secrets-backed smoke-profile generator that rotates bearer tokens for user, merchant, and moderator smoke accounts so `smoke-check.sh` can run deeper probes without relying on long-lived manual tokens.
- Extend the smoke-check script with a webhook replay mode that can safely POST saved Stripe test fixtures to a staging or sandbox backend, verifying payment handling without touching live billing.
- Add a Slack/webhook publisher that posts the generated JSON + Markdown deploy evidence after each smoke-checked redeploy, including any failing health/geodomain findings.

## 2026-04-04 - After Hetzner Post-Deploy Smoke Checks
- Add a small secrets-backed smoke-profile generator that rotates bearer tokens for user, merchant, and moderator smoke accounts so `smoke-check.sh` can run deeper probes without relying on long-lived manual tokens.
- Extend the smoke-check script with a webhook replay mode that can safely POST saved Stripe test fixtures to a staging or sandbox backend, verifying payment handling without touching live billing.
- Add a deploy-report artifact mode that writes JSON + Markdown summaries from `smoke-check.sh` and `php artisan deploy:verify`, making it easy to attach cutover evidence to releases or send it into Slack.

## 2026-04-04 - After Deployment Health & Verification Surface
- Add a tiny operator dashboard that consumes `/api/health` plus the geo-service and websocket domains so a single internal page can show cross-service rollout status during cutovers.
- Add a deploy script wrapper that runs `php artisan deploy:verify --json`, parses critical failures, and emits a red/green summary suitable for CI/CD or Slack notifications.
- Add a merchant/premium synthetic-check suite that runs against production nightly using seeded smoke-test accounts, verifying premium purchase eligibility, merchant queue access, and marketplace browsing without needing full end-to-end manual testing.

## 2026-04-04 - After Marketplace Restoration
- Add merchant location persistence and a true geo-aware nearby storefront feed so `marketplace/nearby` can rank by actual distance instead of a generic latest-items fallback.
- Add merchant verification workflow screens and moderation tooling so restored storefronts can be trust-scored before wider rollout.
- Unify premium and merchant billing receipts under a shared purchase-history surface in user settings.

## 2026-05-23 - After Autonomous Monitoring Integration
- Implement an **Autonomous "Time-Travel" Debugger**: Allow moderators to replay a specific autonomous loop by storing a full snapshot of the repository state (diffs) in a blob store linked to the `autonomous_actions` record.
- Add **Subagent Sentiment Analysis**: Use a small LLM to analyze the logs of subagents and generate a "Sentiment Score" (e.g., Confident, Struggling, Blocked) to help humans intervene earlier.
- Integrate **Auto-Healing for DB Drift**: Extend the autonomous protocol to detect missing columns/tables reported in error logs and automatically generate/apply the necessary Prisma migrations.

## Autonomous Pivot Ideas
- **AI-Managed NFT Loyalty**: Use the autonomous protocol to automatically mint "Merchant Vibe" NFTs for loyal customers based on proximity check-in volume.
- **Auto-Federation Scaling**: Automatically spin up new federation relay nodes when outbound ActivityPub broadcast volume exceeds 10,000/hour.

## 2026-05-24 - Future Integration Ideas
- **Contact Match Notification**: Automatically notify users when a newly synced contact joins the platform, using a "Direct Proximity" signal.
- **Autonomous Moderation**: Use the `AutonomousService` to automatically issue "Cool-down" periods for users with multiple high-score geo-spoof flags.

## 2026-11-12 - v2.3.61 Architecture & Consolidation Insights
- **Shared Monorepo Workspace Contracts (`packages/shared-types`)**: Extract Zod schemas and API response DTOs (such as `BlockedUser`, `FriendSearchCandidate`, and `NarrativeReport`) into a lightweight internal workspace package consumed by `fwber-backend-ts`, `fwber-frontend`, and `mobile` so contract mismatches (like `{ data: [...] }` vs bare `[...]` in `/api/friends/search`) become compile-time impossible.
- **Consent-Tiered Friend Direct Messaging ("Handshake DM")**: Resolve the match-gated vs open-DM tension surfaced in multi-account QA by allowing accepted mutual friends (`status: 'accepted'` in `friendships`) to open a 1-on-1 conversation thread without requiring a romantic match swipe, while keeping cold non-friend DMs gated behind mutual match or single-message token-staked introductions.
- **Unified Realtime Health Store**: Drive both the `AppHeader` realtime badge and the Dashboard Network status card from a single Zustand/Context socket state machine (`connecting` | `connected` | `reconnecting` | `degraded`) backed by Socket.io ping RTT telemetry.
- **Build-Time Version & Commit Provenance Endpoint**: Expose root `VERSION` + short git SHA on `/api/health` (`app_version: "2.3.61"`, preserving `version: "2.0.0-ts"` for backward smoke-check compatibility) so automated deploy verifiers can assert exact commit parity between `fwber.online` and `api.fwber.online`.
