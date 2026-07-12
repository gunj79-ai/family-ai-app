# Render Environment Variables - Copy & Paste

## Backend Service (family-ai-backend)

Copy-paste these into Render Dashboard → family-ai-backend → Environment:

```
NODE_ENV=production
PORT=3001
JWT_SECRET=YOUR_RANDOM_64_CHAR_STRING_HERE
JWT_EXPIRY=7d
ANTHROPIC_API_KEY=sk-ant-YOUR_ACTUAL_KEY_HERE
DEFAULT_MODEL=claude-haiku-4-5-20251001
ESCALATION_MODEL=claude-sonnet-4-6
PII_STRIPPING_ENABLED=true
MAX_FILE_SIZE_MB=10
```

### How to Generate JWT_SECRET

Run this in a terminal:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output and replace `YOUR_RANDOM_64_CHAR_STRING_HERE` above.

### How to Get ANTHROPIC_API_KEY

1. Go to https://console.anthropic.com/
2. Sign in with your Anthropic account
3. Navigate to API Keys
4. Create or copy your API key
5. Replace `sk-ant-YOUR_ACTUAL_KEY_HERE` above

---

## Frontend Service (Deploy After Backend)

After backend is deployed and you have the backend URL (e.g., `family-ai-backend-xxxxx.onrender.com`):

### Option 1: Deploy as Static Site to Netlify/Vercel

**Environment Variable:**
```
VITE_API_BASE_URL=https://family-ai-backend-xxxxx.onrender.com
```

Replace `xxxxx` with your actual Render backend ID.

### Option 2: Deploy as Node.js Web Service on Render

Same environment variable as above:
```
VITE_API_BASE_URL=https://family-ai-backend-xxxxx.onrender.com
```

---

## Setup Steps in Render Dashboard

### Step 1: Add Backend Environment Variables

1. Go to Render Dashboard → family-ai-backend
2. Click "Environment" in the sidebar
3. Click "Add Environment Variable"
4. For each line in the backend list above:
   - **Key:** (the part before `=`)
   - **Value:** (the part after `=`)
5. Click "Save"

### Step 2: Wait for Backend Deployment

1. Go to "Deploys" tab
2. Wait for deployment to complete (status changes to "Live")
3. You'll see a URL like: `https://family-ai-backend-xxxxx.onrender.com`
4. Copy this URL - you'll need it for the frontend

### Step 3: Deploy Frontend

See FRONTEND_DEPLOYMENT.md for detailed steps

---

## Testing Backend After Deployment

Once deployed, test the health endpoint:

```
https://family-ai-backend-xxxxx.onrender.com/api/health
```

You should see:
```json
{"status":"ok","timestamp":"2026-07-12T..."}
```

If you see `Cannot GET /api/health`, the backend root directory is wrong (should be `backend/`, not empty).
