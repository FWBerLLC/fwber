[PROJECT_MEMORY]

## fwber (fwber.site) - Project Architecture & Memory Summary

### 1. Project Vision & Philosophy
**fwber** is an open-source, privacy-first proximity social and dating platform evolving into a "Local Social Economy."
- **Core Loop:** Register -> Onboard -> Discover (via AI avatars & local pulse) -> Match -> Chat/Interact.
- **Philosophy:** Radical Privacy, Authentic Identity, Trust Through Transparency, and localized social economies.
- **Privacy-First Features:** AI avatars (concealing real photos until user-approved "Face Reveals"), "Local Vault" encrypted media, Decoy Mode (deniability), and ZK-Identity (Zero-Knowledge) Verification simulators.

### 2. Tech Stack & Infrastructure
The project completed "The Great Migration" (v2.0.0-ts), moving from a legacy PHP/Laravel backend to a unified TypeScript ecosystem.
- **Backend:** Node.js (ESM), Express.js, Prisma ORM.
- **Frontend:** Next.js 16 (App Router, React 18), Tailwind CSS, Radix UI (shadcn).
- **Database:** MySQL/PostgreSQL (via Prisma).
- **Caching & Spatial:** Redis, Redis Bloom Filters, and H3-js (Uber's hierarchical hexagonal indexing) for high-performance proximity queries.
- **Real-time:** `socket.io` (backend) and `socket.io-client` (frontend), replacing Laravel Echo/Pusher/Reverb. Real-time location sharing via `join_event`, `leave_event`, and `update_location` powers Live Event Maps (via `react-leaflet`).
- **Mobile/PWA:** Native-ready via Expo (`mobile/app.json` requires `expo-notifications` and `expo-location` plugins).

### 3. Core Architectural Patterns & Services
- **Service-Oriented Architecture:** Business logic lives in isolated services (`MatchMakerService`, `GeoScreenerService`, `TokenDistributionService`, `CryptoService`, `SolanaService`, `FederationService`).
- **GeoScreener & Spatial Indexing:** Users' locations map to H3 cells. Redis Bloom filters act as a quick-reject proxy to save database/compute cycles on proximity matching.
- **Token Economy (FWB):** Tokenized economy for premium content, "Match Bounties," AI Wingman usage, and gifts. `SolanaService` stubs Solana RPCs for minting local-loyalty NFTs.
- **AI Wingman & Generative Tools:** Extensive LLM integration for profile roasts, content generation, dynamic tone translation in chats (`ToneTranslator.tsx`), and aggressive content moderation.
- **Monetization:** Stripe webhooks manage merchant subscriptions, updating venue access tiers and expiry dates. *Note: Stripe integration requires the `stripe` npm package to pass TS compilation during CI/CD.*

### 4. Next-Gen Federated Social Graph (ActivityPub)
To supercharge network effects safely, the app is adopting Fediverse standards:
- **WebFinger & Endpoints:** Exposed `/.well-known/webfinger` for remote discovery, plus `/api/federation/inbox`, `/outbox`, and `/actors/:id`.
- **Crypto Signatures:** `CryptoService` auto-generates 2048-bit RSA keypairs upon user registration (using asynchronous `crypto.generateKeyPair` to prevent event loop blocking).
- **Inbound Validation:** `FederationService` validates inbound HTTP Signatures using `crypto.createVerify`. It mitigates SSRF by enforcing HTTPS and blocking key-fetch requests to localhost and internal network IPs (`10.*`, `192.168.*`).
- **Cross-Instance Tracking:** A `federation_follows` join table tracks local-to-remote relationships.

### 5. DevOps, Deployment, & QA
- **Deployment:** Vercel (Frontend edge) and Hetzner VPS (Backend/DB). Bash scripts (`deploy-hetzner.sh`, `deploy-vercel.sh`, `validate-migration.ts`) manage environments. *Note: Prisma migration files (`prisma/migrations`) are not tracked locally; live deployments rely on `npx prisma migrate deploy` or `db push` mechanisms.*
- **Testing:**
  - Backend uses Jest + Supertest. Crucial pattern: mocking Prisma (`jest.unstable_mockModule`) because Prisma eagerly evaluates `DATABASE_URL` upon import. Tests must be executed with Node's `--experimental-vm-modules` flag.
  - Frontend uses Playwright/Cypress for E2E tests and Python verification scripts.
- **Monitoring:** `winston` and `morgan` manage structured backend logging, alongside global Sentry integration for exception tracking.

### 6. Autonomous Agent Workflow (Master Protocol)
The repository enforces a strict, multi-agent LLM collaboration protocol:
- **`docs/UNIVERSAL_LLM_INSTRUCTIONS.md`:** The "Bible" for all AI agents. Mandates autonomous execution, exhaustive logging, and non-destructive git operations. *Critical rule: Never taskkill all node processes.*
- **File Maintenance:** Agents must constantly update `VERSION`, `CHANGELOG.md`, `ROADMAP.md`, `TODO.md`, `PROJECT_STATUS.md`, and `HANDOFF.md` on every feature implementation.
- **Rule of UI Completeness:** Features implemented in the backend *must* have a comprehensive, polished frontend representation (e.g., tooltips, loading states).

### 7. Recent Structural Fixes
- Replaced Prisma enums (like UserRole and Tier) removed from the database schema with direct string values (e.g., `'user'`, `'free'`).
- Querying journal entry counts in backend services uses raw SQL (`$queryRaw`) rather than standard Prisma model queries due to schema discrepancies.
- The user dashboard features a 'Refer & Earn' CTA card linking to the `/referrals` page to drive user engagement.
