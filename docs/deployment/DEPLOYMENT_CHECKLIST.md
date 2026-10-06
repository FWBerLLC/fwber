# fwber Deployment & Production Readiness Checklist

This checklist ensures that both the frontend and backend are fully prepared for production deployment. Use this before any production release.

## Table of Contents
- [Pre-Deployment Setup](#pre-deployment-setup)
- [Frontend Deployment](#frontend-deployment)
- [Backend Deployment](#backend-deployment)
- [Database](#database)
- [Security](#security)
- [Performance](#performance)
- [Monitoring & Logging](#monitoring--logging)
- [DNS & Infrastructure](#dns--infrastructure)
- [Post-Deployment Verification](#post-deployment-verification)
- [Rollback Plan](#rollback-plan)

---

## Pre-Deployment Setup

### Code Quality
- [ ] All tests pass (unit, integration, e2e)
  ```bash
  # Frontend
  cd fwber-frontend && npm run test

  # Backend
  cd fwber-backend && php artisan test
  ```
- [ ] No TypeScript/PHP compilation errors
- [ ] Code linting passes with no errors
  ```bash
  # Frontend
  npm run lint

  # Backend
  ./vendor/bin/phpstan analyse
  ```
- [ ] All console warnings resolved in development
- [ ] No hardcoded credentials or API keys in code
- [ ] Git repository is clean (no uncommitted changes)

### Documentation
- [ ] README.md is up to date
- [ ] API documentation is current
- [ ] Environment variable documentation complete
- [ ] Deployment runbook created
- [ ] Known issues documented
- [ ] CHANGELOG.md updated with release notes

### Version Control
- [ ] Feature branch merged to staging
- [ ] Staging tested and approved
- [ ] Release tag created (e.g., `v1.0.0`)
- [ ] Release notes published

---

## Frontend Deployment

### Environment Configuration

- [ ] Production environment variables set:
  ```env
  NEXT_PUBLIC_API_URL=https://api.fwber.site
  NEXT_PUBLIC_WS_URL=wss://api.fwber.site
  NEXT_PUBLIC_ENVIRONMENT=production
  NEXTAUTH_URL=https://fwber.site
  NEXTAUTH_SECRET=<secure-random-secret>
  ```
- [ ] API endpoints point to production backend
- [ ] WebSocket URL configured correctly
- [ ] Analytics tracking IDs configured (if applicable)
- [ ] Error tracking configured (Sentry DSN, etc.)

### Build Optimization

- [ ] Production build created and tested
  ```bash
  npm run build -- --webpack # Use webpack to avoid Turbopack issues
  npm run start # Test production build locally
  ```
- [ ] Bundle size is acceptable (<300KB main bundle gzipped)
  ```bash
  npm run analyze # If webpack-bundle-analyzer is configured
  ```
- [ ] Code splitting configured for routes
- [ ] Tree shaking enabled and working
- [ ] Source maps configured for error tracking (but not public)
- [ ] No development dependencies in production build

### Static Assets

- [ ] All images optimized (WebP with fallbacks)
- [x] Favicon and PWA icons generated
  - [x] PNG icons (72x72 to 512x512) generated in `public/icons/`
  - [x] Manifest updated with all icon sizes and shortcuts
- [x] Service worker configured (PWA)
  - [x] `next-pwa` configured in `next.config.js`
  - [x] Push notification support in `sw-push.js`
  - [x] Offline caching enabled

- [ ] sitemap.xml generated (if applicable)

### Performance

- [ ] Lighthouse scores meet targets:
  - Performance: >80
  - Accessibility: >90
  - Best Practices: >90
  - SEO: >90
- [ ] Core Web Vitals optimized:
  - LCP < 2.5s
  - FID < 100ms
  - CLS < 0.1
- [ ] Images lazy-loaded where appropriate
- [ ] Critical CSS inlined
- [ ] Font loading optimized

### Next.js Specific

- [ ] API routes secured (rate limiting, auth)
- [ ] Middleware configured correctly
- [ ] ISR/SSG pages configured if needed
- [ ] Edge functions tested (if using)
- [ ] Preview mode disabled in production

### Deployment Platform (Vercel/Netlify/etc.)

- [ ] Custom domain configured
- [ ] SSL certificate active and valid
- [ ] Deployment hooks configured
- [ ] Environment variables set on platform
- [ ] Build settings optimized
  ```
  Build Command: npm run build -- --webpack
  Output Directory: .next
  Install Command: npm ci
  Node Version: 18.x (or latest LTS)
  ```
- [ ] Preview deployments configured for PRs
- [ ] Auto-deploy on main branch enabled (or disabled if manual)
- [ ] Rollback capability tested

### Backend Deployment Note
The `deploy.sh` script in `fwber-backend` handles the backend deployment correctly, including pulling changes, installing dependencies, migrating the database, and restarting services. Ensure you have the necessary permissions to execute it.

---

## Backend Deployment

### Environment Configuration

- [ ] Production .env file configured:
  ```env
  APP_ENV=production
  APP_DEBUG=false
  APP_KEY=<secure-random-32-char-key>
  APP_URL=https://api.fwber.site

  DB_CONNECTION=mysql
  DB_HOST=<production-db-host>
  DB_PORT=3306
  DB_DATABASE=fwber_production
  DB_USERNAME=<db-user>
  DB_PASSWORD=<secure-password>

  CACHE_DRIVER=redis
  QUEUE_CONNECTION=redis
  SESSION_DRIVER=redis

  REDIS_HOST=<redis-host>
  REDIS_PASSWORD=<redis-password>
  REDIS_PORT=6379

  MAIL_MAILER=smtp
  MAIL_HOST=<smtp-host>
  MAIL_PORT=587
  MAIL_USERNAME=<mail-user>
  MAIL_PASSWORD=<mail-password>
  MAIL_ENCRYPTION=tls
  MAIL_FROM_ADDRESS=noreply@fwber.site
  MAIL_FROM_NAME="fwber"

  AWS_ACCESS_KEY_ID=<aws-key>
  AWS_SECRET_ACCESS_KEY=<aws-secret>
  AWS_DEFAULT_REGION=us-east-1
  AWS_BUCKET=fwber-storage

  WEBSOCKET_HOST=0.0.0.0
  WEBSOCKET_PORT=6001

  LOG_CHANNEL=stack
  LOG_LEVEL=error
  ```
- [ ] APP_DEBUG is FALSE
- [ ] APP_KEY is set and secure (32 characters)
- [ ] Database credentials are secure
- [ ] All third-party API keys configured
- [ ] Mail server configured and tested

### Laravel Optimization

- [ ] Configuration cached
  ```bash
  php artisan config:cache
  ```
- [ ] Routes cached
  ```bash
  php artisan route:cache
  ```
- [ ] Views compiled
  ```bash
  php artisan view:cache
  ```
- [ ] OPcache enabled in PHP
- [ ] Composer optimized for production
  ```bash
  composer install --optimize-autoloader --no-dev
  ```

### Database

- [ ] All migrations run successfully
  ```bash
  php artisan migrate --force
  ```
- [ ] Database backup taken before deployment
- [ ] Seeders run if needed (be careful in production!)
- [ ] Database indexes verified and optimized
- [ ] Slow query logging enabled
- [ ] Connection pooling configured

### Queue Workers

- [ ] Queue workers configured and running
  ```bash
  php artisan queue:work --daemon --tries=3
  ```
- [ ] Supervisor configuration created
  ```ini
  [program:fwber-worker]
  process_name=%(program_name)s_%(process_num)02d
  command=php /var/www/fwber-backend/artisan queue:work --sleep=3 --tries=3
  autostart=true
  autorestart=true
  user=www-data
  numprocs=4
  redirect_stderr=true
  stdout_logfile=/var/www/fwber-backend/storage/logs/worker.log
  ```
- [ ] Failed jobs table created
  ```bash
  php artisan queue:failed-table
  php artisan migrate
  ```
- [ ] Queue monitoring configured

### Scheduled Tasks

- [ ] Cron job configured for Laravel scheduler
  ```bash
  * * * * * cd /var/www/fwber-backend && php artisan schedule:run >> /dev/null 2>&1
  ```
- [ ] Scheduled tasks tested
- [ ] Task failure notifications configured

### WebSocket Server

- [ ] WebSocket server (Laravel Echo Server / Reverb) configured
- [ ] SSL certificate configured for WebSocket
- [ ] Firewall rules allow WebSocket port (default 6001)
- [ ] WebSocket server set to auto-restart on failure
- [ ] Supervisor configuration for WebSocket
  ```ini
  [program:fwber-websocket]
  command=php /var/www/fwber-backend/artisan websocket:serve
  autostart=true
  autorestart=true
  user=www-data
  redirect_stderr=true
  stdout_logfile=/var/www/fwber-backend/storage/logs/websocket.log
  ```

### File Storage

- [ ] Storage directories writable (storage/, bootstrap/cache/)
  ```bash
  chmod -R 775 storage bootstrap/cache
  chown -R www-data:www-data storage bootstrap/cache
  ```
- [ ] Public storage linked
  ```bash
  php artisan storage:link
  ```
- [ ] File upload limits configured in php.ini
  ```ini
  upload_max_filesize = 50M
  post_max_size = 50M
  ```
- [ ] S3 or cloud storage configured for production
- [ ] CDN configured for static assets

### Web Server (Nginx/Apache)

- [ ] Virtual host configured
- [ ] SSL certificate installed and active
- [ ] HTTP/2 enabled
- [ ] Gzip compression enabled
- [ ] Static file caching headers set
- [ ] PHP-FPM configured and optimized
- [ ] Request rate limiting configured

**Example Nginx Configuration:**
```nginx
server {
    listen 80;
    listen [::]:80;
    server_name api.fwber.site;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name api.fwber.site;

    root /var/www/fwber-backend/public;
    index index.php;

    ssl_certificate /etc/letsencrypt/live/api.fwber.site/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.fwber.site/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Security headers (also set in middleware)
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    # Static files caching
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \.php$ {
        fastcgi_pass unix:/var/run/php/php8.2-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
    }

    location ~ /\.(?!well-known).* {
        deny all;
    }
}
```

---

## Database

### Pre-Deployment

- [ ] Full database backup created
- [ ] Backup stored in secure, separate location
- [ ] Backup restoration tested recently
- [ ] Migration rollback tested in staging

### Performance

- [ ] Indexes on all foreign keys
- [ ] Indexes on frequently queried columns
- [ ] Query performance analyzed
  ```bash
  # Enable slow query log
  SET GLOBAL slow_query_log = 'ON';
  SET GLOBAL long_query_time = 1;
  ```
- [ ] Connection pool configured
- [ ] Database statistics updated
  ```sql
  ANALYZE TABLE users, matches, messages, photos;
  ```

### Security

- [ ] Database user has minimal required permissions
- [ ] Root access disabled from application
- [ ] Database firewall rules configured
- [ ] SSL/TLS enabled for database connections
- [ ] Automated backups scheduled (daily at minimum)
- [ ] Backup retention policy defined

---

## Security

### SSL/TLS

- [ ] SSL certificates installed and valid
- [ ] Certificate auto-renewal configured (Let's Encrypt)
- [ ] HTTPS enforced (HTTP redirects to HTTPS)
- [ ] HSTS header configured
  ```
  Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
  ```
- [ ] SSL Labs test score: A or A+

### Authentication & Authorization

- [ ] JWT/session tokens secure and properly configured
- [ ] Token expiration times set appropriately
- [ ] Refresh token rotation implemented
- [ ] Password hashing verified (bcrypt, Argon2)
- [ ] Multi-factor authentication working (if implemented)
- [ ] Password reset flow secure and tested
- [ ] Rate limiting on auth endpoints
  ```php
  // Example: 5 login attempts per minute
  RateLimiter::for('login', function (Request $request) {
      return Limit::perMinute(5)->by($request->ip());
  });
  ```

### API Security

- [ ] CORS configured correctly
- [ ] API rate limiting enabled
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention (use parameterized queries)
- [ ] XSS prevention (proper escaping)
- [ ] CSRF protection enabled
- [ ] File upload validation and sanitization
- [ ] API versioning implemented

### Security Headers

- [ ] Security headers middleware active (created in previous commits)
- [ ] CSP configured and tested
- [ ] X-Frame-Options set
- [ ] X-Content-Type-Options set
- [ ] Referrer-Policy configured
- [ ] Permissions-Policy configured

### Secrets Management

- [ ] No secrets in version control
- [ ] .env file not publicly accessible
- [ ] Environment variables encrypted at rest (if using secrets manager)
- [ ] API keys rotated regularly
- [ ] Secrets access audited

### Data Protection

- [ ] Sensitive data encrypted at rest
- [ ] PII (Personally Identifiable Information) handling compliant
- [ ] GDPR compliance verified (if applicable)
- [ ] Data retention policies implemented
- [ ] User data export/deletion endpoints working

---

## Performance

### Caching

- [ ] Redis/Memcached configured and running
- [ ] Application cache enabled
- [ ] Database query caching enabled
- [ ] Route caching enabled (Laravel)
- [ ] Config caching enabled (Laravel)
- [ ] View caching enabled (Laravel)
- [ ] HTTP caching headers configured
- [ ] CDN configured for static assets

### Database

- [ ] Connection pooling enabled
- [ ] Query optimization completed
- [ ] N+1 query problems resolved
- [ ] Eager loading used where appropriate
- [ ] Database indexes optimized
- [ ] Read replicas configured (if applicable)

### Frontend

- [ ] Code splitting implemented
- [ ] Lazy loading for images and components
- [ ] Bundle size optimized
- [ ] Service worker configured (PWA)
- [ ] Client-side caching strategies implemented

### Load Testing

- [ ] Load testing performed
  ```bash
  # Example with Apache Bench
  ab -n 1000 -c 100 https://api.fwber.site/health
  ```
- [ ] Application handles expected traffic
- [ ] Auto-scaling configured (if using cloud)
- [ ] Resource limits appropriate
- [ ] Memory leaks identified and fixed

---

## Monitoring & Logging

### Application Monitoring

- [ ] Error tracking service configured (Sentry, Bugsnag, etc.)
- [ ] Performance monitoring enabled (New Relic, DataDog, etc.)
- [ ] Uptime monitoring configured (Pingdom, UptimeRobot, etc.)
- [ ] Custom metrics tracking implemented
- [ ] Dashboard created for key metrics

### Logging

- [ ] Centralized logging configured (ELK stack, CloudWatch, etc.)
- [ ] Log rotation configured
  ```bash
  # Laravel logs
  'daily' => [
      'driver' => 'daily',
      'path' => storage_path('logs/laravel.log'),
      'level' => 'error',
      'days' => 14,
  ],
  ```
- [ ] Error logs monitored and alerted
- [ ] Access logs enabled
- [ ] Audit logs for sensitive operations
- [ ] Log retention policy defined
- [ ] PII not logged

### Alerts

- [ ] Critical error alerts configured
- [ ] Performance degradation alerts set
- [ ] Disk space alerts configured
- [ ] Database connection alerts configured
- [ ] Queue backup alerts configured
- [ ] SSL expiration alerts set
- [ ] On-call rotation defined

### Health Checks

- [ ] Health check endpoint created
  ```php
  // routes/api.php
  Route::get('/health', function () {
      return response()->json([
          'status' => 'healthy',
          'database' => DB::connection()->getPdo() ? 'connected' : 'disconnected',
          'cache' => Cache::connection()->ping() ? 'connected' : 'disconnected',
          'timestamp' => now()->toISOString(),
      ]);
  });
  ```
- [ ] Database health check included
- [ ] Redis health check included
- [ ] External service health checks included
- [ ] Load balancer health check configured

---

## DNS & Infrastructure

### DNS Configuration

- [ ] A/AAAA records configured
  ```
  fwber.site          A      <frontend-ip>
  www.fwber.site      CNAME  fwber.site
  api.fwber.site      A      <backend-ip>
  ```
- [ ] TTL values appropriate (lower for launch, higher after stability)
- [ ] DNS propagation verified
  ```bash
  dig fwber.site
  dig api.fwber.site
  ```
- [ ] CAA records configured (if using specific CA)

### CDN

- [ ] CDN configured for static assets
- [ ] CDN cache rules configured
- [ ] CDN purge/invalidation tested
- [ ] CDN SSL certificate configured

### Firewall

- [ ] Firewall rules configured
  - Allow HTTP (80) and HTTPS (443)
  - Allow SSH (22) from specific IPs only
  - Allow database port from backend IPs only
  - Allow Redis port from backend IPs only
  - Allow WebSocket port (6001)
- [ ] DDoS protection enabled
- [ ] IP whitelisting for admin endpoints (if applicable)

### Infrastructure as Code

- [ ] Infrastructure defined in code (Terraform, CloudFormation, etc.)
- [ ] Infrastructure changes version controlled
- [ ] Deployment automation configured
- [ ] Infrastructure documentation complete

### Scalability

- [ ] Load balancer configured (if multiple servers)
- [ ] Auto-scaling rules defined
- [ ] Database read replicas configured (if needed)
- [ ] Session storage shared (Redis, database)
- [ ] File storage shared (S3, NFS)

---

## Post-Deployment Verification

### Smoke Tests

Within 15 minutes of deployment:

- [ ] Homepage loads successfully
- [ ] User registration works
- [ ] User login works
- [ ] Profile creation works
- [ ] Photo upload works
- [ ] Discovery feed loads
- [ ] Matching works
- [ ] Messaging works
- [ ] WebSocket connection established
- [ ] Payment flow works (if applicable)

### Monitoring

Within 1 hour of deployment:

- [ ] No error spikes in monitoring
- [ ] Response times within acceptable range
- [ ] Database queries performing well
- [ ] Queue processing normally
- [ ] No memory leaks detected
- [ ] CPU usage normal
- [ ] Disk usage stable

### Analytics

Within 24 hours of deployment:

- [ ] User traffic normal or growing
- [ ] Conversion funnels working
- [ ] No significant increase in bounce rate
- [ ] Core Web Vitals stable
- [ ] User feedback positive

---

## Rollback Plan

### Preparation

- [ ] Previous version tagged and accessible
- [ ] Database backup from just before deployment
- [ ] Rollback procedure documented
- [ ] Team trained on rollback process
- [ ] Rollback decision criteria defined

### Rollback Triggers

Consider rollback if:
- Critical security vulnerability discovered
- Data loss or corruption occurring
- Service completely unavailable
- Error rate exceeds 5%
- Database migrations cannot be reversed safely
- User data exposed or at risk

### Rollback Procedure

1. **Stop Deployment**
   ```bash
   # Stop auto-deployments if enabled
   ```

2. **Revert Frontend**
   ```bash
   # Vercel/Netlify: Use platform rollback feature
   # Or redeploy previous version
   git checkout v1.0.0
   npm run build
   npm run deploy
   ```

3. **Revert Backend**
   ```bash
   git checkout v1.0.0
   composer install --no-dev
   php artisan down # Put site in maintenance mode
   php artisan migrate:rollback # If migrations were run
   php artisan config:cache
   php artisan route:cache
   php artisan view:cache
   sudo systemctl restart php8.2-fpm
   sudo systemctl restart nginx
   php artisan up # Bring site back online
   ```

4. **Verify Rollback**
   - [ ] Application accessible
   - [ ] Critical functions working
   - [ ] No data loss
   - [ ] Monitoring shows stability

5. **Communication**
   - [ ] Notify team of rollback
   - [ ] Update status page
   - [ ] Communicate with users if necessary
   - [ ] Post-mortem scheduled

---

## Team Checklist

- [ ] **Product Manager**: Feature freeze communicated
- [ ] **Engineering**: All items above completed
- [ ] **QA**: Production smoke tests passed
- [ ] **DevOps**: Infrastructure ready and monitored
- [ ] **Security**: Security audit passed
- [ ] **Legal**: Terms of Service and Privacy Policy reviewed
- [ ] **Marketing**: Launch communications prepared
- [ ] **Support**: Support team trained and ready
- [ ] **Stakeholders**: Deployment approved

---

## Sign-off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Tech Lead | | | |
| DevOps Lead | | | |
| QA Lead | | | |
| Product Manager | | | |

---

## Notes

Add any deployment-specific notes, issues, or observations here:

```
Date: _________________
Time: _________________
Deployed By: _________________

Notes:
_________________________________________________
_________________________________________________
_________________________________________________

Issues Encountered:
_________________________________________________
_________________________________________________
_________________________________________________

Resolutions:
_________________________________________________
_________________________________________________
_________________________________________________
```

---

**Last Updated:** November 4, 2025

For questions or updates to this checklist, contact the DevOps team.
