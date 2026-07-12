# FamilyAI Bonjour Setup
# Enables familyai.local domain on your home network
# Run this once as Administrator

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  FamilyAI Network Setup (Bonjour)"
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "This will set up familyai.local so all family devices" -ForegroundColor Yellow
Write-Host "can access FamilyAI with the SAME URL:" -ForegroundColor Yellow
Write-Host ""
Write-Host "  http://familyai.local:3001" -ForegroundColor Cyan
Write-Host ""
Write-Host "Works on:" -ForegroundColor Yellow
Write-Host "  ✓ Windows laptops"
Write-Host "  ✓ iPads / iPhones"
Write-Host "  ✓ Android phones"
Write-Host "  ✓ Any device on your home WiFi"
Write-Host ""

# Check if running as admin
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")
if (-not $isAdmin) {
    Write-Host "ERROR: This script must run as Administrator" -ForegroundColor Red
    Write-Host ""
    Write-Host "Steps:" -ForegroundColor Yellow
    Write-Host "  1. Close this window"
    Write-Host "  2. Right-click SETUP-BONJOUR.ps1"
    Write-Host "  3. Select 'Run with PowerShell'"
    Write-Host "  4. Click 'Yes' when Windows asks for permission"
    Write-Host ""
    Read-Host "Press Enter to close"
    exit 1
}

Write-Host "Checking Bonjour..." -ForegroundColor Green
Write-Host ""

# Check if Bonjour is already installed
$bonjourPath = "C:\Program Files\Bonjour\mDNSResponder.exe"
if (Test-Path $bonjourPath) {
    Write-Host "✓ Bonjour is already installed!" -ForegroundColor Green
    Write-Host ""
    Write-Host "All family members can now use:" -ForegroundColor Cyan
    Write-Host "  http://familyai.local:3001" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Setup is complete!" -ForegroundColor Green
    Read-Host "Press Enter to close"
    exit 0
}

Write-Host "Bonjour not found. Installing..." -ForegroundColor Yellow
Write-Host ""

# Download Bonjour installer
$installerPath = "$env:TEMP\BonjourPSSetup.exe"
$downloadUrl = "https://download.bonjour.ws/BonjourPSSetup.exe"

try {
    Write-Host "Downloading Bonjour (this may take a minute)..."
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    (New-Object Net.WebClient).DownloadFile($downloadUrl, $installerPath)
    Write-Host "✓ Download complete" -ForegroundColor Green
}
catch {
    Write-Host ""
    Write-Host "ERROR: Could not download Bonjour" -ForegroundColor Red
    Write-Host ""
    Write-Host "Manual install option:" -ForegroundColor Yellow
    Write-Host "  1. Visit: https://support.apple.com/downloads/bonjour" -ForegroundColor Gray
    Write-Host "  2. Download 'Bonjour Print Services for Windows'" -ForegroundColor Gray
    Write-Host "  3. Run the installer" -ForegroundColor Gray
    Write-Host "  4. Restart your computer" -ForegroundColor Gray
    Write-Host "  5. All family members can then use: http://familyai.local:3001" -ForegroundColor Gray
    Write-Host ""
    Read-Host "Press Enter to close"
    exit 1
}

# Install Bonjour silently
Write-Host "Installing Bonjour (this may take 2-3 minutes)..."
$process = Start-Process -FilePath $installerPath -ArgumentList "/quiet" -PassThru -Wait
$exitCode = $process.ExitCode

if ($exitCode -eq 0) {
    Write-Host "✓ Bonjour installed successfully!" -ForegroundColor Green
}
else {
    Write-Host "⚠ Installation returned code: $exitCode" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Setup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Green
Write-Host "  1. Restart your computer (optional but recommended)" -ForegroundColor Gray
Write-Host "  2. Make sure FamilyAI backend is running" -ForegroundColor Gray
Write-Host "  3. Tell family members to visit:" -ForegroundColor Gray
Write-Host ""
Write-Host "      http://familyai.local:3001" -ForegroundColor Cyan
Write-Host ""
Write-Host "They will see the login page and can log in." -ForegroundColor Green
Write-Host ""
Write-Host "If it doesn't work right away:" -ForegroundColor Yellow
Write-Host "  • Restart your computer" -ForegroundColor Gray
Write-Host "  • Restart the FamilyAI backend" -ForegroundColor Gray
Write-Host "  • On their device, forget the WiFi and reconnect" -ForegroundColor Gray
Write-Host ""

# Cleanup
Remove-Item $installerPath -Force -ErrorAction SilentlyContinue

Read-Host "Press Enter to close"
