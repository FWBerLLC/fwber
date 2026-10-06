#!/bin/bash

################################################################################
# fwber.site Development Environment Setup Script
################################################################################
#
# This script automates the setup of the fwber.site development environment for both
# frontend (Next.js) and backend (Laravel) applications.
#
# Prerequisites:
# - macOS, Linux, or WSL2 on Windows
# - Git installed
# - Internet connection
#
# The script will install/verify:
# - Node.js 18+ (via nvm)
# - PHP 8.2+
# - Composer
# - MySQL/PostgreSQL
# - Redis
# - And set up both applications
#
# Usage:
#   chmod +x setup-dev.sh
#   ./setup-dev.sh
#
################################################################################

set -e # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Emoji for better UX
CHECK="✓"
CROSS="✗"
ARROW="→"
ROCKET="🚀"
WRENCH="🔧"
PACKAGE="📦"

################################################################################
# Helper Functions
################################################################################

print_header() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
}

print_success() {
    echo -e "${GREEN}${CHECK} $1${NC}"
}

print_error() {
    echo -e "${RED}${CROSS} $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "${BLUE}${ARROW} $1${NC}"
}

command_exists() {
    command -v "$1" >/dev/null 2>&1
}

check_os() {
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        OS="linux"
        if [ -f /etc/debian_version ]; then
            DISTRO="debian"
        elif [ -f /etc/redhat-release ]; then
            DISTRO="redhat"
        else
            DISTRO="unknown"
        fi
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        OS="macos"
        DISTRO="macos"
    else
        OS="unknown"
        DISTRO="unknown"
    fi
}

################################################################################
# Main Script
################################################################################

clear
echo -e "${GREEN}"
cat << "EOF"
  ______        ______
 |  ____|      |  __  \
 | |__ __      _| |__| | ___ _ __
 |  __|\\ \ /\ / /  __  |/ _ \ '__|
 | |    \ V  V /| |__) |  __/ |
 |_|     \_/\_/ |_____/ \___|_|

  Development Environment Setup
EOF
echo -e "${NC}"

print_info "Starting development environment setup..."
echo ""

# Check OS
check_os
print_info "Detected OS: $OS ($DISTRO)"
sleep 1

################################################################################
# Prerequisites Check
################################################################################

print_header "${WRENCH} Checking Prerequisites"

# Check Git
if command_exists git; then
    print_success "Git is installed ($(git --version | cut -d' ' -f3))"
else
    print_error "Git is not installed"
    print_info "Please install Git first: https://git-scm.com/downloads"
    exit 1
fi

# Check curl/wget
if command_exists curl; then
    DOWNLOADER="curl -fsSL"
    print_success "curl is installed"
elif command_exists wget; then
    DOWNLOADER="wget -qO-"
    print_success "wget is installed"
else
    print_error "Neither curl nor wget is installed"
    print_info "Please install curl or wget"
    exit 1
fi

################################################################################
# Node.js Installation
################################################################################

print_header "${PACKAGE} Node.js Setup"

if command_exists node; then
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -ge 18 ]; then
        print_success "Node.js is installed ($(node -v))"
    else
        print_warning "Node.js version is too old ($(node -v)). Need 18+"
        print_info "Please upgrade Node.js"
    fi
else
    print_warning "Node.js is not installed"
    print_info "Installing Node.js via nvm..."

    # Install nvm
    if [ ! -d "$HOME/.nvm" ]; then
        print_info "Installing nvm..."
        curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

        # Load nvm
        export NVM_DIR="$HOME/.nvm"
        [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    fi

    # Install Node.js LTS
    print_info "Installing Node.js LTS..."
    nvm install --lts
    nvm use --lts
    nvm alias default 'lts/*'

    print_success "Node.js installed ($(node -v))"
fi

# Check npm
if command_exists npm; then
    print_success "npm is installed ($(npm -v))"
else
    print_error "npm is not installed"
    exit 1
fi

################################################################################
# PHP Installation
################################################################################

print_header "${PACKAGE} PHP Setup"

if command_exists php; then
    PHP_VERSION=$(php -v | head -n 1 | cut -d' ' -f2 | cut -d'.' -f1,2)
    print_success "PHP is installed ($(php -v | head -n 1 | cut -d' ' -f2))"

    # Check PHP version
    if (( $(echo "$PHP_VERSION >= 8.2" | bc -l) )); then
        print_success "PHP version is sufficient ($PHP_VERSION)"
    else
        print_warning "PHP version is too old ($PHP_VERSION). Need 8.2+"
        print_info "Please upgrade PHP"
    fi
else
    print_warning "PHP is not installed"
    print_info "Installing PHP..."

    if [ "$OS" == "macos" ]; then
        if command_exists brew; then
            brew install php@8.2
        else
            print_error "Homebrew is not installed. Please install it first: https://brew.sh"
            exit 1
        fi
    elif [ "$DISTRO" == "debian" ]; then
        sudo apt-get update
        sudo apt-get install -y php8.2 php8.2-cli php8.2-fpm php8.2-mysql php8.2-xml php8.2-mbstring php8.2-curl php8.2-zip php8.2-gd php8.2-redis
    elif [ "$DISTRO" == "redhat" ]; then
        sudo dnf install -y php php-cli php-fpm php-mysqlnd php-xml php-mbstring php-curl php-zip php-gd php-redis
    else
        print_error "Automatic PHP installation not supported for this OS"
        print_info "Please install PHP 8.2+ manually"
        exit 1
    fi

    print_success "PHP installed"
fi

# Check required PHP extensions
print_info "Checking required PHP extensions..."
REQUIRED_EXTENSIONS=("mbstring" "xml" "curl" "zip" "pdo" "pdo_mysql")
MISSING_EXTENSIONS=()

for ext in "${REQUIRED_EXTENSIONS[@]}"; do
    if php -m | grep -q "$ext"; then
        print_success "PHP extension '$ext' is installed"
    else
        print_warning "PHP extension '$ext' is missing"
        MISSING_EXTENSIONS+=("$ext")
    fi
done

if [ ${#MISSING_EXTENSIONS[@]} -gt 0 ]; then
    print_warning "Some PHP extensions are missing: ${MISSING_EXTENSIONS[*]}"
    print_info "Install them with: sudo apt-get install php-<extension> (on Debian/Ubuntu)"
fi

################################################################################
# Composer Installation
################################################################################

print_header "${PACKAGE} Composer Setup"

if command_exists composer; then
    print_success "Composer is installed ($(composer --version | cut -d' ' -f3))"
else
    print_warning "Composer is not installed"
    print_info "Installing Composer..."

    php -r "copy('https://getcomposer.org/installer', 'composer-setup.php');"
    php composer-setup.php --quiet
    sudo mv composer.phar /usr/local/bin/composer
    php -r "unlink('composer-setup.php');"

    print_success "Composer installed"
fi

################################################################################
# Database Setup
################################################################################

print_header "${PACKAGE} Database Setup"

# MySQL
if command_exists mysql; then
    print_success "MySQL is installed ($(mysql --version | cut -d' ' -f5 | cut -d',' -f1))"
else
    print_warning "MySQL is not installed"
    print_info "You'll need to install MySQL manually:"
    if [ "$OS" == "macos" ]; then
        print_info "  brew install mysql"
        print_info "  brew services start mysql"
    elif [ "$DISTRO" == "debian" ]; then
        print_info "  sudo apt-get install mysql-server"
        print_info "  sudo systemctl start mysql"
    fi
fi

################################################################################
# Redis Setup
################################################################################

print_header "${PACKAGE} Redis Setup"

if command_exists redis-server; then
    print_success "Redis is installed ($(redis-server --version | cut -d'=' -f2 | cut -d' ' -f1))"
else
    print_warning "Redis is not installed"
    print_info "You'll need to install Redis manually:"
    if [ "$OS" == "macos" ]; then
        print_info "  brew install redis"
        print_info "  brew services start redis"
    elif [ "$DISTRO" == "debian" ]; then
        print_info "  sudo apt-get install redis-server"
        print_info "  sudo systemctl start redis"
    fi
fi

################################################################################
# Frontend Setup
################################################################################

print_header "${ROCKET} Setting up Frontend (Next.js)"

cd fwber-frontend || exit 1

# Install dependencies
if [ -f "package-lock.json" ]; then
    print_info "Installing frontend dependencies with npm ci..."
    npm ci
else
    print_info "Installing frontend dependencies with npm install..."
    npm install
fi
print_success "Frontend dependencies installed"

# Create .env.local if it doesn't exist
if [ ! -f ".env.local" ]; then
    print_info "Creating .env.local file..."
    cat > .env.local << 'EOL'
# Frontend Environment Variables
NEXT_PUBLIC_API_URL=http://localhost:8000/api
NEXT_PUBLIC_WS_URL=ws://localhost:6001
NEXT_PUBLIC_ENVIRONMENT=development

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-change-this-in-production

# Optional: Analytics
# NEXT_PUBLIC_GA_ID=
EOL
    print_success "Created .env.local with default values"
    print_warning "Please update .env.local with your actual configuration"
else
    print_success ".env.local already exists"
fi

cd ..

################################################################################
# Backend Setup
################################################################################

print_header "${ROCKET} Setting up Backend (Laravel)"

cd fwber-backend || exit 1

# Install dependencies
print_info "Installing backend dependencies..."
composer install
print_success "Backend dependencies installed"

# Create .env if it doesn't exist
if [ ! -f ".env" ]; then
    print_info "Creating .env file from .env.example..."
    cp .env.example .env

    # Generate app key
    print_info "Generating application key..."
    php artisan key:generate

    print_success "Created .env with default values"
    print_warning "Please update .env with your actual configuration"

    # Provide sample database configuration
    print_info "Sample database configuration:"
    echo ""
    echo "DB_CONNECTION=mysql"
    echo "DB_HOST=127.0.0.1"
    echo "DB_PORT=3306"
    echo "DB_DATABASE=fwber_dev"
    echo "DB_USERNAME=root"
    echo "DB_PASSWORD="
    echo ""
else
    print_success ".env already exists"
fi

# Create database if MySQL is available
if command_exists mysql; then
    print_info "Would you like to create the database now? (y/N)"
    read -r CREATE_DB

    if [[ "$CREATE_DB" =~ ^[Yy]$ ]]; then
        print_info "Enter MySQL root password (press Enter if no password):"
        read -rs MYSQL_PASSWORD

        DB_NAME=$(grep DB_DATABASE .env | cut -d'=' -f2)

        if [ -z "$MYSQL_PASSWORD" ]; then
            mysql -uroot -e "CREATE DATABASE IF NOT EXISTS $DB_NAME;" 2>/dev/null || true
        else
            mysql -uroot -p"$MYSQL_PASSWORD" -e "CREATE DATABASE IF NOT EXISTS $DB_NAME;" 2>/dev/null || true
        fi

        if [ $? -eq 0 ]; then
            print_success "Database '$DB_NAME' created"
        else
            print_warning "Could not create database. Please create it manually."
        fi
    fi
fi

# Run migrations
print_info "Would you like to run migrations now? (y/N)"
read -r RUN_MIGRATIONS

if [[ "$RUN_MIGRATIONS" =~ ^[Yy]$ ]]; then
    print_info "Running database migrations..."
    php artisan migrate
    print_success "Migrations completed"

    print_info "Would you like to seed the database? (y/N)"
    read -r SEED_DB

    if [[ "$SEED_DB" =~ ^[Yy]$ ]]; then
        print_info "Seeding database..."
        php artisan db:seed
        print_success "Database seeded"
    fi
fi

# Create storage symlink
if [ ! -L "public/storage" ]; then
    print_info "Creating storage symlink..."
    php artisan storage:link
    print_success "Storage symlink created"
fi

cd ..

################################################################################
# Final Steps
################################################################################

print_header "${ROCKET} Setup Complete!"

echo ""
print_success "Development environment is ready!"
echo ""

print_info "Next steps:"
echo ""
echo "  ${ARROW} Frontend (Next.js):"
echo "      cd fwber-frontend"
echo "      npm run dev"
echo "      ${ARROW} Open http://localhost:3000"
echo ""
echo "  ${ARROW} Backend (Laravel):"
echo "      cd fwber-backend"
echo "      php artisan serve"
echo "      ${ARROW} API available at http://localhost:8000"
echo ""
echo "  ${ARROW} Optional: Start queue worker"
echo "      cd fwber-backend"
echo "      php artisan queue:work"
echo ""
echo "  ${ARROW} Optional: Start WebSocket server"
echo "      cd fwber-backend"
echo "      php artisan websocket:serve"
echo ""

print_info "Documentation:"
echo "  - README.md - Project overview"
echo "  - TESTING_GUIDE.md - Testing procedures"
echo "  - DEPLOYMENT_CHECKLIST.md - Deployment guide"
echo ""

print_info "Useful commands:"
echo "  - npm run test (frontend tests)"
echo "  - php artisan test (backend tests)"
echo "  - npm run lint (frontend linting)"
echo "  - composer phpstan (backend static analysis)"
echo ""

print_warning "Don't forget to:"
echo "  1. Update .env files with your actual configuration"
echo "  2. Start MySQL and Redis services"
echo "  3. Review the README.md for additional setup steps"
echo ""

echo -e "${GREEN}${ROCKET} Happy coding!${NC}"
echo ""
