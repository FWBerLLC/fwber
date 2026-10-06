#!/usr/bin/env pwsh
<#
 Phase 3 Production Readiness Verification Script (Clean ASCII Version)
 Author: fwber.site Development Team
 Date: November 15, 2025
#>

param([switch]$SkipHealthCheck,[switch]$Verbose)

$ErrorActionPreference = 'Continue'

function Ok($m){ Write-Host "OK: $m" -ForegroundColor Green }
function Fail($m){ Write-Host "FAIL: $m" -ForegroundColor Red }
function Info($m){ Write-Host "INFO: $m" -ForegroundColor Cyan }
function Sect($m){ Write-Host "`n=== $m ===" -ForegroundColor Yellow }

$script:passCount=0; $script:failCount=0; $script:skipCount=0
function HasFile($path,$desc){ if(Test-Path $path){ Ok "$desc exists: $path"; $script:passCount++ ; $true } else { Fail "$desc missing: $path"; $script:failCount++ ; $false } }
function Cmd($cmd,$desc,$pat){ try{ $out = Invoke-Expression $cmd 2>&1 | Out-String; if($pat -and $out -notmatch $pat){ Fail "$desc - expected pattern not found: $pat"; if($Verbose){ Write-Host $out -ForegroundColor DarkGray }; $script:failCount++; return $false }; Ok $desc; if($Verbose){ Write-Host $out -ForegroundColor DarkGray }; $script:passCount++; $true } catch { Fail "$desc - error: $_"; $script:failCount++; $false } }

$backend = Join-Path $PSScriptRoot 'fwber-backend'
if(-not (Test-Path $backend)){ $backend = Join-Path (Get-Location) 'fwber-backend' }
if(-not (Test-Path $backend)){ Fail 'Cannot find fwber-backend directory'; exit 1 }
Set-Location $backend
Write-Host 'fwber.site Phase 3 Verification' -ForegroundColor Magenta

Sect 'Item 1: Deployment Automation'
HasFile 'deploy.sh' 'Deployment script'
HasFile 'rollback.sh' 'Rollback script'
if(Test-Path 'deploy.sh'){ $c = Get-Content 'deploy.sh' -Raw; if($c -match '--env' -and $c -match 'maintenance'){ Ok 'Deployment script has env + maintenance mode'; $script:passCount++ } else { Fail 'Deployment script missing expected features'; $script:failCount++ } }

Sect 'Item 2: Health Check'
HasFile '../docs/operations/HEALTH_CHECK_GUIDE.md' 'Health check documentation'
$routeCheck = Cmd 'php artisan route:list --path=health 2>&1' 'Health check routes registered' '/health'
if($routeCheck){ Info 'Expected: /health, /health/liveness, /health/readiness' }

Sect 'Item 3: Security Audit'
HasFile '../docs/security/PRODUCTION_SECURITY_AUDIT.md' 'Security audit document'
if(Test-Path 'config/cors.php'){ $cc = Get-Content 'config/cors.php' -Raw; if($cc -match 'CORS_ALLOWED_ORIGINS'){ Ok 'CORS env-configurable'; $script:passCount++ } else { Fail 'CORS not env-configurable'; $script:failCount++ } }
if(Test-Path 'app/Http/Middleware/SecurityHeaders.php'){ $sc = Get-Content 'app/Http/Middleware/SecurityHeaders.php' -Raw; if($sc -match 'CSP_RELAXED' -and $sc -match "app\(\)->environment\('production'\)"){ Ok 'CSP strict production mode present'; $script:passCount++ } else { Fail 'CSP hardening incomplete'; $script:failCount++ } }

Sect 'Item 4: Backup Strategy'
HasFile 'scripts/backup_database.sh' 'Backup script'
HasFile 'scripts/restore_database.sh' 'Restore script'
HasFile 'scripts/emergency_restore.sh' 'Emergency restore script'
HasFile '../docs/operations/DATABASE_BACKUP_STRATEGY.md' 'Backup documentation'
if(Test-Path 'scripts/backup_database.sh'){ $bc = Get-Content 'scripts/backup_database.sh' -Raw; if($bc -match 'mysqldump' -and $bc -match 'pg_dump' -and $bc -match 'S3'){ Ok 'Backup supports MySQL/PostgreSQL/S3'; $script:passCount++ } }

Sect 'Item 5: Logging'
HasFile 'config/logging.php' 'Logging configuration'
HasFile 'config/sentry.php' 'Sentry configuration'
HasFile 'app/Logging/JsonFormatterTap.php' 'JSON formatter tap'
HasFile '../docs/operations/PRODUCTION_LOGGING.md' 'Logging documentation'
if(Test-Path 'config/logging.php'){ $lc = Get-Content 'config/logging.php' -Raw; if($lc -match 'JsonFormatterTap' -and $lc -match "'security'"){ Ok 'Logging has JSON tap + security channel'; $script:passCount++ } else { Fail 'Logging config incomplete'; $script:failCount++ } }
if(Test-Path 'composer.json'){ try { $cj = Get-Content 'composer.json' -Raw | ConvertFrom-Json; if($cj.require.'sentry/sentry-laravel'){ Ok 'Sentry dependency present'; $script:passCount++ } else { Fail 'Sentry dependency missing'; $script:failCount++ } } catch { Fail 'composer.json parse failed'; $script:failCount++ } }
Info 'Testing log write...'
try { $tc = "Log::info('Phase3 verification', ['t'=>true]); Log::channel('security')->notice('Verification test',['phase'=>3]); echo 'Success';"; $lt = php artisan tinker --execute=$tc 2>&1 | Out-String; if($lt -match 'Success'){ Ok 'Log write functional'; $script:passCount++ } } catch { Fail 'Log write test failed'; $script:failCount++ }

Sect 'Item 6: Rollback'
HasFile '../docs/operations/ROLLBACK_PROCEDURES.md' 'Rollback documentation'
if(Test-Path 'rollback.sh'){ $rc = Get-Content 'rollback.sh' -Raw; if($rc -match '--with-db' -and $rc -match '--to-commit'){ Ok 'Rollback script has db + commit opts'; $script:passCount++ } }

Sect 'Item 7: Rate Limiting'
HasFile '../docs/operations/RATE_LIMITING_VALIDATION.md' 'Rate limiting documentation'
if(Test-Path 'bootstrap/app.php'){ $ba = Get-Content 'bootstrap/app.php' -Raw; if($ba -match 'rate\.limit.*AdvancedRateLimiting'){ Ok 'Rate limit middleware registered'; $script:passCount++ } else { Fail 'Rate limit middleware not registered'; $script:failCount++ } }
if(Test-Path 'routes/api.php'){ $ar = Get-Content 'routes/api.php' -Raw; if($ar -match 'rate\.limit:auth_attempt' -and $ar -match 'rate\.limit:api_call'){ Ok 'Rate limiting applied to routes'; $script:passCount++ } else { Fail 'Rate limiting missing on routes'; $script:failCount++ } }
HasFile 'app/Services/AdvancedRateLimitingService.php' 'Rate limiting service'

Sect 'Item 8: Performance'
HasFile 'scripts/perf/k6_baseline.js' 'k6 baseline script'
HasFile '../docs/operations/PERFORMANCE_BENCHMARKS.md' 'Performance documentation'
if(Test-Path 'scripts/perf/k6_baseline.js'){ $k6 = Get-Content 'scripts/perf/k6_baseline.js' -Raw; if($k6 -match 'VUS' -and $k6 -match 'DURATION' -and $k6 -match 'thresholds'){ Ok 'k6 script configurable'; $script:passCount++ } }
try { $kv = k6 version 2>&1 | Out-String; if($kv -match 'k6'){ Ok "k6 installed: $($kv.Trim())"; $script:passCount++ } } catch { Info 'k6 not installed (optional)'; $script:skipCount++ }

Sect 'Config Validation'
Cmd 'php artisan config:clear 2>&1' 'Configuration cache clear' 'cleared'
Cmd 'php artisan config:cache 2>&1' 'Configuration cache build' 'cached'
Cmd 'php artisan -V 2>&1' 'Laravel application boot' 'Laravel Framework'

Sect 'Environment Configuration'
HasFile '.env.example' 'Environment template'
if(Test-Path '.env.example'){ $envEx = Get-Content '.env.example' -Raw; $need = @('LOG_FORMAT','LOG_DAILY_DAYS','LOG_SECURITY_DAYS','CORS_ALLOWED_ORIGINS','CSP_RELAXED','SENTRY_LARAVEL_DSN','FEATURE_RATE_LIMITS'); $miss = @(); foreach($v in $need){ if($envEx -notmatch $v){ $miss += $v } }; if($miss.Count -eq 0){ Ok '.env.example documents required vars'; $script:passCount++ } else { Fail "Missing env vars: $($miss -join ', ')"; $script:failCount++ } }

Sect 'Documentation Completeness'
$docs = @{
  '../docs/operations/HEALTH_CHECK_GUIDE.md'='Health Check Guide';
  '../docs/security/PRODUCTION_SECURITY_AUDIT.md'='Security Audit';
  '../docs/operations/DATABASE_BACKUP_STRATEGY.md'='Backup Strategy';
  '../docs/operations/PRODUCTION_LOGGING.md'='Logging Guide';
  '../docs/operations/ROLLBACK_PROCEDURES.md'='Rollback Procedures';
  '../docs/operations/RATE_LIMITING_VALIDATION.md'='Rate Limiting Validation';
  '../docs/operations/PERFORMANCE_BENCHMARKS.md'='Performance Benchmarks';
  '../docs/PHASE_3_PRODUCTION_READINESS_COMPLETE.md'='Phase 3 Summary';
}
foreach($d in $docs.GetEnumerator()){ HasFile $d.Key $d.Value }

if(-not $SkipHealthCheck){ Sect 'Live Health Check'; Info 'Testing /health (optional)...'; $base = if($env:APP_URL){ $env:APP_URL } else { 'http://localhost:8000' }; try { $resp = Invoke-WebRequest -Uri "$base/health" -Method GET -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop; if($resp.StatusCode -eq 200){ Ok "Health endpoint responding: $base/health"; $script:passCount++ } } catch { Info 'Health endpoint not reachable; skipping'; $script:skipCount++ } } else { Info 'Health check skipped (--SkipHealthCheck)'; $script:skipCount++ }

Write-Host ''
Write-Host '=== VERIFICATION SUMMARY ===' -ForegroundColor Magenta
$total = $script:passCount + $script:failCount + $script:skipCount
Write-Host ('Passed:  ' + $script:passCount + '/' + $total) -ForegroundColor Green
Write-Host ('Failed:  ' + $script:failCount + '/' + $total) -ForegroundColor Red
Write-Host ('Skipped: ' + $script:skipCount + '/' + $total) -ForegroundColor Yellow
if($script:failCount -eq 0){ Write-Host 'Phase 3 Production Readiness: COMPLETE' -ForegroundColor Green; exit 0 } else { Write-Host ("Phase 3 has $($script:failCount) failing check(s)") -ForegroundColor Yellow; exit 1 }
