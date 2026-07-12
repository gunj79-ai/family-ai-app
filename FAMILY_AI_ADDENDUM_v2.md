# FamilyAI — Addendum v2: Cloud Inference, PII Stripping, PWA & Native Path
> Give this file to VS Code's AI assistant TOGETHER with the original FAMILY_AI_SPEC.md.
> This addendum REPLACES the Ollama-specific sections of the original spec.
> Everything else in the original — database schema (except one line, noted below),
> auth system, projects/chats/attachments CRUD, frontend component list, admin dashboard —
> stays exactly as originally specified. Do not rebuild those parts.

---

## 0. WHAT CHANGED AND WHY

| Original spec | This addendum |
|---|---|
| Inference: local Ollama only | Inference: Anthropic Claude API only |
| No PII protection layer | Universal PII stripping, all roles, before every API call |
| No prompt caching | Prompt caching on system/project context + incremental conversation caching |
| Web app only | Web app + PWA (installable, no Apple needed) + documented Capacitor path (native, optional, later) |
| `daily_message_limit` rule only | Adds `daily_token_budget` rule type |

Reason for the swap: target hardware has no GPU and is a small-form-factor box, making local CPU inference too slow for daily family use. Cloud inference via the Claude API is the practical path; this addendum adds the privacy and cost-control layers that make that an acceptable trade.

---

## 1. UPDATED TECH STACK ADDITIONS

| Package | Version | Purpose |
|---|---|---|
| `@anthropic-ai/sdk` | latest | Claude API client (replaces ollama fetch calls) |
| `vite-plugin-pwa` | 0.20.x | Generates manifest + service worker for installable web app |
| `workbox-window` | 7.x | Service worker lifecycle helper (installed by vite-plugin-pwa) |

Remove from original stack: nothing strictly removed, but `OLLAMA_URL` and Ollama-specific service code are no longer used in the default path.

---

## 2. UPDATED ENVIRONMENT CONFIGURATION

File: `.env` — replaces the Ollama block from the original spec:

```env
# Server
PORT=3001
NODE_ENV=development

# Security
JWT_SECRET=replace-with-a-random-64-char-string-here
JWT_EXPIRY=7d

# Paths
DATA_DIR=./data
DB_PATH=./data/familyai.db
UPLOADS_DIR=./data/uploads

# Claude API
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxxxxxxxxxx
DEFAULT_MODEL=claude-haiku-4-5-20251001
ESCALATION_MODEL=claude-sonnet-4-6
# ESCALATION_MODEL is only used if you build a manual "use smarter model"
# toggle later. Default behavior: every user, every request, uses DEFAULT_MODEL.

# Privacy
PII_STRIPPING_ENABLED=true
# Applies to ALL roles — admin, adult, teen. No per-role exceptions.

# File limits
MAX_FILE_SIZE_MB=10

# Frontend (Vite)
VITE_API_BASE_URL=http://localhost:3001
```

Get your API key from the Anthropic Console (console.anthropic.com) under API Keys. Treat it like a password — it's billed per token, never commit it to git, and `.env` is already in `.gitignore`.

---

## 3. DATABASE SCHEMA — ONE CHANGED LINE

In `schema.sql`, update the `parental_rules` table's CHECK constraint to add the new rule type:

```sql
-- BEFORE:
rule_type    TEXT NOT NULL CHECK(rule_type IN (
                'time_restriction',
                'daily_message_limit',
                'keyword_block',
                'topic_block',
                'model_restriction',
                'ai_content_filter'
             )),

-- AFTER:
rule_type    TEXT NOT NULL CHECK(rule_type IN (
                'time_restriction',
                'daily_message_limit',
                'daily_token_budget',
                'keyword_block',
                'topic_block',
                'model_restriction',
                'ai_content_filter'
             )),
-- daily_token_budget payload shape: {"limit": 50000}
-- Counts total tokens (input + output) used today across all that user's messages.
```

Everything else in the schema is unchanged.

---

## 4. CLAUDE API SERVICE — replaces `backend/src/services/ollama.ts`

File: `backend/src/services/claude.ts`

```typescript
import Anthropic from '@anthropic-ai/sdk';
import { config } from '../config.js';

const anthropic = new Anthropic({ apiKey: config.ANTHROPIC_API_KEY });

// IMPORTANT: Anthropic's API takes system instructions as a TOP-LEVEL
// `system` parameter — NOT a {role: 'system'} message in the messages array
// (this differs from the OpenAI-compatible shape used for Ollama in the
// original spec). The context manager (section 6 below) has been updated
// to reflect this.

interface ClaudeContentBlock {
  type: 'text' | 'image';
  text?: string;
  source?: { type: 'base64'; media_type: string; data: string };
  cache_control?: { type: 'ephemeral' };
}

interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string | ClaudeContentBlock[];
}

export async function streamClaudeChat(
  systemBlocks: ClaudeContentBlock[],   // system prompt + project files, with cache_control
  messages: ClaudeMessage[],            // conversation turns, last stable turn carries cache_control
  model: string,
  maxTokens: number,
  onChunk: (text: string) => void,
  onDone: (fullText: string, inputTokens: number, outputTokens: number, cacheReadTokens: number) => void,
  onError: (err: Error) => void
): Promise<void> {
  let fullText = '';
  let inputTokens = 0;
  let outputTokens = 0;
  let cacheReadTokens = 0;

  try {
    const stream = await anthropic.messages.create({
      model,
      max_tokens: maxTokens,
      system: systemBlocks as Anthropic.TextBlockParam[],
      messages: messages as Anthropic.MessageParam[],
      stream: true,
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        fullText += event.delta.text;
        onChunk(event.delta.text);
      }
      if (event.type === 'message_start') {
        inputTokens = event.message.usage.input_tokens;
        cacheReadTokens = (event.message.usage as { cache_read_input_tokens?: number }).cache_read_input_tokens || 0;
      }
      if (event.type === 'message_delta') {
        outputTokens = event.usage.output_tokens;
      }
    }

    onDone(fullText, inputTokens, outputTokens, cacheReadTokens);
  } catch (err) {
    onError(err as Error);
  }
}

// Fixed model list — no dynamic discovery needed like Ollama's listModels().
// Claude API models are a known, small set.
export function getAvailableModels(): Array<{ id: string; label: string; description: string }> {
  return [
    {
      id: 'claude-haiku-4-5-20251001',
      label: 'Haiku (Fast — default for everyone)',
      description: 'Fast, low-cost, handles everyday family use well.'
    },
    {
      id: 'claude-sonnet-4-6',
      label: 'Sonnet (Smarter — slower, costs more)',
      description: 'Better for complex reasoning or long writing tasks.'
    },
  ];
}
```

---

## 5. PII STRIPPING SERVICE — applies to ALL roles, no exceptions

File: `backend/src/services/piiStripper.ts`

```typescript
export interface PiiStripResult {
  redactedText: string;
  replacements: Record<string, string>;
}

const EMAIL_RE = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
const PHONE_RE = /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g;
const SSN_RE = /\b\d{3}-\d{2}-\d{4}\b/g;
const ADDRESS_RE = /\b\d{1,5}\s+\w+(\s\w+)?\s(Street|St|Avenue|Ave|Road|Rd|Lane|Ln|Drive|Dr)\b/gi;
const CARD_RE = /\b(?:\d[ -]*?){13,16}\b/g;

/**
 * Strips identifying info before any text leaves the server.
 * Runs unconditionally for every role — admin, adult, teen.
 * `familyMemberNames` should be the display names of ALL active users,
 * queried fresh from the users table (not just the current speaker),
 * so references to other family members are caught too.
 */
export function stripPii(text: string, familyMemberNames: string[]): PiiStripResult {
  let redacted = text;
  const replacements: Record<string, string> = {};
  let counter = 0;

  for (const name of familyMemberNames) {
    if (name && redacted.includes(name)) {
      const placeholder = `[PERSON_${counter}]`;
      redacted = redacted.split(name).join(placeholder);
      replacements[placeholder] = name;
      counter++;
    }
  }

  redacted = redacted.replace(EMAIL_RE, '[EMAIL]');
  redacted = redacted.replace(PHONE_RE, '[PHONE]');
  redacted = redacted.replace(SSN_RE, '[SSN]');
  redacted = redacted.replace(ADDRESS_RE, '[ADDRESS]');
  redacted = redacted.replace(CARD_RE, '[CARD_NUMBER]');

  return { redactedText: redacted, replacements };
}

/** Reverses placeholders back to real values before the response reaches the user. */
export function restorePii(text: string, replacements: Record<string, string>): string {
  let restored = text;
  for (const [placeholder, original] of Object.entries(replacements)) {
    restored = restored.split(placeholder).join(original);
  }
  return restored;
}
```

**Wiring it in** — in `routes/messages.ts`, immediately before calling `streamClaudeChat`:

```typescript
import { stripPii, restorePii } from '../services/piiStripper.js';

// Fetch ALL active family member names fresh from DB (not cached)
const allNames = (db.prepare('SELECT display_name FROM users WHERE is_active = 1').all() as { display_name: string }[])
  .map(r => r.display_name);

// Strip PII from every message in the context, merge replacement maps
const mergedReplacements: Record<string, string> = {};
const redactedMessages = contextMessages.map(msg => {
  if (typeof msg.content === 'string') {
    const { redactedText, replacements } = stripPii(msg.content, allNames);
    Object.assign(mergedReplacements, replacements);
    return { ...msg, content: redactedText };
  }
  return msg; // multi-part content (images) — text blocks within should also be stripped; see note below
});

// On every streamed chunk, restore before sending to the client:
onChunk: (chunk) => {
  const restored = restorePii(chunk, mergedReplacements);
  send({ type: 'chunk', content: restored });
}
```

Note: for multi-part message content (text + image blocks), apply `stripPii` to each `type: 'text'` block individually before sending; leave image blocks untouched.

This is on by default, server-side, for every request, regardless of role. There is a single global toggle in Admin Settings (`PII_STRIPPING_ENABLED`), not a per-user one — see decision rationale in section 0.

---

## 6. CONTEXT MANAGER — updated for Anthropic's request shape

File: `backend/src/services/contextManager.ts` — key differences from the original Ollama version:

1. System instructions go in a separate `system` array, not a `{role: 'system'}` message.
2. Mark the system block(s) with `cache_control: {type: 'ephemeral'}` so repeated reads of the same project instructions + knowledge files cost ~10% of normal price on every turn after the first.
3. Mark the last message of the *prior* turn (not the newest user message) with `cache_control` too — this caches the growing conversation prefix incrementally, so each new turn only pays full price for the new content, not the whole history again.

```typescript
import { ProjectFile, Message } from '../types/index.js';

export function buildClaudeContext(
  systemInstructions: string,
  projectFiles: ProjectFile[],
  chatMessages: Message[],
  userDisplayName: string,
  projectName: string
) {
  const now = new Date();
  let resolvedSystem = systemInstructions
    .replace(/\{\{user_name\}\}/g, userDisplayName)
    .replace(/\{\{current_date\}\}/g, now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }))
    .replace(/\{\{project_name\}\}/g, projectName);

  if (projectFiles.length > 0) {
    resolvedSystem += '\n\n---\n## Knowledge Base Files\n';
    for (const file of projectFiles) {
      if (file.extractedText) {
        resolvedSystem += `\n### ${file.originalName}\n${file.extractedText.slice(0, 8000)}\n`;
      }
    }
  }

  // System block — cached. This is the highest-value cache target since
  // project instructions + files are identical across every turn.
  const systemBlocks = resolvedSystem.trim()
    ? [{ type: 'text' as const, text: resolvedSystem, cache_control: { type: 'ephemeral' as const } }]
    : [];

  // Conversation messages
  const messages = chatMessages.map((m, idx) => {
    const isSecondToLast = idx === chatMessages.length - 2;
    const base = {
      role: m.role as 'user' | 'assistant',
      content: buildContentBlocks(m),
    };
    // Mark the second-to-last message so the prefix up to "now" is cached
    // and reused on the NEXT turn (incremental caching pattern).
    if (isSecondToLast && Array.isArray(base.content) && base.content.length > 0) {
      base.content[base.content.length - 1].cache_control = { type: 'ephemeral' };
    }
    return base;
  });

  return { systemBlocks, messages };
}

function buildContentBlocks(message: Message & { attachments?: import('../types/index.js').Attachment[] }) {
  const blocks: Array<{ type: 'text' | 'image'; text?: string; source?: object; cache_control?: { type: 'ephemeral' } }> = [];
  let text = message.content;

  for (const att of message.attachments ?? []) {
    if (att.mimeType.startsWith('image/')) {
      blocks.push({
        type: 'image',
        source: { type: 'base64', media_type: att.mimeType, data: '<base64-encoded-file-data>' }
        // Backend reads the file from disk and base64-encodes it here.
      });
    } else if (att.extractedText) {
      text += `\n\n[Attached file: ${att.originalName}]\n${att.extractedText}`;
    }
  }
  blocks.unshift({ type: 'text', text });
  return blocks;
}
```

**Cache economics reminder:** the default cache TTL is 5 minutes. As long as a family member's next message in a conversation comes within ~5 minutes of the last one (the overwhelming majority case), the cached prefix is reused. For conversations with long pauses, the cache simply expires and the next message pays full price once — no errors, just no discount that turn.

---

## 7. UPDATED PARENTAL GUARD — token budget enforcement

Add this case to the `switch (rule.ruleType)` block in `backend/src/middleware/parentalGuard.ts` (same file as originally specified, this is an addition, not a replacement):

```typescript
case 'daily_token_budget': {
  const limit = value.limit as number;
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const usageRow = db.prepare(`
    SELECT COALESCE(SUM(m.token_count), 0) as total
    FROM messages m
    JOIN chats c ON m.chat_id = c.id
    WHERE c.user_id = ? AND m.created_at >= ?
  `).get(user.id, todayStart.toISOString()) as { total: number };

  if (usageRow.total >= limit) {
    res.status(429).json({
      error: `Daily token budget of ${limit.toLocaleString()} reached. Resets at midnight.`
    });
    return;
  }
  break;
}
```

This applies the same way regardless of role enforcement elsewhere — but remember the guard already skips `admin`/`adult` by default per the original design. If you want token budgets on adults too (reasonable, since you're now paying real money per token), remove the early-return role check for this specific rule type, or just add a `daily_token_budget` rule for adult accounts as well — the middleware already supports rules on any user ID, the role-skip was a convenience default, not a hard restriction.

---

## 8. MODELS ROUTE — simplified (no more dynamic Ollama discovery)

File: `backend/src/routes/models.ts` — replaces the original Ollama-backed version:

```typescript
import express from 'express';
import { getAvailableModels } from '../services/claude.js';

export const modelsRouter = express.Router();

modelsRouter.get('/', (_req, res) => {
  res.json(getAvailableModels());
});
```

No more `/api/models/pull` route — there's nothing to pull, models are hosted by Anthropic.

---

## 9. ADMIN DASHBOARD ADDITION — cost visibility

Since real money is now being spent per token, add a stat to `AdminStats` (extend the type from the original spec) and the Overview tab:

```typescript
// Add to AdminStats interface in types/index.ts
export interface AdminStats {
  // ...all original fields...
  estimatedCostTodayUsd: number;
  estimatedCostThisMonthUsd: number;
  tokenUsageByUser: Array<{
    userId: string;
    displayName: string;
    tokensToday: number;
    estimatedCostTodayUsd: number;
  }>;
}
```

Compute cost server-side using the rate card at time of writing (Haiku 4.5: $1/$5 per million input/output tokens — **store these as configurable values in `server_settings`, not hardcoded**, since Anthropic's pricing can change):

```sql
-- Add to server_settings defaults in seed.ts
('haiku_input_price_per_mtok', '1.00')
('haiku_output_price_per_mtok', '5.00')
('sonnet_input_price_per_mtok', '3.00')
('sonnet_output_price_per_mtok', '15.00')
```

Show this on the Admin Overview tab as a simple running total, with a configurable monthly budget alert threshold (e.g., email-free, just a red banner in the dashboard: "85% of your $30 monthly estimate used").

---

## 10. PWA SETUP — installable on Windows + iPhone, zero Apple involvement

### 10.1 Install the plugin

```powershell
cd frontend
npm install -D vite-plugin-pwa
```

### 10.2 Update `vite.config.ts`

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'FamilyAI',
        short_name: 'FamilyAI',
        description: 'Private family AI assistant',
        theme_color: '#6366f1',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Cache the app shell for fast loads; do NOT cache API responses —
        // chat data must always be fresh.
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
        navigateFallbackDenylist: [/^\/api\//],
      },
    }),
  ],
});
```

### 10.3 Generate icons

Create two PNG files: `frontend/public/icon-192.png` (192×192) and `frontend/public/icon-512.png` (512×512). Any simple logo works — square, no transparency issues, since iOS adds its own corner rounding.

### 10.4 Requirement: HTTPS

Service workers (which make PWAs installable) require HTTPS, except on `localhost`. You already need this for clean remote access — use the Tailscale HTTPS certificate covered in the original setup:

```powershell
tailscale cert your-machine-name.your-tailnet.ts.net
```

Point a reverse proxy (Caddy is simplest — auto-renews certs, minimal config) at your backend, and the PWA installability requirement is satisfied for free as a side effect of the remote-access setup you already need.

### 10.5 How family members install it

- **Windows:** open the Tailscale HTTPS URL in Edge or Chrome → address bar shows an install icon → click "Install FamilyAI"
- **iPhone:** open the same URL in Safari → Share button → "Add to Home Screen"
- **Android:** same as iPhone via Chrome, often with an automatic install banner

No App Store, no Apple ID involvement, no account creation beyond what's already in your app.

---

## 11. CAPACITOR — THE NATIVE GRADUATION PATH (optional, do this later if ever)

This section is reference material for if/when you want a real native iOS binary. **Do not build this now.** It's documented here so you know the path exists and requires no rework of anything above.

### 11.1 What changes, what doesn't

| Stays exactly the same | Changes |
|---|---|
| All React components | Add a thin Capacitor config file |
| All backend code | None |
| All API routes | None |
| Database, auth, parental controls | None |

### 11.2 Steps, when you're ready

```powershell
cd frontend
npm install @capacitor/core @capacitor/cli
npx cap init FamilyAI com.yourfamily.familyai
npm install @capacitor/ios @capacitor/android
npx cap add ios
npx cap add android
```

### 11.3 Two configuration choices for `capacitor.config.ts`

**Option A — Bundle the build into the binary** (offline-capable UI shell, but doesn't reflect server changes until rebuilt):
```typescript
const config: CapacitorConfig = {
  appId: 'com.yourfamily.familyai',
  appName: 'FamilyAI',
  webDir: 'dist',
};
```

**Option B — Point at your live Tailscale server** (recommended for your setup — always fresh, behaves like the PWA but as a real native shell):
```typescript
const config: CapacitorConfig = {
  appId: 'com.yourfamily.familyai',
  appName: 'FamilyAI',
  webDir: 'dist',
  server: {
    url: 'https://your-machine-name.your-tailnet.ts.net',
    cleartext: false,
  },
};
```

Option B is the natural choice given your architecture — your server already exists and is reachable; the native app just becomes a dedicated window onto it, with the added benefit of a real APNs-based push channel if you build that later.

### 11.4 What you need ONLY at this stage, not before

- A Mac (Capacitor's iOS build step requires Xcode, which is Mac-only)
- Apple Developer Program membership — $99/year
- For family-only distribution without public App Store listing: **TestFlight** lets you distribute to up to 100 internal testers (your family) via a private link, without ever appearing in App Store search. This is almost certainly the right distribution model for you if you ever reach this stage — real native app, zero public visibility, no App Store review queue for every update beyond the first.

### 11.5 Build command, for reference

```powershell
npx cap sync ios
npx cap open ios
# Xcode opens — build and run on a connected/simulated device,
# or archive and upload to TestFlight from there.
```

---

## 12. UPDATED BUILD PHASES — insert into the original 9-phase plan

Insert after the original **Phase 6 (Core chat UI)**:

### PHASE 6.5 — Cloud inference swap
1. Install `@anthropic-ai/sdk`
2. Write `services/claude.ts` (section 4)
3. Write `services/piiStripper.ts` (section 5)
4. Update `services/contextManager.ts` for Anthropic's request shape (section 6)
5. Update `parentalGuard.ts` with `daily_token_budget` case (section 7)
6. Rewrite `routes/models.ts` (section 8)
7. Test: send a message, verify PII is stripped before the API call (log redacted payload), verify it's restored correctly in the streamed response

Insert after the original **Phase 9 (Settings + polish)**:

### PHASE 10 — PWA
1. Install and configure `vite-plugin-pwa` (section 10)
2. Generate icons
3. Set up Tailscale HTTPS cert + reverse proxy
4. Test install on Windows (Edge) and iPhone (Safari Add to Home Screen)

### PHASE 11 — Native wrap (future, optional, not part of initial build)
Reference section 11 when/if you decide to do this. Not part of the current build plan.

---

## 12.5 WELCOME STATE — TEEN-APPROPRIATE DAD JOKE ON NEW CHAT

Build this as part of the original spec's **Phase 6** (Core chat UI), specifically alongside `ChatWindow.tsx` — it's the empty-state screen shown when a chat has zero messages, the same moment Claude.ai shows its own greeting.

**Design decision:** static curated list, not LLM-generated. A hardcoded array is fully predictable — no risk of the model drifting into something inappropriate for a teen account, no extra API call or token cost, no loading flicker. Shown to **every role** (admin, adult, teen) — consistent with the universal-by-default pattern used for PII stripping. If you'd rather restrict it to teen accounts only, gate the component render on `user.role === 'teen'`; the data file and logic below don't change either way.

File: `frontend/src/data/dadJokes.ts`

```typescript
// Curated, family-safe — no innuendo, no edgy themes.
// Static by design: predictable content beats generated content here.
export const DAD_JOKES: string[] = [
  "Why don't scientists trust atoms? Because they make up everything.",
  "I used to hate facial hair, but then it grew on me.",
  "Why did the scarecrow win an award? He was outstanding in his field.",
  "I'm reading a book about anti-gravity. It's impossible to put down.",
  "Why don't eggs tell jokes? They'd crack each other up.",
  "What do you call a factory that makes good products? A satisfactory.",
  "I used to be a baker, but I couldn't make enough dough.",
  "Why did the bicycle fall over? It was two tired.",
  "What do you call cheese that isn't yours? Nacho cheese.",
  "I only know 25 letters of the alphabet. I don't know y.",
  "Why can't you give Elsa a balloon? She'll let it go.",
  "What's orange and sounds like a parrot? A carrot.",
  "I told my wife she was drawing her eyebrows too high. She looked surprised.",
  "Why don't skeletons fight each other? They don't have the guts.",
  "What do you call a belt made of watches? A waist of time.",
  "I would tell you a chemistry joke, but I know I wouldn't get a reaction.",
  "Why did the math book look sad? It had too many problems.",
  "What did the ocean say to the beach? Nothing, it just waved.",
  "I'm on a seafood diet. I see food and I eat it.",
  "Why did the coffee file a police report? It got mugged.",
  "What do you call a dinosaur that crashes his car? Tyrannosaurus wrecks.",
  "I used to play piano by ear, but now I use my hands.",
  "Why couldn't the leopard play hide and seek? He was always spotted.",
  "What's the best thing about Switzerland? I don't know, but the flag is a big plus.",
  "Why did the golfer bring two pairs of pants? In case he got a hole in one.",
  "I'm friends with all electricians. We have great current connections.",
  "What do you call a can opener that doesn't work? A can't opener.",
  "Why did the gym close down? It just didn't work out.",
  "What's brown and sticky? A stick.",
  "I tried to catch fog yesterday. Mist.",
  "Why don't oysters share their pearls? Because they're shellfish.",
  "What did one wall say to the other wall? I'll meet you at the corner.",
  "Why did the cookie go to the doctor? It was feeling crumbly.",
  "How do you organize a space party? You planet.",
  "What do you call a sleeping dinosaur? A dino-snore.",
  "Why did the picture go to jail? It was framed.",
  "What's a pirate's favorite letter? You'd think it's R, but it's the C.",
  "Why did the student eat his homework? The teacher said it was a piece of cake.",
  "What do you call an alligator in a vest? An investigator.",
];

export function getRandomDadJoke(): string {
  return DAD_JOKES[Math.floor(Math.random() * DAD_JOKES.length)];
}
```

Wire into `frontend/src/components/chat/ChatWindow.tsx` empty state:

```tsx
import { useMemo } from 'react';
import { getRandomDadJoke } from '../../data/dadJokes';
import { useChatStore } from '../../store/chatStore';
import { useAuthStore } from '../../store/authStore';

export function ChatWindow() {
  const { messages, activeChat } = useChatStore();
  const { user } = useAuthStore();

  // Pick once per chat — not on every re-render, or it'll flicker
  // to a new joke on each keystroke while typing.
  const joke = useMemo(() => getRandomDadJoke(), [activeChat?.id]);

  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-6 text-center">
        <h2 className="text-xl font-medium mb-3">
          Hey {user?.displayName}, what's on your mind?
        </h2>
        <p className="text-muted-foreground italic max-w-md">{joke}</p>
      </div>
    );
  }

  // ... existing message list rendering for non-empty chats
}
```

That's the whole feature — no backend route, no DB table, no API call. Pure frontend, near-zero cost to build or run.

---

## 13. QUICK REFERENCE FOR FEEDING TO VS CODE

When starting work with Claude Code or another AI assistant in VS Code, the prompt pattern that works well:

```
Read FAMILY_AI_SPEC.md and FAMILY_AI_ADDENDUM_v2.md.
The addendum supersedes the Ollama sections of the original spec —
use Claude API (Anthropic SDK) as the only inference backend, with
universal PII stripping and prompt caching as specified.
Build Phase 1 first. Do not proceed to later phases until I confirm
the current phase works.
```

---

## 14. DATA ISOLATION — USERS CANNOT SEE EACH OTHER'S PROJECTS OR CHATS

The original spec's API table for `/api/projects` and `/api/chats` listed endpoints but didn't show the route bodies — this is the actual enforcement, replacing the placeholder routes.

**The rule:** every non-admin request is hard-scoped to `req.user.id` at the SQL level, no exceptions. Admin gets one explicit override — a `?userId=` query param — used only by the Admin dashboard, never by the regular chat UI.

File: `backend/src/routes/projects.ts` (GET handler — replaces the placeholder)

```typescript
projectsRouter.get('/', (req, res) => {
  const db = getDb();
  const isAdmin = req.user!.role === 'admin';
  const requestedUserId = req.query.userId as string | undefined;

  // Non-admins ALWAYS see only their own projects, regardless of any query param.
  // Admins may pass ?userId=X to inspect a specific family member's projects —
  // this is the ONLY path that crosses the ownership boundary, and it's role-gated.
  const targetUserId = isAdmin && requestedUserId ? requestedUserId : req.user!.id;

  const archived = req.query.archived === 'true' ? 1 : 0;
  const projects = db.prepare(`
    SELECT * FROM projects WHERE user_id = ? AND is_archived = ?
    ORDER BY is_pinned DESC, updated_at DESC
  `).all(targetUserId, archived);

  res.json(projects);
});
```

File: `backend/src/routes/chats.ts` (GET handler — same pattern)

```typescript
chatsRouter.get('/', (req, res) => {
  const db = getDb();
  const isAdmin = req.user!.role === 'admin';
  const requestedUserId = req.query.userId as string | undefined;
  const targetUserId = isAdmin && requestedUserId ? requestedUserId : req.user!.id;

  let query = `SELECT * FROM chats WHERE user_id = ?`;
  const params: unknown[] = [targetUserId];

  if (req.query.projectId) { query += ` AND project_id = ?`; params.push(req.query.projectId); }
  if (req.query.pinned === 'true') { query += ` AND is_pinned = 1`; }
  if (req.query.search) { query += ` AND title LIKE ?`; params.push(`%${req.query.search}%`); }

  query += ` ORDER BY updated_at DESC LIMIT ? OFFSET ?`;
  params.push(parseInt(req.query.limit as string) || 50, parseInt(req.query.offset as string) || 0);

  res.json(db.prepare(query).all(...params));
});
```

Single-resource routes (`GET /api/projects/:id`, `GET /api/chats/:id`) need the same check inline:

```typescript
const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id) as Project | undefined;
if (!project) return res.status(404).json({ error: 'Not found' });
if (project.userId !== req.user!.id && req.user!.role !== 'admin') {
  return res.status(403).json({ error: 'Forbidden' });
}
```

This exact pattern is already used in the `messages.ts` GET handler from the original spec — apply it identically to every single-resource route across projects, chats, and project files.

**Admin Users Tab tie-in:** the "View full chat history" action referenced in the original spec's section 11.4 now has a concrete implementation — it calls `GET /api/chats?userId={targetUserId}`, then drills into each chat via the existing `GET /api/chats/:chatId/messages` (which already allows admin override). No new admin-specific message route is needed; the ownership check already grants admin read access to any user's full message content, not just flagged content.

---

## 15. PROJECT KNOWLEDGE FILES — IMAGES

Claude's API takes system instructions as **text-only** — you cannot put an image inside the `system` parameter. The original `buildClaudeContext` only handled text-extracted project files (PDFs, .txt). This patches in image support for project files (e.g., a reference photo, a diagram, a screenshot of a recipe card).

Update `backend/src/services/contextManager.ts`:

```typescript
// After building resolvedSystem (text) as before, separately collect
// any image files attached to the project:
const projectImageBlocks: ClaudeContentBlock[] = projectFiles
  .filter(f => f.mimeType.startsWith('image/'))
  .slice(0, 3) // cap — vision context is expensive, 3 reference images is plenty for a family project
  .map(f => ({
    type: 'image' as const,
    source: {
      type: 'base64' as const,
      media_type: f.mimeType,
      data: readFileAsBase64(path.join(config.UPLOADS_DIR, 'project-files', f.filename)),
    },
  }));

// Prepend these to the CURRENT user message's content blocks (not the system
// block, since images can't go there). This re-attaches them on every turn —
// but with cache_control, repeat sends within the 5-minute window cost ~10%.
if (projectImageBlocks.length > 0) {
  const currentTurn = messages[messages.length - 1];
  if (Array.isArray(currentTurn.content)) {
    currentTurn.content = [...projectImageBlocks, ...currentTurn.content];
    currentTurn.content[projectImageBlocks.length - 1].cache_control = { type: 'ephemeral' };
  }
}
```

Practical cap: 3 project images keeps cost bounded and is realistically enough for "here's a photo of the thing we're talking about" use cases. If a project needs more than that, it's probably better suited to per-message attachments instead of permanent project knowledge.

---

## 16. SCREENSHOT / PHOTO CAPTURE

Two distinct behaviors, both needed, both small additions to `MessageInput.tsx`:

**Desktop — paste a screenshot.** Person hits their OS screenshot shortcut (Win+Shift+S on Windows), then pastes directly into the chat box.

```tsx
function handlePaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
  const items = e.clipboardData?.items;
  if (!items) return;

  for (const item of items) {
    if (item.type.startsWith('image/')) {
      e.preventDefault();
      const file = item.getAsFile();
      if (file) uploadAttachment(file); // reuses the existing attachment upload flow
    }
  }
}

// <textarea onPaste={handlePaste} ... />
```

**Mobile — open the camera directly.** A second attach button alongside the existing file picker, using the `capture` attribute so mobile browsers open the camera app instead of a generic file browser:

```tsx
<input
  type="file"
  accept="image/*"
  capture="environment"
  onChange={(e) => e.target.files?.[0] && uploadAttachment(e.target.files[0])}
  className="hidden"
  id="camera-capture"
/>
<label htmlFor="camera-capture" className="cursor-pointer">
  <Camera className="w-5 h-5" /> {/* lucide-react icon */}
</label>
```

Both feed into the same `POST /api/attachments/upload` endpoint already specified in the original spec — no backend changes needed, this is purely two additional input methods on the frontend.

---

## 17. VOICE INPUT (MIC)

Two implementation tiers. Build the first for speed; consider the second for consistency with everything else in this addendum being privacy-first.

### 17.1 Tier 1 — Browser-native (fast to build, free, inconsistent across browsers)

The Web Speech API works well in Chrome and Edge (covers Windows family members). Safari/iOS support for continuous dictation has historically been unreliable — test before relying on it for teen devices that are likely iPhones.

```tsx
function startVoiceInput() {
  const SpeechRecognitionCtor = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (!SpeechRecognitionCtor) {
    toast.error('Voice input isn\'t supported in this browser — try Chrome or Edge.');
    return;
  }
  const recognition = new SpeechRecognitionCtor();
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.lang = 'en-US';
  recognition.onresult = (event: SpeechRecognitionEvent) => {
    const transcript = Array.from(event.results).map(r => r[0].transcript).join('');
    setInputText(transcript);
  };
  recognition.onend = () => setIsListening(false);
  recognition.start();
  setIsListening(true);
}
```

### 17.2 Tier 2 — Local Whisper (recommended for this project specifically)

Given the privacy posture you've built everywhere else — PII stripping, no cloud retention beyond what's necessary — sending voice audio (a biometric signal, arguably more identifying than text) to a third-party browser API for transcription is the one inconsistent piece. A self-hosted Whisper model on the same Windows box closes that gap, and works identically across every browser including Safari, since it only needs basic audio recording (`MediaRecorder`, universally supported) rather than each browser's own speech API.

CPU cost is a non-issue here — transcription is a one-shot batch job on a short clip (a few seconds of audio), not token-by-token generation like the chat model. `base.en` on CPU transcribes a 10-second clip in roughly 2-4 seconds.

```powershell
npm install nodejs-whisper --save
```

File: `backend/src/routes/speech.ts`

```typescript
import express from 'express';
import multer from 'multer';
import fs from 'fs';
import { nodewhisper } from 'nodejs-whisper';

export const speechRouter = express.Router();
const upload = multer({ dest: 'data/uploads/tmp-audio' });

speechRouter.post('/transcribe', upload.single('audio'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No audio provided' });

  try {
    const text = await nodewhisper(req.file.path, {
      modelName: 'base.en',
      whisperOptions: { outputInText: true },
    });
    res.json({ text: text.trim() });
  } catch {
    res.status(500).json({ error: 'Transcription failed' });
  } finally {
    fs.unlink(req.file.path, () => {}); // audio is never persisted — delete immediately after transcribing
  }
});
```

Frontend — push-to-talk, records on hold, transcribes on release:

```tsx
const mediaRecorderRef = useRef<MediaRecorder | null>(null);
const chunksRef = useRef<Blob[]>([]);

async function startRecording() {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const recorder = new MediaRecorder(stream);
  chunksRef.current = [];
  recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
  recorder.onstop = async () => {
    const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
    const formData = new FormData();
    formData.append('audio', blob, 'recording.webm');
    const { data } = await apiClient.post('/api/speech/transcribe', formData);
    setInputText(prev => (prev ? `${prev} ${data.text}` : data.text));
  };
  recorder.start();
  mediaRecorderRef.current = recorder;
  setIsListening(true);
}

function stopRecording() {
  mediaRecorderRef.current?.stop();
  setIsListening(false);
}

// Mic button: onMouseDown/onTouchStart={startRecording}, onMouseUp/onTouchEnd={stopRecording}
```

Register `speechRouter` in `index.ts` under `app.use('/api/speech', speechRouter)`, behind the same `authMiddleware` as everything else.

**Recommendation:** build Tier 1 first to get the feature working end to end quickly. Swap to Tier 2 before this goes into regular family use — it's a backend route and a recording hook, not a UI rewrite, so the swap is cheap, and it's the option consistent with everything else you've prioritized in this build.

---

## 18. ACCESS — IN-HOUSE AND AWAY, CONFIRMED

No new code needed here — this was already covered by the original Tailscale setup, worth restating plainly: on your home network, devices reach the server either via Tailscale's IP or the plain local IP (e.g., `192.168.1.x`) directly — both work, Tailscale doesn't have to be the only path when you're already on the same LAN. Away from home, Tailscale is what makes the same URL reachable. The PWA install (section 10) works identically either way, since it's just a website at a stable HTTPS address.

---
-e 
*End of addendum.*
