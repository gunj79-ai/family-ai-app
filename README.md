# FamilyAI

Private family AI assistant built on Claude API.
Multi-user, parental controls, admin visibility, PWA installable.

## Quick Start

### Prerequisites
- Node.js 20+
- An Anthropic API key (console.anthropic.com)

### Setup

```bash
# Clone the repo
git clone https://github.com/YOUR_USERNAME/familyai.git
cd familyai

# Install dependencies
npm install
cd backend && npm install
cd ../frontend && npm install

# Configure environment
cp .env.example .env
# Edit .env — add your ANTHROPIC_API_KEY and set a strong JWT_SECRET
# Generate JWT_SECRET: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Initialize database + generate icons
cd backend
npm run db:seed
npx tsx scripts/generate-icons.ts

# Build frontend
cd ../frontend
npm run build
```

### Start the server

```bash
# From project root
./start.bat  # Windows
# Or manually:
cd backend && npx tsx src/index.ts
```

Open http://localhost:3001 — first run shows setup wizard.

Login with default credentials:
- **Username:** admin
- **Password:** admin123

⚠️ **IMPORTANT:** Change the admin password immediately in Settings → Change Password

## Architecture

- **Backend:** Node.js + Express + TypeScript + SQLite (sql.js)
- **Frontend:** React 18 + TypeScript + Vite + Tailwind CSS
- **AI:** Anthropic Claude API (Haiku 4.5 by default)
- **Auth:** JWT + scrypt password hashing
- **Privacy:** PII stripping on all API calls, prompt caching for efficiency

## Key Features

### User Management
- Multiple family members with role-based access (admin, teen, adult)
- Age-aware communication — Eva adapts her responses to the user's age
- User profiles with custom settings

### Parental Controls
6 rule types to customize child safety:
- **Access Hours:** Restrict when the app can be used (e.g., 7 AM to 10 PM)
- **Daily Message Limit:** Max messages per calendar day
- **Daily Usage Budget:** Max tokens (computation units) per day (~4 tokens per message)
- **Keyword Blocking:** Block conversations containing specific words
- **Topic Blocking:** Block conversations about certain topics
- **AI Content Filter:** Custom content safety rules (profanity, violence, etc.)

### Eva — Your Family AI Assistant
- **Age-Aware:** Talks to a 6-year-old differently than a 16-year-old
- **Customizable:** Each family can customize her character and guidelines
- **Visual:** Beautiful SVG avatar
- **Safe:** Automatically strips personally identifiable information (PII) from all conversations

### Admin Dashboard
- View all chats, messages, and activity logs
- See flagged content and apply moderation
- Monitor token usage and costs
- Manage users and their parental control rules
- Manual database backups

### Multi-Device
- Works on Windows, macOS, Linux (desktop)
- iOS (Safari → Add to Home Screen)
- Android (Chrome install banner)
- Responsive design for phones and tablets

## Remote Access

### Home Network Only (Simplest)
Kids on the same home WiFi:
```
1. Find server IP: ipconfig | findstr IPv4  (e.g., 192.168.1.42)
2. Kids open: http://192.168.1.42:3001
```

Reserve the IP in your router to keep it stable, or add to kids' hosts files for a friendly name.

### Anywhere Access (Tailscale VPN)
Kids at school, grandma's house, anywhere:
```
1. Install Tailscale on all devices: tailscale.com/download
2. Run once: tailscale serve https / http://localhost:3001
3. Kids visit: https://[your-machine].ts.net
```
Data stays peer-to-peer encrypted — never touches Tailscale servers.

### Internet (No VPN)
Using Cloudflare Tunnel for public HTTPS (optional):
```
# Install cloudflared and authenticate
cloudflared login
cloudflared tunnel create familyai
cloudflared tunnel route dns familyai ai.yourdomain.com
```
Then add to .github Actions for auto-deployment.

## Project Structure

```
familyai/
├── backend/
│   ├── src/
│   │   ├── database/        # SQLite schema, migrations, seed
│   │   ├── routes/          # Express endpoints (auth, chats, projects, etc.)
│   │   ├── middleware/      # Auth, rate limiting, activity logging
│   │   ├── services/        # Claude API, PII stripping, backups, Eva
│   │   ├── utils/           # Crypto (JWT, scrypt), markdown parsing
│   │   ├── types/           # TypeScript interfaces
│   │   └── index.ts         # Express app setup
│   ├── scripts/             # DB migrations, icon generation
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── pages/           # Login, Chat, Projects, Settings, Admin
│   │   ├── components/      # Reusable UI (buttons, inputs, modals, etc.)
│   │   ├── hooks/           # useAuth, useChat, useToast, etc.
│   │   ├── api/             # Fetch wrappers for backend
│   │   ├── App.tsx          # Main router
│   │   └── main.tsx         # Entry point
│   └── package.json
├── data/                    # SQLite DB, backups, uploads (gitignored)
├── .env.example             # Environment template (commit this)
├── .env                     # Your secrets (NEVER commit)
├── .gitignore
└── start.bat / start.sh     # Quick-start scripts
```

## Security

✅ **Implemented:**
- **Rate limiting** — 20 login attempts per 15 min, 300 API calls per minute
- **Input validation** — message max 20,000 chars, project name max 100 chars
- **Path traversal protection** — file serving validated
- **JWT enforcement** — 64-char secret required at startup
- **Request size limits** — max 1MB JSON to prevent DoS
- **Helmet** — HTTP security headers (CSP, HSTS, etc.)
- **PII stripping** — automatic redaction before sending to Claude
- **Database backups** — automated daily (2am, 2pm UTC), keep 7 days

⚠️ **Before external access:**
1. Change admin password from default `admin123`
2. Generate a strong JWT_SECRET (64+ random chars)
3. Set ANTHROPIC_API_KEY to your real Anthropic API key
4. Use HTTPS (Tailscale, Cloudflare Tunnel, or local only)

## Development

### Start dev servers (with hot reload)
```bash
# Terminal 1: Backend
cd backend && npm run dev  # or: npx tsx src/index.ts

# Terminal 2: Frontend
cd frontend && npm run dev  # Vite dev server on :5173
```

### Build for production
```bash
# Frontend
cd frontend && npm run build  # outputs to backend/public/

# Backend (if needed)
cd backend && npm run build   # outputs to backend/dist/
```

### Run verification
```bash
npm run verify:phase11
```

## Deployment

### Docker (Recommended for production)
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY . .
RUN npm install && cd backend && npm install && cd ../frontend && npm run build
EXPOSE 3001
CMD ["node", "backend/dist/index.js"]
```

### Cloudflare Workers (Serverless, but requires backend refactor)
Not currently supported. Backend needs persistent SQLite file.

### Traditional VPS
1. Copy repo to server
2. Install Node.js 20+
3. Set environment variables (.env)
4. Run: `npm install && node backend/dist/index.js`
5. Use systemd/PM2 to keep it running
6. Nginx as reverse proxy with Let's Encrypt SSL

## Environment Variables

See `.env.example` for full list. Critical ones:

```
# Required for startup
JWT_SECRET=64-char-random-string
ANTHROPIC_API_KEY=sk-ant-your-real-key

# Optional
CORS_ORIGINS=http://localhost:5173,https://your-domain.com
TAILSCALE_HOSTNAME=your-machine.tailnet.ts.net
PII_STRIPPING_ENABLED=true
```

## Troubleshooting

**Q: "JWT_SECRET is still the placeholder value"**
- Generate: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`
- Update .env

**Q: Frontend shows "Frontend not built"**
- Run: `cd frontend && npm run build`

**Q: Database errors after git update**
- Database schema may have changed. Backups are auto-saved in `data/backups/`
- Delete `data/familyai.db` and restart to reinitialize

**Q: Rate limit blocking legitimate traffic**
- Check `backend/src/middleware/rateLimiter.ts` — adjust `max` values

**Q: Can't access from another device on WiFi**
- Ensure firewall allows port 3001
- Use Tailscale for secure VPN access

## License

This project is private to your family. Do not redistribute.

## Support

- Docs: See FAMILY_AI_SPEC.md and FAMILY_AI_ADDENDUM_v2.md
- Issues: GitHub Issues in your private repo
- Questions: Check troubleshooting above

---

Made with ❤️ for family privacy and AI safety.
