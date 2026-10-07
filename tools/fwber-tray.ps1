# ==========================================================================
#  FWBer System Tray Controller (v2.3.34)
#  A lightweight Windows notification-area icon that owns the dev services.
#
#  Why this exists:
#    fwber is a pure web monorepo (Next.js + Express). There was no tray, so
#    operators had to hunt stray node.exe windows to stop the stack. This
#    helper is deliberately NOT an Electron wrapper - it only spawns and
#    reaps the two npm processes, keeping the app itself a normal website.
#
#  Menu:
#    Open Frontend / Open Backend  - launch default browser to each port
#    Start All / Stop All          - own the two npm dev processes
#    Start Log Viewer              - tail logs\*.log in a console
#    Quit Servers & Tray           - stop children, then exit
#
#  Usage:  powershell -ExecutionPolicy Bypass -File tools\fwber-tray.ps1
# ==========================================================================

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
Add-Type @'
using System;
using System.Runtime.InteropServices;
public class FwberNative {
    // Attach to the parent console so Write-Host works when launched from a
    // terminal; if there is no console (double-clicked) this fails silently
    // and the tray simply stays a pure GUI process.
    [DllImport("kernel32.dll")] public static extern bool AttachConsole(int pid);
    [DllImport("kernel32.dll")] public static extern bool FreeConsole();
}
'@

# ---- Paths ---------------------------------------------------------------
$RepoRoot = Split-Path -Parent $PSScriptRoot
$LogDir   = Join-Path $RepoRoot 'logs'
if (-not (Test-Path $LogDir)) { New-Item -ItemType Directory -Path $LogDir | Out-Null }

$Services = @(
    @{ Name = 'Backend';  Dir = (Join-Path $RepoRoot 'fwber-backend-ts'); Port = 4003; Url = 'http://localhost:4003' }
    @{ Name = 'Frontend'; Dir = (Join-Path $RepoRoot 'fwber-frontend');  Port = 3000; Url = 'http://localhost:3000' }
)

# ---- Process bookkeeping -------------------------------------------------
# We keep the Process objects so Stop-All can kill exactly what we spawned
# (never a broad node.exe sweep - that would take out unrelated tools).
$script:Children = @{}

function Write-TrayLog([string]$Message) {
    $stamp = Get-Date -Format 'HH:mm:ss'
    $line  = "[$stamp] $Message"
    Write-Host $line
    Add-Content -Path (Join-Path $LogDir 'tray.log') -Value $line -ErrorAction SilentlyContinue
}

function Test-PortFree([int]$Port) {
    $existing = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
    return ($null -eq $existing)
}

function Start-ServiceProcess($Service) {
    if ($script:Children.ContainsKey($Service.Name)) {
        $p = $script:Children[$Service.Name]
        if (-not $p.HasExited) {
            Write-TrayLog "$($Service.Name) already running (PID $($p.Id))"
            return
        }
    }
    if (-not (Test-Path $Service.Dir)) {
        Write-TrayLog "ERROR: missing directory $($Service.Dir)"
        return
    }

    $stdout = Join-Path $LogDir "$($Service.Name.ToLower()).out.log"
    $stderr = Join-Path $LogDir "$($Service.Name.ToLower()).err.log"

    # Use npm.cmd explicitly: on Windows the npm "bin" entry is a bash shim
    # which Node cannot spawn directly from PowerShell (known failure mode).
    $npmCmd = (Get-Command npm.cmd -ErrorAction SilentlyContinue).Source
    if (-not $npmCmd) { $npmCmd = 'npm.cmd' }

    Write-TrayLog "Starting $($Service.Name) in $($Service.Dir) ..."
    try {
        $p = Start-Process -FilePath $npmCmd -ArgumentList 'run','dev' `
                -WorkingDirectory $Service.Dir `
                -RedirectStandardOutput $stdout `
                -RedirectStandardError  $stderr `
                -WindowStyle Hidden -PassThru
        $script:Children[$Service.Name] = $p
        Write-TrayLog "$($Service.Name) started (PID $($p.Id)) -> $stdout"
    } catch {
        Write-TrayLog "ERROR starting $($Service.Name): $($_.Exception.Message)"
    }
}

function Stop-ServiceProcess($Service) {
    if (-not $script:Children.ContainsKey($Service.Name)) { return }
    $p = $script:Children[$Service.Name]
    try {
        if (-not $p.HasExited) {
            Write-TrayLog "Stopping $($Service.Name) (PID $($p.Id)) ..."

            # Kill the npm.cmd wrapper, then any node child still listening on
            # our port. Scoped by port so we never touch unrelated node processes.
            Stop-Process -Id $p.Id -Force -ErrorAction SilentlyContinue

            $listeners = Get-NetTCPConnection -LocalPort $Service.Port -State Listen -ErrorAction SilentlyContinue
            foreach ($l in $listeners) {
                $proc = Get-Process -Id $l.OwningProcess -ErrorAction SilentlyContinue
                if ($proc -and $proc.ProcessName -match 'node') {
                    Write-TrayLog "  reclaiming port $($Service.Port) from node PID $($proc.Id)"
                    Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
                }
            }
        }
    } catch {
        Write-TrayLog "ERROR stopping $($Service.Name): $($_.Exception.Message)"
    } finally {
        $script:Children.Remove($Service.Name)
    }
}

function Start-AllServices  { foreach ($s in $Services) { Start-ServiceProcess $s } }
function Stop-AllServices   { foreach ($s in $Services) { Stop-ServiceProcess  $s } }

# ---- Tray UI -------------------------------------------------------------
$tray = New-Object System.Windows.Forms.NotifyIcon
# A simple hand-drawn icon so we do not ship a binary .ico asset.
$bmp  = New-Object System.Drawing.Bitmap 32,32
$g    = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = 'AntiAlias'
$g.Clear([System.Drawing.Color]::FromArgb(220, 38, 38, 200))   # indigo tile
$g.DrawString('F', (New-Object System.Drawing.Font('Segoe UI', 16, [System.Drawing.FontStyle]::Bold)),
              [System.Drawing.Brushes]::White, 6, 2)
$g.Dispose()
$tray.Icon    = [System.Drawing.Icon]::FromHandle($bmp.GetHicon())
$tray.Text    = 'FWBer Dev Stack'
$tray.Visible = $true

$menu = New-Object System.Windows.Forms.ContextMenuStrip

function Add-Menu([string]$Label, [scriptblock]$Action) {
    $item = $menu.Items.Add($Label)
    $item.Add_Click($Action)
    return $item
}

Add-Menu 'Open Frontend'      { Start-Process 'http://localhost:3000' }
Add-Menu 'Open Backend'       { Start-Process 'http://localhost:4003' }
$menu.Items.Add((New-Object System.Windows.Forms.ToolStripSeparator)) | Out-Null
Add-Menu 'Start All'          { Start-AllServices; Update-Status }
Add-Menu 'Stop All'           { Stop-AllServices;  Update-Status }
$menu.Items.Add((New-Object System.Windows.Forms.ToolStripSeparator)) | Out-Null
Add-Menu 'Open Log Folder'    { Start-Process $LogDir }
Add-Menu 'Refresh Status'     { Update-Status }
$menu.Items.Add((New-Object System.Windows.Forms.ToolStripSeparator)) | Out-Null
Add-Menu 'Quit Servers && Tray' {
    Write-TrayLog 'Quit requested - shutting down services'
    Stop-AllServices
    $tray.Visible = $false
    $tray.Dispose()
    [System.Windows.Forms.Application]::Exit()
}

$tray.ContextMenuStrip = $menu

function Update-Status {
    $parts = @()
    foreach ($s in $Services) {
        $listening = -not (Test-PortFree $s.Port)
        $parts += "$($s.Name)=$(if ($listening) { 'ON' } else { 'off' })"
    }
    $tray.Text = "FWBer [$(($parts) -join ' ')]"
}

# Double-click the icon to open the frontend - the most common intent.
$tray.Add_DoubleClick({ Start-Process 'http://localhost:3000' })

# Periodic status refresh so the tooltip reflects reality without user action.
$timer = New-Object System.Windows.Forms.Timer
$timer.Interval = 5000
$timer.Add_Tick({ Update-Status })
$timer.Start()

Write-TrayLog 'FWBer tray ready'
Update-Status

# Auto-start both services on launch so the tray is useful immediately.
Start-AllServices

[System.Windows.Forms.Application]::Run()
