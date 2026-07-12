# Frontend Deployment Guide - Render or Netlify

## Prerequisites

✅ Backend deployed and running at: `https://family-ai-backend-xxxxx.onrender.com`

---

## Option A: Deploy to Render as Node.js Service (RECOMMENDED)

Render can serve both the built frontend and proxy API calls to the backend.

### Step 1: Create Frontend Web Service on Render

1. Go to Render Dashboard → "My project" → "+ New"
2. Select "Web Service"
3. Connect GitHub repository (gunj79-ai/family-ai-app)
4. Fill in:
   - **Name:** `family-ai-frontend`
   - **Root Directory:** `frontend`
   - **Environment:** Node
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm run preview`
   - **Plan:** Free

### Step 2: Add Environment Variable

1. After creating the service, go to "Environment"
2. Click "Add Environment Variable"
   - **Key:** `VITE_API_BASE_URL`
   - **Value:** `https://family-ai-backend-xxxxx.onrender.com` (replace xxxxx)
3. Save

### Step 3: Wait for Deployment

- Go to "Deploys" tab
- Wait for "Live" status
- Your frontend URL will appear: `https://family-ai-frontend-xxxxx.onrender.com`

### Step 4: Test

1. Navigate to: `https://family-ai-frontend-xxxxx.onrender.com`
2. Login with test credentials
3. Send a chat message
4. Verify everything works

---

## Option B: Deploy to Netlify (Alternative)

Netlify can serve the built frontend and proxy API calls.

### Step 1: Build Locally

```bash
cd c:\App-Projects\Family AI Spec\frontend
npm run build
```

This creates the `dist/` folder ready to deploy.

### Step 2: Connect to Netlify

1. Go to https://netlify.com
2. Login with GitHub
3. Click "Add new site" → "Import an existing project"
4. Connect gunj79-ai/family-ai-app repository
5. Configure:
   - **Base directory:** `frontend`
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
   - **Environment variable:**
     - Key: `VITE_API_BASE_URL`
     - Value: `https://family-ai-backend-xxxxx.onrender.com`

### Step 3: Deploy

Click "Deploy site" and wait for build to complete.

---

## Option C: Deploy as Static Site to Vercel

Similar to Netlify, but on Vercel platform.

### Step 1: Connect Repository

1. Go to https://vercel.com
2. Login with GitHub
3. Import gunj79-ai/family-ai-app project
4. Configure:
   - **Framework:** Vite
   - **Root Directory:** `frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`

### Step 2: Add Environment Variable

In Project Settings → Environment Variables:
- Key: `VITE_API_BASE_URL`
- Value: `https://family-ai-backend-xxxxx.onrender.com`

### Step 3: Deploy

Click "Deploy" and wait for completion.

---

## Testing After Deployment

### Test 1: Page Loads
```
Navigate to your frontend URL
Should see login page with Eva avatar
```

### Test 2: Login
```
Email: admin (or any test user)
Password: (from your database)
Should see dashboard
```

### Test 3: Chat Works
```
Click "Create Chat"
Type a question
Click Send
Should stream response from Claude
```

### Test 4: Admin Features
```
Login as admin user
Go to Admin Dashboard
Check app settings, user management
Should all work
```

---

## Troubleshooting

### API calls return 404
- **Problem:** Frontend still pointing to wrong backend
- **Fix:** Check VITE_API_BASE_URL environment variable is set correctly
- **Test:** Open DevTools → Network → send message → check if POST goes to correct URL

### Chat sends but no response
- **Problem:** Backend not receiving request or timing out
- **Fix:** Check backend logs in Render Dashboard
- **Test:** `curl https://backend-url/api/health` should return status OK

### Page shows old version
- **Problem:** Browser cache or CDN cache
- **Fix:** Hard refresh (Ctrl+Shift+R) or clear browser cache
- **For CDN:** Netlify/Vercel have cache purge options in dashboard

### Timeout on chat responses
- **Problem:** Backend request taking too long
- **Fix:** Increase timeout in client (frontend/src/api/client.ts has 30s timeout, should be fine)
- **Verify:** Backend logs show request is being processed

---

## Post-Deployment Checklist

- [ ] Backend deployed and health check passes
- [ ] Frontend deployed and loads login page
- [ ] Can login with test credentials
- [ ] Can send chat message and get response
- [ ] Admin dashboard is accessible (if admin user)
- [ ] Can update admin settings (app name, color, etc.)
- [ ] User creation works (create new test user)
- [ ] Chat history persists across sessions

---

## Production URL

Once confirmed working:

**Share with family:**
- Frontend URL (Render/Netlify/Vercel)
- Test login credentials
- Instructions for use

All data will persist in the Render-hosted database. Backups happen automatically at 2am and 2pm UTC.
