# Endpoint Fingerprints & Host Signals — Implementation Notes

**Date:** 2026-04-04  
**Version:** 1.5.0

## Problem
The smoke-check reports in v1.4.9 could explain likely causes, but they still lacked some low-level evidence operators often need during deploy debugging:
- which remote IP actually answered
- which `Server` header answered
- whether there was a redirect target
- what content type came back
- what body excerpt was returned for the failing endpoint

Without that fingerprinting layer, operators still had to re-run manual `curl -I` commands after reading the report.

## Implementation Summary
Extended `ops/hetzner/scripts/smoke-check.sh` so each HTTP probe now records an endpoint fingerprint snapshot containing:
- check label
- HTTP method
- requested URL
- returned HTTP code
- remote IP
- effective URL
- `Server` header
- `Content-Type`
- `Location` header when present
- body excerpt

## Report Output
### JSON
Added a `snapshots` array to `smoke-check-summary.json`.

### Markdown
Added an `Endpoint Fingerprints` table to `smoke-check-summary.md`.

## Current Operational Value
This made the current live findings much sharper:
- `api.fwber.site` health-route failures are now fingerprinted as coming from **Apache** at `75.119.202.57`
- `geo.fwber.site` failures are now fingerprinted as coming from **Vercel** at `64.29.17.1`
- `fwber.site` itself fingerprints as **Vercel** with a redirect to `https://www.fwber.site/`

That evidence strengthens the routing-drift interpretation substantially.

## Important Implementation Detail
Snapshot fields can legitimately be empty, especially `Location`. To keep tab-delimited snapshot parsing stable under Bash, empty snapshot fields are normalized to `—` before being written to the temporary snapshot log.
