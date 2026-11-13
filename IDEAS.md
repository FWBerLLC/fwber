# fwber Extreme Ideation & Analysis
> **Generated on:** 2026-04-02
> **Goal:** Creative, constructive analysis of the fwber monorepo to find missing features, improvements, refactoring targets, language ports, and concept pivots.

## 2026-11-13 Addendum (from the v2.3.63–v2.3.80 hardening loop)
1. **Self-hosted TURN (coturn) on Hetzner** for Audio Rooms: client is already env-ready (`NEXT_PUBLIC_TURN_URL/USERNAME/CREDENTIAL`); a coturn service beside PM2 closes strict-NAT voice. Needs Robert's go (new listening service + UDP ports on a shared box).
2. **Live fediverse interop harness**: spin an ephemeral Mastodon/Pleroma in CI (or a scheduled job) and assert the full chain — WebFinger → actor fetch → signed Follow → Accept → Create delivery — against real server software, not just contract mocks.
3. **Rewrite-target audit in CI**: a tiny check that every `next.config.js` rewrite destination answers non-404 on prod smoke. WebFinger and NodeInfo both hid as rewrite-to-404 for months; make the class unrepresentable.
4. **QA-account lifecycle**: prod proofs keep minting QA users (188–197) with no delete endpoint. Add an admin-only QA cleanup (delete user + authored rooms) so verification residue stays bounded.

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
