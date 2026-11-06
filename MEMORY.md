# MEMORY.md — fwber Internal Architectural Observations

## Current Version: 2.3.53 "Federated Interactions"
**Last Updated:** 2026-11-04

### Architectural Shift: Unified High-Value Dashboard & Tooltip Standards (v2.3.53)
- The user dashboard at fwber-frontend/app/dashboard/page.tsx serves as the consolidated single pane of glass for all 10 platform domains.
- Every interactive FeatureTile enforces an explicit tooltip attribute explaining the workflow and purpose.
- Legacy or duplicate migration tools are categorized in tools/legacy/, maintaining non-destructive backups.
- Process control and server cleanup are managed through tools/fwber-tray.ps1 with port scoping (Backend 4003, Frontend 3000) and verified via tools/fwber-tray-check.py.

### Architectural Shift: Production Federation (v2.2.1)
The ActivityPub layer is now production-ready for external discovery and real-time interaction.
- **WebFinger**: Handles resolution of `@user@domain` handles to internal actor URIs.
- **Security Hardening**: DNS-level SSRF protection (`ssrf.ts`) for all outbound federation requests and XSS sanitization (`sanitize.ts`) for remote content.
- **Federated Interactions**: Support for outbound `Like` and `Announce` (Boost) activities, correctly targeting remote object URIs.
- **Activity Stream Ingestion**: `FederationService` now processes inbound `Create` activities for future global feed integration.

### Architectural Shift: Narrative Compatibility (v2.1.9)
The matching engine now produces "Narrative Reports" via `NarrativeService.ts`. This moves the platform away from raw percentages toward a more immersive "Cyber-Noir" discovery experience.
- **Signal Unification**: Compatibility scores are no longer just about question answers. They now incorporate real-time proximity (80/20 split) via `MatchingHeuristicService.ts`.

### Project Memory: Matching Engine (v2.1.5 - v2.1.8)
- The project implements an OkCupid-style matching engine using a geometric-mean compatibility heuristic: `Score = (Satisfaction A * Satisfaction B) ^ (1/2)`.
- It includes importance weighting: Irrelevant (0), A Little Important (1), Somewhat Important (10), Very Important (50), and Mandatory (250).
- The matching question frontend interface is at `/settings/matching`.
- As of v2.1.8, the dataset contains 95 broad personality questions. (v2.1.9: 108 questions including Cyber-Noir ethics).

### Federation Protocol (v2.0.11+)
- ActivityPub implementation with WebFinger support.
- Routes: `/api/federation/actors/:id`, `/api/federation/users/:id/inbox`, `/api/federation/users/:userId/outbox`.
- (Fixed v2.1.9): The actor detail route now handles non-numeric IDs gracefully.

### UI Standards
- High-fidelity "Cyber-Noir" aesthetic.
- Every backend feature must be comprehensively wired to the frontend with detailed tooltips and descriptions.

[... Historical observations ...]
