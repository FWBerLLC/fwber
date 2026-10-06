# fwber.site Quick Start Testing Script
# Run this in PowerShell to start testing immediately

Write-Host "🚀 fwber.site Testing Quick Start" -ForegroundColor Green
Write-Host "============================`n" -ForegroundColor Green

# 1. Find PHP
Write-Host "1. Locating PHP..." -ForegroundColor Cyan
$phpPath = Get-Command php -ErrorAction SilentlyContinue
if (-not $phpPath) {
    # Try common locations
    $phpLocations = @(
        "C:\Program Files\PHP\v8.3\php.exe",
        "C:\Program Files\PHP\v8.2\php.exe",
        "C:\PHP\php.exe",
        "C:\xampp\php\php.exe"
    )

    foreach ($loc in $phpLocations) {
        if (Test-Path $loc) {
            $phpPath = $loc
            break
        }
    }
}

if ($phpPath) {
    Write-Host "   ✅ PHP found: $phpPath" -ForegroundColor Green
    & $phpPath --version | Select-Object -First 1
} else {
    Write-Host "   ❌ PHP not found. Please restart PowerShell or reboot." -ForegroundColor Red
    Write-Host "   After restart, run: php --version" -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# 2. Check MySQL
Write-Host "2. Checking MySQL..." -ForegroundColor Cyan
$mysqlPath = Get-Command mysql -ErrorAction SilentlyContinue
if ($mysqlPath) {
    Write-Host "   ✅ MySQL found" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  MySQL command not in PATH (this is OK)" -ForegroundColor Yellow
    Write-Host "   You may need to configure MySQL manually" -ForegroundColor Yellow
}

Write-Host ""

# 3. Check if database exists
Write-Host "3. Database Setup" -ForegroundColor Cyan
Write-Host "   📋 You'll need to manually:" -ForegroundColor Yellow
Write-Host "      1. Create database 'fwber'" -ForegroundColor Yellow
Write-Host "      2. Run: mysql -u root -p fwber < setup-database.sql" -ForegroundColor Yellow
Write-Host "      3. Configure _db.php with your credentials" -ForegroundColor Yellow

Write-Host ""

# 4. Offer to start PHP server
Write-Host "4. Starting PHP Development Server..." -ForegroundColor Cyan
$startServer = Read-Host "   Start PHP server now? (y/n)"

if ($startServer -eq 'y' -or $startServer -eq 'Y') {
    Write-Host ""
    Write-Host "🌐 Starting server at http://localhost:8000" -ForegroundColor Green
    Write-Host "   Press Ctrl+C to stop the server" -ForegroundColor Yellow
    Write-Host ""

    Set-Location $PSScriptRoot

    if ($phpPath -is [System.Management.Automation.ApplicationInfo]) {
        & php -S localhost:8000
    } else {
        & $phpPath -S localhost:8000
    }
} else {
    Write-Host ""
    Write-Host "📝 To start server manually, run:" -ForegroundColor Cyan
    Write-Host "   cd $PSScriptRoot" -ForegroundColor White
    Write-Host "   php -S localhost:8000" -ForegroundColor White
    Write-Host ""
    Write-Host "📚 Then follow: MANUAL_TESTING_RUNBOOK.md" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "✨ Setup complete! Next steps:" -ForegroundColor Green
Write-Host "   1. Configure database (see above)" -ForegroundColor White
Write-Host "   2. Open http://localhost:8000 in browser" -ForegroundColor White
Write-Host "   3. Follow MANUAL_TESTING_RUNBOOK.md" -ForegroundColor White
Write-Host ""
