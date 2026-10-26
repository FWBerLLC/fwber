# Branch Evidence — `feat/react-leaflet-5` (react-leaflet 4.2.1 → 5.0.0)

> **Date:** 2026-10-26 · **Agent:** Pi (`[mimo-v2.6-pro in pi in ~/workspace/fwber]`)
> **Status:** branch built + validated, **NOT deployed** (deploy is Robert's call)
> **Rollback target:** `e72b27a79` (main before this branch; changes are 2 manifests + `.npmrc` removal)

## Change

| Item | Before | After |
|---|---|---|
| `react-leaflet` | 4.2.1 | **5.0.0** (`@latest`, the React-19-native line) |
| `leaflet` | 1.9.4 | 1.9.4 (unchanged) |
| `fwber-frontend/.npmrc` | `legacy-peer-deps=true` | **DELETED** — the sole remaining blocker is gone |
| Files | — | `package.json`, `package-lock.json`, `.npmrc` (deleted) |

## Why this branch is small (the audit)

Only **2 components** use react-leaflet: `components/EventMap.tsx`,
`components/LocationPicker.tsx`. Neither touches the v5-removed APIs
(`whenCreated`, `MapConsumer`, `useMapElement`, `onOpen`/`onClose` props):
- `LocationPicker` already uses the v5-preferred **ref-callback** (`ref={setMap}`)
  and `useMapEvents` (both valid in v5).
- Both are `'use client'` with client-side `leaflet/dist/leaflet.css`, explicit
  container heights (`h-[400px]` / `h-[300px]`), and `dynamic(..., { ssr: false })`
  at their call sites — Muse's "invisible map" traps already handled.
- Marker icons are set explicitly (`L.Icon.Default.mergeOptions` + explicit
  `L.Icon`) — bundler-proof.

## Static + resolution validation (isolated test checkout)

| Check | Result |
|---|---|
| `npx tsc --noEmit` | **0 errors** |
| `npm run lint` (`eslint app components lib`) | **0 errors** (14 pre-existing warnings) |
| `npm run build` (Turbopack standalone) | **green** |
| `npm install --dry-run --legacy-peer-deps=false` | **EXIT 0** — strict resolution SUCCEEDS (only warnings from nested `qrcode.react@1.0.1` / `react-qr-reader@2.2.1` old peers, which npm overrides) |
| `npm install` with `.npmrc` **deleted** | **EXIT 0** — clean strict install, no flag needed |

**The `legacy-peer-deps` flag is retired on this branch** (the plan's target).

## Runtime battery (real CDP input events, test build on :3999)

Mounting path tested via a temporary harness page (`/maptest-harness`, test
checkout ONLY, deleted after — never committed) because app-level gating
(merchant `verification_status: pending`, RSVP flows) blocked the map pages
for a disposable QA account. Harness mounted `LocationPicker` + `EventMap`
directly.

| Muse's trap / check | Result |
|---|---|
| Map container renders with **nonzero height** | ✅ 1820×298 |
| **OSM tiles load** | ✅ 32/32 loaded |
| **Marker VISIBLE with real dimensions** (not just map loads) | ✅ 25×41, icon renders |
| Map click handled (LocationPicker set/move) | ✅ markers stable (2→2) |
| Interactive overlays (marker/circle paths) | ✅ 3 elements |
| **Remount: no "Map container is already initialized"** | ✅ navigate-away-and-back: remounts at h=298, 2 markers, 32 tiles, zero errors |

**6/6.** (Note: StrictMode dev double-mount doesn't apply to production
builds; the meaningful test is SPA/full-reload remount — covered.)

## Observations (not blockers)

- Marker icons load from **unpkg.com** (`LocationPicker` pins 1.7.1 paths,
  `EventMap` 1.9.4). Works, but is an external runtime dependency — self-hosting
  `public/images/leaflet/*` (the paths `EventMap`'s `mergeOptions` already
  references) would remove the network dependency. Filed as a hardening item.
- The two nested old-peer warnings (`qrcode.react`, `react-qr-reader`) come
  from web3/qr transitive trees — npm resolves them with warnings; not
  blockers.

## Deploy

**Not deployed.** Branch pushed (`feat/react-leaflet-5`); merge + deploy await
Robert's explicit go.
