# FamilyAI Auto-Start Installation
# This script sets up Windows Task Scheduler to run FamilyAI servers automatically on boot

Write-Host "FamilyAI Auto-Start Setup" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Green
Write-Host ""

# Get current script directory
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$BatchFile = Join-Path $ScriptDir "START-BOTH-SERVERS.bat"

# Verify the batch file exists
if (-not (Test-Path $BatchFile)) {
    Write-Host "ERROR: START-BOTH-SERVERS.bat not found!" -ForegroundColor Red
    Write-Host "This script must be in the FamilyAI root directory." -ForegroundColor Red
    exit 1
}

Write-Host "This will set up FamilyAI to start automatically when your computer boots." -ForegroundColor Yellow
Write-Host ""
Write-Host "Your computer will:"
Write-Host "  1. Start the backend server (port 3001)"
Write-Host "  2. Start the frontend server (port 5173)"
Write-Host "  3. Be ready for family members to use"
Write-Host ""

$confirm = Read-Host "Continue? (Y/N)"
if ($confirm -ne "Y" -and $confirm -ne "y") {
    Write-Host "Cancelled."
    exit 0
}

Write-Host ""
Write-Host "Setting up Task Scheduler..." -ForegroundColor Green

# Create task action (run batch file)
$action = New-ScheduledTaskAction `
    -Execute $BatchFile `
    -WorkingDirectory $ScriptDir

# Create task trigger (at boot, with delay to let system stabilize)
$trigger = New-ScheduledTaskTrigger `
    -AtStartup `
    -RandomDelay (New-TimeSpan -Seconds 10)

# Create task settings
$settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -RunOnlyIfNetworkAvailable `
    -MultipleInstances IgnoreNew

# Register the task
try {
    Register-ScheduledTask `
        -TaskName "FamilyAI-Auto-Start" `
        -Description "Automatically starts FamilyAI backend and frontend servers on system boot" `
        -Action $action `
        -Trigger $trigger `
        -Settings $settings `
        -RunLevel Highest `
        -Force | Out-Null

    Write-Host ""
    Write-Host "✓ Task created successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Green
    Write-Host "  1. Restart your computer"
    Write-Host "  2. FamilyAI will start automatically (may take 30 seconds)"
    Write-Host "  3. Open http://localhost:3001 in your browser"
    Write-Host ""
    Write-Host "To stop the servers, close the 'FamilyAI Backend' and 'FamilyAI Frontend' windows." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "To remove auto-start later:" -ForegroundColor Yellow
    Write-Host "  Uninstall-ScheduledTask -TaskName 'FamilyAI-Auto-Start'" -ForegroundColor Gray
    Write-Host ""
}
catch {
    Write-Host "ERROR: Could not create task scheduler entry." -ForegroundColor Red
    Write-Host "Make sure you're running PowerShell as Administrator." -ForegroundColor Red
    Write-Host ""
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}

Read-Host "Press Enter to close this window"
