# Submodule Dashboard — fwber

> **Last Updated:** 2026-07-17
> **Root Version:** 2.3.32

---

## Topology

| Component | Path | Type | Remote | Status |
|-----------|------|------|--------|--------|
| **Root** | `.` | Monorepo | `github.com/robertpelloni/fwber` | ✅ Active |
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
| `fwber.me` + `www.fwber.me` | Let's Encrypt | Oct 15, 2026 | ✅ |
| `api.fwber.me` | Let's Encrypt | Sep 1, 2026 | ✅ |
| `geo.fwber.me` | Let's Encrypt | Sep 1, 2026 | ✅ |
| `ws.fwber.me` | Let's Encrypt | Sep 1, 2026 | ✅ |

## DNS

| Domain | Type | Value |
|--------|------|-------|
| `fwber.me` | A | `5.161.250.43` |
| `www.fwber.me` | A | `5.161.250.43` |
| `api.fwber.me` | A | `5.161.250.43` |
| `geo.fwber.me` | A | `5.161.250.43` |
| `ws.fwber.me` | A | `5.161.250.43` |

## Deploy Targets

| Component | Target | Method |
|-----------|--------|--------|
| Frontend | Hetzner `5.161.250.43:3000` | GitHub Action `deploy-frontend.yml` |
| Backend (TS) | Hetzner `5.161.250.43:4003` | GitHub Action `deploy-backend.yml` |
| Geo (Rust) | Hetzner `5.161.250.43:8081` | systemd `fwber-geo.service` |
| Database | MySQL on Hetzner | Localhost |

## Active Feature Branches

All feature branches are fully merged into `main`. No unique commits outstanding.
