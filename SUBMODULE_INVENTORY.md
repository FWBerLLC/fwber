# Submodule Inventory — FWBerLLC/fwber

> **Last Updated:** 2026-11-12
> **Root Version:** 2.3.61

Monorepo layout — zero nested `.gitmodules` inside `fwber` (tracked as a single git repository at `https://github.com/FWBerLLC/fwber.git`, with automatic GitHub redirect from `https://github.com/robertpelloni/fwber.git` and historical fork parent `git@github.com:fwber-code/fwber.git`).

| # | Component | Path | Branch | Version | Remote | Status |
|---|-----------|------|--------|---------|--------|--------|
| 1 | fwber (root) | `.` | `main` | `v2.3.61` | `FWBerLLC/fwber` (`robertpelloni/fwber`) | clean, synced |
| 2 | fwber-backend-ts | `fwber-backend-ts/` | *(root)* | `2.3.61` | *(same repo)* | active, port `4003` (PM2) |
| 3 | fwber-frontend | `fwber-frontend/` | *(root)* | `2.3.61` | *(same repo)* | active, port `3000` (PM2) |
| 4 | fwber-geo | `fwber-geo/` | *(root)* | `0.99.1` | *(same repo)* | active, port `8081` (`systemd`) |
| 5 | fwber-wasm | `fwber-wasm/` | *(root)* | `0.1.0` | *(same repo)* | active, client E2EE WASM crate |
| 6 | mobile | `mobile/` | *(root)* | `1.0.0` | *(same repo)* | active, Expo 55 / RN 0.83 |
| 7 | ARCHIVE_v1_8_php_legacy | `ARCHIVE_v1_8_php_legacy/` | *(root)* | `1.8.x` | *(same repo)* | archived legacy PHP monolith |
