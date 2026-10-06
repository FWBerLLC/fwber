# Health Check Guide

**Purpose**: Comprehensive guide for health monitoring endpoints used by load balancers, orchestrators (Kubernetes/Docker), and monitoring systems to verify service availability and readiness.

**Author**: GitHub Copilot  
**Date**: 2025-11-15  
**Phase**: Phase 3 - Production Readiness

---

## Table of Contents

1. [Endpoints Overview](#endpoints-overview)
2. [Health Check Endpoint](#health-check-endpoint)
3. [Liveness Probe](#liveness-probe)
4. [Readiness Probe](#readiness-probe)
5. [Integration with Load Balancers](#integration-with-load-balancers)
6. [Integration with Container Orchestrators](#integration-with-container-orchestrators)
7. [Monitoring and Alerting](#monitoring-and-alerting)
8. [Testing Procedures](#testing-procedures)
9. [Troubleshooting](#troubleshooting)

---

## Endpoints Overview

fwber.site provides three health check endpoints for different monitoring purposes:

| Endpoint | Purpose | Response Codes | Use Case |
|----------|---------|----------------|----------|
| `/health` | Comprehensive system health | 200 (healthy), 503 (unhealthy) | Detailed monitoring, dashboards |
| `/health/liveness` | Application process status | 200 (alive) | Kubernetes liveness probe, process monitoring |
| `/health/readiness` | Service readiness for traffic | 200 (ready), 503 (not ready) | Load balancer checks, Kubernetes readiness probe |

**Key Characteristics**:
- **Unauthenticated**: All endpoints are public and do not require JWT tokens
- **OpenAPI Documented**: Full Swagger/OpenAPI annotations for API documentation
- **Production Ready**: Includes comprehensive error handling and graceful degradation

---

## Health Check Endpoint

**Route**: `GET /health`  
**Controller**: `HealthController@check`  
**Authentication**: None (public endpoint)

### Purpose

Comprehensive health check that validates all critical system components and returns detailed status information. Used for:
- Monitoring dashboards
- Operational health visibility
- Incident investigation
- Capacity planning

### Response Structure

#### Healthy Response (HTTP 200)

```json
{
  "status": "healthy",
  "timestamp": "2025-11-15T10:30:45+00:00",
  "version": "1.0.0",
  "environment": "production",
  "checks": {
    "database": {
      "status": "ok",
      "version": "8.0.35",
      "connection": "fwber_production"
    },
    "redis": {
      "status": "ok",
      "version": "7.2.4"
    },
    "cache": {
      "status": "ok",
      "driver": "redis"
    },
    "storage": {
      "status": "ok",
      "path": "/var/www/fwber-backend/storage/logs",
      "writable": true
    },
    "queue": {
      "status": "ok",
      "connection": "redis"
    }
  },
  "metrics": {
    "memory_usage": "45.23 MB",
    "memory_peak": "52.17 MB",
    "uptime": "3 days"
  }
}
```

#### Unhealthy Response (HTTP 503)

```json
{
  "status": "unhealthy",
  "timestamp": "2025-11-15T10:30:45+00:00",
  "version": "1.0.0",
  "environment": "production",
  "checks": {
    "database": {
      "status": "failed",
      "error": "SQLSTATE[HY000] [2002] Connection refused"
    },
    "redis": {
      "status": "ok",
      "version": "7.2.4"
    },
    "cache": {
      "status": "ok",
      "driver": "redis"
    },
    "storage": {
      "status": "ok",
      "path": "/var/www/fwber-backend/storage/logs",
      "writable": true
    },
    "queue": {
      "status": "degraded",
      "error": "Redis connection timeout"
    }
  },
  "metrics": {
    "memory_usage": "45.23 MB",
    "memory_peak": "52.17 MB",
    "uptime": "3 days"
  }
}
```

### Component Checks

#### 1. Database Connectivity

**What it checks**:
- MySQL/PostgreSQL connection via PDO
- Database version retrieval
- Active database name

**Failure criteria**:
- Cannot establish connection
- PDO connection error
- Connection timeout

**Impact**: **CRITICAL** - Service cannot operate without database

#### 2. Redis Connectivity

**What it checks**:
- Redis PING command response
- Server version information

**Failure criteria**:
- Connection refused
- Authentication failure
- PING timeout

**Impact**: **CRITICAL** - Cache and session storage unavailable

#### 3. Cache Functionality

**What it checks**:
- Write operation (put)
- Read operation (get)
- Delete operation (forget)
- Cache driver configuration

**Failure criteria**:
- Write/read/delete fails
- Retrieved value doesn't match written value

**Impact**: **DEGRADED** - Application functions but with performance impact

#### 4. Storage Writability

**What it checks**:
- `storage/logs` directory write permissions
- Path accessibility

**Failure criteria**:
- Directory not writable
- Path does not exist

**Impact**: **CRITICAL** - Cannot write logs or handle errors

#### 5. Queue Connectivity

**What it checks**:
- Queue connection configuration
- Connection driver status

**Failure criteria**:
- Connection errors
- Configuration issues

**Impact**: **DEGRADED** - Background jobs may fail (marked as "degraded", not critical)

### Testing Commands

```bash
# Basic health check
curl -i http://localhost:8000/health

# With formatted output (requires jq)
curl -s http://localhost:8000/health | jq '.'

# Check only status code
curl -o /dev/null -s -w "%{http_code}\n" http://localhost:8000/health

# Production environment
curl -i https://api.fwber.com/health
```

### Expected Response Times

| Environment | Target | Acceptable | Warning |
|-------------|--------|------------|---------|
| Development | < 50ms | < 100ms | > 100ms |
| Staging | < 100ms | < 200ms | > 200ms |
| Production | < 200ms | < 500ms | > 500ms |

---

## Liveness Probe

**Route**: `GET /health/liveness`  
**Controller**: `HealthController@liveness`  
**Authentication**: None (public endpoint)

### Purpose

Lightweight probe to verify the application process is alive and responding. Used for:
- Kubernetes/Docker liveness probes
- Process restart decisions
- Load balancer basic checks

### Response Structure

#### Response (HTTP 200)

```json
{
  "status": "alive"
}
```

**Note**: This endpoint ALWAYS returns 200 if the process is running. It does not check dependencies.

### Use Cases

**Kubernetes Liveness Probe**:
```yaml
livenessProbe:
  httpGet:
    path: /health/liveness
    port: 8000
  initialDelaySeconds: 30
  periodSeconds: 10
  timeoutSeconds: 5
  failureThreshold: 3
```

**Docker Compose Healthcheck**:
```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:8000/health/liveness"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 40s
```

### Testing Commands

```bash
# Basic liveness check
curl -i http://localhost:8000/health/liveness

# Continuous monitoring (every 10 seconds)
watch -n 10 'curl -s http://localhost:8000/health/liveness | jq .'

# Check from within container
docker exec fwber-backend curl -f http://localhost:8000/health/liveness
```

### Expected Response Times

| Environment | Target | Acceptable | Warning |
|-------------|--------|------------|---------|
| All | < 10ms | < 50ms | > 50ms |

---

## Readiness Probe

**Route**: `GET /health/readiness`  
**Controller**: `HealthController@readiness`  
**Authentication**: None (public endpoint)

### Purpose

Determines if the service is ready to receive production traffic by checking critical dependencies. Used for:
- Kubernetes/Docker readiness probes
- Load balancer routing decisions
- Rolling deployment validation

### Response Structure

#### Ready Response (HTTP 200)

```json
{
  "status": "ready"
}
```

#### Not Ready Response (HTTP 503)

```json
{
  "status": "not_ready",
  "error": "SQLSTATE[HY000] [2002] Connection refused"
}
```

### Component Checks

**Critical Dependencies Only**:
1. **Database Connectivity** - MySQL/PostgreSQL connection via PDO
2. **Redis Connectivity** - Redis PING command

**Why minimal checks?**
- Readiness probes run frequently (every 5-10 seconds)
- Must be fast (< 100ms)
- Only checks dependencies required to serve traffic
- Failures trigger traffic removal, not restarts

### Use Cases

**Kubernetes Readiness Probe**:
```yaml
readinessProbe:
  httpGet:
    path: /health/readiness
    port: 8000
  initialDelaySeconds: 10
  periodSeconds: 5
  timeoutSeconds: 3
  successThreshold: 1
  failureThreshold: 3
```

**Load Balancer Health Check (Nginx)**:
```nginx
upstream fwber_backend {
  server backend1:8000 max_fails=3 fail_timeout=30s;
  server backend2:8000 max_fails=3 fail_timeout=30s;
}

server {
  location /health/readiness {
    proxy_pass http://fwber_backend;
    proxy_connect_timeout 3s;
    proxy_read_timeout 5s;
  }
}
```

**HAProxy Health Check**:
```haproxy
backend fwber_api
  option httpchk GET /health/readiness
  http-check expect status 200
  server backend1 10.0.1.10:8000 check inter 5s fall 3 rise 2
  server backend2 10.0.1.11:8000 check inter 5s fall 3 rise 2
```

### Testing Commands

```bash
# Basic readiness check
curl -i http://localhost:8000/health/readiness

# Monitor readiness during deployment
while true; do
  STATUS=$(curl -o /dev/null -s -w "%{http_code}" http://localhost:8000/health/readiness)
  echo "$(date): $STATUS"
  sleep 5
done

# Test from load balancer perspective
curl -i -H "Host: api.fwber.com" http://load-balancer-ip/health/readiness
```

### Expected Response Times

| Environment | Target | Acceptable | Warning |
|-------------|--------|------------|---------|
| All | < 50ms | < 100ms | > 100ms |

---

## Integration with Load Balancers

### Nginx Configuration

```nginx
upstream fwber_backend {
  server backend1:8000 max_fails=3 fail_timeout=30s;
  server backend2:8000 max_fails=3 fail_timeout=30s;
  server backend3:8000 max_fails=3 fail_timeout=30s;
  
  # Passive health checks via proxy_next_upstream
  # Readiness probe via separate location block
}

server {
  listen 80;
  server_name api.fwber.com;
  
  # Health check endpoint (not proxied to backend)
  location /health/check {
    access_log off;
    proxy_pass http://fwber_backend/health/readiness;
    proxy_connect_timeout 3s;
    proxy_read_timeout 5s;
    proxy_next_upstream error timeout invalid_header http_500 http_502 http_503;
  }
  
  # Application traffic
  location / {
    proxy_pass http://fwber_backend;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    
    # Circuit breaker pattern
    proxy_next_upstream error timeout http_503;
    proxy_connect_timeout 10s;
    proxy_read_timeout 30s;
  }
}
```

### HAProxy Configuration

```haproxy
global
  log /dev/log local0
  maxconn 4096

defaults
  mode http
  timeout connect 5s
  timeout client 30s
  timeout server 30s
  option httplog
  option dontlognull

frontend fwber_api
  bind *:80
  default_backend fwber_backend

backend fwber_backend
  balance roundrobin
  option httpchk GET /health/readiness
  http-check expect status 200
  
  # Backend servers
  server backend1 10.0.1.10:8000 check inter 5s fall 3 rise 2 weight 100
  server backend2 10.0.1.11:8000 check inter 5s fall 3 rise 2 weight 100
  server backend3 10.0.1.12:8000 check inter 5s fall 3 rise 2 weight 100
  
  # Backup server (only used if all primary servers down)
  server backup1 10.0.2.10:8000 check inter 10s fall 5 rise 3 backup
```

### AWS Application Load Balancer (ALB)

**Target Group Health Check Settings**:
```json
{
  "HealthCheckEnabled": true,
  "HealthCheckProtocol": "HTTP",
  "HealthCheckPath": "/health/readiness",
  "HealthCheckIntervalSeconds": 30,
  "HealthCheckTimeoutSeconds": 5,
  "HealthyThresholdCount": 2,
  "UnhealthyThresholdCount": 3,
  "Matcher": {
    "HttpCode": "200"
  }
}
```

**Terraform Configuration**:
```hcl
resource "aws_lb_target_group" "fwber_api" {
  name     = "fwber-api-tg"
  port     = 8000
  protocol = "HTTP"
  vpc_id   = aws_vpc.main.id
  
  health_check {
    enabled             = true
    path                = "/health/readiness"
    protocol            = "HTTP"
    interval            = 30
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 3
    matcher             = "200"
  }
  
  deregistration_delay = 30
}
```

---

## Integration with Container Orchestrators

### Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: fwber-backend
  labels:
    app: fwber-backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: fwber-backend
  template:
    metadata:
      labels:
        app: fwber-backend
    spec:
      containers:
      - name: fwber-backend
        image: fwber/backend:latest
        ports:
        - containerPort: 8000
          name: http
        
        # Liveness probe - restart if process dead
        livenessProbe:
          httpGet:
            path: /health/liveness
            port: 8000
            scheme: HTTP
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          successThreshold: 1
          failureThreshold: 3
        
        # Readiness probe - remove from service if not ready
        readinessProbe:
          httpGet:
            path: /health/readiness
            port: 8000
            scheme: HTTP
          initialDelaySeconds: 10
          periodSeconds: 5
          timeoutSeconds: 3
          successThreshold: 1
          failureThreshold: 3
        
        # Startup probe - allow extra time for initial startup
        startupProbe:
          httpGet:
            path: /health/liveness
            port: 8000
            scheme: HTTP
          initialDelaySeconds: 0
          periodSeconds: 10
          timeoutSeconds: 5
          successThreshold: 1
          failureThreshold: 30  # 5 minutes total
        
        resources:
          requests:
            memory: "256Mi"
            cpu: "200m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        
        env:
        - name: APP_ENV
          value: "production"
        - name: APP_DEBUG
          value: "false"
        - name: DB_HOST
          valueFrom:
            secretKeyRef:
              name: fwber-secrets
              key: db-host
```

### Docker Compose

```yaml
version: '3.8'

services:
  backend:
    image: fwber/backend:latest
    container_name: fwber-backend
    restart: unless-stopped
    ports:
      - "8000:8000"
    environment:
      APP_ENV: production
      APP_DEBUG: "false"
      DB_HOST: mysql
      REDIS_HOST: redis
    depends_on:
      mysql:
        condition: service_healthy
      redis:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health/readiness"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s
    networks:
      - fwber-network
  
  mysql:
    image: mysql:8.0
    container_name: fwber-mysql
    restart: unless-stopped
    environment:
      MYSQL_ROOT_PASSWORD: ${DB_PASSWORD}
      MYSQL_DATABASE: fwber
    volumes:
      - mysql-data:/var/lib/mysql
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - fwber-network
  
  redis:
    image: redis:7-alpine
    container_name: fwber-redis
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - fwber-network

networks:
  fwber-network:
    driver: bridge

volumes:
  mysql-data:
```

---

## Monitoring and Alerting

### Prometheus Metrics

**Recommended metrics to export**:

```yaml
# Health check response time (seconds)
fwber_health_check_duration_seconds{endpoint="/health"}

# Health check success/failure count
fwber_health_check_status{endpoint="/health",status="healthy|unhealthy"}

# Component health status (0 = failed, 1 = ok)
fwber_component_health{component="database|redis|cache|storage|queue"}

# Readiness probe response time (seconds)
fwber_readiness_check_duration_seconds

# Liveness probe response time (seconds)
fwber_liveness_check_duration_seconds
```

**Example Prometheus Scrape Config**:
```yaml
scrape_configs:
  - job_name: 'fwber-health'
    scrape_interval: 15s
    static_configs:
      - targets: ['backend1:8000', 'backend2:8000', 'backend3:8000']
    metrics_path: /metrics
```

### Grafana Dashboard

**Recommended panels**:

1. **Overall Health Status** (Single Stat)
   - Query: `fwber_health_check_status{status="healthy"}`
   - Threshold: Red if 0, Green if 1

2. **Component Health Matrix** (Heatmap)
   - Query: `fwber_component_health`
   - Show: database, redis, cache, storage, queue status

3. **Health Check Response Time** (Graph)
   - Query: `rate(fwber_health_check_duration_seconds[5m])`
   - Alert if > 500ms

4. **Failed Health Checks** (Counter)
   - Query: `increase(fwber_health_check_status{status="unhealthy"}[1h])`
   - Alert if > 3

### Alert Rules

**Prometheus AlertManager Rules**:

```yaml
groups:
  - name: fwber_health_alerts
    interval: 30s
    rules:
      # Critical: Service completely down
      - alert: FWBERServiceDown
        expr: up{job="fwber-health"} == 0
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "FWBER backend service is down"
          description: "{{ $labels.instance }} has been down for more than 2 minutes"
      
      # Critical: Health check failing
      - alert: FWBERHealthCheckFailing
        expr: fwber_health_check_status{status="healthy"} == 0
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "FWBER health check is failing"
          description: "{{ $labels.instance }} health check has been unhealthy for 5 minutes"
      
      # Critical: Database connectivity lost
      - alert: FWBERDatabaseDown
        expr: fwber_component_health{component="database"} == 0
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "FWBER database connection lost"
          description: "{{ $labels.instance }} cannot connect to database"
      
      # Critical: Redis connectivity lost
      - alert: FWBERRedisDown
        expr: fwber_component_health{component="redis"} == 0
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "FWBER Redis connection lost"
          description: "{{ $labels.instance }} cannot connect to Redis"
      
      # Warning: Health check slow
      - alert: FWBERHealthCheckSlow
        expr: rate(fwber_health_check_duration_seconds[5m]) > 0.5
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "FWBER health checks are slow"
          description: "{{ $labels.instance }} health check avg response time > 500ms"
      
      # Warning: Storage not writable
      - alert: FWBERStorageNotWritable
        expr: fwber_component_health{component="storage"} == 0
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "FWBER storage directory not writable"
          description: "{{ $labels.instance }} cannot write to storage/logs"
```

### PagerDuty Integration

**Alert Routing**:
```yaml
# AlertManager PagerDuty config
receivers:
  - name: 'pagerduty-critical'
    pagerduty_configs:
      - service_key: '<YOUR_PAGERDUTY_SERVICE_KEY>'
        severity: critical
        description: '{{ .CommonAnnotations.summary }}'
        details:
          firing: '{{ .Alerts.Firing | len }}'
          resolved: '{{ .Alerts.Resolved | len }}'

route:
  group_by: ['alertname', 'cluster']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 12h
  receiver: 'pagerduty-critical'
  routes:
    - match:
        severity: critical
      receiver: pagerduty-critical
      continue: true
```

---

## Testing Procedures

### Manual Testing

**1. Basic Connectivity Test**:
```bash
# Test all three endpoints
curl -i http://localhost:8000/health
curl -i http://localhost:8000/health/liveness
curl -i http://localhost:8000/health/readiness
```

**2. Simulated Database Failure**:
```bash
# Stop MySQL
docker stop fwber-mysql

# Check health endpoints
curl -s http://localhost:8000/health | jq '.checks.database'
# Expected: {"status": "failed", "error": "..."}

curl -o /dev/null -s -w "%{http_code}\n" http://localhost:8000/health/readiness
# Expected: 503

# Restart MySQL
docker start fwber-mysql
```

**3. Simulated Redis Failure**:
```bash
# Stop Redis
docker stop fwber-redis

# Check health endpoints
curl -s http://localhost:8000/health | jq '.checks.redis'
# Expected: {"status": "failed", "error": "..."}

curl -o /dev/null -s -w "%{http_code}\n" http://localhost:8000/health/readiness
# Expected: 503

# Restart Redis
docker start fwber-redis
```

**4. Storage Permission Test**:
```bash
# Make storage directory read-only
chmod 555 /path/to/fwber-backend/storage/logs

# Check health endpoint
curl -s http://localhost:8000/health | jq '.checks.storage'
# Expected: {"status": "failed", "path": "...", "writable": false}

# Restore permissions
chmod 755 /path/to/fwber-backend/storage/logs
```

### Automated Testing

**Bash Script for Continuous Monitoring**:
```bash
#!/bin/bash
# health_monitor.sh - Continuous health check monitoring

API_URL="${API_URL:-http://localhost:8000}"
CHECK_INTERVAL="${CHECK_INTERVAL:-10}"
LOG_FILE="${LOG_FILE:-health_monitor.log}"

echo "Starting health monitor for $API_URL"
echo "Checking every $CHECK_INTERVAL seconds"
echo "Logging to $LOG_FILE"
echo "---"

while true; do
  TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
  
  # Test comprehensive health check
  HEALTH_STATUS=$(curl -o /dev/null -s -w "%{http_code}" "$API_URL/health")
  
  # Test readiness
  READINESS_STATUS=$(curl -o /dev/null -s -w "%{http_code}" "$API_URL/health/readiness")
  
  # Test liveness
  LIVENESS_STATUS=$(curl -o /dev/null -s -w "%{http_code}" "$API_URL/health/liveness")
  
  # Log results
  LOG_LINE="$TIMESTAMP | Health: $HEALTH_STATUS | Readiness: $READINESS_STATUS | Liveness: $LIVENESS_STATUS"
  echo "$LOG_LINE"
  echo "$LOG_LINE" >> "$LOG_FILE"
  
  # Alert if any check fails
  if [ "$HEALTH_STATUS" != "200" ] || [ "$READINESS_STATUS" != "200" ] || [ "$LIVENESS_STATUS" != "200" ]; then
    echo "⚠️  ALERT: Health check failed!"
    # Add notification logic here (email, Slack, PagerDuty, etc.)
  fi
  
  sleep "$CHECK_INTERVAL"
done
```

**Usage**:
```bash
# Monitor local development
./health_monitor.sh

# Monitor production
API_URL=https://api.fwber.com CHECK_INTERVAL=30 ./health_monitor.sh

# Run in background
nohup ./health_monitor.sh > /dev/null 2>&1 &
```

---

## Troubleshooting

### Common Issues

#### 1. Health Check Returns 503 (Database Failed)

**Symptoms**:
```json
{
  "status": "unhealthy",
  "checks": {
    "database": {
      "status": "failed",
      "error": "SQLSTATE[HY000] [2002] Connection refused"
    }
  }
}
```

**Diagnosis**:
```bash
# Check if MySQL is running
docker ps | grep mysql
systemctl status mysql

# Check database connection from backend
docker exec fwber-backend php artisan tinker
>>> DB::connection()->getPdo();

# Check database credentials
cat fwber-backend/.env | grep DB_
```

**Resolution**:
- Verify `DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD` in `.env`
- Ensure MySQL service is running
- Check network connectivity between backend and database
- Verify database user permissions

#### 2. Health Check Returns 503 (Redis Failed)

**Symptoms**:
```json
{
  "status": "unhealthy",
  "checks": {
    "redis": {
      "status": "failed",
      "error": "Connection refused"
    }
  }
}
```

**Diagnosis**:
```bash
# Check if Redis is running
docker ps | grep redis
systemctl status redis

# Test Redis connection
redis-cli -h localhost -p 6379 ping

# Check Redis credentials
cat fwber-backend/.env | grep REDIS_
```

**Resolution**:
- Verify `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` in `.env`
- Ensure Redis service is running
- Check network connectivity between backend and Redis
- Test authentication with `redis-cli -h <host> -p <port> -a <password>`

#### 3. Storage Directory Not Writable

**Symptoms**:
```json
{
  "checks": {
    "storage": {
      "status": "failed",
      "path": "/var/www/fwber-backend/storage/logs",
      "writable": false
    }
  }
}
```

**Diagnosis**:
```bash
# Check directory permissions
ls -ld /var/www/fwber-backend/storage/logs

# Check directory owner
stat /var/www/fwber-backend/storage/logs

# Check web server user
ps aux | grep nginx
ps aux | grep php-fpm
```

**Resolution**:
```bash
# Fix permissions (Laravel standard)
cd /var/www/fwber-backend
chmod -R 755 storage
chmod -R 755 bootstrap/cache

# Fix ownership (assuming www-data user)
chown -R www-data:www-data storage
chown -R www-data:www-data bootstrap/cache

# SELinux context (if applicable)
chcon -R -t httpd_sys_rw_content_t storage
chcon -R -t httpd_sys_rw_content_t bootstrap/cache
```

#### 4. Health Check Slow (> 500ms)

**Symptoms**:
- Health endpoint taking > 500ms to respond
- Monitoring alerts for slow health checks

**Diagnosis**:
```bash
# Measure response time
time curl -s http://localhost:8000/health > /dev/null

# Check database query performance
docker exec fwber-backend php artisan tinker
>>> DB::enableQueryLog();
>>> DB::connection()->getPdo();
>>> DB::getQueryLog();

# Check Redis latency
redis-cli --latency -h localhost -p 6379
```

**Resolution**:
- Optimize database connection pooling
- Check Redis network latency
- Review cache driver configuration
- Consider increasing PHP-FPM workers
- Investigate slow queries or N+1 issues

#### 5. Liveness Probe Always Succeeds But Readiness Fails

**Symptoms**:
- `/health/liveness` returns 200
- `/health/readiness` returns 503
- Kubernetes/Docker keeps restarting containers

**Diagnosis**:
This is **expected behavior** during:
- Database migrations
- Redis unavailability
- Application startup (before dependencies ready)

**Resolution**:
- Use `startupProbe` in Kubernetes to allow longer initial startup time
- Increase `initialDelaySeconds` for `readinessProbe`
- Verify database and Redis are actually accessible
- Check for configuration issues in `.env`

### Debug Mode

For additional debugging information, enable Laravel debug mode temporarily:

```bash
# .env (development only - NEVER in production)
APP_DEBUG=true
LOG_LEVEL=debug

# Restart application
docker restart fwber-backend
php artisan config:cache

# Check health endpoint with detailed errors
curl -s http://localhost:8000/health | jq '.'
```

**⚠️ WARNING**: Never enable `APP_DEBUG=true` in production as it exposes sensitive information.

---

## Best Practices

### DO

✅ Use `/health/readiness` for load balancer health checks  
✅ Use `/health/liveness` for process/container restart decisions  
✅ Use `/health` for monitoring dashboards and incident investigation  
✅ Set appropriate timeouts (3-5 seconds for readiness, 5-10 seconds for health)  
✅ Configure multiple failure thresholds (3+ consecutive failures before action)  
✅ Monitor health check response times in production  
✅ Test health checks in staging before deploying to production  
✅ Use startup probes in Kubernetes for slow-starting applications  
✅ Log health check failures for debugging  

### DON'T

❌ Don't use `/health` for load balancer checks (too slow, too detailed)  
❌ Don't configure liveness probes too aggressively (causes restart loops)  
❌ Don't authenticate health check endpoints (they need to be public)  
❌ Don't add expensive operations to readiness checks  
❌ Don't ignore health check failures in production  
❌ Don't set timeouts too low (< 3 seconds) - causes false positives  
❌ Don't check non-critical services in readiness probe (queue is optional)  
❌ Don't restart containers on readiness failures (remove from load balancer instead)  

---

## Summary

**Health Check Endpoints**:
- `/health` - Comprehensive monitoring with detailed component status
- `/health/liveness` - Lightweight process status check
- `/health/readiness` - Critical dependency validation for traffic routing

**Key Takeaways**:
1. Use the right endpoint for the right purpose (readiness for LB, liveness for restarts, health for monitoring)
2. Configure appropriate timeouts and failure thresholds
3. Monitor health check response times and failures
4. Test thoroughly in staging before production deployment
5. Use Kubernetes probes correctly (startup, liveness, readiness serve different purposes)

**Next Steps**:
- Integrate health checks with load balancers (Phase 3, Item 2 ✅)
- Configure monitoring and alerting (Phase 3, Item 5)
- Implement performance benchmarks for health checks (Phase 3, Item 8)
- Test health checks during deployment procedures (Phase 3, Item 6)

---

**Related Documentation**:
- [`deploy.sh`](../../fwber-backend/deploy.sh) - Deployment script with health check verification
- [`rollback.sh`](../../fwber-backend/rollback.sh) - Rollback script with health validation
- [`ENV_CONFIG_CHECKLIST.md`](../testing/ENV_CONFIG_CHECKLIST.md) - Environment variable reference
- [`E2E_TESTING_PLAN.md`](../testing/E2E_TESTING_PLAN.md) - Master testing strategy

**Controller**: [`HealthController.php`](../../fwber-backend/app/Http/Controllers/HealthController.php)
