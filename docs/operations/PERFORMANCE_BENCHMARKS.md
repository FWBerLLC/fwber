# Performance Benchmarks

Purpose: Establish baseline performance targets and a repeatable process to measure and improve fwber.site API latency and throughput.

Last updated: 2025-11-15

---

## Targets (initial)

- Health endpoints: p95 < 200ms
- Auth (login): p95 < 350ms
- Dashboard stats: p95 < 400ms
- Matches: p95 < 500ms
- Messages list: p95 < 500ms
- Error rate: < 1%

These are starting points; adjust as production telemetry arrives.

---

## Tools

- k6 (OSS) for load testing
- Laravel logs/Sentry for error monitoring
- DB EXPLAIN for query tuning

---

## Quick start (k6)

Script: `fwber-backend/scripts/perf/k6_baseline.js`

```bash
# Install k6 (Windows: choco install k6)
# Run baseline (20 VUs, 2 minutes)
set BASE_URL=http://localhost:8000
set TOKEN=<paste_bearer_token>
k6 run fwber-backend/scripts/perf/k6_baseline.js

# Override VUs/duration
k6 run -e VUS=50 -e DURATION=5m -e BASE_URL=%BASE_URL% -e TOKEN=%TOKEN% fwber-backend/scripts/perf/k6_baseline.js
```

Outputs of interest:
- http_req_duration p95/p99
- http_reqs (throughput)
- http_req_failed rate

---

## Query optimization workflow

1. Enable query logging (staging):
   ```php
   DB::whenQueryingForLongerThan(100, function($connection, $event) {
       \Log::warning('Slow query', [
           'connection' => $connection->getName(),
           'sql' => $event->sql, 'time_ms' => $event->time,
       ]);
   });
   ```
2. Identify slow endpoints from k6 and logs
3. Capture SQL via `
   EXPLAIN ANALYZE <query>`
4. Add/adjust indexes; avoid N+1 queries (use `with()` eager loading)
5. Re-run k6 and compare p95/p99

---

## Database indexing checklist

- WHERE clauses have supporting indexes
- JOIN columns indexed on both sides
- Composite indexes match query order
- Avoid leading wildcards in LIKE
- Use covering indexes for hot queries

---

## Caching

- Use Redis for short-lived cache of dashboard stats
- Cache heavy counts with tags and bust on writes
- Cache configuration and routes for production (`config:cache`, `route:cache`)

---

## CI smoke perf (optional)

Add a light k6 step to CI:
- VUs: 5, duration: 30s
- Thresholds: p95 < 750ms, http_req_failed < 2%

---

## Reporting

- Capture k6 summary JSON (`--out`) and archive with pipeline artifacts
- Track trend of p95 per endpoint monthly
- Add Grafana panel if shipping logs/metrics

---

## Sign-off checklist

- [ ] Baseline k6 completed
- [ ] p95 targets recorded
- [ ] Slow endpoints identified
- [ ] Index/ORM optimizations applied
- [ ] Regression check passed after changes
