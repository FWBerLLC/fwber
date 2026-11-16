<#
.SYNOPSIS
  Off-site backup pull: copy the latest fwber nightly backup from Hetzner
  to a local drive (default M:\fwber-backups), verify integrity, prune old.

.DESCRIPTION
  The Hetzner box has a single disk, so its nightly backups
  (/var/backups/fwber/*.tar.gz) protect against software accidents but not
  disk loss. This pull makes the laptop copy the off-site replica: scp the
  newest tarball, verify it lists cleanly (tar tzf), keep the newest 14.

  Scheduled nightly (Windows Task "fwber-backup-pull", 04:15) and safe to
  run by hand. Exits non-zero if the copy or verification fails.
#>
param(
  [string]$DestDir = "M:\fwber-backups",
  [int]$Keep = 14
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $DestDir)) {
  New-Item -ItemType Directory -Path $DestDir -Force | Out-Null
}

# Newest remote tarball name (names only; no content listed locally yet).
$remoteLatest = (ssh -o BatchMode=yes hetzner "ls -t /var/backups/fwber/*.tar.gz | head -1").Trim()
if (-not $remoteLatest) { throw "No remote backup found" }
$fileName = Split-Path $remoteLatest -Leaf
$localPath = Join-Path $DestDir $fileName

if (Test-Path $localPath) {
  Write-Output "Already have $fileName"
} else {
  scp -o BatchMode=yes "hetzner:${remoteLatest}" $localPath
  if ($LASTEXITCODE -ne 0) { throw "scp failed ($LASTEXITCODE)" }
  Write-Output "Pulled $fileName"
}

# Integrity: the archive must list without error.
tar tzf $localPath > $null
if ($LASTEXITCODE -ne 0) { throw "Integrity check failed for $localPath" }
Write-Output "Integrity OK: $fileName"

# Prune beyond the newest $Keep.
Get-ChildItem $DestDir -Filter "fwber-backup-*.tar.gz" |
  Sort-Object LastWriteTime -Descending |
  Select-Object -Skip $Keep |
  ForEach-Object { Remove-Item $_.FullName; Write-Output "Pruned $($_.Name)" }

Write-Output "Off-site backup current: $localPath"
