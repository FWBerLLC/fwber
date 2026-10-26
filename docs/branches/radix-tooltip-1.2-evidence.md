# Branch Evidence — `feat/radix-tooltip-1.2` (`@radix-ui/react-tooltip` 1.0.7 → 1.4.1)

> **Date:** 2026-10-26 · **Agent:** Pi (`[mimo-v2.6-pro in pi in ~/workspace/fwber]`)
> **Status:** branch built + validated, **NOT deployed** (deploy is Robert's call)
> **Rollback target:** `cf772ee80` (pre-migration prod; also trivial: this branch touches only 2 manifest files)

## Change

| Item | Before | After |
|---|---|---|
| `@radix-ui/react-tooltip` | 1.0.7 | **1.4.1** (`@latest`; includes the 1.2 line Muse named) |
| Files changed | — | `fwber-frontend/package.json`, `fwber-frontend/package-lock.json` ONLY |
| `react-leaflet` | 4.2.1 (unchanged) | deferred to its own branch per plan |

## Static validation (isolated test checkout `/var/www/fwber/next16-test`)

| Check | Result |
|---|---|
| `npx tsc --noEmit` | **0 errors** (includes tooltip wrapper `forwardRef` + all 8 usage sites) |
| `npm run lint` (`eslint app components lib`) | **0 errors**, 14 pre-existing `exhaustive-deps` warnings |
| `npm run build` (Turbopack standalone) | **BUILD_EXIT=0**, postbuild asset copy OK |

## What `legacy-peer-deps` is still hiding (the probe Muse asked for)

`npm install --dry-run --legacy-peer-deps=false` after the tooltip bump:

```
npm error code ERESOLVE
npm error While resolving: react-leaflet@4.2.1
npm error Found: react@19.3.1
npm error   peer react@"^18.0.0" from react-leaflet@4.2.1
```

**Exactly one conflict class remains: `react-leaflet@4.2.1`'s `peer react@^18.0.0`.**
The tooltip bump removed the tooltip from the equation; the `.npmrc` flag cannot
be deleted until the `react-leaflet` 5 branch lands — measured, not assumed.

## Interaction results (real CDP input events; `asChild` trigger is a lucide `<svg>`)

Method: registered throwaway QA account (id 186) via the public register API;
drove the `/bounties` tooltip (`TooltipTrigger asChild` → `<Info>` svg) with
CDP `Input.dispatchMouseEvent` / `Input.dispatchTouchEvent` / key events against
the **test build on :3999 (tooltip 1.4.1)** and, as a **control, the live prod
(tooltip 1.0.7)**.

| Interaction | 1.4.1 (candidate) | 1.0.7 (control) | Verdict |
|---|---|---|---|
| Trigger located, renders as original element (`asChild`) | ✅ `tag=svg` | ✅ `tag=svg` | parity |
| Hover opens tooltip (real mouse move) | ✅ text rendered | ✅ text rendered | parity |
| `asChild` aria wiring (`aria-describedby` on the svg itself) | ✅ | ✅ | parity |
| Focus opens tooltip (keyboard a11y) | ✅ | ✅ | parity |
| Escape closes tooltip | ✅ | ✅ | parity |
| Hover-out closes | ⚠️ stays open | ⚠️ stays open | **pre-existing, parity** |
| Mobile tap opens | ⚠️ not observed | ⚠️ not observed | **pre-existing, parity** (desktop-viewport CDP touch) |
| Content text integrity | ✅ full text renders | ✅ full text renders | parity |

**Bottom line:** candidate is **behavior-identical to the shipped version on
every dimension tested** — the two ⚠️s reproduce identically on production
today and are not upgrade regressions. The hover-out/tap quirks deserve their
own investigation ticket independent of this upgrade.

## `.npmrc` status after this bump

Still present (`legacy-peer-deps=true`) — **required**, solely by
`react-leaflet@4.2.1` (probe above). Target remains: delete after the
react-leaflet 5 branch.

## Deploy

**Not deployed.** Branch is pushed (`feat/radix-tooltip-1.2`); merge + deploy
await Robert's explicit go.
