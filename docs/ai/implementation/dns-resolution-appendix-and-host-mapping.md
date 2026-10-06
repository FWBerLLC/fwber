# DNS Resolution Appendix & Host Mapping — Implementation Notes

**Date:** 2026-04-04  
**Version:** 1.5.1

## Problem
After v1.5.0, smoke-check reports could fingerprint the HTTP responder for each endpoint, but they still did not show what each hostname currently resolved to at the DNS layer.

That meant operators still had to run separate DNS commands to answer questions like:
- what IPs does `geo.fwber.site` resolve to right now?
- does the hostname itself already point toward Vercel-style addresses?
- does the HTTP responder IP line up with the host's resolved IP set?

## Implementation Summary
Extended `ops/hetzner/scripts/smoke-check.sh` with a DNS appendix.

### New report output
#### JSON
Added:
- `dns_records`

Each record contains:
- label
- host
- resolver
- addresses
- notes

#### Markdown
Added:
- `## DNS Resolution Appendix`

## Resolution strategy
The script now resolves the frontend, API, geo, and websocket hosts using:
- `python3` if available
- otherwise `python`
- specifically `socket.getaddrinfo`

This keeps the script portable without hard-requiring `dig` or `nslookup` packages.

## Current Live Operational Value
The live smoke-check run now reveals:
- `fwber.site` resolves to `216.198.79.1|216.198.79.65`
- `api.fwber.site` resolves to `75.119.202.57`
- `geo.fwber.site` resolves to `216.198.79.65|64.29.17.1`
- `ws.fwber.site` resolves to `69.163.180.228`

That strengthens the geo-domain drift picture because the DNS appendix now shows `geo.fwber.site` resolving into addresses associated with the wrong hosting topology instead of a clean Hetzner geo-service target.
