# FamilyAI Setup Guide

Complete plain-English instructions for setting up FamilyAI on your family's computer.

---

## 1. Prerequisites

Before you start, make sure you have:

### Windows Computer
- **Windows 10 or 11** on a machine that can stay on most of the time (like a home server or always-on desktop)
- At least 2GB free disk space
- A stable internet connection

### Software to Install
1. **Node.js 20+** (the software that runs the server)
   - Download from: https://nodejs.org/download
   - Choose the Windows installer
   - Accept all defaults during installation

2. **Git** (version control software)
   - Download from: https://git-scm.com
   - Accept all defaults during installation

3. **Anthropic API Key** (access to Claude AI)
   - Go to: https://console.anthropic.com
   - Create a free account
   - Generate an API key (copy and save it — you'll need it later)
   - Add credits to your account (free tier available)

### Verify Installation
Open **PowerShell** (Windows key → type "PowerShell" → press Enter) and run:
```
node --version
git --version
```

Both should show version numbers. If not, restart your computer and try again.

---

## 2. Installation

### Step 1: Download the code
Open PowerShell in a folder where you want to install FamilyAI (e.g., `C:\App-Projects\`):

```powershell
git clone https://github.com/YOUR_USERNAME/familyai.git
cd familyai
```

### Step 2: Install dependencies
```powershell
npm install
cd backend
npm install
cd ../frontend
npm install
```

This will take 2-5 minutes. You'll see a lot of text — that's normal. If it finishes without errors in red, you're good.

### Step 3: Verify installation
From the `familyai` folder, run:
```powershell
cd backend && npx tsc --noEmit
cd ../frontend && npx tsc --noEmit
```

If both say "no output" or show no errors, you're ready for the next step.

---

## 3. Configuration

### Step 1: Create your .env file
In the main `familyai` folder, copy the example:
```powershell
Copy-Item .env.example .env
```

Now open `.env` in Notepad (right-click → Open with → Notepad):

### Step 2: Generate your JWT_SECRET
This is a unique security key. Open PowerShell and run:
```powershell
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Copy the long random string that appears. In your `.env` file, replace:
```
JWT_SECRET=replace-with-a-random-64-char-string-here
```

with:
```
JWT_SECRET=[paste the string you copied]
```

### Step 3: Add your API key
In `.env`, find:
```
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxxxxxxxxxx
```

Replace it with your real API key from console.anthropic.com:
```
ANTHROPIC_API_KEY=sk-ant-YOUR_ACTUAL_KEY_HERE
```

### Step 4: Understand the other variables
Here's what each setting does in plain English:

| Variable | What It Does | Example |
|----------|------------|---------|
| **PORT** | Which port the server uses | 3001 |
| **NODE_ENV** | Is this development or production? | development |
| **JWT_SECRET** | Security key (you just set this) | random string |
| **JWT_EXPIRY** | How long before re-login required | 7d |
| **DATA_DIR** | Where user chats are saved | ./data |
| **DB_PATH** | Where the database file lives | ./data/familyai.db |
| **UPLOADS_DIR** | Where uploaded files are stored | ./data/uploads |
| **ANTHROPIC_API_KEY** | Your Claude API key (you just set this) | sk-ant-xxx |
| **DEFAULT_MODEL** | Which Claude model to use for chat | claude-haiku-4-5-20251001 |
| **PII_STRIPPING_ENABLED** | Should we remove personal info before sending to Claude? | true |
| **MAX_FILE_SIZE_MB** | Biggest file kids can upload | 10 |
| **VITE_API_BASE_URL** | Where the app connects to the server | http://localhost:3001 |

**Don't change anything else unless you know what you're doing.**

---

## 4. First Run

### Step 1: Generate app icons
```powershell
cd backend
npx tsx scripts/generate-icons.ts
```

### Step 2: Build the app
```powershell
cd ../frontend
npm run build
```

This creates the production version. It takes about 2 minutes.

### Step 3: Start the server
Go back to the main folder and double-click **start.bat**

A PowerShell window should open and show:
```
✓ Database initialized
✓ Running on port 3001
```

Leave this window open (don't close it).

### Step 4: Open the app
Open any web browser and go to: **http://localhost:3001**

You should see a setup wizard asking for:
- App name (e.g., "Family AI")
- Admin username and password

### Step 5: Create your admin account
- **Username:** admin (or something else)
- **Password:** Something strong (you'll change this immediately anyway)

Click "Create Admin Account"

### ⚠️ CRITICAL: Change the admin password
1. Click your username in the top-right corner
2. Go to **Settings**
3. Click **Change Password**
4. Enter the current password you just set
5. Enter a NEW strong password (at least 8 characters, mix of letters and numbers)
6. Save

**Never use the default "admin123" in production.**

---

## 5. Adding Family Members

Now that you're set up, add each family member as a user.

### How to add a user:
1. Click the hamburger menu (≡) in the top-left
2. Go to **Admin Dashboard**
3. Click the **Users** tab
4. Click **Add User**
5. Fill in:
   - **Username:** Something simple they'll remember (e.g., "alice", "bob")
   - **Password:** A temporary password (at least 8 characters) — they should change it on first login
   - **Display Name:** Their full name or nickname
   - **Age:** How old they are (this helps Eva talk appropriately)
   - **Role:** Choose from below

### Role Guide

**Admin** (You, the parent)
- Can see all chats and messages
- Can create rules and parental controls
- Can manage all users
- Can change the admin password

**Adult** (Spouse, grandparent, trusted guardian)
- Can use Eva normally
- Cannot see other users' chats
- Cannot manage users

**Teen** (Kids 8-17)
- Can use Eva normally
- Subject to parental controls (see below)
- Cannot access admin features

### Setting up parental controls
For each teen account:
1. Go to **Admin Dashboard** → **Rules**
2. Click **Add Rule** and set:

#### Access Hours
Restrict when the app can be used.
- Example: 7,22 means "allow 7 AM to 10 PM"
- Use 24-hour format (0-23)

#### Daily Message Limit
Maximum messages per calendar day.
- Example: 100 allows 100 messages per day

#### Daily Usage Hours
Maximum time per day (in tokens).
- Example: 50000 tokens ≈ 12,500 messages
- (This is roughly 4 tokens per message)

---

## 6. Getting Eva Set Up

Eva is FamilyAI's AI assistant. She adapts her communication style to each age group.

### Step 1: Create a project for Eva
1. In the sidebar, click **+ New Project**
2. Name it: "Eva — Family Assistant"
3. Click "Create"

### Step 2: Add her character instructions
1. Click the project name
2. Click **Settings** (gear icon)
3. Go to **Eva's Character**
4. Click **Edit**
5. Copy the system instructions from: [FAMILY_AI_SPEC.md](FAMILY_AI_SPEC.md) (search for "EVA_DEFAULT_CHARACTER")
6. Paste into the text box
7. Click **Save Changes**

### Step 3: Tell your family to use it
Share the project with your family members. Eva will:
- Use simple words for younger kids (ages 5-9)
- Add complexity gradually for tweens (ages 10-13)
- Discuss topics maturely with teens (ages 14+)
- Talk to adults as peers (age 18+)

---

## 7. Remote Access Options

### Option A: Home Network Only (Simplest)
Best if everyone is on the same WiFi.

1. Find your server's IP address:
   ```powershell
   ipconfig | findstr "IPv4"
   ```
   Look for something like `192.168.1.42`

2. Tell family members to use: `http://192.168.1.42:3001`

3. (Optional) In your router settings, set a **static IP** so it never changes.

### Option B: Tailscale (Recommended - Anywhere Access)
Best if your family is split across multiple locations.

1. Download Tailscale on the server and all family devices:
   - https://tailscale.com/download
   - Windows, Mac, iOS, Android all supported

2. On each device, log in with the same account

3. On the server, run once:
   ```powershell
   tailscale serve https / http://localhost:3001
   ```

4. In Tailscale admin (https://login.tailscale.com), go to **DNS**:
   - Add your server's Tailscale hostname (e.g., `server-name.tailnet.ts.net`)

5. Family visits: `https://your-machine.tailnet.ts.net`

**Data never leaves your home network** — Tailscale just creates a private tunnel.

### Option C: Cloudflare Tunnel (Public HTTPS, No VPN)
Best if you have a domain name and want the simplest experience.

1. Install Cloudflare CLI:
   - Download from: https://github.com/cloudflare/cloudflared/releases
   - Choose `cloudflared-windows-amd64.exe`

2. Authenticate:
   ```powershell
   cloudflared login
   ```

3. Create tunnel:
   ```powershell
   cloudflared tunnel create familyai
   ```

4. Route to your domain:
   ```powershell
   cloudflared tunnel route dns familyai ai.yourdomain.com
   ```

5. Run as service:
   ```powershell
   cloudflared service install
   net start cloudflared
   ```

6. Family visits: `https://ai.yourdomain.com`

**Security note:** This is public, so anyone can try to log in. Use strong passwords and consider adding Cloudflare Access to require an email-based login gate.

---

## 8. Keeping It Running

### Automatic Features
- **Backups:** Saved daily at 2 AM and 2 PM (in `data/backups/`)
- **Logs:** Check `data/backend.log` if anything goes wrong

### Updating the Code
When you update from GitHub:
```powershell
git pull
cd frontend
npm run build
# Restart start.bat
```

### If the server crashes:
1. Check `data/backend.log` for error messages
2. Stop the PowerShell window (Ctrl+C)
3. Double-click `start.bat` again

### Keeping it running 24/7
For always-on operation:
1. Use **Task Scheduler** to run `start.bat` on boot
2. Or install **PM2**: `npm install -g pm2` (advanced)

---

## 9. Troubleshooting

### "Server won't start"
**Check:** `data/backend.log` — copy the last few lines and read the error message.
- **"EADDRINUSE"** → Port 3001 is already in use. Kill other Node processes and restart.
- **"Cannot find module"** → Run `npm install` again.
- **Other errors** → Check that `ANTHROPIC_API_KEY` is set correctly in `.env`.

### "Login fails / Invalid credentials"
**Check:** Is the `.env` file's `ANTHROPIC_API_KEY` correct?
- Copy it again from https://console.anthropic.com
- Restart the server (Ctrl+C in PowerShell, then re-run `start.bat`)

### "Kids can't connect from another device"
**If using home network:**
- Is the other device on the same WiFi?
- Can you ping the server? `ping 192.168.1.42` (use your IP)
- Is Windows Firewall blocking port 3001? (Allow it through)

**If using Tailscale:**
- Is Tailscale running on both devices?
- Are they logged into the same Tailscale account?
- Run `tailscale status` to see all connected devices

**If using Cloudflare:**
- Is the tunnel running? Check Task Scheduler or `cloudflared.exe --version`
- Is the domain pointing to Cloudflare? Check your DNS settings

### "Too many requests" error
You've hit the rate limiter (safety feature).
- Wait 15 minutes and try again
- If it keeps happening, someone is trying to brute-force the login

### "Database corrupted" or "Missing attachments"
**Recovery:**
1. Stop the server
2. Delete `data/familyai.db`
3. Restore from `data/backups/familyai-YYYY-MM-DD...db`
4. Restart the server

### "My storage is full"
**Clean up:**
- Old messages auto-archive, but you can delete projects to free space
- Backups older than 7 days are auto-deleted
- Check `data/uploads/` for old file uploads

### "I forgot the admin password"
**Recovery:**
1. Stop the server
2. Delete `data/familyai.db`
3. Restart the server
4. Complete the setup wizard again (creates new admin account)
5. Restore messages from `data/backups/` (advanced)

---

## Need Help?

- **Logs:** Check `data/backend.log`
- **GitHub Issues:** Create an issue in your private repo
- **Documentation:** See [README.md](README.md) and [FAMILY_AI_SPEC.md](FAMILY_AI_SPEC.md)

---

**Happy chatting with Eva! 🚀**
