# VISION.md — The Ultimate fwber Architecture & Philosophy

> **Last Updated:** 2026-11-13
> **Version:** 2.3.87 (Federation Discovery & Realtime Unification)
> **Goal:** To serve as the definitive North Star for all human and AI agents working on the fwber project.

---

## 🚀 1. The Core Philosophy

**fwber** is a privacy-first, proximity-based social operating system designed for the physical world. It actively rejects the gamified, swipe-based, infinite-scroll, superficial dopamine loops of traditional dating apps.

fwber facilitates **intentional, real-world connections** through technology that gets out of the way. We believe technology should orchestrate real-life serendipity, not keep users glued to screens.

### 🌟 The Four Pillars
1. **Privacy is a Human Right**: In an age of surveillance capitalism, fwber is a sanctuary. We do not sell user data. We do not track exact GPS coordinates continuously (fuzzy location only). We allow "Ghost Mode" and incognito browsing, and rely on mathematically proven privacy via **Zero-Knowledge (ZK) Proximity Proofs** and **ZK-Identity Verification**.
2. **The "Anti-Catfish" Guarantee**: By defaulting to **AI-generated Avatars** until a mutual match occurs, we eliminate superficial judgment and profile picture fraud. Physical attraction is revealed *after* a connection is established, or via secure, consensual "Face Reveals."
3. **Proximity is Power**: The most meaningful connections happen with the people around you right now. The **Local Pulse** is a real-time, ephemeral feed of the vibe of your immediate vicinity—not a global feed of influencers. It is the digital aura of a neighborhood.
4. **Safety by Design**: From **Geo-Spoof Detection**, **Hardware Token API**, to **End-to-End Encrypted Messaging**, safety is baked into the architecture at the deepest levels, not added as a feature toggle.

---

## 🏗️ 2. Architectural Vision & Technology Stack

fwber is a bleeding-edge, high-performance platform capable of handling extreme concurrency in dense urban environments (festivals, conferences, downtowns).

### The Modern Stack (v2.3.61)
*   **Backend**: Node.js (ESM) / Express.js 5 / TypeScript 6 (`fwber-backend-ts`, port `4003`). High-concurrency API layer with strict Zod validation, Prisma ORM, and shared on-box local LLM inference (`gemma-4-heretic` via Ollama, `AI_PREFER_LOCAL=true`) with multi-provider cloud fallback.
*   **Real-time**: Socket.io (`ws.fwber.online`) for bidirectional communication (Chat, Typing, Nudges, Local Pulse, Emotional Auras).
*   **Database**: MySQL + Redis on Hetzner (`5.161.250.43`) with Prisma-driven schema management and automated nightly backups (`/var/backups/fwber/`).
*   **Frontend**: Next.js 16.4.3 (React 19.3.1, standalone output on port `3000` at `fwber.online`) utilizing App Router Server Components, PWA capabilities, glassmorphism/particle UI, and TailwindCSS.
*   **Mobile**: React Native 0.83 / Expo 55 (`mobile/`) with Expo Router and NFC hardware tap integration.

### The Distributed Next-Gen Phase
*   **Rust Geo-Screener Microservice**: A high-density Rust microservice utilizing H3 or S2 spatial indexing (`fwber-geo`). Calculates the Local Pulse in sub-millisecond time.
*   **ActivityPub Federation**: fwber nodes can federate, allowing cross-server discovery and interaction via standard WebFinger and ActivityPub inbox/outbox protocols.
*   **CRDT Offline Sync**: Conflict-free Replicated Data Types allowing seamless offline chatting, syncing smoothly via IndexedDB when devices regain connection.

---

## 🔮 3. The Feature Horizon

### Currently Realized (Phase 1-4)
- **Identity & Discovery**: AI Avatars, ZK-Identity Verification (Anti-Catfish), Local Pulse feed.
- **Engagement**: Relationship Tiers, Photo Reveals, Token Economy (FWB), Leaderboards, Achievements.
- **Communication**: E2E Encrypted Chat, Voice-Only Confessional Mode, Proximity Chatrooms, Event Discussion Boards.
- **Viral Mechanics**: "Rate My Cat", Wingman AI (Cosmic, Vibe, Nemesis).
- **Merchant Integration**: Sponsored local deals seamlessly integrated into the Pulse.
- **Safety**: Safe Walk Tracking, Panic Buttons, Hardware Tokens (BLE), AR "Ghost" Navigation.

### The Next Frontier (Phase 5+)
- **Value-Aligned Matching (CORE COMPLETE - v2.1.5)**: AI-powered "OkCupid-style" matching engine assessing shared life goals and ethical frameworks via a geometric-mean compatibility heuristic and weighted importance.
- **The AI Wingman Evolution**: A proactive agent that watches conversation flow and suggests real-time nudges ("You've been chatting for 3 days — suggest this nearby jazz event!").
- **Dynamic Emotional Avatars**: Avatars that shift their visual "aura" based on the user's recent sentiment and activity.
- **Neighborhood Social Layer**: Expanding the Local Pulse to serve as a hyper-local neighborhood forum ("Nextdoor meets modern dating").

---

## 🎨 4. Design Language & UX

*   **Aesthetic**: "Neon-Professional" / "Cyber-Noir". Deep dark modes, subtle glowing accents, glassmorphism for overlays, maintaining high-contrast typography and absolute usability.
*   **Experience**: Fluid, app-like interactions. Zero page reloads for core flows. Instant optimistic UI updates backed by robust error recovery. The app should feel *alive* but never overwhelming.
*   **Tone**: Confident, slightly edgy, yet universally respectful and safe.

---

## 🛡️ 5. AI Governance & Protocol

All AI agents (Claude, Gemini, GPT) working on this repository must adhere to the following universal directives:
1.  **Read the Documentation First**: Always sync with `AGENTS.md`, `docs/UNIVERSAL_LLM_INSTRUCTIONS.md`, and `TODO.md` before writing code.
2.  **Avoid Destructive Laziness**: Do not leave `// TODO: Implement this` when asked to write a feature. Implement it fully with proper error handling and UI polishing.
3.  **No `console.log` in Production**: Use structured logging.
4.  **UX Anti-Patterns**: Never use native `alert()` or `confirm()`. Use the established Toast system or custom Modals.
5.  **Autonomous Progression**: When executing a protocol, push through to completion. Anticipate edge cases. Update the `VERSION` and `CHANGELOG.md` autonomously.

## The Autonomous Execution Protocol (v2.0.21)
The fwber platform operates on a "Self-Correcting Autonomous Protocol". This system uses AI agents to monitor repository health, execute maintenance tasks, and adjust behavioral settings (Strict Mode, Subagent Delegation) in real-time. The goal is a zero-maintenance, self-evolving social graph that scales without human intervention.
