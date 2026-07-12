# FamilyAI — Quick Start Guide

Get the development environment running in 5 minutes.

---

## Prerequisites (5 minutes)

### 1. Install Node.js 20+

Download from https://nodejs.org (includes npm)

Verify:
```powershell
node --version      # Should be v20+
npm --version       # Should be v10+
```

### 2. Set up .env file

In project root, create `.env`:

```env
PORT=3001
NODE_ENV=development
JWT_SECRET=dev-secret-key-change-in-production
ANTHROPIC_API_KEY=sk-ant-api03-<YOUR-REAL-KEY>
DEFAULT_MODEL=claude-haiku-4-5-20251001
DATA_DIR=./data
DB_PATH=./data/familyai.db
UPLOADS_DIR=./data/uploads
PII_STRIPPING_ENABLED=true
```

**Get your API key:** https://console.anthropic.com (Anthropic account required)

### 3. Done! ✓

---

## Start Development (1 command)

### Automatic (Recommended)

```powershell
.\start-dev.ps1
```

That's it! Wait ~10 seconds, then open:

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:3001

### Manual (2 terminals)

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

## Login

Use default credentials:
- **Username:** admin
- **Password:** admin123

---

## Development Workflow

### Edit Frontend Code (src/ files)

1. Make changes
2. **Auto-reloads** in browser (HMR enabled)
3. Check DevTools Console (F12) for errors

### Edit Backend Code (src/ files)

1. Make changes
2. **Stop backend** (Ctrl+C)
3. **Restart backend**
4. Refresh browser

### Common Tasks

| Task | Command |
|------|---------|
| Check TypeScript errors | `cd frontend && npx tsc --noEmit` |
| Build for production | `cd frontend && npm run build` |
| Verify environment | `.\verify-env.ps1` |
| Reset everything | `.\verify-env.ps1 -Fix` |

---

## Troubleshooting

### "localhost:5173 won't load"

```powershell
# Kill stuck processes and restart
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 2
.\start-dev.ps1
```

### "Port 3001/5173 already in use"

```powershell
# Kill all Node processes
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force

# Wait and restart
Start-Sleep -Seconds 2
.\start-dev.ps1
```

### "API calls return 401"

Check your `.env` has a valid ANTHROPIC_API_KEY (not placeholder).

### More issues?

See **TROUBLESHOOTING.md** for detailed solutions.

---

## Project Structure

```
.
├── backend/                 # Node.js + Express API
│   ├── src/
│   │   ├── index.ts        # Main server
│   │   ├── config.ts       # Configuration
│   │   ├── routes/         # API endpoints
│   │   ├── services/       # Business logic (Claude, PII, etc.)
│   │   ├── middleware/     # Auth, logging, etc.
│   │   └── types/          # TypeScript types
│   ├── data/               # Database & uploads
│   └── package.json
│
├── frontend/                # React + Vite
│   ├── src/
│   │   ├── main.tsx        # Entry point
│   │   ├── App.tsx         # Main component
│   │   ├── pages/          # Page components
│   │   ├── components/     # Reusable components
│   │   ├── hooks/          # React hooks
│   │   ├── store/          # Zustand stores (state management)
│   │   ├── api/            # API clients
│   │   ├── types/          # TypeScript types
│   │   └── utils/          # Utilities
│   ├── public/             # Static assets
│   └── package.json
│
├── .env                     # Configuration (add to .gitignore!)
├── STARTUP_GUIDE.md        # Detailed setup guide
├── TROUBLESHOOTING.md      # Common issues & fixes
├── start-dev.ps1           # PowerShell startup script
├── start-dev.sh            # Bash startup script
└── verify-env.ps1          # Environment verification
```

---

## Key Features

✓ **Real-time chat** with Claude via SSE streaming  
✓ **PII protection** — redacts sensitive data before Claude sees it  
✓ **File uploads** — attach PDFs, images, text documents  
✓ **Prompt caching** — reduces API calls for repeated context  
✓ **Activity logging** — audit trail of all changes  
✓ **Role-based access** — admin and user roles  
✓ **Responsive UI** — works on desktop and mobile  

---

## Architecture Highlights

### Backend

- **Express** — REST API server
- **SQLite** (sql.js) — File-based database
- **TypeScript** — Type-safe code
- **Anthropic SDK** — Claude AI integration
- **SSE Streaming** — Real-time responses
- **JWT Auth** — Stateless authentication

### Frontend

- **React 19** — UI framework
- **Vite** — Fast dev server & builder
- **TanStack Query** — Server state management
- **Zustand** — Client state management
- **Tailwind CSS** — Styling
- **TypeScript** — Type safety

---

## API Endpoints

### Health Check

```bash
GET http://localhost:3001/api/health
# Returns: {"ok":true}
```

### Authentication

```bash
POST /api/auth/login
POST /api/auth/logout
POST /api/auth/register
GET  /api/auth/me
```

### Chats & Messages

```bash
GET    /api/chats
POST   /api/chats
GET    /api/chats/:id
POST   /api/chats/:id/messages     # Streaming endpoint
GET    /api/chats/:id/messages
```

### Files & Attachments

```bash
POST   /api/attachments/upload
GET    /api/attachments/:id
DELETE /api/attachments/:id
```

---

## Performance Tips

1. **Frontend build time** — Usually 5-10 seconds
2. **Backend startup** — Usually 2-3 seconds
3. **First chat load** — Usually 1-2 seconds
4. **API streaming** — Chunks arrive in real-time

If slow, check:
- CPU/RAM usage (open Task Manager)
- Disk space (need at least 1GB free)
- Network latency (test curl to localhost)

---

## Code Examples

### Create a Chat

```typescript
const response = await fetch('http://localhost:3001/api/chats', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({ title: 'My Chat' })
});

const chat = await response.json();
console.log(chat.id); // Use for sending messages
```

### Send a Message (Streaming)

```typescript
const response = await fetch(`http://localhost:3001/api/chats/${chatId}/messages`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    content: 'Hello Claude!',
    attachmentIds: [] // Optional file IDs
  })
});

// Read SSE stream
const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  
  const text = decoder.decode(value);
  const lines = text.split('\n');
  
  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const event = JSON.parse(line.slice(6));
      console.log(event); // { type: 'chunk', content: '...' }
    }
  }
}
```

---

## Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | `3001` | Backend server port |
| `NODE_ENV` | No | `development` | Environment mode |
| `JWT_SECRET` | Yes | — | Secret for signing JWTs |
| `ANTHROPIC_API_KEY` | Yes | — | Claude API key from console.anthropic.com |
| `DEFAULT_MODEL` | No | `claude-haiku-4-5-20251001` | Which Claude model to use |
| `DATA_DIR` | No | `./data` | Directory for database/uploads |
| `DB_PATH` | No | `./data/familyai.db` | SQLite database file path |
| `UPLOADS_DIR` | No | `./data/uploads` | Directory for uploaded files |
| `PII_STRIPPING_ENABLED` | No | `true` | Enable PII redaction |

---

## Next Steps

1. ✓ Follow prerequisites above
2. ✓ Run `.\start-dev.ps1`
3. ✓ Open http://localhost:5173
4. ✓ Login with admin/admin123
5. ✓ Create a chat and test streaming

**Need help?** → See TROUBLESHOOTING.md or STARTUP_GUIDE.md

---

**Happy coding! 🚀**

For questions or issues, refer to:
- **Detailed setup:** STARTUP_GUIDE.md
- **Troubleshooting:** TROUBLESHOOTING.md
- **Environment check:** `.\verify-env.ps1`
