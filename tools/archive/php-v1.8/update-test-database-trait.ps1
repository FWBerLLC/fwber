#!/usr/bin/env pwsh
# Script to update all test files to use RefreshDatabaseSilently trait

$testDir = "c:\Users\hyper\workspace\fwber\fwber-backend\tests\Feature"
$filesChanged = 0

Write-Host "Updating test files to use RefreshDatabaseSilently..." -ForegroundColor Cyan

Get-ChildItem -Path $testDir -Recurse -Filter "*.php" | ForEach-Object {
    $file = $_
    $content = Get-Content $file.FullName -Raw
    
    # Skip if already using RefreshDatabaseSilently
    if ($content -match "RefreshDatabaseSilently") {
        Write-Host "  [SKIP] $($file.Name) - already updated" -ForegroundColor Gray
        return
    }
    
    # Check if file uses RefreshDatabase
    if ($content -match "use RefreshDatabase;") {
        Write-Host "  [UPDATE] $($file.Name)" -ForegroundColor Yellow
        
        # Replace import statement
        $content = $content -replace `
            "use Illuminate\\Foundation\\Testing\\RefreshDatabase;", `
            "use Tests\Traits\RefreshDatabaseSilently;"
        
        # Replace trait usage
        $content = $content -replace `
            "use RefreshDatabase;", `
            "use RefreshDatabaseSilently;"
        
        # Handle cases with trait aliasing (like ModerationControllerTest)
        $content = $content -replace `
            "use RefreshDatabase \{", `
            "use RefreshDatabaseSilently {"
        
        # Write back to file
        Set-Content -Path $file.FullName -Value $content -NoNewline
        $filesChanged++
    }
}

Write-Host "`nCompleted: Updated $filesChanged test files" -ForegroundColor Green
Write-Host "All tests now use RefreshDatabaseSilently to avoid confirmation prompts" -ForegroundColor Cyan
