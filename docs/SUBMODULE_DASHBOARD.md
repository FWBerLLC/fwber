# Submodule Dashboard — fwber

> **Last Updated:** 2026-11-14
> **Root Version:** 2.3.86

---

## 1. Repository & Submodule Topology

`fwber` is a unified multi-package monorepo (no nested `.gitmodules` inside `fwber`). When checked out inside the operator's parent superproject (`C:\Users\hyper\workspace`), `fwber` itself is tracked as a git submodule pointing to `github.com/FWBerLLC/fwber`.

| # | Component | Path | Kind | Version | Stack / Runtime | Remote / Origin | Status |
|---|-----------|------|------|---------|-----------------|-----------------|--------|
| 1 | **Root Monorepo** | `.` | Git Root (Submodule in parent workspace) | `2.3.86` | Unified orchestrator, docs, ops & CI | `https://github.com/FWBerLLC/fwber.git` (redirected from `https://github.com/robertpelloni/fwber.git`); legacy upstream `git@github.com:fwber-code/fwber.git` | ✅ Active (`main`) |
| 2 | **Backend API & WS** | `fwber-backend-ts/` | Workspace Package | `2.3.86` | Node.js ESM, Express 5, TypeScript 6, Prisma 6, Socket.io 4, Ollama + Cloud LLMs | *(monorepo)* | ✅ Active, port `4003` (PM2) |
| 3 | **Web Frontend** | `fwber-frontend/` | Workspace Package | `2.3.86` | Next.js `16.4.3` (standalone), React `19.3.1`, TailwindCSS, Solana Wallet Adapter, Sentry | *(monorepo)* | ✅ Active, port `3000` (PM2) |
| 4 | **Geo Screener** | `fwber-geo/` | Rust Crate | `2.3.81` (crate version, aligned 2026-11-13) | Rust `2024` edition, Actix-Web `4.19`, `h3o` hexagonal spatial index, `dashmap` | *(monorepo)* | ✅ Active, port `8081` (`systemd`) |
| 5 | **WASM Crypto** | `fwber-wasm/` | Rust/WASM Crate | `0.1.0` | Rust `2021` edition, `wasm-bindgen`, `aes-gcm` client-side E2EE primitives | *(monorepo)* | ✅ Active library |
| 6 | **Mobile Client** | `mobile/` | Expo / RN App | `1.0.0` | Expo `~55.0.4`, React Native `0.83.2`, Expo Router `~3.5.0`, `react-native-nfc-manager` | *(monorepo)* | ✅ Active mobile shell |
| 7 | **Legacy PHP Archive** | `ARCHIVE_v1_8_php_legacy/` | Historical Archive | `1.8.x` | Retired Laravel 11 + Reverb monolith (kept for schema/feature provenance) | *(monorepo)* | 📦 Archived |

---

## 2. Port & Process Registry

| Port | Service | Dev Command (`start.bat` / Tray) | Production Manager (`5.161.250.43`) | Public Domain |
|------|---------|----------------------------------|-------------------------------------|---------------|
| `3000` | `fwber-frontend` (Next.js 16) | `npm run dev` | PM2 (`fwber-frontend`) | `https://fwber.online`, `https://www.fwber.online` |
| `4003` | `fwber-backend-ts` (Express + Socket.io) | `npm run dev` (`tsx watch`) | PM2 (`fwber-backend-ts`) | `https://api.fwber.online`, `wss://ws.fwber.online` |
| `8081` | `fwber-geo` (Rust H3 Screener) | `cargo run --release` | `systemd` (`fwber-geo.service`) | `https://geo.fwber.online` |
| `3306` | MySQL 8 | Local / Docker | `systemd` (`mysql.service`) | Localhost only |
| `6379` | Redis | Local / Docker | `systemd` (`redis-server.service`) | Localhost only |
| `11434` | Shared Local LLM (Ollama `gemma-4-heretic`) | Optional | `systemd` (`ollama.service`) | Localhost only (`AI_PREFER_LOCAL=true`) |

---

## 3. DNS & TLS Layout (`fwber.online`)

> **Domain Note:** `fwber.me` was permanently retired on `2026-10-22`. `fwber.online` is the sole canonical domain.

| Domain | Record | Value | TLS | Auto-Renew |
|--------|--------|-------|-----|------------|
| `fwber.online` | A | `5.161.250.43` | Let's Encrypt (Certbot) | ✅ |
| `www.fwber.online` | A | `5.161.250.43` | Let's Encrypt (Certbot) | ✅ |
| `api.fwber.online` | A | `5.161.250.43` | Let's Encrypt (Certbot) | ✅ |
| `ws.fwber.online` | A | `5.161.250.43` | Let's Encrypt (Certbot) | ✅ |
| `geo.fwber.online` | A | `5.161.250.43` | Let's Encrypt (Certbot) | ✅ |

---

## 4. Deploy Targets & Scripts

| Component | Production Path (`5.161.250.43`) | CI / Deploy Automation | Local Build Target (`build.bat`) |
|-----------|----------------------------------|------------------------|----------------------------------|
| Frontend | `/var/www/fwber/repo/fwber-frontend` | `.github/workflows/deploy-frontend.yml` | `build.bat frontend` |
| Backend (TS) | `/var/www/fwber/repo/fwber-backend-ts` | `.github/workflows/deploy-backend.yml` / `ops/hetzner/scripts/deploy-backend-ts.sh` | `build.bat backend` |
| Geo (Rust) | `/var/www/fwber/repo/fwber-geo` | `ops/hetzner/scripts/deploy-backend-ts.sh` + `systemd` | `build.bat geo` |
| Mobile | N/A (EAS / native builds) | Expo CLI | `build.bat mobile` |

---

## 5. Branch Reconciliation Matrix (Verified `2026-11-14`, `v2.3.86`)

All active local and `origin/*` (`FWBerLLC/fwber` / `robertpelloni/fwber`) feature branches are **100% merged into `main`** (`0` unmerged commits remaining). Branch refs are preserved non-destructively per operator policy.

| Branch / Ref | Tip Commit | Unmerged Into `main` | Disposition |
|--------------|------------|----------------------|-------------|
| `main` / `origin/main` | `v2.3.86` | `0` | Canonical production & integration branch |
| `origin/jules-10314857368856784967-6dd32a46` | `ebf38a143` | `0` | ✅ Merged (`093632f6e`) & conflict-audited in `v2.3.61` |
| `origin/feat/wallet-login-backend` | `ad82d18a9` | `0` | ✅ Merged |
| `origin/chore/frontend-hardening-2026-10-26` | `671d79921` | `0` | ✅ Merged |
| `origin/feat/react-leaflet-5` | `d7835e2f6` | `0` | ✅ Merged |
| `origin/feat/radix-tooltip-1.2` | `9c6f7cbcb` | `0` | ✅ Merged |
| `origin/feat/next16-react19` | `cf772ee80` | `0` | ✅ Merged |
| Local historical `feat/*`, `feature/*`, `rev/*`, `v2.1.9-*` (9 branches) | `59cae3edf` / `0eb14e0d7` / etc. | `0` | ✅ Fully merged ancestors of `main` |
| `upstream/master` (`fwber-code/fwber`) | `f7ae49058` (`2020-02-17`) | `0` | ✅ Ancestor (`2,925+` commits behind `main`) |
| `upstream/dependabot/npm_and_yarn/js/Datejs-master/*` (6 branches) | `2020–2022` | `1` each (legacy `/js/Datejs-master`) | ⏭️ Ignored (stagnant 2020–2022 upstream bumps for deleted legacy v0 tree) |
