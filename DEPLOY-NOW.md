# 🚀 DEPLOY TO PRODUCTION - QUICK GUIDE

## ✅ Pre-Flight Check (DONE)
- [x] Code pushed to GitHub: `gunj79-ai/family-ai-app`
- [x] All stability fixes committed
- [x] Password management working
- [x] iOS fixes applied
- [x] Error boundaries added
- [x] Rate limiting configured

## 🎯 DEPLOYMENT OPTIONS

### Option 1: Render.com (Recommended - Easiest)

#### Step 1: Create Render Account
1. Go to https://render.com
2. Sign up with GitHub
3. Connect your repository: `gunj79-ai/family-ai-app`

#### Step 2: Deploy via render.yaml (Automatic)
1. Render will detect `render.yaml` in your repo
2. Click "Apply" to create both services automatically:
   - `family-ai-backend` (Node.js web service)
   - `family-ai-frontend` (Static site)

#### Step 3: Set Environment Variables
**Backend service** needs:
```
ANTHROPIC_API_KEY=<your-actual-anthropic-key>
```
All other variables are auto-configured in render.yaml

#### Step 4: Wait for Deploy
- Backend: ~3-5 minutes
- Frontend: ~2-3 minutes
- Total: ~5-8 minutes

#### Step 5: Get Your URLs
After deployment completes:
- **Backend**: `https://family-ai-backend.onrender.com`
- **Frontend**: `https://family-ai-frontend.onrender.com`

#### Step 6: Update CORS (If Needed)
If you get CORS errors, update `backend/src/config.ts`:
```typescript
CORS_ORIGINS: process.env.NODE_ENV === 'production'
  ? ['https://family-ai-frontend.onrender.com']
  : '*'
```
Then commit and push to redeploy.

---

### Option 2: Manual Render Setup (If render.yaml doesn't work)

#### Backend Deployment
1. Render Dashboard → "New" → "Web Service"
2. Connect GitHub repo: `gunj79-ai/family-ai-app`
3. Settings:
   - **Name**: `family-ai-backend`
   - **Root Directory**: `backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Plan**: Starter ($7/mo) or Free

4. Environment Variables:
   ```
   NODE_ENV=production
   PORT=3001
   JWT_SECRET=<generate-with-openssl-rand-hex-32>
   ANTHROPIC_API_KEY=<your-key>
   DEFAULT_MODEL=claude-haiku-4-5-20251001
   ESCALATION_MODEL=claude-sonnet-4-6
   PII_STRIPPING_ENABLED=true
   MAX_FILE_SIZE_MB=10
   ```

5. Add Disk:
   - Name: `family-ai-data`
   - Mount Path: `/opt/render/project/src/data`
   - Size: 1 GB

6. Click "Create Web Service"

#### Frontend Deployment
1. Render Dashboard → "New" → "Static Site"
2. Connect same GitHub repo
3. Settings:
   - **Name**: `family-ai-frontend`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`

4. Environment Variables:
   ```
   VITE_API_BASE_URL=https://family-ai-backend.onrender.com
   ```

5. Click "Create Static Site"

---

### Option 3: Vercel + Render (Alternative)

#### Backend: Render (Same as above)
Follow backend deployment steps from Option 2

#### Frontend: Vercel
1. Go to https://vercel.com
2. Import project from GitHub
3. Framework: Vite
4. Root Directory: `frontend`
5. Build Command: `npm run build`
6. Output Directory: `dist`
7. Environment Variables:
   ```
   VITE_API_BASE_URL=https://family-ai-backend.onrender.com
   ```
8. Click "Deploy"

**URL**: `https://family-ai-app.vercel.app`

---

## 📝 POST-DEPLOYMENT CHECKLIST

### 1. Test Backend Health
```bash
curl https://family-ai-backend.onrender.com/api/health
# Should return: {"status":"ok","timestamp":"..."}
```

### 2. Test Frontend
1. Open: `https://family-ai-frontend.onrender.com`
2. Check:
   - [ ] Page loads (no white screen)
   - [ ] Eva avatar shows
   - [ ] Can navigate to login page
   - [ ] Can log in with admin/admin123
   - [ ] Chat page loads
   - [ ] Can type in message input
   - [ ] Admin dashboard accessible
   - [ ] Password reset works

### 3. Test on Mobile
1. Open frontend URL on iPhone
2. Check:
   - [ ] No continuous refresh
   - [ ] Input works (can type)
   - [ ] Buttons respond
   - [ ] No zoom on input focus

### 4. Set Up Custom Domain (Optional)
1. Buy domain (e.g., familyai.app)
2. Render → Settings → Custom Domain
3. Add domain and follow DNS instructions
4. Update CORS_ORIGINS to include custom domain

---

## 🔧 TROUBLESHOOTING

### Build Fails
**Backend:**
```bash
# Check TypeScript errors locally first
cd backend
npm run build
```

**Frontend:**
```bash
# Check build locally
cd frontend
npm run build
```

### CORS Errors
Update `backend/src/config.ts`:
```typescript
CORS_ORIGINS: [
  'https://family-ai-frontend.onrender.com',
  'https://your-custom-domain.com',
  'http://localhost:5173' // for testing
]
```

### Database Not Persisting
- Make sure disk is attached to backend service
- Check mount path matches DB_PATH environment variable
- Verify disk has enough space

### Frontend Can't Connect to Backend
1. Check VITE_API_BASE_URL is correct
2. Verify backend health endpoint works
3. Check browser console for errors
4. Verify CORS configuration

---

## 🎉 SUCCESS!

Once deployed, you'll have:
- ✅ **Backend API**: Running on Render with persistent database
- ✅ **Frontend App**: Static site with all features
- ✅ **Custom URLs**: Clean production URLs
- ✅ **Auto-deploys**: Every git push triggers new deployment
- ✅ **SSL/HTTPS**: Automatic certificates
- ✅ **Monitoring**: Render dashboard shows logs and metrics

**Your family can now access the app from anywhere!** 🚀

---

## 💰 PRICING (Render)

### Free Tier (Limited)
- Backend: Free tier available (sleeps after 15 min inactivity)
- Frontend: Static sites are FREE
- Database: 512MB free disk
- **Total**: $0/month (but backend will be slow due to cold starts)

### Starter Tier (Recommended)
- Backend: $7/month (always-on, no cold starts)
- Frontend: FREE
- Database: 1GB disk included
- **Total**: $7/month

### Production Tier
- Backend: $25/month (more resources)
- Frontend: FREE
- Database: 10GB disk ($0.25/GB)
- **Total**: ~$27/month

---

## 📞 SUPPORT

If deployment fails:
1. Check Render logs: Dashboard → Service → Logs
2. Check browser console: F12 → Console tab
3. Verify environment variables are set correctly
4. Make sure Anthropic API key is valid
5. Check GitHub Actions didn't block the push

**Need help?** Check logs first, they usually show the exact error!
