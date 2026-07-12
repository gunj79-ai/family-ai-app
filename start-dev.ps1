#!/usr/bin/env pwsh
<#
.SYNOPSIS
    FamilyAI Development Startup Script
    Starts backend and frontend servers with automatic dependency checking and cleanup

.DESCRIPTION
    - Kills stuck Node processes
    - Checks Node.js version
    - Verifies dependencies
    - Starts backend server (port 3001)
    - Starts frontend dev server (port 5173)
    - Provides health checks and status

.EXAMPLE
    .\start-dev.ps1

.EXAMPLE
    .\start-dev.ps1 -Force  # Skip all checks and start immediately
#>

param(
    [switch]$Force,
    [switch]$BackendOnly,
    [switch]$FrontendOnly,
    [switch]$NoInstall
)

# Colors
$OK = @{ ForegroundColor = 'Green' }
$ERR = @{ ForegroundColor = 'Red' }
$WARN = @{ ForegroundColor = 'Yellow' }
$INFO = @{ ForegroundColor = 'Cyan' }

function Write-OK { Write-Host @OK @args }
function Write-Err { Write-Host @ERR @args }
function Write-Warn { Write-Host @WARN @args }
function Write-Info { Write-Host @INFO @args }

Write-Info "
╔════════════════════════════════════════╗
║  FamilyAI Development Startup Script   ║
╚════════════════════════════════════════╝
"

# ============================================================================
# STEP 1: Check Prerequisites
# ============================================================================

Write-Info "`n📋 Checking Prerequisites..."

# Check Node.js
try {
    $NodeVersion = (node --version 2>$null)
    if (-not $NodeVersion) { throw "Node.js not found" }
    Write-OK "✓ Node.js: $NodeVersion"
} catch {
    Write-Err "✗ Node.js not installed. Please install Node.js 20+ from nodejs.org"
    exit 1
}

# Check npm
try {
    $NpmVersion = (npm --version 2>$null)
    Write-OK "✓ npm: $NpmVersion"
} catch {
    Write-Err "✗ npm not found"
    exit 1
}

# Check .env file
if (-not (Test-Path ".env")) {
    Write-Warn "⚠ .env file not found at project root"
    Write-Warn "  You need to set ANTHROPIC_API_KEY in .env for streaming to work"
}

# ============================================================================
# STEP 2: Kill Stuck Processes
# ============================================================================

Write-Info "`n🛑 Cleaning up stuck processes..."
$StuckProcesses = Get-Process node -ErrorAction SilentlyContinue
if ($StuckProcesses) {
    Write-Warn "  Found $($StuckProcesses.Count) stuck Node process(es)"
    $StuckProcesses | Stop-Process -Force -ErrorAction SilentlyContinue
    Write-OK "  ✓ Killed stuck processes"
    Start-Sleep -Seconds 1
} else {
    Write-OK "  ✓ No stuck processes"
}

# ============================================================================
# STEP 3: Check Ports
# ============================================================================

Write-Info "`n🔌 Checking ports..."

$Port3001Busy = $false
$Port5173Busy = $false

try {
    $NetStat = netstat -ano 2>$null
    if ($NetStat -match ":3001.*LISTENING") { $Port3001Busy = $true }
    if ($NetStat -match ":5173.*LISTENING") { $Port5173Busy = $true }
} catch {}

if ($Port3001Busy) {
    Write-Warn "  ⚠ Port 3001 is busy (backend port)"
}
if ($Port5173Busy) {
    Write-Warn "  ⚠ Port 5173 is busy (frontend port)"
}

if (-not $Port3001Busy -and -not $Port5173Busy) {
    Write-OK "  ✓ Ports 3001 and 5173 are available"
}

# ============================================================================
# STEP 4: Install Dependencies
# ============================================================================

if (-not $NoInstall -and -not $Force) {
    Write-Info "`n📦 Checking dependencies..."
    
    $BackendNeedsInstall = -not (Test-Path "backend/node_modules")
    $FrontendNeedsInstall = -not (Test-Path "frontend/node_modules")
    
    if ($BackendNeedsInstall) {
        Write-Info "  Installing backend dependencies..."
        Push-Location backend
        npm install --legacy-peer-deps 2>&1 | Out-Null
        Pop-Location
        Write-OK "  ✓ Backend dependencies installed"
    }
    
    if ($FrontendNeedsInstall) {
        Write-Info "  Installing frontend dependencies..."
        Push-Location frontend
        npm install 2>&1 | Out-Null
        Pop-Location
        Write-OK "  ✓ Frontend dependencies installed"
    }
    
    if (-not $BackendNeedsInstall -and -not $FrontendNeedsInstall) {
        Write-OK "  ✓ All dependencies present"
    }
}

# ============================================================================
# STEP 5: Start Services
# ============================================================================

Write-Info "`n🚀 Starting services..."

$BackendJob = $null
$FrontendJob = $null

# Start Backend
if (-not $FrontendOnly) {
    Write-Info "  ⏳ Starting Backend (port 3001)..."
    try {
        $BackendJob = Start-Job -ScriptBlock {
            Set-Location (Join-Path $Using:PWD "backend")
            & npx tsx src/index.ts 2>&1
        } -Name "FamilyAI-Backend"
        
        Write-OK "  ✓ Backend started (Job ID: $($BackendJob.Id))"
        
        # Wait for backend to be ready (max 10 seconds)
        $MaxWait = 10
        $WaitTime = 0
        while ($WaitTime -lt $MaxWait) {
            try {
                $Health = curl -s http://localhost:3001/api/health 2>$null
                if ($Health -and ($Health | ConvertFrom-Json).ok) {
                    Write-OK "  ✓ Backend is responding (http://localhost:3001)"
                    break
                }
            } catch {}
            
            Start-Sleep -Seconds 1
            $WaitTime++
        }
    } catch {
        Write-Err "  ✗ Failed to start backend: $_"
    }
}

# Start Frontend
if (-not $BackendOnly) {
    Write-Info "  ⏳ Starting Frontend (port 5173)..."
    try {
        $FrontendJob = Start-Job -ScriptBlock {
            Set-Location (Join-Path $Using:PWD "frontend")
            & npm run dev 2>&1
        } -Name "FamilyAI-Frontend"
        
        Write-OK "  ✓ Frontend started (Job ID: $($FrontendJob.Id))"
        Write-Info "  ⏳ Waiting for dev server to start (usually 5-10 seconds)..."
        
        # Wait for frontend to be ready (max 30 seconds)
        $MaxWait = 30
        $WaitTime = 0
        while ($WaitTime -lt $MaxWait) {
            try {
                $Response = curl -s http://localhost:5173 2>$null
                if ($Response) {
                    Write-OK "  ✓ Frontend is responding (http://localhost:5173)"
                    break
                }
            } catch {}
            
            Start-Sleep -Seconds 1
            $WaitTime++
        }
    } catch {
        Write-Err "  ✗ Failed to start frontend: $_"
    }
}

# ============================================================================
# STEP 6: Show Status and Instructions
# ============================================================================

Write-OK "`n
╔════════════════════════════════════════════════════════════╗
║                      ✓ Ready to Develop                    ║
╚════════════════════════════════════════════════════════════╝
"

Write-Info "📍 Service URLs:"
Write-OK "   Frontend (UI):     http://localhost:5173"
Write-OK "   Backend (API):     http://localhost:3001"
Write-OK "   Health Check:      http://localhost:3001/api/health"

Write-Info "`n📝 Login Credentials (default):"
Write-OK "   Username: admin"
Write-OK "   Password: admin123"

Write-Info "`n⌨️  Keyboard Shortcuts:"
Write-OK "   Ctrl+C in this window to stop both servers"
Write-OK "   Ctrl+Shift+C to stop individual jobs:"
Write-OK "      Stop-Job -Name FamilyAI-Backend"
Write-OK "      Stop-Job -Name FamilyAI-Frontend"

Write-Info "`n💡 Tips:"
Write-OK "   • Frontend auto-reloads on file changes (HMR)"
Write-OK "   • Backend requires restart for code changes"
Write-OK "   • Open DevTools (F12) to debug"
Write-OK "   • Check STARTUP_GUIDE.md for troubleshooting"

Write-Info "`n🔍 Monitoring:"
Write-OK "   Backend logs:" -NoNewline
Write-Info " (see window output above)"
Write-OK "   Frontend logs:" -NoNewline
Write-Info " (see window output above)"

# ============================================================================
# STEP 7: Keep Running
# ============================================================================

Write-Warn "`n⏳ Servers running... Press Ctrl+C to stop all services.`n"

try {
    # Monitor jobs and show any output
    while ($true) {
        if ($BackendJob -and $BackendJob.State -eq "Failed") {
            Write-Err "✗ Backend job failed!"
            break
        }
        if ($FrontendJob -and $FrontendJob.State -eq "Failed") {
            Write-Err "✗ Frontend job failed!"
            break
        }
        Start-Sleep -Seconds 2
    }
} finally {
    Write-Info "`n🛑 Stopping services..."
    
    if ($BackendJob) {
        Stop-Job -Job $BackendJob -ErrorAction SilentlyContinue
        Remove-Job -Job $BackendJob -ErrorAction SilentlyContinue
        Write-OK "   ✓ Backend stopped"
    }
    
    if ($FrontendJob) {
        Stop-Job -Job $FrontendJob -ErrorAction SilentlyContinue
        Remove-Job -Job $FrontendJob -ErrorAction SilentlyContinue
        Write-OK "   ✓ Frontend stopped"
    }
    
    # Kill any remaining processes
    Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    
    Write-OK "`n✓ All services stopped. Goodbye!`n"
}
