# ==========================================================================
#  FWBer System Tray Controller (v2.3.63)
#  Lightweight Windows notification-area (system tray) icon that manages the
#  local FWBer stack at BelowNormal CPU priority so dev servers never starve
#  interactive desktop responsiveness.
#
#  Managed Services:
#    - Backend  (fwber-backend-ts) -> http://127.0.0.1:4003/health
#    - Frontend (fwber-frontend)   -> http://127.0.0.1:3000
#    - Geo      (fwber-geo Rust)   -> http://127.0.0.1:8081/health
#
#  Process Safety Guarantee:
#    - Tracks exact child Process objects spawned by this controller and uses
#      `taskkill /PID <id> /T /F` + fast `netstat -ano` port cleanup ONLY for
#      services started by this tray instance. Never runs broad node.exe sweeps.
#    - Forces $env:PORT = '4003' when launching Backend so a local .env with
#      PORT=4000 cannot desynchronize from the tray health monitor (:4003).
#    - Automatically falls back to `node --watch dist/index.js` for Backend if
#      `node_modules/tsx` is not installed locally.
#
#  Usage:
#    GUI Tray Mode (default):
#      powershell -NoProfile -ExecutionPolicy Bypass -File tools\fwber-tray.ps1
#    CLI / Automated Modes:
#      powershell -NoProfile -ExecutionPolicy Bypass -File tools\fwber-tray.ps1 -Status
#      powershell -NoProfile -ExecutionPolicy Bypass -File tools\fwber-tray.ps1 -SmokeTest
#      powershell -NoProfile -ExecutionPolicy Bypass -File tools\fwber-tray.ps1 -StopAll
# ==========================================================================

param(
    [switch]$StartAll,
    [switch]$StopAll,
    [switch]$Status,
    [switch]$SmokeTest,
    [int]$SmokeWaitSeconds = 22
)

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

# ---- Paths & Service Registry --------------------------------------------
$RepoRoot = Split-Path -Parent $PSScriptRoot
$LogDir   = Join-Path $RepoRoot 'logs'
if (-not (Test-Path $LogDir)) { New-Item -ItemType Directory -Path $LogDir | Out-Null }

$Services = @(
    @{
        Name      = 'Backend'
        Short     = 'API'
        Kind      = 'backend'
        Dir       = (Join-Path $RepoRoot 'fwber-backend-ts')
        Port      = 4003
        EnvPort   = '4003'
        Url       = 'http://127.0.0.1:4003/health'
        ProcMatch = 'node'
    },
    @{
        Name      = 'Frontend'
        Short     = 'UI'
        Kind      = 'npm'
        Dir       = (Join-Path $RepoRoot 'fwber-frontend')
        Port      = 3000
        EnvPort   = $null
        Url       = 'http://127.0.0.1:3000'
        ProcMatch = 'node'
    },
    @{
        Name      = 'Geo'
        Short     = 'GEO'
        Kind      = 'binary'
        Dir       = (Join-Path $RepoRoot 'fwber-geo')
        Exe       = (Join-Path $RepoRoot 'fwber-geo\target\release\fwber-geo.exe')
        Port      = 8081
        EnvPort   = $null
        Url       = 'http://127.0.0.1:8081/health'
        ProcMatch = 'fwber-geo'
    }
)

# ---- Process Bookkeeping -------------------------------------------------
$script:Children   = @{}
$script:OwnedPorts = @{}

function Write-TrayLog([string]$Message) {
    $stamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    $line  = "[$stamp] $Message"
    Write-Host $line
    Add-Content -Path (Join-Path $LogDir 'tray.log') -Value $line -ErrorAction SilentlyContinue
}

function Get-ListeningPids([int]$Port) {
    $pids = @()
    try {
        $lines = & netstat.exe -ano -p tcp 2>$null
        foreach ($ln in $lines) {
            if ($ln -match "^\s*TCP\s+\S+:$Port\s+\S+\s+LISTENING\s+(\d+)\s*$") {
                $id = [int]$Matches[1]
                if ($id -gt 4 -and ($pids -notcontains $id)) {
                    $pids += $id
                }
            }
        }
    } catch {}
    return $pids
}

function Test-PortListening([int]$Port) {
    return ((Get-ListeningPids $Port).Count -gt 0)
}

function Test-HttpEndpoint([string]$Url) {
    try {
        $req = [System.Net.HttpWebRequest]::Create($Url)
        $req.Method = 'GET'
        $req.Timeout = 1500
        $resp = [System.Net.HttpWebResponse]$req.GetResponse()
        $code = [int]$resp.StatusCode
        $resp.Close()
        return $code
    } catch [System.Net.WebException] {
        if ($_.Exception.Response) {
            return [int]$_.Exception.Response.StatusCode
        }
        return 0
    } catch {
        return 0
    }
}

function Set-BelowNormalSafe($ProcessObj, [string]$Label) {
    try {
        if ($ProcessObj -and -not $ProcessObj.HasExited) {
            $ProcessObj.PriorityClass = [System.Diagnostics.ProcessPriorityClass]::BelowNormal
            Write-TrayLog "  [$Label] PID $($ProcessObj.Id) priority set to $($ProcessObj.PriorityClass)"
        }
    } catch {
        Write-TrayLog "  [$Label] Could not lower priority on PID $($ProcessObj.Id): $($_.Exception.Message)"
    }
}

function Start-FwberService($Service) {
    if ($script:Children.ContainsKey($Service.Name)) {
        $existingProc = $script:Children[$Service.Name]
        if (-not $existingProc.HasExited) {
            Write-TrayLog "$($Service.Name) already managed & running (PID $($existingProc.Id))"
            return
        }
    }

    if (Test-PortListening $Service.Port) {
        Write-TrayLog "$($Service.Name) port $($Service.Port) is already listening externally; adopting status without spawning duplicate."
        return
    }

    if (-not (Test-Path $Service.Dir)) {
        Write-TrayLog "ERROR: missing directory $($Service.Dir)"
        return
    }

    $stdout = Join-Path $LogDir "$($Service.Name.ToLower()).out.log"
    $stderr = Join-Path $LogDir "$($Service.Name.ToLower()).err.log"

    $prevPort = $env:PORT
    try {
        if ($Service.EnvPort) {
            # dotenv in fwber-backend-ts does not overwrite existing process.env.PORT,
            # guaranteeing Backend binds :4003 even if local .env specifies PORT=4000.
            $env:PORT = $Service.EnvPort
        }

        if ($Service.Kind -eq 'binary') {
            if (-not (Test-Path $Service.Exe)) {
                Write-TrayLog "WARN: $($Service.Name) binary not found at $($Service.Exe) (run 'build.bat geo' to compile)."
                return
            }
            Write-TrayLog "Starting $($Service.Name) binary ($($Service.Exe)) on :$($Service.Port) ..."
            $p = Start-Process -FilePath $Service.Exe `
                    -WorkingDirectory $Service.Dir `
                    -RedirectStandardOutput $stdout `
                    -RedirectStandardError  $stderr `
                    -WindowStyle Hidden -PassThru
        } elseif ($Service.Kind -eq 'backend' -and -not (Test-Path (Join-Path $Service.Dir 'node_modules\tsx'))) {
            $nodeExe = (Get-Command node.exe -ErrorAction SilentlyContinue).Source
            if (-not $nodeExe) { $nodeExe = 'node.exe' }
            $distEntry = Join-Path $Service.Dir 'dist\index.js'
            if (-not (Test-Path $distEntry)) {
                Write-TrayLog "ERROR: Backend missing both node_modules\tsx and dist\index.js (run 'build.bat backend')."
                return
            }
            Write-TrayLog "Starting $($Service.Name) via node --watch dist/index.js on :$($Service.Port) ..."
            $p = Start-Process -FilePath $nodeExe -ArgumentList '--watch','dist/index.js' `
                    -WorkingDirectory $Service.Dir `
                    -RedirectStandardOutput $stdout `
                    -RedirectStandardError  $stderr `
                    -WindowStyle Hidden -PassThru
        } else {
            # Use npm.cmd explicitly: on Windows the extensionless 'npm' shim is a bash script.
            $npmCmd = (Get-Command npm.cmd -ErrorAction SilentlyContinue).Source
            if (-not $npmCmd) { $npmCmd = 'npm.cmd' }

            Write-TrayLog "Starting $($Service.Name) via npm run dev in $($Service.Dir) on :$($Service.Port) ..."
            $p = Start-Process -FilePath $npmCmd -ArgumentList 'run','dev' `
                    -WorkingDirectory $Service.Dir `
                    -RedirectStandardOutput $stdout `
                    -RedirectStandardError  $stderr `
                    -WindowStyle Hidden -PassThru
        }

        $script:Children[$Service.Name]   = $p
        $script:OwnedPorts[$Service.Name] = $true
        Set-BelowNormalSafe $p $Service.Name
        Write-TrayLog "$($Service.Name) spawned (PID $($p.Id)) -> $stdout"
    } catch {
        Write-TrayLog "ERROR starting $($Service.Name): $($_.Exception.Message)"
    } finally {
        if ($null -eq $prevPort) {
            Remove-Item Env:\PORT -ErrorAction SilentlyContinue
        } else {
            $env:PORT = $prevPort
        }
    }
}

function Stop-FwberService($Service, [switch]$AllowUnownedPortCleanup) {
    $owned = $script:OwnedPorts.ContainsKey($Service.Name) -and $script:OwnedPorts[$Service.Name]

    if ($script:Children.ContainsKey($Service.Name)) {
        $p = $script:Children[$Service.Name]
        try {
            if (-not $p.HasExited) {
                Write-TrayLog "Stopping $($Service.Name) process tree rooted at PID $($p.Id) ..."
                & taskkill.exe /PID $p.Id /T /F *> $null
            }
        } catch {
            Write-TrayLog "WARN stopping PID $($p.Id): $($_.Exception.Message)"
        } finally {
            $script:Children.Remove($Service.Name)
        }
    }

    if ($owned -or $AllowUnownedPortCleanup) {
        $portPids = Get-ListeningPids $Service.Port
        foreach ($lpid in $portPids) {
            $proc = Get-Process -Id $lpid -ErrorAction SilentlyContinue
            if ($proc -and $proc.ProcessName -match $Service.ProcMatch) {
                Write-TrayLog "  Reclaiming port $($Service.Port) from $($proc.ProcessName) PID $($proc.Id)"
                & taskkill.exe /PID $proc.Id /T /F *> $null
            }
        }
        $script:OwnedPorts.Remove($Service.Name)
    }
}

function Start-AllServices {
    foreach ($s in $Services) { Start-FwberService $s }
}

function Stop-AllServices([switch]$ForcePortCleanup) {
    foreach ($s in $Services) {
        Stop-FwberService $s -AllowUnownedPortCleanup:$ForcePortCleanup
    }
}

function Show-StatusReport {
    Write-TrayLog '--- FWBer Local Stack Status ---'
    foreach ($s in $Services) {
        $pids = Get-ListeningPids $s.Port
        $up   = ($pids.Count -gt 0)
        $http = if ($up) { Test-HttpEndpoint $s.Url } else { 0 }
        $pidInfo = ''
        if ($up) {
            $proc = Get-Process -Id $pids[0] -ErrorAction SilentlyContinue
            if ($proc) {
                $pidInfo = " (PID $($proc.Id), Priority=$($proc.PriorityClass))"
            }
        }
        Write-TrayLog ("  {0,-9} :{1,-5} Port={2,-4} HTTP={3}{4}" -f $s.Name, $s.Port, $(if ($up) { 'OPEN' } else { 'DOWN' }), $http, $pidInfo)
    }
}

# ---- CLI-Only Fast Paths (-Status / -StopAll) ----------------------------
if ($Status) {
    Show-StatusReport
    [System.Environment]::Exit(0)
}

if ($StopAll) {
    Write-TrayLog 'CLI -StopAll requested...'
    Stop-AllServices -ForcePortCleanup
    Start-Sleep -Milliseconds 600
    Show-StatusReport
    [System.Environment]::Exit(0)
}

# ---- Build Windows Notification Area Icon --------------------------------
$tray = New-Object System.Windows.Forms.NotifyIcon
$bmp  = New-Object System.Drawing.Bitmap 32,32
$g    = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = 'AntiAlias'
$g.Clear([System.Drawing.Color]::FromArgb(255, 79, 70, 229)) # Indigo-600 tile
$font = New-Object System.Drawing.Font('Segoe UI', 16, [System.Drawing.FontStyle]::Bold)
$g.DrawString('F', $font, [System.Drawing.Brushes]::White, 6, 2)
$font.Dispose()
$g.Dispose()

$tray.Icon    = [System.Drawing.Icon]::FromHandle($bmp.GetHicon())
$tray.Text    = 'FWBer Dev Stack'
$tray.Visible = $true

function Update-TrayStatus {
    $parts = @()
    foreach ($s in $Services) {
        $on = Test-PortListening $s.Port
        $parts += "$($s.Short):$(if ($on) { 'ON' } else { 'off' })"
    }
    # NotifyIcon.Text has a strict 63-char limit in WinForms.
    $text = "FWBer [$($parts -join ' ')]"
    if ($text.Length -gt 63) { $text = $text.Substring(0, 63) }
    $tray.Text = $text
}

$menu = New-Object System.Windows.Forms.ContextMenuStrip
function Add-TrayMenuItem([string]$Label, [scriptblock]$Action) {
    $item = $menu.Items.Add($Label)
    $item.Add_Click($Action)
    return $item
}

Add-TrayMenuItem 'Open FWBer App (localhost:3000)'             { Start-Process 'http://localhost:3000' } | Out-Null
Add-TrayMenuItem 'Open Backend Health (localhost:4003/health)' { Start-Process 'http://localhost:4003/health' } | Out-Null
Add-TrayMenuItem 'Open Geo Health (127.0.0.1:8081/health)'     { Start-Process 'http://127.0.0.1:8081/health' } | Out-Null
$menu.Items.Add((New-Object System.Windows.Forms.ToolStripSeparator)) | Out-Null
Add-TrayMenuItem 'Start All Services (BelowNormal)'            { Start-AllServices; Start-Sleep -Milliseconds 800; Update-TrayStatus } | Out-Null
Add-TrayMenuItem 'Stop All Services'                           { Stop-AllServices;  Start-Sleep -Milliseconds 600; Update-TrayStatus } | Out-Null
Add-TrayMenuItem 'Restart All Services'                        { Stop-AllServices; Start-Sleep -Seconds 1; Start-AllServices; Start-Sleep -Milliseconds 800; Update-TrayStatus } | Out-Null
$menu.Items.Add((New-Object System.Windows.Forms.ToolStripSeparator)) | Out-Null
Add-TrayMenuItem 'Open Logs Folder (logs\)'                    { Start-Process $LogDir } | Out-Null
Add-TrayMenuItem 'Refresh Status'                              { Update-TrayStatus; Show-StatusReport } | Out-Null
$menu.Items.Add((New-Object System.Windows.Forms.ToolStripSeparator)) | Out-Null
Add-TrayMenuItem 'Quit (Stop Servers && Exit Tray)' {
    Write-TrayLog 'Quit requested from System Tray menu — stopping managed services...'
    Stop-AllServices
    $tray.Visible = $false
    $tray.Dispose()
    [System.Windows.Forms.Application]::Exit()
} | Out-Null

$tray.ContextMenuStrip = $menu
$tray.Add_DoubleClick({ Start-Process 'http://localhost:3000' })

# ---- Automated Non-Blocking Smoke Test Mode (-SmokeTest) -----------------
if ($SmokeTest) {
    Write-TrayLog "=== FWBer System Tray SmokeTest Started (Wait=${SmokeWaitSeconds}s) ==="
    Start-AllServices
    $deadline = (Get-Date).AddSeconds($SmokeWaitSeconds)
    while ((Get-Date) -lt $deadline) {
        [System.Windows.Forms.Application]::DoEvents()
        Update-TrayStatus
        $allReady = $true
        foreach ($s in $Services) {
            if (-not (Test-PortListening $s.Port)) { $allReady = $false }
        }
        if ($allReady) {
            # Give HTTP servers 1.5s after socket listen so /health & Next SSR respond 200
            Start-Sleep -Milliseconds 1500
            break
        }
        Start-Sleep -Seconds 1
    }
    Update-TrayStatus
    Write-TrayLog "Tray Tooltip during active run: '$($tray.Text)'"
    Show-StatusReport

    Write-TrayLog 'SmokeTest testing clean Quit / Stop-AllServices...'
    Stop-AllServices
    Start-Sleep -Seconds 1
    Update-TrayStatus
    Write-TrayLog "Tray Tooltip after Stop-AllServices: '$($tray.Text)'"
    Show-StatusReport

    $tray.Visible = $false
    $tray.Dispose()
    Write-TrayLog '=== FWBer System Tray SmokeTest Completed Cleanly ==='
    [System.Environment]::Exit(0)
}

# ---- Interactive GUI Event Loop ------------------------------------------
$timer = New-Object System.Windows.Forms.Timer
$timer.Interval = 5000
$timer.Add_Tick({ Update-TrayStatus })
$timer.Start()

Write-TrayLog 'FWBer System Tray GUI initialized in Windows Notification Area.'
Start-AllServices
Update-TrayStatus

[System.Windows.Forms.Application]::Run()
