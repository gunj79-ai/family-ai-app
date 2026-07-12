# FamilyAI Troubleshooting Guide

Quick fixes for common issues during development.

---

## Before You Start

Run this to verify everything is set up:

```powershell
.\verify-env.ps1
```

This checks:
- ✓ Node.js and npm versions
- ✓ Project files and directories
- ✓ Environment variables
- ✓ Port availability
- ✓ Dependencies installed
- ✓ TypeScript compilation

---

## Issue: "localhost:5173 won't load"

### Quick Diagnosis

1. **Is the frontend dev server running?**
   - Check terminal for `➜ Local: http://localhost:5173/`
   - If missing, the server crashed

2. **Are there TypeScript errors?**
   - Look for red error text in frontend terminal
   - Fix the error (usually in src/ files)

3. **Is port 5173 busy?**
   ```powershell
   netstat -ano | findstr :5173
   ```
   - If yes, see "Port Already in Use" below

### Solutions

**Solution 1: Restart frontend server**
```powershell
# Press Ctrl+C in frontend terminal, then:
npm run dev
```

**Solution 2: Full clean install**
```powershell
cd frontend
npm cache clean --force
Remove-Item node_modules -Recurse -Force
Remove-Item package-lock.json
npm install
npm run dev
```

**Solution 3: Check backend is running**
```powershell
curl http://localhost:3001/api/health
```
- Should return `{"ok":true}`
- If not, backend is down (see "Backend Won't Start" below)

---

## Issue: "API calls return 401/403/500"

### Check 1: Backend is running?

```powershell
curl http://localhost:3001/api/health
```

Expected: `{"ok":true}`

If fails, see "Backend Won't Start" section below.

### Check 2: Are you logged in?

- Frontend shows `/login` page?
- Try with default credentials:
  - Username: `admin`
  - Password: `admin123`

### Check 3: Is ANTHROPIC_API_KEY valid?

```powershell
# Check .env file
type .env | findstr ANTHROPIC_API_KEY
```

Should look like: `sk-ant-api03-xxxxxxxxxxxxx...` (not placeholder)

If invalid, 401 errors on streaming messages.

### Check 4: Check browser Console

Open DevTools (F12):
- Console tab: Any red error messages?
- Network tab: What status code on API call?
- Check request headers: `Authorization: Bearer <token>` present?

---

## Issue: "Port Already in Use"

### Check which process is using the port

```powershell
# For port 3001
netstat -ano | findstr :3001

# For port 5173
netstat -ano | findstr :5173
```

### Kill the process

```powershell
# Replace <PID> with the number from netstat output
taskkill /PID <PID> /F

# Or kill all Node processes
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
```

### Restart services

```powershell
.\start-dev.ps1
```

---

## Issue: "Backend Won't Start"

### Check 1: Is there an error message?

Look at the error output in the terminal. Common ones:

| Error | Meaning | Fix |
|-------|---------|-----|
| `listen EADDRINUSE` | Port 3001 busy | Kill process (see above) |
| `Cannot find module` | Missing dependency | `npm install` |
| `ENOENT: no such file` | Missing .env or data dir | Create them |
| `401 Unauthorized` | Bad API key | Fix ANTHROPIC_API_KEY in .env |

### Check 2: Database permission error?

```powershell
# Create data directory if missing
mkdir data -Force

# Check write permissions
# The script should be able to create/write to ./data/
```

### Check 3: Dependencies installed?

```powershell
cd backend
npm install --legacy-peer-deps
cd ..
```

### Check 4: TypeScript errors?

```powershell
cd backend
npx tsc --noEmit
cd ..
```

Fix any errors shown, then restart.

### Check 5: Full clean start

```powershell
# Kill all Node processes
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force

# Clean backend
cd backend
rm node_modules -Recurse -Force 2>$null
rm package-lock.json 2>$null
npm install --legacy-peer-deps

# Start backend
npx tsx src/index.ts
```

---

## Issue: "Blank page or errors in DevTools"

### Check DevTools Console

Open DevTools (F12) → Console tab. Look for:

**"Failed to fetch"** → Backend not running or API proxy not working
- Run: `curl http://localhost:3001/api/health`
- Check vite.config.ts proxy settings

**"Unexpected token < in JSON"** → Server returned HTML (404) instead of JSON
- Check API endpoint is correct
- Check backend route exists

**"CORS error"** → Backend not configured for localhost:5173
- Check backend/src/config.ts CORS_ORIGINS includes 5173

**"Cannot find module"** → Frontend import issue
- Check file paths use `/src/` not relative paths
- Use `@/components` syntax (alias in vite.config.ts)

### Check Network Tab

Network tab → XHR/Fetch filter:
1. Look for failed requests (red)
2. Click request → Response tab
3. See what error message came back

---

## Issue: "TypeScript Errors in Frontend"

### Check what errors exist

```powershell
cd frontend
npx tsc --noEmit
```

Shows all type errors.

### Common TypeScript issues

| Error | Fix |
|-------|-----|
| `Cannot find module '@/...'` | Check vite.config.ts alias |
| `Property ... does not exist` | Import types correctly: `import type { ... }` |
| `Type 'string' is not assignable to 'number'` | Cast properly: `as number` or fix type |
| `'React' not found` | Add import: `import React from 'react'` |

### Fix and rebuild

```powershell
cd frontend
npm run build  # This runs tsc && vite build
```

If build succeeds, TypeScript is fine.

---

## Issue: "Hot Module Replacement (HMR) not working"

Frontend should auto-reload when you edit files. If it doesn't:

### Check 1: Is terminal showing file changes?

Look for messages like:
```
VITE v8.1.1 ready in 2000 ms

➜  Local:   http://localhost:5173/
```

When you edit a file, should see:
```
[11:23:45 AM] [vite] ✨ hmr update [something.tsx]
```

### Check 2: Is browser tab focused?

HMR only works in focused tabs.

### Check 3: Hard refresh browser

```
Ctrl+Shift+R  (Windows)
Cmd+Shift+R   (Mac)
```

### Check 4: Restart frontend server

```powershell
# Press Ctrl+C in frontend terminal
npm run dev
```

---

## Issue: "npm install hangs or fails"

### Check 1: Network connectivity

```powershell
ping npm.js.org
```

If no response, npm registry is unreachable.

### Solution: Use npm mirror

```powershell
npm config set registry https://registry.npmmirror.com

# Then try again
npm install
```

### Solution 2: Clean cache and retry

```powershell
npm cache clean --force
npm install
```

### Solution 3: Use legacy peer deps flag

```powershell
npm install --legacy-peer-deps
```

---

## Issue: "Database corruption or schema errors"

### Check 1: Delete and recreate database

```powershell
# Delete old database
rm ./data/familyai.db

# Restart backend - it will auto-create
cd backend
npx tsx src/index.ts
```

Database will be created fresh on startup.

### Check 2: Check database file exists

```powershell
ls ./data/familyai.db
```

Should show a file (should be a few KB).

### Check 3: Check data directory permissions

```powershell
# Ensure directory is writable
icacls ./data /grant $env:USERNAME:F
```

---

## Issue: "Streaming messages not working (401 error)"

### Check API key

```powershell
# Verify key exists and is not placeholder
type .env | findstr ANTHROPIC_API_KEY
```

Should be: `sk-ant-api03-...` (actual key, not example)

### Check it's loaded in backend

1. Restart backend: `npx tsx src/index.ts`
2. Look for error messages about missing API key
3. Try a test call:
   ```powershell
   curl -H "Authorization: Bearer <token>" \
     http://localhost:3001/api/chats
   ```

### Check Claude API status

Visit https://status.anthropic.com to see if API is down.

### Test streaming directly

```powershell
# Create a test chat
curl -X POST http://localhost:3001/api/chats \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"title":"Test"}'

# Send a message (should stream back)
curl -X POST http://localhost:3001/api/chats/<chatId>/messages \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"content":"Hello"}'
```

Should return `text/event-stream` response with chunks.

---

## Emergency Reset (Nuclear Option)

If everything is broken and you want to start fresh:

```powershell
# 1. Kill all Node processes
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force

# 2. Wait a moment
Start-Sleep -Seconds 2

# 3. Clean backend
cd backend
rm node_modules -Recurse -Force 2>$null
rm package-lock.json 2>$null
npm install --legacy-peer-deps
cd ..

# 4. Clean frontend
cd frontend
rm node_modules -Recurse -Force 2>$null
rm package-lock.json 2>$null
npm install
cd ..

# 5. Delete database to start fresh
rm ./data/familyai.db 2>$null

# 6. Start fresh
.\start-dev.ps1
```

This should reset everything to a working state.

---

## Getting Help

If nothing works:

1. **Check startup guide:**
   - `STARTUP_GUIDE.md` — Complete setup instructions

2. **Run verification:**
   ```powershell
   .\verify-env.ps1 -Verbose
   ```

3. **Check logs:**
   - Terminal output (backend/frontend)
   - DevTools Console (browser F12)
   - Network tab (browser F12)

4. **Collect debug info:**
   ```powershell
   # Node/npm versions
   node --version
   npm --version
   
   # Check .env (redact API key)
   type .env
   
   # Check backend runs
   cd backend && npx tsc --noEmit
   
   # Check frontend runs
   cd frontend && npx tsc --noEmit && npm run build
   ```

---

## Quick Command Reference

```powershell
# Startup
.\start-dev.ps1                    # Start both servers
.\verify-env.ps1                   # Check environment

# Manual startup
cd backend && npx tsx src/index.ts # Terminal 1
cd frontend && npm run dev         # Terminal 2

# Cleanup
Get-Process node | Stop-Process -Force  # Kill stuck processes
rm node_modules -Recurse -Force         # Delete dependencies (cleanup)
rm package-lock.json                    # Delete lock file (cleanup)

# Testing
npm run build                      # Build frontend
npx tsc --noEmit                  # Check TypeScript
curl http://localhost:3001/api/health  # Check backend
curl http://localhost:5173        # Check frontend

# Database
rm ./data/familyai.db             # Delete database (reset)
ls ./data/familyai.db             # Verify database exists
```

---

**Last updated:** 2026-07-05
**For setup instructions:** See STARTUP_GUIDE.md
