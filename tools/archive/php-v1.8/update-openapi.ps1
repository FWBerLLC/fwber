Param(
    [switch]$SkipCopy
)

$ErrorActionPreference = 'Stop'

# Move into backend
Push-Location "$(Split-Path $MyInvocation.MyCommand.Path -Parent)\..\fwber-backend"
try {
    Write-Host "Generating OpenAPI via L5-Swagger..." -ForegroundColor Cyan
    php artisan l5-swagger:generate | Out-String | Write-Verbose

    if (-not $SkipCopy) {
        $src = (Resolve-Path "storage/api-docs/api-docs.json").Path
        $dst = (Resolve-Path "..\docs\postman\").Path + "\fwber-openapi.json"
        Write-Host "Copying $src -> $dst" -ForegroundColor Cyan
        Copy-Item -Path $src -Destination $dst -Force
        Write-Host "Done." -ForegroundColor Green
    } else {
        Write-Host "Skipped copying to docs/postman (per flag)." -ForegroundColor Yellow
    }
} finally {
    Pop-Location
}
