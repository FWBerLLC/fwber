################################################################################
# fwber.site Development Environment Setup Script (PowerShell)
################################################################################
#
# This script automates the setup of the fwber.site development environment for both
# frontend (Next.js) and backend (Laravel) applications on Windows.
#
# Prerequisites:
# - Windows 10/11
# - PowerShell 5.1 or later
# - Internet connection
#
# The script will install/verify:
# - Node.js 18+ (via Node installer or nvm-windows)
# - PHP 8.2+
# - Composer
# - MySQL
# - Redis (via Memurai or WSL)
# - And set up both applications
#
# Usage:
#   Right-click → Run with PowerShell
#   Or: powershell -ExecutionPolicy Bypass -File setup-dev.ps1
#
################################################################################

# Requires elevated permissions for some operations
#Requires -Version 5.1

# Error handling
$ErrorActionPreference = "Stop"

################################################################################
# Helper Functions
################################################################################

function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Color = "White",
        [string]$Prefix = ""
    )

    $fullMessage = if ($Prefix) { "$Prefix $Message" } else { $Message }
    Write-Host $fullMessage -ForegroundColor $Color
}

function Write-Success {
    param([string]$Message)
    Write-ColorOutput -Message $Message -Color Green -Prefix "✓"
}

function Write-Error-Custom {
    param([string]$Message)
    Write-ColorOutput -Message $Message -Color Red -Prefix "✗"
}

function Write-Warning-Custom {
    param([string]$Message)
    Write-ColorOutput -Message $Message -Color Yellow -Prefix "⚠"
}

function Write-Info {
    param([string]$Message)
    Write-ColorOutput -Message $Message -Color Cyan -Prefix "→"
}

function Write-Header {
    param([string]$Message)
    Write-Host ""
    Write-ColorOutput -Message ("=" * 80) -Color Blue
    Write-ColorOutput -Message "  $Message" -Color Blue
    Write-ColorOutput -Message ("=" * 80) -Color Blue
    Write-Host ""
}

function Test-CommandExists {
    param([string]$Command)
    $null = Get-Command $Command -ErrorAction SilentlyContinue
    return $?
}

function Test-Administrator {
    $currentUser = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($currentUser)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

################################################################################
# Main Script
################################################################################

Clear-Host

Write-Host @"

  ______        ______
 |  ____|      |  __  \
 | |__ __      _| |__| | ___ _ __
 |  __|\\ \ /\ / /  __  |/ _ \ '__|
 | |    \ V  V /| |__) |  __/ |
 |_|     \_/\_/ |_____/ \___|_|

  Development Environment Setup (Windows)

"@ -ForegroundColor Green

Write-Info "Starting development environment setup..."
Write-Host ""
Start-Sleep -Seconds 1

# Check if running as administrator
if (-not (Test-Administrator)) {
    Write-Warning-Custom "Not running as Administrator. Some operations may require elevated privileges."
    Write-Info "Consider running PowerShell as Administrator for full functionality."
    Write-Host ""
}

################################################################################
# Prerequisites Check
################################################################################

Write-Header "🔧 Checking Prerequisites"

# Check Git
if (Test-CommandExists git) {
    $gitVersion = (git --version) -replace "git version ", ""
    Write-Success "Git is installed ($gitVersion)"
} else {
    Write-Error-Custom "Git is not installed"
    Write-Info "Please install Git from: https://git-scm.com/download/win"
    Write-Info "After installation, restart PowerShell and run this script again."
    exit 1
}

################################################################################
# Node.js Installation
################################################################################

Write-Header "📦 Node.js Setup"

if (Test-CommandExists node) {
    $nodeVersion = node -v
    $nodeMajorVersion = [int]($nodeVersion -replace "v", "" -split "\.")[0]

    if ($nodeMajorVersion -ge 18) {
        Write-Success "Node.js is installed ($nodeVersion)"
    } else {
        Write-Warning-Custom "Node.js version is too old ($nodeVersion). Need 18+"
        Write-Info "Please upgrade Node.js from: https://nodejs.org/"
    }
} else {
    Write-Warning-Custom "Node.js is not installed"
    Write-Info "Downloading Node.js installer..."
    Write-Info "Please install from: https://nodejs.org/"
    Write-Info "After installation, restart PowerShell and run this script again."

    Start-Process "https://nodejs.org/en/download/"
    exit 1
}

# Check npm
if (Test-CommandExists npm) {
    $npmVersion = npm -v
    Write-Success "npm is installed ($npmVersion)"
} else {
    Write-Error-Custom "npm is not installed (should come with Node.js)"
    exit 1
}

################################################################################
# PHP Installation
################################################################################

Write-Header "📦 PHP Setup"

if (Test-CommandExists php) {
    $phpVersion = php -v | Select-String -Pattern "PHP (\d+\.\d+\.\d+)" | ForEach-Object { $_.Matches.Groups[1].Value }
    Write-Success "PHP is installed ($phpVersion)"

    # Check PHP version
    $phpMajorMinor = [decimal]($phpVersion -split "\.")[0,1] -join "."
    if ($phpMajorMinor -ge 8.2) {
        Write-Success "PHP version is sufficient ($phpVersion)"
    } else {
        Write-Warning-Custom "PHP version is too old ($phpVersion). Need 8.2+"
        Write-Info "Please upgrade PHP"
    }
} else {
    Write-Warning-Custom "PHP is not installed"
    Write-Info "You can install PHP via:"
    Write-Info "  1. XAMPP: https://www.apachefriends.org/"
    Write-Info "  2. PHP for Windows: https://windows.php.net/download/"
    Write-Info "  3. Laravel Herd: https://herd.laravel.com/ (Recommended)"
    Write-Info ""
    Write-Info "After installation, add PHP to your PATH and run this script again."
    exit 1
}

# Check required PHP extensions
Write-Info "Checking required PHP extensions..."
$requiredExtensions = @("mbstring", "xml", "curl", "zip", "pdo", "pdo_mysql")
$missingExtensions = @()

foreach ($ext in $requiredExtensions) {
    $hasExtension = php -m | Select-String -Pattern "^$ext$" -Quiet
    if ($hasExtension) {
        Write-Success "PHP extension '$ext' is installed"
    } else {
        Write-Warning-Custom "PHP extension '$ext' is missing"
        $missingExtensions += $ext
    }
}

if ($missingExtensions.Count -gt 0) {
    Write-Warning-Custom "Some PHP extensions are missing: $($missingExtensions -join ', ')"
    Write-Info "Enable them in php.ini by uncommenting: extension=$ext"
}

################################################################################
# Composer Installation
################################################################################

Write-Header "📦 Composer Setup"

if (Test-CommandExists composer) {
    $composerVersion = (composer --version) -replace "Composer version ", "" -replace " .*", ""
    Write-Success "Composer is installed ($composerVersion)"
} else {
    Write-Warning-Custom "Composer is not installed"
    Write-Info "Downloading Composer installer..."
    Write-Info "Please install from: https://getcomposer.org/Composer-Setup.exe"

    Start-Process "https://getcomposer.org/Composer-Setup.exe"
    Write-Info "After installation, restart PowerShell and run this script again."
    exit 1
}

################################################################################
# Database Setup
################################################################################

Write-Header "📦 Database Setup"

# MySQL
if (Test-CommandExists mysql) {
    try {
        $mysqlVersion = (mysql --version) -replace "mysql.*Ver ", "" -replace " .*", ""
        Write-Success "MySQL is installed ($mysqlVersion)"
    } catch {
        Write-Warning-Custom "MySQL command exists but version check failed"
    }
} else {
    Write-Warning-Custom "MySQL is not installed"
    Write-Info "You can install MySQL via:"
    Write-Info "  1. XAMPP: https://www.apachefriends.org/"
    Write-Info "  2. MySQL Installer: https://dev.mysql.com/downloads/installer/"
    Write-Info "  3. Laravel Herd (includes MySQL)"
}

################################################################################
# Redis Setup
################################################################################

Write-Header "📦 Redis Setup"

if (Test-CommandExists redis-server) {
    Write-Success "Redis is installed"
} elseif (Test-CommandExists memurai) {
    Write-Success "Memurai (Redis for Windows) is installed"
} else {
    Write-Warning-Custom "Redis is not installed"
    Write-Info "Options for Redis on Windows:"
    Write-Info "  1. Memurai (Redis alternative): https://www.memurai.com/"
    Write-Info "  2. WSL2 with Redis"
    Write-Info "  3. Docker with Redis"
}

################################################################################
# Frontend Setup
################################################################################

Write-Header "🚀 Setting up Frontend (Next.js)"

Set-Location fwber-frontend

# Install dependencies
if (Test-Path "package-lock.json") {
    Write-Info "Installing frontend dependencies with npm ci..."
    npm ci
} else {
    Write-Info "Installing frontend dependencies with npm install..."
    npm install
}
Write-Success "Frontend dependencies installed"

# Create .env.local if it doesn't exist
if (-not (Test-Path ".env.local")) {
    Write-Info "Creating .env.local file..."

    @"
# Frontend Environment Variables
NEXT_PUBLIC_API_URL=http://localhost:8000/api
NEXT_PUBLIC_WS_URL=ws://localhost:6001
NEXT_PUBLIC_ENVIRONMENT=development

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-change-this-in-production

# Optional: Analytics
# NEXT_PUBLIC_GA_ID=
"@ | Out-File -FilePath ".env.local" -Encoding UTF8

    Write-Success "Created .env.local with default values"
    Write-Warning-Custom "Please update .env.local with your actual configuration"
} else {
    Write-Success ".env.local already exists"
}

Set-Location ..

################################################################################
# Backend Setup
################################################################################

Write-Header "🚀 Setting up Backend (Laravel)"

Set-Location fwber-backend

# Install dependencies
Write-Info "Installing backend dependencies..."
composer install
Write-Success "Backend dependencies installed"

# Create .env if it doesn't exist
if (-not (Test-Path ".env")) {
    Write-Info "Creating .env file from .env.example..."
    Copy-Item ".env.example" ".env"

    # Generate app key
    Write-Info "Generating application key..."
    php artisan key:generate

    Write-Success "Created .env with default values"
    Write-Warning-Custom "Please update .env with your actual configuration"

    # Provide sample database configuration
    Write-Info "Sample database configuration:"
    Write-Host ""
    Write-Host "DB_CONNECTION=mysql"
    Write-Host "DB_HOST=127.0.0.1"
    Write-Host "DB_PORT=3306"
    Write-Host "DB_DATABASE=fwber_dev"
    Write-Host "DB_USERNAME=root"
    Write-Host "DB_PASSWORD="
    Write-Host ""
} else {
    Write-Success ".env already exists"
}

# Ask to create database
if (Test-CommandExists mysql) {
    $createDb = Read-Host "Would you like to create the database now? (Y/N)"

    if ($createDb -eq "Y" -or $createDb -eq "y") {
        $mysqlPassword = Read-Host "Enter MySQL root password (press Enter if no password)" -AsSecureString
        $plainPassword = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
            [Runtime.InteropServices.Marshal]::SecureStringToBSTR($mysqlPassword)
        )

        $dbName = (Get-Content ".env" | Select-String "DB_DATABASE=").ToString().Split("=")[1]

        try {
            if ($plainPassword) {
                mysql -uroot -p"$plainPassword" -e "CREATE DATABASE IF NOT EXISTS $dbName;" 2>$null
            } else {
                mysql -uroot -e "CREATE DATABASE IF NOT EXISTS $dbName;" 2>$null
            }
            Write-Success "Database '$dbName' created"
        } catch {
            Write-Warning-Custom "Could not create database. Please create it manually."
        }
    }
}

# Run migrations
$runMigrations = Read-Host "Would you like to run migrations now? (Y/N)"

if ($runMigrations -eq "Y" -or $runMigrations -eq "y") {
    Write-Info "Running database migrations..."
    php artisan migrate
    Write-Success "Migrations completed"

    $seedDb = Read-Host "Would you like to seed the database? (Y/N)"

    if ($seedDb -eq "Y" -or $seedDb -eq "y") {
        Write-Info "Seeding database..."
        php artisan db:seed
        Write-Success "Database seeded"
    }
}

# Create storage symlink
if (-not (Test-Path "public\storage")) {
    Write-Info "Creating storage symlink..."
    php artisan storage:link
    Write-Success "Storage symlink created"
}

Set-Location ..

################################################################################
# Final Steps
################################################################################

Write-Header "🚀 Setup Complete!"

Write-Host ""
Write-Success "Development environment is ready!"
Write-Host ""

Write-Info "Next steps:"
Write-Host ""
Write-Host "  → Frontend (Next.js):"
Write-Host "      cd fwber-frontend"
Write-Host "      npm run dev"
Write-Host "      → Open http://localhost:3000"
Write-Host ""
Write-Host "  → Backend (Laravel):"
Write-Host "      cd fwber-backend"
Write-Host "      php artisan serve"
Write-Host "      → API available at http://localhost:8000"
Write-Host ""
Write-Host "  → Optional: Start queue worker"
Write-Host "      cd fwber-backend"
Write-Host "      php artisan queue:work"
Write-Host ""
Write-Host "  → Optional: Start WebSocket server"
Write-Host "      cd fwber-backend"
Write-Host "      php artisan websocket:serve"
Write-Host ""

Write-Info "Documentation:"
Write-Host "  - README.md - Project overview"
Write-Host "  - TESTING_GUIDE.md - Testing procedures"
Write-Host "  - DEPLOYMENT_CHECKLIST.md - Deployment guide"
Write-Host ""

Write-Info "Useful commands:"
Write-Host "  - npm run test (frontend tests)"
Write-Host "  - php artisan test (backend tests)"
Write-Host "  - npm run lint (frontend linting)"
Write-Host "  - composer phpstan (backend static analysis)"
Write-Host ""

Write-Warning-Custom "Don't forget to:"
Write-Host "  1. Update .env files with your actual configuration"
Write-Host "  2. Start MySQL and Redis services"
Write-Host "  3. Review the README.md for additional setup steps"
Write-Host ""

Write-Host "🚀 Happy coding!" -ForegroundColor Green
Write-Host ""

# Keep window open
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
