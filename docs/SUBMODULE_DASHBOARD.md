# Submodule Dashboard — fwber

> **Last Updated:** 2026-09-30
> **Root Version:** 2.3.33

---

## Topology

| Component | Path | Type | Remote | Status |
|-----------|------|------|--------|--------|
| **Root** | `.` | Monorepo | `github.com/FWBerLLC/fwber` | ✅ Active |
| **Backend (TS)** | `fwber-backend-ts/` | Directory | (same repo) | ✅ Active, port 4003 |
| **Frontend** | `fwber-frontend/` | Directory | (same repo) | ✅ Active, port 3000 (Hetzner) |
| **Geo Service** | `fwber-geo/` | Directory | (same repo) | ✅ Active, port 8081 |

## Port Registry

| Port | Service | Manager |
|------|---------|---------|
| 3000 | fwber-frontend (Next.js) | PM2 |
| 4003 | fwber-backend-ts (Express) | PM2 |
| 8081 | fwber-geo (Rust) | systemd |

## SSL Certificates

| Domain | Certificate | Expires | Auto-Renew |
|--------|-------------|---------|------------|
| `fwber.site` + `www.fwber.site` | Let's Encrypt | Oct 15, 2026 | ✅ |
| `api.fwber.site` | Let's Encrypt | Sep 1, 2026 | ✅ |
| `geo.fwber.site` | Let's Encrypt | Sep 1, 2026 | ✅ |
| `ws.fwber.site` | Let's Encrypt | Sep 1, 2026 | ✅ |

## DNS

| Domain | Type | Value |
|--------|------|-------|
| `fwber.site` | A | `5.161.250.43` |
| `www.fwber.site` | A | `5.161.250.43` |
| `api.fwber.site` | A | `5.161.250.43` |
| `geo.fwber.site` | A | `5.161.250.43` |
| `ws.fwber.site` | A | `5.161.250.43` |

## Deploy Targets

| Component | Target | Method |
|-----------|--------|--------|
| Frontend | Hetzner `5.161.250.43:3000` | GitHub Action `deploy-frontend.yml` |
| Backend (TS) | Hetzner `5.161.250.43:4003` | GitHub Action `deploy-backend.yml` |
| Geo (Rust) | Hetzner `5.161.250.43:8081` | systemd `fwber-geo.service` |
| Database | MySQL on Hetzner | Localhost |

## Active Feature Branches

All feature branches are fully merged into `main`. No unique commits outstanding. Remote `FWBerLLC/fwber` has only `main` (verified 2026-09-30 via `git ls-remote`).
