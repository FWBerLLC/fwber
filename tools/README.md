# FWBer Tools Directory

## Active Tools (`tools/`)
| Script | Purpose |
|--------|---------|
| `fwber-tray.bat` / `fwber-tray.ps1` | Windows system tray — start/stop dev stack, open browser, quit |
| `fwber-tray-check.py` | Cross-platform port health checker & log tail tool for tray services |
| `audit-entry-points.cjs` | Audit API entry points for coverage gaps |
| `repair-truncated-packages.cjs` | Fix npm truncation issues on Windows (`<node_modules> [--apply]`) |
| `check_nav_coverage.py` | UI audit — finds app routes not linked from dashboard/header (reusable) |
| `check_remaining_routes.py` | UI audit — classifies unlinked routes as real pages vs redirects (reusable) |
| `scan_unguarded_map.py` | UI audit — finds unguarded `.map()` calls on API-response props (reusable) |
| `update-openapi.ps1` | Regenerate OpenAPI spec from routes |
| `update-test-database-trait.ps1` | Refresh the test-database helper |
| `verify_phase3.ps1` | Phase-3 verification routine |

## Service Scripts (`tools/scripts/`)
| Script | Purpose |
|--------|---------|
| `ai_cleanup.ps1` | AI scratch-file cleanup |
| `ai_coordinator.py` | AI coordination service |
| `cleanup-project.sh` | Project-wide cleanup (see also `tools/scripts/cleanup-project.sh`) |
| `fix-database-quick.ps1` | Quick database fix helper |
| `fwber_workflows.py` | Workflow automation helpers |
| `load_test.py` | Load testing for API endpoints |
| `deployment/setup-dev.ps1` | Development environment setup |

## Migrations & One-Time Fix Scripts (`tools/migrations/`, `tools/legacy/`, tracked)
Historical automation kept in-repo as provenance for their respective fixes — safe to re-run where idempotent, kept for reference otherwise.
| Script | Purpose |
|--------|---------|
| `migrate_theme_tokens.py` | Theme token migration Phase 1 (v2.3.36, 4,220 replacements) |
| `migrate_theme_tokens2.py` | Theme token migration Phase 2 (v2.3.36, 643 replacements) |
| `count_colors.py` | Count hardcoded color classes per file (theme audit) |
| `fix_button_types.py` | Auto-insert `type="button"` on onClick buttons (452 fixed) |
| `fix_unguarded_map.py` | Add `|| []` guards to API-response `.map()` calls (79 fixed) |
| `gen_loading_error.py` | Generated `loading.tsx`/`error.tsx` for all 180 page routes |

DB image-URL migration lives with the backend: `fwber-backend-ts/scripts/migrate-image-urls.mjs`.

## Archived (`tools/archive/` — `config/`, `orchestration/`, `scripts/` subdirs)
Stale, superseded, or abandoned tooling (Codex configs, Cline configs, PHP migrations, orchestrators). Kept for reference but not actively maintained.
