# FWBer Tools Directory

## Active Tools
| Script | Purpose |
|--------|---------|
| `fwber-tray.bat` / `fwber-tray.ps1` | Windows system tray — start/stop dev stack, open browser, quit |
| `audit-entry-points.cjs` | Audit API entry points for coverage gaps |
| `repair-truncated-packages.cjs` | Fix npm truncation issues on Windows |
| `check_nav_coverage.py` | UI audit — finds app routes not linked from dashboard/header (reusable) |
| `check_remaining_routes.py` | UI audit — classifies unlinked routes as real pages vs redirects (reusable) |
| `scan_unguarded_map.py` | UI audit — finds unguarded `.map()` calls on API-response props (reusable) |

## Migrations & One-Time Fix Scripts (`tools/migrations/`, tracked)
Historical automation kept in-repo as provenance for their respective fixes — safe to re-run where idempotent, kept for reference otherwise.
| Script | Purpose |
|--------|---------|
| `migrate_theme_tokens.py` | Theme token migration Phase 1 (v2.3.36, 4,220 replacements) |
| `migrate_theme_tokens2.py` | Theme token migration Phase 2 (v2.3.36, 643 replacements) |
| `count_colors.py` | Count hardcoded color classes per file (theme audit) |
| `fix_button_types.py` | Auto-insert `type="button"` on onClick buttons (452 fixed) |
| `fix_unguarded_map.py` | Add `|| []` guards to API-response `.map()` calls (79 fixed) |
| `gen_loading_error.py` | Generated `loading.tsx`/`error.tsx` for all 180 page routes |
| `../migrate-theme…` | *(see fwber-backend-ts/scripts/migrate-image-urls.mjs for the DB image-URL migration)* |
| `update-openapi.ps1` | Regenerate OpenAPI spec from routes |
| `scripts/load_test.py` | Load testing for API endpoints |
| `scripts/fwber_workflows.py` | Workflow automation helpers |
| `scripts/ai_coordinator.py` | AI coordination service |
| `deployment/setup-dev.ps1` | Development environment setup |

## Archived (moved to `tools/archive/`)
Scripts that are stale, superseded, or belong to abandoned tooling (Codex configs, Cline configs, PHP migrations, orchestrators). Kept for reference but not actively maintained.
