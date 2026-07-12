# Quick Reference - What to Fill in Render Form

## RIGHT NOW - Complete the Backend Form in Render Dashboard

You're on the "New Web Service" page. Fill these fields:

### ✅ Already Done
- [x] Name: `family-ai-backend`
- [x] Repository: `gunj79-ai/family-ai-app`
- [x] Language: `Node`
- [x] Branch: `main`

### 🔴 Still Need to Do

**Root Directory:**
```
backend
```

**Build Command:**
```
npm install && npm run build
```

**Start Command:**
```
npm start
```

**Instance Type:** Select `Free` (or `Standard` for better performance)

### Then Click: "Create Web Service"

---

## After Backend is Created

### Step 1: Add Environment Variables

1. Backend service → "Environment" in sidebar
2. Add each variable:

```
NODE_ENV = production
PORT = 3001
JWT_SECRET = (generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
ANTHROPIC_API_KEY = sk-ant-... (your key from Anthropic console)
DEFAULT_MODEL = claude-haiku-4-5-20251001
ESCALATION_MODEL = claude-sonnet-4-6
PII_STRIPPING_ENABLED = true
MAX_FILE_SIZE_MB = 10
```

### Step 2: Deploy Backend

- Click "Deploy"
- Wait for "Live" status
- Note your backend URL (e.g., `https://family-ai-backend-xxxxx.onrender.com`)

### Step 3: Deploy Frontend

- Create new web service
- Root Directory: `frontend`
- Build: `npm install && npm run build`
- Start: `npm run preview`
- Environment Variable:
  ```
  VITE_API_BASE_URL = https://family-ai-backend-xxxxx.onrender.com
  ```

### Step 4: Test

- Open frontend URL
- Login
- Send chat message
- Verify response appears

---

## If Something Goes Wrong

### Backend won't deploy
- Check "Build" tab for errors
- Common issue: Root Directory should be `backend/` not `/backend/` or blank
- If it says "Cannot GET /api/health", root directory is wrong

### Frontend won't deploy
- Check "Build" tab for errors
- Make sure VITE_API_BASE_URL is set correctly (without trailing slash)
- Hard refresh browser (Ctrl+Shift+R) after deployment

### Chat doesn't work
- Check browser DevTools → Network tab
- POST request should go to backend URL (not frontend URL)
- If going to wrong URL, VITE_API_BASE_URL not set correctly

---

## URLs You'll Need

```
Backend Health Check:
https://family-ai-backend-xxxxx.onrender.com/api/health

Frontend:
https://family-ai-frontend-xxxxx.onrender.com

GitHub Repo:
https://github.com/gunj79-ai/family-ai-app
```

Replace `xxxxx` with your actual Render service IDs (they'll be visible in the dashboard).
