# fwber Deployment Guide

Complete guide for deploying fwber in local development, staging, and production environments.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Local Development Setup](#local-development-setup)
- [Environment Configuration](#environment-configuration)
- [Database Setup](#database-setup)
- [Docker Deployment](#docker-deployment)
- [Production Deployment](#production-deployment)
- [SSL/TLS Configuration](#ssltls-configuration)
- [Performance Optimization](#performance-optimization)
- [Monitoring & Logging](#monitoring--logging)
- [Backup & Recovery](#backup--recovery)
- [Troubleshooting](#troubleshooting)

## Prerequisites

### System Requirements

**Backend (Laravel):**
- PHP 8.2 or higher
- Composer 2.x
- MySQL 8.0+ / PostgreSQL 14+ / SQLite 3.35+
- Redis 6.0+ (for caching and queues)
- Node.js 18+ (for frontend assets)

**Frontend (Next.js):**
- Node.js 18.17.0 or higher
- npm 9+ or yarn 1.22+

**Infrastructure:**
- Docker 24+ & Docker Compose 2.0+ (optional but recommended)
- Nginx 1.24+ or Apache 2.4+ (production)
- SSL certificate (production)

### Development Tools

```bash
# Check versions
php --version          # Should be 8.2+
composer --version     # Should be 2.x
node --version         # Should be 18+
docker --version       # Should be 24+
```

## Local Development Setup

### 1. Clone Repository

```bash
git clone https://github.com/FWBerLLC/fwber.git
cd fwber
```

### 2. Backend Setup

```bash
cd fwber-backend

# Install PHP dependencies
composer install

# Copy environment file
cp .env.example .env

# Generate application key
php artisan key:generate

# Create database file (SQLite for development)
touch database/database.sqlite

# Run migrations
php artisan migrate

# Seed database (optional)
php artisan db:seed --class=DashboardDataSeeder

# Install Laravel Sanctum
php artisan vendor:publish --provider="Laravel\Sanctum\SanctumServiceProvider"
php artisan migrate

# Start development server
php artisan serve
```

Backend will be available at `http://localhost:8000`

### 3. Frontend Setup

```bash
cd ../fwber-frontend

# Install dependencies
npm install

# Copy environment file
cp .env.local.example .env.local

# Edit .env.local to point to backend
echo "NEXT_PUBLIC_API_URL=http://localhost:8000/api" >> .env.local

# Start development server
npm run dev
```

Frontend will be available at `http://localhost:3000`

### 4. Test the Setup

```bash
# Create test user
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "password123",
    "password_confirmation": "password123"
  }'

# Login and get token
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

## Environment Configuration

### Backend Environment Variables

Create `fwber-backend/.env` with the following:

```env
# Application
APP_NAME="fwber"
APP_ENV=local
APP_KEY=base64:your-key-here
APP_DEBUG=true
APP_URL=http://localhost:8000

# Database (Development - SQLite)
DB_CONNECTION=sqlite
DB_DATABASE=/absolute/path/to/database/database.sqlite

# Database (Production - PostgreSQL)
# DB_CONNECTION=pgsql
# DB_HOST=127.0.0.1
# DB_PORT=5432
# DB_DATABASE=fwber
# DB_USERNAME=fwber_user
# DB_PASSWORD=secure_password_here

# Cache & Session
CACHE_DRIVER=redis
SESSION_DRIVER=redis
QUEUE_CONNECTION=redis

# Redis
REDIS_HOST=127.0.0.1
REDIS_PASSWORD=null
REDIS_PORT=6379

# Mail (Development - Log)
MAIL_MAILER=log
MAIL_FROM_ADDRESS=noreply@fwber.local
MAIL_FROM_NAME="${APP_NAME}"

# Mail (Production - SMTP)
# MAIL_MAILER=smtp
# MAIL_HOST=smtp.mailtrap.io
# MAIL_PORT=2525
# MAIL_USERNAME=your-username
# MAIL_PASSWORD=your-password
# MAIL_ENCRYPTION=tls

# Security
SANCTUM_STATEFUL_DOMAINS=localhost,localhost:3000,127.0.0.1,127.0.0.1:3000
SESSION_DOMAIN=localhost

# AWS S3 (for file storage)
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_DEFAULT_REGION=us-east-1
AWS_BUCKET=
AWS_USE_PATH_STYLE_ENDPOINT=false

# AI Services (Optional)
OPENAI_API_KEY=your-key-here

# Geolocation
IPAPI_KEY=your-key-here

# WebSocket (Mercure)
MERCURE_URL=http://localhost:3000/.well-known/mercure
MERCURE_PUBLIC_URL=http://localhost:3000/.well-known/mercure
MERCURE_JWT_SECRET=your-secret-here

# Monitoring
SENTRY_LARAVEL_DSN=
```

### Frontend Environment Variables

Create `fwber-frontend/.env.local`:

```env
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:8000/api

# WebSocket
NEXT_PUBLIC_WS_URL=ws://localhost:8000

# Mercure Hub
NEXT_PUBLIC_MERCURE_URL=http://localhost:3000/.well-known/mercure

# Google Maps (for location features)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-key-here

# Analytics (Optional)
NEXT_PUBLIC_GA_MEASUREMENT_ID=
```

## Database Setup

### Development (SQLite)

```bash
# Create database file
touch database/database.sqlite

# Run migrations
php artisan migrate

# Seed test data
php artisan db:seed
```

### Production (PostgreSQL)

```bash
# Create database
sudo -u postgres psql
CREATE DATABASE fwber;
CREATE USER fwber_user WITH ENCRYPTED PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE fwber TO fwber_user;
\q

# Update .env with PostgreSQL credentials
DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=fwber
DB_USERNAME=fwber_user
DB_PASSWORD=secure_password

# Run migrations
php artisan migrate --force
```

### Production (MySQL)

```bash
# Create database
mysql -u root -p
CREATE DATABASE fwber CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'fwber_user'@'localhost' IDENTIFIED BY 'secure_password';
GRANT ALL PRIVILEGES ON fwber.* TO 'fwber_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;

# Update .env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=fwber
DB_USERNAME=fwber_user
DB_PASSWORD=secure_password

# Run migrations
php artisan migrate --force
```

## Docker Deployment

### Development with Docker

```bash
# Build and start services
docker-compose -f docker-compose.dev.yml up -d

# View logs
docker-compose -f docker-compose.dev.yml logs -f

# Run migrations
docker-compose -f docker-compose.dev.yml exec backend php artisan migrate

# Stop services
docker-compose -f docker-compose.dev.yml down
```

### Production with Docker

```bash
# Build production images
docker-compose -f docker-compose.prod.yml build

# Start services
docker-compose -f docker-compose.prod.yml up -d

# Run migrations
docker-compose -f docker-compose.prod.yml exec backend php artisan migrate --force

# Optimize
docker-compose -f docker-compose.prod.yml exec backend php artisan optimize

# View logs
docker-compose -f docker-compose.prod.yml logs -f app
```

## Production Deployment

### 1. Server Setup (Ubuntu 22.04)

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install PHP 8.2
sudo add-apt-repository ppa:ondrej/php
sudo apt install -y php8.2 php8.2-fpm php8.2-cli php8.2-mysql php8.2-pgsql \
  php8.2-sqlite3 php8.2-redis php8.2-mbstring php8.2-xml php8.2-curl \
  php8.2-zip php8.2-bcmath php8.2-gd php8.2-intl

# Install Composer
curl -sS https://getcomposer.com/installer | php
sudo mv composer.phar /usr/local/bin/composer

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Install Redis
sudo apt install -y redis-server

# Install Nginx
sudo apt install -y nginx

# Install Certbot (for SSL)
sudo apt install -y certbot python3-certbot-nginx
```

### 2. Application Deployment

```bash
# Create application directory
sudo mkdir -p /var/www/fwber
sudo chown -R $USER:$USER /var/www/fwber

# Clone repository
cd /var/www
git clone https://github.com/FWBerLLC/fwber.git
cd fwber

# Backend setup
cd fwber-backend
composer install --no-dev --optimize-autoloader
cp .env.example .env

# Edit .env with production values
nano .env

# Generate key and optimize
php artisan key:generate
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan migrate --force

# Set permissions
sudo chown -R www-data:www-data /var/www/fwber/fwber-backend/storage
sudo chown -R www-data:www-data /var/www/fwber/fwber-backend/bootstrap/cache
sudo chmod -R 775 /var/www/fwber/fwber-backend/storage
sudo chmod -R 775 /var/www/fwber/fwber-backend/bootstrap/cache

# Frontend setup
cd ../fwber-frontend
npm ci
npm run build

# Start PM2 for frontend
npm install -g pm2
pm2 start npm --name "fwber-frontend" -- start
pm2 save
pm2 startup
```

### 3. Nginx Configuration

Create `/etc/nginx/sites-available/fwber`:

```nginx
# Backend API
server {
    listen 80;
    server_name api.fwber.com;
    root /var/www/fwber/fwber-backend/public;

    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-Content-Type-Options "nosniff";

    index index.php;

    charset utf-8;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location = /favicon.ico { access_log off; log_not_found off; }
    location = /robots.txt  { access_log off; log_not_found off; }

    error_page 404 /index.php;

    location ~ \.php$ {
        fastcgi_pass unix:/var/run/php/php8.2-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
    }

    location ~ /\.(?!well-known).* {
        deny all;
    }
}

# Frontend
server {
    listen 80;
    server_name fwber.com www.fwber.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/fwber /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## SSL/TLS Configuration

### Using Let's Encrypt (Recommended)

```bash
# Obtain SSL certificate
sudo certbot --nginx -d fwber.com -d www.fwber.com -d api.fwber.com

# Test auto-renewal
sudo certbot renew --dry-run

# Certificate will auto-renew via cron
```

### Manual SSL Configuration

If using custom certificates, add to Nginx config:

```nginx
server {
    listen 443 ssl http2;
    server_name api.fwber.com;

    ssl_certificate /path/to/fullchain.pem;
    ssl_certificate_key /path/to/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # ... rest of config ...
}
```

## Performance Optimization

### Backend Optimization

```bash
# Cache configuration
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Enable OPcache (edit /etc/php/8.2/fpm/php.ini)
opcache.enable=1
opcache.memory_consumption=256
opcache.interned_strings_buffer=16
opcache.max_accelerated_files=10000
opcache.revalidate_freq=60
opcache.fast_shutdown=1

# Queue Workers (create systemd service)
sudo nano /etc/systemd/system/laravel-worker.service
```

Laravel Worker Service:

```ini
[Unit]
Description=Laravel Queue Worker
After=network.target

[Service]
User=www-data
Group=www-data
Restart=always
ExecStart=/usr/bin/php /var/www/fwber/fwber-backend/artisan queue:work --sleep=3 --tries=3 --timeout=90

[Install]
WantedBy=multi-user.target
```

Enable worker:

```bash
sudo systemctl enable laravel-worker
sudo systemctl start laravel-worker
```

### Frontend Optimization

```bash
# Build with production optimizations
npm run build

# PM2 cluster mode for multiple instances
pm2 start npm --name "fwber-frontend" -i max -- start
```

### Database Optimization

```sql
-- Add indexes for common queries
CREATE INDEX idx_matches_users ON matches(user1_id, user2_id);
CREATE INDEX idx_messages_sender ON messages(sender_id, created_at);
CREATE INDEX idx_profile_views_viewed ON profile_views(viewed_user_id, created_at);

-- Enable query cache (MySQL)
SET GLOBAL query_cache_size = 268435456;
SET GLOBAL query_cache_type = ON;
```

### Redis Optimization

Edit `/etc/redis/redis.conf`:

```conf
maxmemory 256mb
maxmemory-policy allkeys-lru
```

## Monitoring & Logging

### Application Monitoring

```bash
# Laravel Telescope (development only)
composer require laravel/telescope --dev
php artisan telescope:install
php artisan migrate

# Access at: http://yourdomain.com/telescope
```

### Log Management

```bash
# Rotate Laravel logs
sudo nano /etc/logrotate.d/laravel
```

Logrotate config:

```
/var/www/fwber/fwber-backend/storage/logs/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 www-data www-data
    sharedscripts
}
```

### Health Checks

```bash
# Backend health
curl http://api.fwber.com/api/health

# Setup monitoring with UptimeRobot or similar
# Ping: http://api.fwber.com/api/health every 5 minutes
```

## Backup & Recovery

### Database Backup

```bash
# PostgreSQL backup script
#!/bin/bash
BACKUP_DIR="/var/backups/fwber"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

pg_dump -U fwber_user fwber | gzip > $BACKUP_DIR/fwber_$DATE.sql.gz

# Keep only last 30 days
find $BACKUP_DIR -name "fwber_*.sql.gz" -mtime +30 -delete

# Add to crontab: 0 2 * * * /path/to/backup-script.sh
```

### Application Backup

```bash
# Backup uploaded files (if stored locally)
tar -czf /var/backups/fwber/storage_$(date +%Y%m%d).tar.gz \
  /var/www/fwber/fwber-backend/storage/app/public

# Backup environment config
cp /var/www/fwber/fwber-backend/.env /var/backups/fwber/.env.backup
```

### Recovery

```bash
# Restore database
gunzip < /var/backups/fwber/fwber_20250114_020000.sql.gz | \
  psql -U fwber_user fwber

# Restore files
tar -xzf /var/backups/fwber/storage_20250114.tar.gz -C /

# Clear caches
php artisan cache:clear
php artisan config:clear
php artisan view:clear
```

## Troubleshooting

### Common Issues

**Issue: 500 Internal Server Error**
```bash
# Check logs
tail -f /var/www/fwber/fwber-backend/storage/logs/laravel.log

# Check permissions
sudo chown -R www-data:www-data storage bootstrap/cache
sudo chmod -R 775 storage bootstrap/cache

# Clear caches
php artisan cache:clear
php artisan config:clear
```

**Issue: CORS Errors**
```bash
# Check SANCTUM_STATEFUL_DOMAINS in .env
# Must include frontend domain
SANCTUM_STATEFUL_DOMAINS=fwber.com,www.fwber.com
```

**Issue: Database Connection Failed**
```bash
# Test connection
php artisan tinker
>>> DB::connection()->getPdo();

# Check credentials in .env
# Check database service is running
sudo systemctl status postgresql
```

**Issue: Queue Not Processing**
```bash
# Check worker status
sudo systemctl status laravel-worker

# Restart worker
sudo systemctl restart laravel-worker

# Process queue manually
php artisan queue:work --once
```

**Issue: Frontend API Connection Failed**
```bash
# Check .env.local has correct API_URL
# Check CORS headers in backend
# Check Nginx proxy configuration
```

### Performance Issues

```bash
# Enable query logging
php artisan tinker
>>> DB::enableQueryLog();
>>> // Run slow operation
>>> DB::getQueryLog();

# Check slow queries (MySQL)
mysql> SHOW FULL PROCESSLIST;
mysql> SET GLOBAL slow_query_log = 'ON';

# Redis memory usage
redis-cli info memory

# PHP-FPM status
sudo systemctl status php8.2-fpm
```

### Debug Mode

```bash
# NEVER enable debug in production
# For temporary debugging, use log viewer
tail -f storage/logs/laravel.log

# Or install Laravel Debugbar (dev only)
composer require barryvdh/laravel-debugbar --dev
```

## Security Checklist

- [ ] Change all default passwords
- [ ] Set `APP_DEBUG=false` in production
- [ ] Configure firewall (ufw/iptables)
- [ ] Enable SSL/TLS (HTTPS only)
- [ ] Set up database backups
- [ ] Configure rate limiting
- [ ] Enable CSRF protection
- [ ] Validate all user inputs
- [ ] Keep dependencies updated
- [ ] Monitor error logs
- [ ] Set up intrusion detection
- [ ] Configure secure headers

## Deployment Checklist

- [ ] Update `.env` with production values
- [ ] Run `composer install --no-dev --optimize-autoloader`
- [ ] Run `php artisan migrate --force`
- [ ] Run `php artisan config:cache`
- [ ] Run `php artisan route:cache`
- [ ] Run `php artisan view:cache`
- [ ] Set proper file permissions
- [ ] Configure Nginx/Apache
- [ ] Install SSL certificate
- [ ] Set up queue workers
- [ ] Configure cron jobs
- [ ] Set up monitoring
- [ ] Configure backups
- [ ] Test all critical paths
- [ ] Load test the application

---

**Need Help?**
- Documentation: https://docs.fwber.com
- Issues: https://github.com/FWBerLLC/fwber/issues
- Email: support@fwber.com
