# Render Deployment Guide

## ✅ Pre-Deployment Checklist

- [x] All code committed and pushed to GitHub
- [x] Backend builds successfully (npm run build)
- [x] Frontend builds successfully (npm run build)
- [x] TypeScript configuration fixed (vite.d.ts)
- [x] Chat functional on both dev and test machines
- [x] Environment variables documented (.env.example)
- [x] API URL uses VITE_API_BASE_URL environment variable for flexibility

## Backend Deployment (Node.js)

### Step 1: Create Backend Service on Render
1. Go to https://dashboard.render.com
2. Click "New" → "Web Service"
3. Connect your GitHub repository
4. Configure:
   - **Name:** `family-ai-backend`
   - **Environment:** Node
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
   - **Plan:** Standard (or Free if available)

### Step 2: Set Environment Variables
In Render dashboard → family-ai-backend → Environment:

```
NODE_ENV=production
PORT=3001
JWT_SECRET=<generate-random-64-char-string>
ANTHROPIC_API_KEY=<your-actual-key>
DEFAULT_MODEL=claude-haiku-4-5-20251001
ESCALATION_MODEL=claude-sonnet-4-6
PII_STRIPPING_ENABLED=true
MAX_FILE_SIZE_MB=10
```

To generate JWT_SECRET:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Step 3: Configure CORS for Frontend
After frontend URL is known, update backend CORS in `backend/src/config.ts`:
```typescript
CORS_ORIGINS: process.env.NODE_ENV === 'development' 
  ? '*'
  : [
      'https://your-frontend-url.onrender.com',
      'https://your-frontend-url.netlify.app', // if using Netlify
      'http://localhost:3001',
      'http://localhost:5173'
    ],
```

Push this change before deploying frontend.

## Frontend Deployment (Static Site + Backend Proxy)

### Option A: Deploy as Static Site with Render Web Service

Render can serve the frontend + proxy API calls to backend automatically.

1. In `backend` folder, create `render.yaml`:

```yaml
services:
  - type: web
    name: family-ai-backend
    env: node
    buildCommand: npm install && npm run build
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: JWT_SECRET
        generateValue: true
      - key: ANTHROPIC_API_KEY
        sync: false

  - type: static_site
    name: family-ai-frontend
    buildCommand: npm install && npm run build
    staticPublicPath: dist
    envVars:
      - key: VITE_API_BASE_URL
        value: https://family-ai-backend.onrender.com
```

### Option B: Deploy as Separate Static Site (Netlify or Vercel)

If using Netlify:
1. Connect GitHub repository (frontend folder)
2. Set build command: `npm run build`
3. Set publish directory: `dist`
4. Add environment variable:
   - `VITE_API_BASE_URL=https://family-ai-backend.onrender.com/api`

## Post-Deployment Testing

1. **Test Backend Health:**
   ```
   https://family-ai-backend.onrender.com/api/health
   ```
   Should return: `{"status":"ok","timestamp":"..."}`

2. **Test Frontend:**
   - Navigate to frontend URL
   - Login with test credentials
   - Send a chat message
   - Verify message is saved and response comes back

3. **Test Admin Features:**
   - Login as admin
   - Check Admin Dashboard
   - Update app settings
   - Verify settings persist

## Common Issues & Solutions

### 404 on API Calls
- **Cause:** Frontend still using localhost:3001 instead of deployed backend URL
- **Fix:** Set `VITE_API_BASE_URL` environment variable on frontend

### CORS Errors
- **Cause:** Backend CORS_ORIGINS doesn't include frontend URL
- **Fix:** Update `backend/src/config.ts` with correct frontend URL

### Database Connection Errors
- **Cause:** Database file not writable or missing
- **Fix:** Ensure `data/` directory exists and is writable. On Render, use `/tmp` for temporary data or persistent disks for permanent data.

### Timeout on Chat Responses
- **Cause:** API timeout too short for streaming
- **Fix:** Ensure `res.setTimeout(300000)` is set in messages.ts (5 minutes)

## Monitoring

After deployment:
1. Check Render logs for errors: Dashboard → Logs
2. Monitor token usage in Claude API console
3. Set up error tracking (Sentry integration optional)
4. Test production URLs daily

## Rollback Plan

If deployment fails:
1. All changes committed with reversible git tag
2. Previous build still available in Render dashboard
3. Can redeploy previous version in seconds
