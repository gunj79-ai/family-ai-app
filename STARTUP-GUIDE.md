# FamilyAI Startup Guide

## Network Setup (One-Time)

### For All Family Members to Use Same URL

**Run this ONCE:**
Right-click **`SETUP-BONJOUR.ps1`** → Run with PowerShell → Click "Yes" (Administrator)

**Then all family members use:**
```
http://familyai.local:3001
```

Works on Windows, iPad, iPhone, Android — no configuration needed on their devices!

---

## Quick Start (Development)

### Option 1: One-Click Start Both Servers (Recommended)
Double-click **`START-BOTH-SERVERS.bat`**

This will:
1. Clean up any old processes
2. Start backend on http://localhost:3001
3. Start frontend on http://localhost:5173
4. Show you instructions

Two new windows will open - keep them running while you use FamilyAI.

### Option 2: Manual Start (Two terminals)

**Terminal 1:**
```powershell
cd backend
npx tsx src/index.ts
```

**Terminal 2:**
```powershell
cd frontend
npm run dev
```

---

## Permanent Solution: Auto-Start on Boot

If you want FamilyAI to start automatically every time you restart your computer:

### Step 1: Run the installer (requires Administrator)
Right-click **`INSTALL-AUTOSTART.ps1`** → Run with PowerShell

### Step 2: Confirm the setup
Say "Y" when asked to continue

### Step 3: Restart your computer
FamilyAI will automatically start (takes about 30 seconds after boot)

### Step 4: Verify it worked
- Open http://localhost:3001 in your browser
- You should see FamilyAI login page
- Check for two new windows: "FamilyAI Backend" and "FamilyAI Frontend"

---

## Stopping the Servers

### If using START-BOTH-SERVERS.bat:
- Type `quit` in the main launcher window and press Enter
- All servers will shut down cleanly

### If running manually:
- Press **Ctrl+C** in each terminal window

### If auto-started:
- Close the "FamilyAI Backend" and "FamilyAI Frontend" windows

---

## Removing Auto-Start

If you installed auto-start and want to remove it:

Open PowerShell as Administrator and run:
```powershell
Uninstall-ScheduledTask -TaskName 'FamilyAI-Auto-Start' -Confirm:$false
```

Or use Task Scheduler:
1. Open Task Scheduler (search in Windows)
2. Find "FamilyAI-Auto-Start"
3. Right-click → Delete

---

## Troubleshooting

### "PORT 3001 already in use"
Another process is using the port. Kill it:
```powershell
Get-Process | Where-Object {$_.Name -like "*node*"} | Stop-Process -Force
```

Then restart.

### "npm: command not found"
Node.js isn't installed or not in PATH. Restart your computer after installing.

### Servers start but browser shows "Connection refused"
Wait 10 seconds for servers to fully start, then refresh the page.

### Frontend shows blank screen
Check browser console (F12) for errors. Make sure backend is running on port 3001.

### Auto-start doesn't work
1. Verify you ran INSTALL-AUTOSTART.ps1 as Administrator
2. Check Task Scheduler (search "Task Scheduler")
3. Look for "FamilyAI-Auto-Start"
4. If missing, run INSTALL-AUTOSTART.ps1 again

---

## Always-On Setup (For Production)

For 24/7 operation without manual intervention:

### Option A: Task Scheduler (What we just set up)
✓ Automatic restart on reboot
✓ Runs as system user
✓ Survives power failures

### Option B: PM2 (Advanced)
```powershell
npm install -g pm2
cd backend && pm2 start "npx tsx src/index.ts" --name "familyai-backend"
cd ../frontend && pm2 start "npm run dev" --name "familyai-frontend"
pm2 startup  # Auto-start on reboot
pm2 save     # Save configuration
```

### Option C: Windows Service (Most Robust)
Requires NSSM (Non-Sucking Service Manager):
1. Download from https://nssm.cc/download
2. Extract to `C:\Tools\nssm\`
3. Run:
```powershell
C:\Tools\nssm\nssm.exe install FamilyAI-Backend "npx.cmd" "tsx src/index.ts"
C:\Tools\nssm\nssm.exe install FamilyAI-Frontend "npm.cmd" "run dev -- --host"
```

---

## Monitoring

### Check if servers are running:
```powershell
Get-Process | Where-Object {$_.Name -like "*node*" -or $_.Name -like "*tsx*"}
```

### Check if ports are in use:
```powershell
netstat -ano | Select-String ":3001|:5173"
```

### View logs:
- **Backend logs:** `data/backend.log`
- **Frontend console:** Check the frontend window output

---

## Quick Reference

| Task | Command |
|------|---------|
| Start both servers | Double-click `START-BOTH-SERVERS.bat` |
| Start backend only | `cd backend && npx tsx src/index.ts` |
| Start frontend only | `cd frontend && npm run dev` |
| Kill all Node processes | `Get-Process node,tsx \| Stop-Process -Force` |
| Install auto-start | Right-click `INSTALL-AUTOSTART.ps1` → Run as Admin |
| Remove auto-start | `Uninstall-ScheduledTask -TaskName 'FamilyAI-Auto-Start'` |

---

**Need help?** Check `data/backend.log` for error messages.
