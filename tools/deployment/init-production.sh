#!/bin/bash

# fwber.site Production Initialization Script
# One-command production deployment and migration

set -e  # Exit on any error

echo "=================================================="
echo "fwber.site Production Initialization"
echo "=================================================="
echo ""

# Color codes for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
COMPOSE_FILE="docker-compose.prod.yml"
BACKEND_CONTAINER="fwber-laravel-prod"
MYSQL_CONTAINER="fwber-mysql-prod"

# Validation function
check_env_file() {
    if [ ! -f ".env" ]; then
        echo -e "${RED}ERROR: .env file not found in root directory${NC}"
        echo "Please create .env from .env.example and configure all required secrets"
        exit 1
    fi
    
    if [ ! -f "fwber-backend/.env" ]; then
        echo -e "${RED}ERROR: fwber-backend/.env file not found${NC}"
        echo "Please create fwber-backend/.env from .env.example"
        exit 1
    fi
}

# Pre-flight checks
preflight_checks() {
    echo -e "${YELLOW}Running pre-flight checks...${NC}"
    
    # Check for Docker
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}ERROR: Docker is not installed${NC}"
        exit 1
    fi
    
    # Check for Docker Compose
    if ! command -v docker compose &> /dev/null; then
        echo -e "${RED}ERROR: Docker Compose is not installed${NC}"
        exit 1
    fi
    
    # Check environment files
    check_env_file
    
    # Check for nginx.conf
    if [ ! -f "nginx.conf" ]; then
        echo -e "${RED}ERROR: nginx.conf not found${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✓ Pre-flight checks passed${NC}"
    echo ""
}

# Build Docker images
build_images() {
    echo -e "${YELLOW}Building Docker images...${NC}"
    docker compose -f $COMPOSE_FILE build --no-cache
    echo -e "${GREEN}✓ Images built successfully${NC}"
    echo ""
}

# Start services
start_services() {
    echo -e "${YELLOW}Starting services...${NC}"
    docker compose -f $COMPOSE_FILE up -d
    
    # Wait for MySQL to be ready
    echo "Waiting for MySQL to be ready..."
    until docker exec $MYSQL_CONTAINER mysqladmin ping -h localhost --silent; do
        echo -n "."
        sleep 2
    done
    echo ""
    echo -e "${GREEN}✓ Services started${NC}"
    echo ""
}

# Run Laravel migrations
run_migrations() {
    echo -e "${YELLOW}Running database migrations...${NC}"
    
    # Wait a bit for Laravel to be ready
    sleep 5
    
    docker exec $BACKEND_CONTAINER php artisan migrate --force
    echo -e "${GREEN}✓ Migrations completed${NC}"
    echo ""
}

# Run Laravel optimizations
optimize_laravel() {
    echo -e "${YELLOW}Optimizing Laravel...${NC}"
    
    docker exec $BACKEND_CONTAINER php artisan config:cache
    docker exec $BACKEND_CONTAINER php artisan route:cache
    docker exec $BACKEND_CONTAINER php artisan view:cache
    docker exec $BACKEND_CONTAINER php artisan event:cache
    
    echo -e "${GREEN}✓ Laravel optimized${NC}"
    echo ""
}

# Create storage symlink
setup_storage() {
    echo -e "${YELLOW}Setting up storage symlink...${NC}"
    docker exec $BACKEND_CONTAINER php artisan storage:link
    echo -e "${GREEN}✓ Storage configured${NC}"
    echo ""
}

# Display status
show_status() {
    echo ""
    echo "=================================================="
    echo -e "${GREEN}Production deployment complete!${NC}"
    echo "=================================================="
    echo ""
    echo "Services running:"
    docker compose -f $COMPOSE_FILE ps
    echo ""
    echo "Access points:"
    echo "  - Frontend: http://localhost"
    echo "  - API: http://localhost/api"
    echo "  - Mercure SSE: http://localhost/.well-known/mercure"
    echo ""
    echo "Useful commands:"
    echo "  View logs: docker compose -f $COMPOSE_FILE logs -f"
    echo "  Stop: docker compose -f $COMPOSE_FILE down"
    echo "  Restart: docker compose -f $COMPOSE_FILE restart"
    echo ""
    echo -e "${YELLOW}IMPORTANT REMINDERS:${NC}"
    echo "  1. Rotate any API keys that were previously committed"
    echo "  2. Configure SSL certificates in ./ssl/ directory"
    echo "  3. Update nginx.conf to enable HTTPS (port 443)"
    echo "  4. Review .env files to ensure no secrets are committed"
    echo ""
}

# Main execution
main() {
    echo "This script will:"
    echo "  1. Run pre-flight checks"
    echo "  2. Build Docker images"
    echo "  3. Start all services"
    echo "  4. Run database migrations"
    echo "  5. Optimize Laravel caches"
    echo ""
    read -p "Continue? (y/n) " -n 1 -r
    echo ""
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Aborted."
        exit 0
    fi
    
    preflight_checks
    build_images
    start_services
    run_migrations
    optimize_laravel
    setup_storage
    show_status
}

# Run main function
main
