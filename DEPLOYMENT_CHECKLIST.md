# 🚀 DEPLOYMENT CHECKLIST - GitHub → Render

## ⚠️ PRE-DEPLOYMENT VERIFICATION (DO FIRST)

### Step 1: Verify Frontend Build & Assets
**Goal:** Ensure eva-avatar.png and all assets are in production build
```
□ Delete c:\App-Projects\Family AI Spec\backend\public\ (old build)
□ Run: npm run build (in frontend folder)
□ Check: backend\public\assets\ folder contains eva-avatar-*.png
□ Expected: Should see file like eva-avatar-CzfVurMF.png (size ~5-6KB)
```

### Step 2: Verify Backend Environment Variables
**File:** `c:\App-Projects\Family AI Spec\backend\.env`
```
□ NODE_ENV=production
□ PORT=3001
□ DATABASE_URL=sqlite:./familyai.db (or absolute path)
□ SESSION_SECRET=your-secret-key
□ ANTHROPIC_API_KEY=your-key
```

### Step 3: Test Locally (Both Servers Running)
```
□ Terminal 1: cd backend && npm start → runs on http://localhost:3001
□ Terminal 2: cd frontend && npm run dev → runs on http://localhost:5173
□ Open browser: http://localhost:5173
□ Check: Eva avatar visible in sidebar header
□ Check: All pages work (Chat, Admin, Settings)
□ Check: Can log in, create chat, use admin panel
```

### Step 4: Build Production Bundle
```
□ Frontend build: cd frontend && npm run build
□ Check build output: zero TypeScript errors
□ Verify: dist/ folder exists (or backend/public/ contains built files)
```

---

## 📦 GITHUB SETUP

### Step 5: Create GitHub Repository
```
Option A: Single Mono Repo (Recommended for simplicity)
□ Create repo: family-ai-app
□ Structure:
  family-ai-app/
  ├── frontend/
  ├── backend/
  ├── .gitignore
  └── README.md

Option B: Two Separate Repos
□ Create: family-ai-frontend
□ Create: family-ai-backend
```

### Step 6: Create .gitignore
**Frontend .gitignore:**
```
node_modules/
dist/
.env
.env.local
.DS_Store
```

**Backend .gitignore:**
```
node_modules/
.env
.env.local
familyai.db
familyai.db-*.backup
logs/
.DS_Store
```

### Step 7: Create Environment Templates
**frontend/.env.example:**
```
VITE_API_URL=http://localhost:3001
# For production: VITE_API_URL=https://your-backend-url.onrender.com
```

**backend/.env.example:**
```
NODE_ENV=development
PORT=3001
ANTHROPIC_API_KEY=your-anthropic-key-here
SESSION_SECRET=change-this-in-production
DATABASE_URL=sqlite:./familyai.db
```

### Step 8: Initial GitHub Commit
```
□ Initialize git: git init
□ Add remote: git remote add origin https://github.com/YOUR-USERNAME/family-ai-app.git
□ Add files: git add .
□ Commit: git commit -m "Initial commit: Family AI with Eva avatar"
□ Push: git push -u origin main
```

---

## 🚀 RENDER DEPLOYMENT

### Step 9: Deploy Backend to Render

**A. Create Render Account**
```
□ Go to https://render.com
□ Sign up with GitHub
```

**B. Deploy Backend Service**
```
□ Dashboard → New +  → Web Service
□ Connect GitHub repo
□ Settings:
  - Name: family-ai-backend
  - Environment: Node
  - Region: US (or your region)
  - Build Command: npm install
  - Start Command: npm start
  
□ Environment Variables (Add each):
  - NODE_ENV: production
  - PORT: 3001
  - ANTHROPIC_API_KEY: (paste your key)
  - SESSION_SECRET: (generate random string, e.g., 32 chars)
  - DATABASE_URL: sqlite:./familyai.db

□ Click Deploy
□ Wait for build complete (3-5 minutes)
□ Note the URL: https://family-ai-backend-xxxx.onrender.com
```

### Step 10: Deploy Frontend to Render

**Option A: Build and Serve with Node.js (Recommended)**
```
□ New Web Service
□ Connect GitHub repo (same one)
□ Settings:
  - Name: family-ai-frontend
  - Root Directory: frontend
  - Build Command: npm run build
  - Start Command: npm run preview
  
□ Environment Variables:
  - VITE_API_URL: https://family-ai-backend-xxxx.onrender.com
  
□ Click Deploy
□ Wait for build
□ Note URL: https://family-ai-frontend-xxxx.onrender.com
```

**Option B: Deploy as Static Site (Faster, No Backend Calls)**
```
If you only want to serve static files:
□ Use Render Static Site
□ Build: npm run build (in frontend)
□ Publish Directory: frontend/dist
□ Note: Frontend API calls must use correct backend URL
```

---

## ✅ POST-DEPLOYMENT TESTING

### Step 11: Verify Live App
```
□ Open: https://family-ai-frontend-xxxx.onrender.com
□ Check: Page loads without errors
□ Check: Eva avatar visible in sidebar
□ Check: Can log in (use admin/admin)
□ Check: Can create new chat
□ Check: Can access Admin Dashboard
□ Check: Can view Settings page
□ Test on Mobile: Use iPhone/Android browser
```

### Step 12: Check Console & Network Errors
```
□ Open DevTools (F12)
□ Go to Console tab: No red errors
□ Go to Network tab: Check all requests successful (200/201 status)
□ Check eva-avatar image loads (Network tab, look for .png)
```

### Step 13: Verify Admin Panel
```
□ Log in as admin
□ Admin Dashboard → App Settings tab
□ Change app name, save
□ Refresh page: Changes persist
□ Check Primary Color picker works
```

---

## 🔗 CONNECTING FRONTEND TO BACKEND

**Critical:** Update frontend API URL for production

**File:** `frontend/src/api/client.ts`

Check the baseURL is using environment variable:
```typescript
const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
```

**Before deploying frontend, set:**
```
VITE_API_URL=https://family-ai-backend-xxxx.onrender.com
```

---

## 🐛 TROUBLESHOOTING

| Problem | Solution |
|---------|----------|
| Eva avatar not showing | Check DevTools → Network tab, look for eva-avatar-*.png request, verify it returns 200 |
| "Cannot reach backend" | Verify VITE_API_URL in frontend environment matches actual backend URL |
| Login fails | Check backend logs on Render: Dashboard → Service → Logs |
| Dark theme not working | Check localStorage, may need cache clear (Ctrl+Shift+Del) |
| Pages not loading | Check browser console for JavaScript errors |

---

## ⚡ AFTER LIVE DEPLOYMENT

```
□ Share URL with users/kids
□ Monitor Render dashboard for errors
□ Set up email alerts on Render for failures
□ Keep .env.example updated (but NEVER commit real .env)
□ Document any issues users report
```

---

**Total Time Estimate:** 15-20 minutes
**Difficulty:** Medium (mostly copy-paste, patience for Render builds)
