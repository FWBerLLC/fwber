# Smoke Check Diagnostics & Remediation Hints — Implementation Notes

**Date:** 2026-04-04  
**Version:** 1.4.9

## Problem
The smoke-check report artifacts added in v1.4.8 preserved raw evidence, but operators still had to interpret that evidence manually.

That meant the script could tell you **what failed** without helping enough on **what to do next**.

## Implementation Summary
Extended `ops/hetzner/scripts/smoke-check.sh` with a diagnostics layer that analyzes the captured case log after the smoke run completes.

### Diagnostic output
The script now writes a `diagnostics` section into the JSON report and a `Diagnostics & Recommended Actions` section into the Markdown report.

Each diagnostic contains:
- severity
- title
- finding
- remediation guidance

## Current Heuristics
### 1. Backend route drift on `api.fwber.site`
Triggered when:
- `/api/health`
- `/api/health/liveness`
- `/api/health/readiness`
all fail with `404`

Interpretation:
- reachable backend exists, but it likely is not the latest deployed route set

### 2. Geo domain still pointing at Vercel or a missing Vercel target
Triggered when:
- the geo endpoint fails
- the body contains `deployment could not be found on Vercel`

Interpretation:
- DNS or proxy routing for `geo.fwber.site` is still wrong for the intended Hetzner topology

### 3. Authenticated smoke coverage incomplete
Triggered when premium / merchant / moderation checks are skipped for missing bearer tokens.

Interpretation:
- the smoke script is still running usefully, but privileged surfaces remain unverified

### 4. Partial-health narrowing hint
Triggered when:
- invalid-login still passes
- public roast preview still passes
- one or more health/geo checks fail

Interpretation:
- the public deployment is partially healthy, so remediation should focus on rollout drift rather than broad outage assumptions

## Why This Matters
This moves the smoke check from a passive verifier to a lightweight deployment triage assistant. That is especially valuable during cutovers or late-night redeploys when operators need fast, opinionated next steps.
