#!/usr/bin/env pwsh
<#
.SYNOPSIS
    FamilyAI Environment Verification Script
    Checks all prerequisites and common issues before startup

.DESCRIPTION
    Verifies:
    - Node.js and npm versions
    - Required files and directories
    - Environment variables
    - Port availability
    - npm dependencies
    - TypeScript compilation

.EXAMPLE
    .\verify-env.ps1

.EXAMPLE
    .\verify-env.ps1 -Fix  # Attempt automatic fixes
#>

param(
    [switch]$Fix,
    [switch]$Verbose
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

# Test counter
$Passed = 0
$Failed = 0
$Warnings = 0

function Test-Check {
    param([string]$Name, [scriptblock]$Test, [string]$OnFail)
    
    $Result = & $Test
    
    if ($Result) {
        Write-OK "✓ $Name"
        $script:Passed++
    } else {
        Write-Err "✗ $Name"
        if ($OnFail) { Write-Err "  └─ $OnFail" }
        $script:Failed++
    }
}

function Test-Warn {
    param([string]$Name, [scriptblock]$Test)
    
    if (& $Test) {
        Write-Warn "⚠ $Name"
        $script:Warnings++
    }
}

Write-Info "
╔════════════════════════════════════════╗
║   FamilyAI Environment Verification    ║
╚════════════════════════════════════════╝
"

# ============================================================================
# SECTION 1: Runtime Environment
# ============================================================================

Write-Info "`n📦 SECTION 1 — Runtime Environment"
Write-Info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Node.js check
Test-Check "Node.js installed (v20+)" {
    try {
        $ver = [version](node --version 2>$null).TrimStart('v')
        $ver -ge [version]"20.0.0"
    } catch {
        $false
    }
} "Install from nodejs.org"

# npm check
Test-Check "npm installed (v10+)" {
    try {
        $ver = [version](npm --version 2>$null)
        $ver -ge [version]"10.0.0"
    } catch {
        $false
    }
} "Install Node.js with npm included"

# PowerShell version
Test-Check "PowerShell 5.1+" {
    $PSVersionTable.PSVersion.Major -ge 5
} "Update Windows PowerShell"

# ============================================================================
# SECTION 2: Project Structure
# ============================================================================

Write-Info "`n📁 SECTION 2 — Project Structure"
Write-Info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

$RequiredDirs = @(
    "backend",
    "frontend",
    "data"
)

foreach ($dir in $RequiredDirs) {
    Test-Check "Directory exists: $dir" {
        Test-Path $dir -PathType Container
    } "Create directory: mkdir $dir"
}

$RequiredFiles = @(
    ".env",
    "backend/package.json",
    "frontend/package.json",
    "backend/src/index.ts",
    "frontend/src/main.tsx"
)

foreach ($file in $RequiredFiles) {
    Test-Check "File exists: $file" {
        Test-Path $file -PathType Leaf
    } "File is missing or in wrong location"
}

# ============================================================================
# SECTION 3: Environment Variables
# ============================================================================

Write-Info "`n🔐 SECTION 3 — Environment Variables (.env)"
Write-Info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if (Test-Path ".env") {
    $EnvContent = Get-Content ".env" -Raw
    
    Test-Check "ANTHROPIC_API_KEY set" {
        $EnvContent -match "ANTHROPIC_API_KEY=sk-ant"
    } "Add ANTHROPIC_API_KEY to .env file"
    
    Test-Check "JWT_SECRET set" {
        $EnvContent -match "JWT_SECRET=.{20,}"
    } "Add JWT_SECRET to .env file"
    
    Test-Check "DATABASE path set" {
        $EnvContent -match "DB_PATH="
    } "Ensure DB_PATH is defined"
    
    Test-Warn "API key is placeholder" {
        $EnvContent -match "sk-ant-xxxxx|PLACEHOLDER|example"
    }
} else {
    Write-Warn "⚠ .env file missing — streaming will not work"
    $script:Warnings++
}

# ============================================================================
# SECTION 4: Port Availability
# ============================================================================

Write-Info "`n🔌 SECTION 4 — Port Availability"
Write-Info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

$PortsToCheck = @(3001, 5173)

foreach ($port in $PortsToCheck) {
    $IsBusy = $false
    try {
        $NetStat = netstat -ano 2>$null
        if ($NetStat -match ":$port.*LISTENING") {
            $IsBusy = $true
        }
    } catch {}
    
    if ($IsBusy) {
        Write-Warn "⚠ Port $port is in use"
        $script:Warnings++
        if ($Fix) {
            Get-Process -ErrorAction SilentlyContinue | Where-Object {
                $_.Handles -match $port
            } | Stop-Process -Force -ErrorAction SilentlyContinue
            Write-OK "  └─ Fixed: Killed process on port $port"
        } else {
            Write-Info "  └─ Run: netstat -ano | findstr :$port"
            Write-Info "  └─ Then: taskkill /PID <PID> /F"
        }
    } else {
        Write-OK "✓ Port $port is available"
        $script:Passed++
    }
}

# ============================================================================
# SECTION 5: Dependencies
# ============================================================================

Write-Info "`n📚 SECTION 5 — Dependencies"
Write-Info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Backend dependencies
$BackendHasModules = Test-Path "backend/node_modules" -PathType Container
if ($BackendHasModules) {
    Write-OK "✓ Backend node_modules exists"
    $script:Passed++
} else {
    Write-Warn "⚠ Backend node_modules missing"
    $script:Warnings++
    if ($Fix) {
        Write-Info "  └─ Installing backend dependencies..."
        Push-Location backend
        npm install --legacy-peer-deps 2>&1 | Out-Null
        Pop-Location
        Write-OK "  └─ Done"
    }
}

# Frontend dependencies
$FrontendHasModules = Test-Path "frontend/node_modules" -PathType Container
if ($FrontendHasModules) {
    Write-OK "✓ Frontend node_modules exists"
    $script:Passed++
} else {
    Write-Warn "⚠ Frontend node_modules missing"
    $script:Warnings++
    if ($Fix) {
        Write-Info "  └─ Installing frontend dependencies..."
        Push-Location frontend
        npm install 2>&1 | Out-Null
        Pop-Location
        Write-OK "  └─ Done"
    }
}

# ============================================================================
# SECTION 6: TypeScript Compilation
# ============================================================================

Write-Info "`n✨ SECTION 6 — TypeScript Compilation"
Write-Info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if ($FrontendHasModules) {
    try {
        Push-Location frontend
        $Output = npx tsc --noEmit 2>&1
        Pop-Location
        
        if ($LASTEXITCODE -eq 0) {
            Write-OK "✓ Frontend TypeScript compiles"
            $script:Passed++
        } else {
            Write-Err "✗ Frontend TypeScript errors"
            $script:Failed++
            if ($Verbose -and $Output) {
                Write-Err "  Errors:"
                $Output | Select-Object -First 5 | ForEach-Object { Write-Err "    $_" }
            }
        }
    } catch {
        Write-Warn "⚠ Could not run TypeScript check"
        $script:Warnings++
    }
} else {
    Write-Info "⊘ Skipping TypeScript check (node_modules not installed)"
}

# ============================================================================
# SECTION 7: Database
# ============================================================================

Write-Info "`n💾 SECTION 7 — Database"
Write-Info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if (Test-Path "data/familyai.db") {
    $DbSize = (Get-Item "data/familyai.db").Length
    Write-OK "✓ Database exists ($(($DbSize/1KB).ToString('F1')) KB)"
    $script:Passed++
} else {
    Write-Info "⊘ Database will be created on first run"
}

Test-Check "Data directory is writable" {
    if (Test-Path "data" -PathType Container) {
        $TestFile = Join-Path "data" ".write-test-$(Get-Random).tmp"
        try {
            "" | Out-File $TestFile
            Remove-Item $TestFile -ErrorAction SilentlyContinue
            $true
        } catch {
            $false
        }
    } else {
        $false
    }
} "Check file permissions on ./data directory"

# ============================================================================
# SECTION 8: Summary
# ============================================================================

Write-Info "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
Write-Info "📊 VERIFICATION SUMMARY"
Write-Info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

Write-OK "  Passed:  $Passed" 
Write-Warn "  Warnings: $Warnings" 
Write-Err "  Failed:  $Failed"

Write-Info "`n"

if ($Failed -eq 0) {
    Write-OK "✓ Environment is ready!"
    Write-Info ""
    Write-Info "Next steps:"
    Write-Info "  1. Run the startup script:"
    Write-OK "     .\start-dev.ps1"
    Write-Info ""
    Write-Info "  2. Or start manually:"
    Write-OK "     Terminal 1: cd backend && npx tsx src/index.ts"
    Write-OK "     Terminal 2: cd frontend && npm run dev"
    Write-Info ""
} else {
    Write-Err "✗ Fix the errors above before starting development"
    Write-Info ""
    Write-Info "To attempt automatic fixes, run:"
    Write-OK "  .\verify-env.ps1 -Fix"
    Write-Info ""
    exit 1
}
