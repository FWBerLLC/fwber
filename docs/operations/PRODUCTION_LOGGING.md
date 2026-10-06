# Production Logging Configuration

Purpose: Configure structured, secure, and observable logging for fwber.site production.

Last updated: 2025-11-15

---

## Overview

This guide configures production-grade logging with:

- JSON structured logs (for log aggregation/ELK)
- Daily file rotation with 30-day retention
- Dedicated security audit channel (`security.log`)
- STDERR logging for container platforms
- Sentry integration for error tracking and performance traces

---

## Configuration Summary

### Environment variables (`.env`)

```dotenv
LOG_CHANNEL=stack
# Recommended in production
LOG_STACK=daily,stderr,security
LOG_LEVEL=info
LOG_FORMAT=json
LOG_DAILY_DAYS=30
LOG_SECURITY_DAYS=90

# Sentry (optional)
SENTRY_LARAVEL_DSN=
SENTRY_TRACES_SAMPLE_RATE=0.0
SENTRY_PROFILES_SAMPLE_RATE=0.0
SENTRY_SEND_DEFAULT_PII=false
```

### Logging channels

- `daily`: Rotating log at `storage/logs/laravel-YYYY-MM-DD.log`
- `stderr`: STDERR stream (for Docker/Kubernetes)
- `security`: Rotating security audit log at `storage/logs/security-YYYY-MM-DD.log`
- `stack`: Combines the above via `LOG_STACK`

JSON formatting is applied when `LOG_FORMAT=json`.

---

## Files changed

- `config/logging.php`:
  - Added `tap` to `daily` and `stderr` for JSON formatting
  - Added `security` channel (daily rotation, JSON-capable)
- `app/Logging/JsonFormatterTap.php`:
  - Applies `Monolog\Formatter\JsonFormatter` when `LOG_FORMAT=json`
- `config/sentry.php`:
  - Minimal Sentry config mapped to `.env`
- `composer.json`:
  - Added `sentry/sentry-laravel` dependency
- `.env.example`:
  - Added logging and Sentry environment variables

---

## Usage

### Application logging

```php
use Illuminate\Support\Facades\Log;

// General log
Log::info('User viewed feed', ['user_id' => $userId, 'count' => $count]);

// Warning and error
Log::warning('Image upload size exceeded', ['user_id' => $userId, 'bytes' => $size]);
Log::error('Payment gateway timeout', ['order_id' => $orderId, 'retry' => true]);

// Security log
Log::channel('security')->notice('Failed login', [
    'user_id' => $userId,
    'ip' => request()->ip(),
    'ua' => request()->userAgent(),
]);
```

### Error tracking (Sentry)

- Install dependencies: `composer install` (package auto-discovered)
- Set `SENTRY_LARAVEL_DSN`
- Sentry will automatically receive unhandled exceptions and `report()` calls

Manual capture example:

```php
use Sentry\Laravel\Facade as Sentry;

try {
    // risky operation
} catch (\Throwable $e) {
    Sentry::captureException($e);
    throw $e; // still propagate if needed
}
```

---

## Rotation, retention, and shipping

- `daily` logs retain `LOG_DAILY_DAYS` (default 30)
- `security` logs retain `LOG_SECURITY_DAYS` (default 90)
- For containers, prefer `LOG_STACK=daily,stderr,security` and ship `stderr` to your aggregator

### Log shipping (examples)

- Docker: `docker logs` or sidecar shippers (Fluent Bit/Filebeat)
- Kubernetes: ship from container `stderr` and/or mount `storage/logs`
- Bare metal: install Filebeat to tail `storage/logs/*.log`

---

## Verification

Run locally:

```bash
php artisan tinker --execute="\Illuminate\\Support\\Facades\\Log::info('log test', ['ts'=>now()->toIso8601String()]);"
php artisan tinker --execute="\Illuminate\\Support\\Facades\\Log::channel('security')->notice('security test', ['ip'=>'127.0.0.1']);"

# Inspect files
ls -l storage/logs/
```

Switch to JSON and verify format:

```bash
php -r "file_put_contents('.env', preg_replace('/^LOG_FORMAT=.*/m','LOG_FORMAT=json', file_get_contents('.env')));"
php artisan config:clear
php artisan tinker --execute="\Illuminate\\Support\\Facades\\Log::info('json test', ['ok'=>true]);"
```

Expected line (pretty-printed for clarity):

```json
{"message":"json test","context":{"ok":true},"level":200,"level_name":"INFO","channel":"daily","datetime":"2025-11-15T12:00:00.000000+00:00"}
```

---

## Production recommendations

- `APP_DEBUG=false`, `LOG_LEVEL=info` (or `warning` for extra quiet)
- `LOG_STACK=daily,stderr,security` for safe shipping and audit split
- `LOG_FORMAT=json` for machine-readable logs
- Ensure `storage/logs` is writable by the web user
- Configure Sentry sampling:
  - `SENTRY_TRACES_SAMPLE_RATE=0.2` (20% traces) to start
  - `SENTRY_PROFILES_SAMPLE_RATE=0.1` if profiling desired

---

## Troubleshooting

- No logs written: check file permissions and `config:clear`
- JSON not applied: ensure `LOG_FORMAT=json` and `config/logging.php` tap exists
- Sentry not receiving: verify DSN and network egress
- Large log files: tune `LOG_LEVEL` and rotate aggressively (`LOG_DAILY_DAYS=14`)

---

## Change log

- 2025-11-15: Initial production logging configuration and docs
