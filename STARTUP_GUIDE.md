# FamilyAI Startup & Hardening Guide

## Quick Start (Recommended)

### Using the Startup Scripts

**Windows (PowerShell):**
```powershell
# Start everything automatically
.\start-dev.ps1
```

**macOS/Linux (Bash):**
```bash
# Start everything automatically
./start-dev.sh
```

---

## Prerequisites Checklist

Before starting, verify these are installed and working:

- [ ] **Node.js 20+** (verify: `node --version`)
- [ ] **npm 10+** (verify: `npm --version`)
- [ ] **Git** (verify: `git --version`)
- [ ] **.env file** exists at project root with `ANTHROPIC_API_KEY`
- [ ] **Port 3001** is available (backend)
- [ ] **Port 5173** is available (frontend)

### Kill Stuck Processes (if needed)

**Windows:**
```powershell
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
```

**macOS/Linux:**
```bash
pkill -f "node|npm" || true
```

---

## Manual Startup (Terminal-by-Terminal)

### Terminal 1: Backend Server

```powershell
cd backend
npm install  # Only needed first time or after package.json changes
npx tsx src/index.ts
```

**Expected output:**
```
✓ Database initialized at ...
✓ Running on port 3001
✓ Environment: development
🔗 API endpoint: http://localhost:3001
```

### Terminal 2: Frontend Dev Server

```powershell
cd frontend
npm install  # Only needed first time or after package.json changes
npm run dev
```

**Expected output:**
```
VITE v... ready in ... ms

➜  Local:   http://localhost:5173/
```

---

## Common Issues & Solutions

### Issue 1: "localhost:5173 won't load"

**Check:**
1. Is frontend terminal showing "Local: http://localhost:5173"?
2. Is there TypeScript errors in frontend terminal?
3. Is `npm run dev` actually running (not stuck)?

**Fix:**
```powershell
# Kill all Node processes
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force

# Clean and reinstall
cd frontend
rm node_modules -Recurse -Force
rm package-lock.json
npm install
npm run dev
```

### Issue 2: "API calls return 403 or 401"

**Check:**
1. Is backend running on port 3001?
2. Is ANTHROPIC_API_KEY set in .env (not empty)?
3. Are you logged in? (Check /login page)

**Fix:**
```powershell
# Check backend is running
curl http://localhost:3001/api/health

# Check .env has API key
type .env | grep ANTHROPIC_API_KEY
```

### Issue 3: "Module not found / import errors"

**Fix:**
```powershell
# Clear cache and reinstall
cd frontend
npm cache clean --force
rm node_modules -Recurse -Force
rm package-lock.json
npm install
npx tsc --noEmit  # Check TypeScript
npm run dev
```

### Issue 4: "Port 3001 or 5173 already in use"

**Fix:**
```powershell
# Kill all Node processes
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force

# Wait 2 seconds, then restart
Start-Sleep -Seconds 2
```

### Issue 5: "Blank page or never loads"

**Check:**
1. Open browser DevTools (F12)
2. Check Console tab for errors
3. Check Network tab—is index.html loading?

**If API calls fail:**
- Verify `/api/health` returns `{"ok":true}`
- Check frontend/.env or vite config proxy settings

---

## Environment Setup

### Required .env (Project Root)

```env
PORT=3001
NODE_ENV=development
JWT_SECRET=<your-secret-key>
ANTHROPIC_API_KEY=sk-ant-api03-<your-real-key>
DEFAULT_MODEL=claude-haiku-4-5-20251001
DATA_DIR=./data
DB_PATH=./data/familyai.db
UPLOADS_DIR=./data/uploads
PII_STRIPPING_ENABLED=true
```

### Dependencies

**Backend requires:**
- TypeScript 5.x
- Express 4.18
- sql.js 1.8.0
- @anthropic-ai/sdk 0.24.3+
- multer, sharp, pdf-parse

**Frontend requires:**
- React 19
- React Router 6.30
- Vite 8.1
- Tailwind CSS 3.4
- TanStack Query 5
- Zustand 4.5

Run `npm install` in both `/backend` and `/frontend` to ensure all are present.

---

## Verification

### Verify Backend

```powershell
# Should return {"ok":true}
curl http://localhost:3001/api/health
```

### Verify Frontend Build

```powershell
cd frontend
npm run build
# Should output: dist/... files
# Should output: ../backend/public/ gets populated
```

### Verify Streaming

```powershell
# Run the Phase 6 verification script
cd frontend
node scripts/verify-phase6.mjs
```

---

## Development Workflow

1. **Start Both Servers** (use start-dev.ps1 or manual steps above)
2. **Open Browser** → http://localhost:5173
3. **Login** with credentials (default: username=admin, password=admin123)
4. **Make changes** → Frontend auto-reloads (HMR), backend needs restart
5. **Test API** → Check DevTools Network tab or curl http://localhost:3001/api/...

---

## Production Build

```powershell
cd frontend
npm run build
# Output: ../backend/public/

# Then start backend (serves static files)
cd ../backend
npm run build  # TypeScript compile
npm start
```

---

## Debugging Tips

### Enable Verbose Logging

**Backend:**
```env
DEBUG=familyai:*
```

**Frontend:**
- Open DevTools (F12)
- Check Console and Network tabs
- Look for red error messages

### Check Database

```powershell
# View database file exists
ls ./data/familyai.db

# Query database (using Node)
node -e "const sql = require('sql.js'); const fs = require('fs'); const filebuffer = fs.readFileSync('./data/familyai.db'); const SQL = await sql.Database; const db = new SQL(new Uint8Array(filebuffer)); console.log(db.exec('SELECT * FROM users LIMIT 1'));"
```

### Monitor Network

**Frontend DevTools:**
- Network tab → Filter by XHR/Fetch
- Check request headers: `Authorization: Bearer <token>`
- Check response status and body

---

## Still Stuck?

### Step-by-Step Recovery

```powershell
# 1. Kill everything
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 2

# 2. Clean both directories
cd backend
rm node_modules -Recurse -Force 2>$null
rm package-lock.json 2>$null
cd ../frontend
rm node_modules -Recurse -Force 2>$null
rm package-lock.json 2>$null
cd ..

# 3. Reinstall everything
cd backend
npm install
cd ../frontend
npm install

# 4. Verify TypeScript
cd frontend
npx tsc --noEmit

# 5. Test backend
cd ../backend
npx tsx src/index.ts &  # Run in background

# 6. Test frontend in new terminal
cd frontend
npm run dev
```

Then open http://localhost:5173 in browser.

---

## Key Files to Know

- **Backend config:** `backend/src/config.ts`
- **Frontend config:** `frontend/vite.config.ts`
- **App routing:** `frontend/src/App.tsx`
- **Environment:** `.env` (project root)
- **Database:** `./data/familyai.db`
- **Uploads:** `./data/uploads/`
- **Built frontend:** `backend/public/` (after `npm run build`)

---

## Quick Reference

| Task | Command |
|------|---------|
| Start backend | `cd backend && npx tsx src/index.ts` |
| Start frontend | `cd frontend && npm run dev` |
| Build frontend | `cd frontend && npm run build` |
| Check types | `cd frontend && npx tsc --noEmit` |
| Run tests | `cd frontend && node scripts/verify-phase6.mjs` |
| Kill stuck processes | `Get-Process node \| Stop-Process -Force` |
| Check backend health | `curl http://localhost:3001/api/health` |

---

## Notes

- **HMR (Hot Module Replacement):** Frontend auto-reloads on file change (dev mode only)
- **API Proxy:** Frontend proxies `/api/*` to `http://localhost:3001` (defined in vite.config.ts)
- **Database:** SQLite file-based (sql.js)—no external DB needed
- **API Key:** Must be valid Anthropic key or streaming will return 401

---

Last updated: 2026-07-05
