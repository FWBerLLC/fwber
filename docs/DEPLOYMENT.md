# Production Deployment Guide

**Status**: ✅ Phase 3 Complete - Ready for Production Configuration

This guide provides a comprehensive path for production deployment, including quick reference scripts and detailed manual steps.

---

## ⚡ Quick Reference

### Backend Deployment
```bash
cd fwber-backend
./deploy.sh --env=production --branch=main
```
*Options: `--skip-migrations`, `--skip-backup`, `--dry-run`*

### Frontend Deployment
```bash
cd fwber-frontend
./deploy.sh --env=production --branch=main
```

### Rollback
```bash
# Backend
cd fwber-backend
./rollback.sh

# Frontend
cd fwber-frontend
git checkout HEAD^ && ./deploy.sh
```

---

## Prerequisites Checklist

Before starting production configuration, ensure:

- [x] Phase 3 verification passed (run `.\verify_phase3.ps1`)
- [ ] Production server provisioned (Linux recommended)
- [ ] Domain DNS configured (e.g., app.fwber.site, api.fwber.site)
- [ ] SSL/TLS certificates obtained (Let's Encrypt recommended)
- [ ] Database server running (MySQL 8.0+ or PostgreSQL 13+)
- [ ] Redis server running (for caching and rate limiting)
- [ ] AWS account configured (for S3 backups)
- [ ] Sentry account created (for error tracking)

---

## Step 1: Production Environment Configuration (30 minutes)

### 1.1 Copy Environment Template

```bash
cd fwber-backend
cp .env.example .env
```

### 1.2 Configure Critical Security Settings

Edit `.env` and set:

```dotenv
# Application
APP_ENV=production
APP_DEBUG=false
APP_KEY=   # Generate with: php artisan key:generate
APP_URL=https://app.fwber.site

# Security
SESSION_ENCRYPT=true
SESSION_SECURE_COOKIE=true
SESSION_SAME_SITE=strict

# CORS - Replace with actual domains
CORS_ALLOWED_ORIGINS=https://app.fwber.site,https://admin.fwber.site
CORS_ALLOWED_METHODS=GET,POST,PUT,DELETE,OPTIONS
CORS_ALLOWED_HEADERS=Content-Type,Authorization,X-Requested-With
CORS_SUPPORTS_CREDENTIALS=false

# CSP - Strict in production
CSP_RELAXED=false

# Database
DB_CONNECTION=mysql
DB_HOST=your-rds-endpoint.amazonaws.com  # Or your DB host
DB_PORT=3306
DB_DATABASE=fwber_production
DB_USERNAME=fwber_user
DB_PASSWORD=strong-random-password-here
DB_ENCRYPT=true
DB_SSL_VERIFY=true

# Redis
REDIS_HOST=your-redis-endpoint
REDIS_PASSWORD=your-redis-password
REDIS_PORT=6379

# Logging
LOG_CHANNEL=stack
LOG_STACK=daily,stderr,security
LOG_LEVEL=info
LOG_FORMAT=json
LOG_DAILY_DAYS=30
LOG_SECURITY_DAYS=90

# Sentry Error Tracking
SENTRY_LARAVEL_DSN=https://your-key@sentry.io/your-project-id
SENTRY_TRACES_SAMPLE_RATE=0.2
SENTRY_PROFILES_SAMPLE_RATE=0.1
SENTRY_SEND_DEFAULT_PII=false
```

### 1.3 Enable Production Features

```dotenv
# Rate Limiting
FEATURE_RATE_LIMITS=true

# Disable dev/testing features
# Do NOT set API_DEV_BYPASS_TOKEN in production
```

### 1.4 Verify Configuration

```bash
php artisan config:clear
php artisan config:cache
php artisan about
```

**Expected Output**: No errors, APP_ENV=production, APP_DEBUG=false

---

## Step 2: Database Setup (15 minutes)

### 2.1 Run Migrations

```bash
php artisan migrate --force
```

### 2.2 Configure Automated Backups

```bash
# Edit backup schedule
crontab -e

# Add these lines:
0 2,6,10,14,18,22 * * * /var/www/fwber/fwber-backend/scripts/backup_database.sh --compress --upload-s3 >> /var/log/fwber_backup.log 2>&1

# Test backup manually
./scripts/backup_database.sh --compress
```

### 2.3 Set Up S3 Bucket

```bash
# Create S3 bucket
aws s3 mb s3://fwber-backups-production

# Apply lifecycle policy (see docs/operations/DATABASE_BACKUP_STRATEGY.md)
aws s3api put-bucket-lifecycle-configuration \
  --bucket fwber-backups-production \
  --lifecycle-configuration file://s3-lifecycle-policy.json
```

**Add to `.env`**:
```dotenv
BACKUP_S3_BUCKET=fwber-backups-production
BACKUP_S3_PREFIX=backups
```

### 2.4 Test Restore Procedure

```bash
# In staging environment, not production!
./scripts/restore_database.sh --latest
```

---

## Step 3: Web Server Configuration (20 minutes)

### 3.1 Nginx Configuration (VPS/Dedicated)

*Note: If using Shared Hosting (e.g., DreamHost), skip this section and use the provided `.htaccess` or panel configuration.*

Create `/etc/nginx/sites-available/fwber`:

```nginx
server {
    listen 443 ssl http2;
    server_name api.fwber.site;

    ssl_certificate /etc/letsencrypt/live/api.fwber.site/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.fwber.site/privkey.pem;

    root /var/www/fwber/fwber-backend/public;
    index index.php;

    # Security headers (basic - SecurityHeaders middleware adds more)
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;

    # Health check endpoint (load balancer)
    location = /health {
        access_log off;
        try_files $uri $uri/ /index.php?$query_string;
    }

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \.php$ {
        fastcgi_pass unix:/var/run/php/php8.4-fpm.sock;
        fastcgi_index index.php;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
    }

    location ~ /\.(?!well-known).* {
        deny all;
    }
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name api.fwber.site;
    return 301 https://$server_name$request_uri;
}
```

```bash
# Enable site
ln -s /etc/nginx/sites-available/fwber /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

### 3.2 Set Permissions

```bash
cd /var/www/fwber/fwber-backend

# Set ownership
sudo chown -R www-data:www-data .

# Set permissions
sudo find . -type f -exec chmod 644 {} \;
sudo find . -type d -exec chmod 755 {} \;
sudo chmod -R 775 storage bootstrap/cache
```

---

## Step 4: Deploy Application (10 minutes)

### 4.1 First Deployment

```bash
cd /var/www/fwber/fwber-backend

# Install dependencies
composer install --no-dev --optimize-autoloader

# Cache configuration
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Storage link
php artisan storage:link

# Queue workers (if using)
php artisan queue:restart
```

### 4.2 Subsequent Deployments

```bash
./deploy.sh --env production
```

---

## Step 5: Monitoring Setup (30 minutes)

### 5.1 Configure Sentry

Already configured in `.env` (Step 1.2). Test with:

```bash
php artisan tinker --execute="throw new Exception('Sentry test from production');"
```

Check Sentry dashboard for the error.

### 5.2 Set Up Log Shipping

**For Docker/Kubernetes**: Logs already go to stderr, ship with Fluentd/Fluent Bit

**For Bare Metal / VPS**: Set up Filebeat

```bash
# Install Filebeat
curl -L -O https://artifacts.elastic.co/downloads/beats/filebeat/filebeat-8.11.0-linux-x86_64.tar.gz
tar xzvf filebeat-8.11.0-linux-x86_64.tar.gz

# Configure filebeat.yml
filebeat.inputs:
- type: log
  enabled: true
  paths:
    - /var/www/fwber/fwber-backend/storage/logs/*.log
  json.keys_under_root: true
  json.add_error_key: true

output.elasticsearch:
  hosts: ["your-elasticsearch:9200"]
```

### 5.3 Health Check Monitoring

Configure uptime monitoring (Pingdom, UptimeRobot, etc.) for:

- `https://api.fwber.site/health` - Every 5 minutes
- Alert on status != 200 or response time > 2s

**Load Balancer Integration**: See `docs/operations/HEALTH_CHECK_GUIDE.md`

---

## Step 6: Performance Baseline (15 minutes)

### 6.1 Install k6

```bash
# Linux
sudo apt-get install k6

# Or download binary
wget https://github.com/grafana/k6/releases/download/v0.47.0/k6-v0.47.0-linux-amd64.tar.gz
tar -xzf k6-v0.47.0-linux-amd64.tar.gz
sudo mv k6-v0.47.0-linux-amd64/k6 /usr/local/bin/
```

### 6.2 Run Baseline Test

```bash
cd /var/www/fwber/fwber-backend

# Get API token
TOKEN=$(php artisan tinker --execute="echo User::first()->tokens()->create(['name' => 'perf-test'])->plainTextToken;")

# Run k6 baseline
k6 run \
  -e BASE_URL=https://api.fwber.site \
  -e TOKEN=$TOKEN \
  scripts/perf/k6_baseline.js

# Save results
k6 run \
  -e BASE_URL=https://api.fwber.site \
  -e TOKEN=$TOKEN \
  --out json=baseline_$(date +%Y%m%d).json \
  scripts/perf/k6_baseline.js
```

### 6.3 Review Results

Look for:
- ✅ p95 response times < 500ms
- ✅ Error rate < 1%
- ⚠️  Any endpoints exceeding targets

**If endpoints are slow**: See `docs/operations/PERFORMANCE_BENCHMARKS.md` for optimization guide

---

## Step 7: Security Validation (15 minutes)

### 7.1 SSL/TLS Check

```bash
# Check SSL configuration
curl -I https://api.fwber.site
# Expect: HTTP/2 200, Strict-Transport-Security header

# Test with SSL Labs
# https://www.ssllabs.com/ssltest/analyze.html?d=api.fwber.site
```

### 7.2 Security Headers Check

```bash
curl -I https://api.fwber.site/health

# Expected headers:
# Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'; ...
# Strict-Transport-Security: max-age=31536000; includeSubDomains
# X-Content-Type-Options: nosniff
# X-Frame-Options: SAMEORIGIN
# Referrer-Policy: strict-origin-when-cross-origin
# Permissions-Policy: geolocation=(self), camera=(), microphone=()
```

### 7.3 Rate Limiting Test

```bash
# Test auth rate limiting (expect 429 after 5 attempts)
for i in {1..7}; do
  curl -X POST https://api.fwber.site/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"wrong"}'
  echo ""
done

# Verify 429 response on 6th and 7th attempts
```

### 7.4 CORS Check

```bash
# Should reject unauthorized origins
curl -X OPTIONS https://api.fwber.site/api/profile \
  -H "Origin: https://malicious-site.com" \
  -H "Access-Control-Request-Method: GET" \
  -v

# Expect: No Access-Control-Allow-Origin header (or error)
```

---

## Step 8: Smoke Tests (10 minutes)

### 8.1 Health Checks

```bash
# Liveness
curl https://api.fwber.site/health/liveness
# Expected: {"status":"ok","timestamp":"..."}

# Readiness
curl https://api.fwber.site/health/readiness
# Expected: {"status":"ok","checks":{...}}

# Full health
curl https://api.fwber.site/health | jq .
# Expected: All checks passing
```

### 8.2 Authentication Flow

```bash
# Register
curl -X POST https://api.fwber.site/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "smoketest@example.com",
    "password": "TestPass123!",
    "password_confirmation": "TestPass123!",
    "gender": "man",
    "looking_for": "woman",
    "age": 30
  }'

# Login
TOKEN=$(curl -X POST https://api.fwber.site/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"smoketest@example.com","password":"TestPass123!"}' \
  | jq -r '.token')

# Get profile
curl https://api.fwber.site/api/profile \
  -H "Authorization: Bearer $TOKEN" \
  | jq .
```

### 8.3 Core Features

```bash
# Dashboard stats
curl https://api.fwber.site/api/dashboard/stats \
  -H "Authorization: Bearer $TOKEN" \
  | jq .

# Matches
curl https://api.fwber.site/api/matches \
  -H "Authorization: Bearer $TOKEN" \
  | jq .

# Messages
curl https://api.fwber.site/api/messages \
  -H "Authorization: Bearer $TOKEN" \
  | jq .
```

---

## Step 9: Final Checks (5 minutes)

### 9.1 Review Logs

```bash
# Check for errors in last 100 lines
tail -n 100 storage/logs/laravel.log | grep -i error

# Check security logs
tail -n 50 storage/logs/security-*.log

# Check Sentry dashboard for exceptions
```

### 9.2 Verify Backups

```bash
# Check latest backup
ls -lh storage/backups/ | tail -n 5

# Verify S3 upload
aws s3 ls s3://fwber-backups-production/backups/ | tail -n 5

# Test backup notification (if configured)
```

### 9.3 Document Deployment

Update deployment log:

```
Deployment Date: 2025-11-15 14:30 UTC
Deployed By: [Your Name]
Git Commit: [SHA]
Database Schema Version: [Migration timestamp]
Issues: None
Performance Baseline: p95=320ms, p99=520ms
Next Review Date: 2025-11-22
```

---

## Step 10: Go Live! 🚀

### 10.1 Enable Traffic

- Update load balancer to route traffic to new instance
- Monitor error rates for first 30 minutes
- Keep deployment team on standby

### 10.2 Announce Deployment

Send team notification:

```
✅ Production deployment complete!

Deployment Summary:
- Time: 2025-11-15 14:45 UTC
- Duration: 15 minutes
- Downtime: 0 minutes (zero-downtime)
- Health Status: All checks passing
- Performance: p95 response time 320ms

Monitoring:
- Sentry: https://sentry.io/fwber
- Logs: [ELK dashboard URL]
- Uptime: [Pingdom dashboard URL]

Rollback Plan: ./rollback.sh (if needed within 24h)
```

### 10.3 Post-Deployment Monitoring (24 hours)

**Hour 1**: Check every 15 minutes
- Error rates
- Response times
- User reports

**Hour 2-24**: Check every hour
- Backup success
- Queue processing
- Database performance
- Memory/CPU usage

**Week 1**: Daily checks
- Review logs for anomalies
- Monitor rate limiting effectiveness
- Check backup costs vs. estimates
- Review Sentry error patterns

---

## Rollback Procedure (If Needed)

If issues arise:

```bash
# Standard rollback (no database changes)
./rollback.sh

# Rollback with database migrations
./rollback.sh --with-db

# Emergency database restore (disaster scenarios)
./scripts/emergency_restore.sh
```

**See**: `docs/operations/ROLLBACK_PROCEDURES.md` for detailed instructions

---

## Maintenance Schedule

### Daily
- Review error logs (5 minutes)
- Check backup success (automated, verify alerts)

### Weekly
- Review performance metrics (30 minutes)
- Check rate limiting stats (15 minutes)
- Review security logs for anomalies (30 minutes)

### Monthly
- Update dependencies: `composer update` (1 hour)
- Review and tune rate limits (30 minutes)
- Test backup restore procedure (1 hour)
- Security review: Check for new CVEs (1 hour)

### Quarterly
- Full security audit using `docs/security/PRODUCTION_SECURITY_AUDIT.md` (4 hours)
- Disaster recovery drill (full restore) (2 hours)
- Performance optimization review (2 hours)
- Documentation updates (1 hour)

---

## Support Resources

### Documentation
- Production Readiness: `docs/PHASE_3_PRODUCTION_READINESS_COMPLETE.md`
- Health Checks: `docs/operations/HEALTH_CHECK_GUIDE.md`
- Security Audit: `docs/security/PRODUCTION_SECURITY_AUDIT.md`
- Backup Strategy: `docs/operations/DATABASE_BACKUP_STRATEGY.md`
- Logging: `docs/operations/PRODUCTION_LOGGING.md`
- Rollback: `docs/operations/ROLLBACK_PROCEDURES.md`
- Rate Limiting: `docs/operations/RATE_LIMITING_VALIDATION.md`
- Performance: `docs/operations/PERFORMANCE_BENCHMARKS.md`

### Scripts
- Deploy: `./deploy.sh --env production`
- Rollback: `./rollback.sh`
- Backup: `./scripts/backup_database.sh`
- Restore: `./scripts/restore_database.sh`
- Emergency Restore: `./scripts/emergency_restore.sh`
- Performance Test: `k6 run scripts/perf/k6_baseline.js`

### Troubleshooting

**Issue**: Deployment fails with "configuration not found"
**Solution**: Run `php artisan config:cache` before deployment

**Issue**: Rate limiting not working
**Solution**: Verify `FEATURE_RATE_LIMITS=true` and Redis is accessible

**Issue**: Health checks failing
**Solution**: Check database and Redis connectivity, review logs

**Issue**: High response times
**Solution**: Enable query logging, run EXPLAIN ANALYZE, add indexes

**Issue**: Backup upload to S3 fails
**Solution**: Verify AWS credentials, check IAM permissions, test with `aws s3 ls`

---

**Last Updated**: November 27, 2025  
**Guide Version**: 2.0  
**Next Review**: After first production deployment
