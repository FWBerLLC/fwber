#!/bin/bash

# fwber.site Production Deployment Script
# Based on Multi-AI Consensus Recommendations

set -e

echo "🚀 Starting fwber.site Production Deployment..."

# Configuration
APP_NAME="fwber"
BACKUP_DIR="/backups/fwber"
DEPLOY_DIR="/var/www/fwber"
REPO_URL="https://github.com/FWBerLLC/fwber.git"
BRANCH="main"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   error "This script should not be run as root for security reasons"
fi

# Create backup
create_backup() {
    log "Creating backup of current deployment..."
    
    if [ -d "$DEPLOY_DIR" ]; then
        BACKUP_NAME="backup-$(date +%Y%m%d-%H%M%S)"
        sudo mkdir -p "$BACKUP_DIR"
        sudo cp -r "$DEPLOY_DIR" "$BACKUP_DIR/$BACKUP_NAME"
        success "Backup created: $BACKUP_DIR/$BACKUP_NAME"
    else
        warning "No existing deployment found, skipping backup"
    fi
}

# Deploy Laravel Backend
deploy_backend() {
    log "Deploying Laravel backend..."
    
    # Clone or update repository
    if [ -d "$DEPLOY_DIR" ]; then
        cd "$DEPLOY_DIR"
        git pull origin "$BRANCH"
    else
        sudo mkdir -p "$DEPLOY_DIR"
        sudo chown $USER:$USER "$DEPLOY_DIR"
        git clone -b "$BRANCH" "$REPO_URL" "$DEPLOY_DIR"
        cd "$DEPLOY_DIR"
    fi
    
    # Install PHP dependencies
    cd "$DEPLOY_DIR/fwber-backend"
    composer install --no-dev --optimize-autoloader
    
    # Set up environment
    if [ ! -f .env ]; then
        cp .env.example .env
        warning "Please configure .env file with production settings"
    fi
    
    # Generate application key
    php artisan key:generate --force
    
    # Run migrations
    php artisan migrate --force
    
    # Cache configuration
    php artisan config:cache
    php artisan route:cache
    php artisan view:cache
    
    # Set permissions
    sudo chown -R www-data:www-data storage bootstrap/cache
    sudo chmod -R 755 storage bootstrap/cache
    
    success "Laravel backend deployed successfully"
}

# Deploy Next.js Frontend
deploy_frontend() {
    log "Deploying Next.js frontend..."
    
    cd "$DEPLOY_DIR/fwber-frontend"
    
    # Install dependencies
    npm ci --production
    
    # Build for production
    npm run build
    
    success "Next.js frontend deployed successfully"
}

# Deploy with Docker
deploy_docker() {
    log "Deploying with Docker Compose..."
    
    cd "$DEPLOY_DIR"
    
    # Stop existing containers
    docker-compose -f docker-compose.prod.yml down
    
    # Build and start new containers
    docker-compose -f docker-compose.prod.yml up -d --build
    
    # Wait for services to be ready
    sleep 30
    
    # Run migrations in container
    docker-compose -f docker-compose.prod.yml exec laravel php artisan migrate --force
    
    success "Docker deployment completed"
}

# Health checks
health_check() {
    log "Running health checks..."
    
    # Check Laravel API
    if curl -f -s http://localhost:8000/api/health > /dev/null; then
        success "Laravel API is healthy"
    else
        error "Laravel API health check failed"
    fi
    
    # Check Next.js frontend
    if curl -f -s http://localhost:3000 > /dev/null; then
        success "Next.js frontend is healthy"
    else
        error "Next.js frontend health check failed"
    fi
    
    # Check Mercure hub
    if curl -f -s http://localhost:3001/.well-known/mercure > /dev/null; then
        success "Mercure hub is healthy"
    else
        error "Mercure hub health check failed"
    fi
    
    # Check MySQL
    if docker-compose -f docker-compose.prod.yml exec mysql mysqladmin ping -h localhost --silent; then
        success "MySQL database is healthy"
    else
        error "MySQL database health check failed"
    fi
}

# Performance validation
performance_check() {
    log "Running performance validation..."
    
    # Test API response time
    RESPONSE_TIME=$(curl -o /dev/null -s -w '%{time_total}' http://localhost:8000/api/health)
    if (( $(echo "$RESPONSE_TIME < 0.5" | bc -l) )); then
        success "API response time: ${RESPONSE_TIME}s (excellent)"
    elif (( $(echo "$RESPONSE_TIME < 1.0" | bc -l) )); then
        success "API response time: ${RESPONSE_TIME}s (good)"
    else
        warning "API response time: ${RESPONSE_TIME}s (needs optimization)"
    fi
    
    # Test frontend load time
    FRONTEND_TIME=$(curl -o /dev/null -s -w '%{time_total}' http://localhost:3000)
    if (( $(echo "$FRONTEND_TIME < 2.0" | bc -l) )); then
        success "Frontend load time: ${FRONTEND_TIME}s (excellent)"
    elif (( $(echo "$FRONTEND_TIME < 5.0" | bc -l) )); then
        success "Frontend load time: ${FRONTEND_TIME}s (good)"
    else
        warning "Frontend load time: ${FRONTEND_TIME}s (needs optimization)"
    fi
}

# Main deployment function
main() {
    log "Starting fwber.site production deployment..."
    
    # Pre-deployment checks
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed"
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        error "Docker Compose is not installed"
    fi
    
    # Create backup
    create_backup
    
    # Deploy services
    if [ "$1" = "docker" ]; then
        deploy_docker
    else
        deploy_backend
        deploy_frontend
    fi
    
    # Health checks
    health_check
    
    # Performance validation
    performance_check
    
    success "🎉 fwber.site deployment completed successfully!"
    log "Services are running on:"
    log "  - Frontend: http://localhost:3000"
    log "  - Backend API: http://localhost:8000"
    log "  - Mercure Hub: http://localhost:3001"
    log "  - Database: localhost:3306"
}

# Run main function with arguments
main "$@"


