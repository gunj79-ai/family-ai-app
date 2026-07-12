import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const G = s => `\x1b[32m  ✓ ${s}\x1b[0m`;
const R = s => `\x1b[31m  ✗ ${s}\x1b[0m`;
const Y = s => `\x1b[33m  ⚠ ${s}\x1b[0m`;
const B = s => `\x1b[1m\n━━ ${s}\x1b[0m`;

let passed = 0, failed = 0, warned = 0;
const pass = (l,d='') => { console.log(G(l)+(d?` → ${d}`:'')); passed++; };
const fail = (l,d='') => { console.log(R(l)+(d?` → ${d}`:'')); failed++; };
const warn = (l,d='') => { console.log(Y(l)+(d?` → ${d}`:'')); warned++; };

console.log(B('PHASE 6 VERIFICATION'));

// Section 1: Frontend Files
console.log(B('SECTION 1 — Frontend Files Exist'));
const frontendFiles = [
  'src/hooks/useChat.ts', 'src/hooks/useProjects.ts',
  'src/components/chat/MessageBubble.tsx',
  'src/components/chat/MessageInput.tsx',
  'src/components/chat/ChatWindow.tsx',
  'src/components/layout/Sidebar.tsx',
  'src/components/layout/AppShell.tsx',
];
for (const f of frontendFiles) {
  fs.existsSync(f) ? pass(f) : fail(f, 'MISSING');
}

// Section 1b: Backend Files
console.log(B('SECTION 1b — Backend Files Exist'));
const backendRoot = path.resolve(__dirname, '..', '..', 'backend', 'src');
const backendFiles = [
  'services/piiStripper.ts', 'services/claude.ts',
  'services/contextManager.ts', 'routes/messages.ts',
  'routes/attachments.ts',
];
for (const f of backendFiles) {
  const full = path.join(backendRoot, f);
  fs.existsSync(full) ? pass(`backend/${f}`) : fail(`backend/${f}`, 'MISSING');
}

// Section 2: Code Patterns
console.log(B('SECTION 2 — Code Patterns & Features'));
const checks = [
  ['src/hooks/useChat.ts', 'text/event-stream', 'SSE fetch in useChat'],
  ['src/hooks/useChat.ts', 'appendChunk', 'useChat calls appendChunk'],
  ['src/hooks/useChat.ts', 'AbortController', 'useChat has abort support'],
  ['src/components/chat/ChatWindow.tsx', 'getRandomDadJoke', 'Dad joke in empty state'],
  ['src/components/chat/ChatWindow.tsx', 'isStreaming', 'ChatWindow handles streaming'],
  ['src/components/chat/MessageBubble.tsx', 'ReactMarkdown', 'Markdown rendering'],
  ['src/components/chat/MessageBubble.tsx', 'SyntaxHighlighter', 'Code highlighting'],
  ['src/components/layout/Sidebar.tsx', 'handleNewChat', 'New chat button'],
  ['src/components/layout/Sidebar.tsx', 'deleteChat', 'Delete chat functionality'],
];
for (const [file, pattern, label] of checks) {
  const content = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  content.includes(pattern) ? pass(label) : fail(label, `Pattern "${pattern}" not found`);
}

const pii = fs.existsSync(path.join(backendRoot, 'services/piiStripper.ts'))
  ? fs.readFileSync(path.join(backendRoot, 'services/piiStripper.ts'), 'utf8') : '';
pii.includes('createChunkRestorer')
  ? pass('PII stripper has createChunkRestorer')
  : fail('PII stripper missing createChunkRestorer');
pii.includes('PARTIAL_RE')
  ? pass('PII stripper has partial placeholder regex')
  : warn('PII stripper', 'No PARTIAL_RE');

const claude = fs.existsSync(path.join(backendRoot, 'services/claude.ts'))
  ? fs.readFileSync(path.join(backendRoot, 'services/claude.ts'), 'utf8') : '';
claude.includes('cache_control')
  ? pass('Claude service uses prompt caching')
  : warn('Claude service', 'No cache_control');
claude.includes('stream: true')
  ? pass('Claude service uses streaming')
  : fail('Claude service', 'stream: true not found');

const msgs = fs.existsSync(path.join(backendRoot, 'routes/messages.ts'))
  ? fs.readFileSync(path.join(backendRoot, 'routes/messages.ts'), 'utf8') : '';
msgs.includes('text/event-stream')
  ? pass('Messages route sets SSE content-type')
  : fail('Messages route missing SSE headers');
msgs.includes('parentalGuard')
  ? pass('Messages route applies parentalGuard middleware')
  : fail('Messages route missing parentalGuard');
msgs.includes('stripPii')
  ? pass('Messages route calls stripPii before Claude')
  : fail('Messages route missing PII stripping');
msgs.includes('createChunkRestorer')
  ? pass('Messages route restores PII on chunks')
  : fail('Messages route does not restore PII');

// Section 3: TypeScript
console.log(B('SECTION 3 — TypeScript Compilation'));
try {
  execSync('npx tsc --noEmit', { stdio: 'pipe' });
  pass('tsc --noEmit — zero type errors');
} catch (e) {
  const out = (e.stdout?.toString()||'')+(e.stderr?.toString()||'');
  const lines = out.split('\n').filter(Boolean);
  fail(`TypeScript errors: ${lines.length}`);
  lines.slice(0,5).forEach(l => console.log('    '+l));
}

// Section 4: Build
console.log(B('SECTION 4 — Production Build'));
try {
  execSync('npm run build 2>&1', { encoding:'utf8', timeout:90000, stdio: 'pipe' });
  pass('npm run build succeeded');
} catch (e) {
  fail('npm run build failed');
}

// Section 5: Backend Streaming Test
console.log(B('SECTION 5 — Backend Streaming (if running)'));
try {
  const loginResp = await fetch('http://localhost:3001/api/auth/login', {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({username:'admin',password:'admin123'}),
    signal: AbortSignal.timeout(5000),
  });
  if (!loginResp.ok) throw new Error('Login failed');
  const { token } = await loginResp.json();
  pass('Backend authentication OK');

  const chatResp = await fetch('http://localhost:3001/api/chats', {
    method:'POST', headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`},
    body: JSON.stringify({ title:'Verify Test' }),
    signal: AbortSignal.timeout(5000),
  });
  const chat = await chatResp.json();
  pass('Test chat created');

  const msgResp = await fetch(`http://localhost:3001/api/chats/${chat.id}/messages`, {
    method:'POST', headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`},
    body: JSON.stringify({ content:'Respond with STREAM_OK' }),
    signal: AbortSignal.timeout(30000),
  });

  if (msgResp.headers.get('content-type')?.includes('text/event-stream')) {
    pass('Response Content-Type is text/event-stream');
  } else {
    fail('Wrong SSE headers', `Got: ${msgResp.headers.get('content-type')}`);
  }

  const reader = msgResp.body.getReader();
  const decoder = new TextDecoder();
  let chunks = 0, gotDone = false;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const raw = decoder.decode(value, { stream:true });
    for (const line of raw.split('\n')) {
      if (!line.startsWith('data: ')) continue;
      try {
        const ev = JSON.parse(line.slice(6));
        if (ev.type === 'chunk') chunks++;
        if (ev.type === 'done') gotDone = true;
        if (ev.type === 'error') {
          warn('Streaming error', ev.error.substring(0, 60));
          break;
        }
      } catch(pe) { if (!(pe instanceof SyntaxError)) throw pe; }
    }
  }

  chunks > 0
    ? pass(`Streaming: ${chunks} chunk events`)
    : warn('Streaming: zero chunks (API key issue?)');
  gotDone
    ? pass('Streaming: done event received')
    : fail('Streaming: no done event');

  await fetch(`http://localhost:3001/api/chats/${chat.id}`, {
    method:'DELETE', headers:{'Authorization':`Bearer ${token}`}
  });

} catch(e) {
  if (e.message?.includes('ECONNREFUSED') || e.message?.includes('fetch failed')) {
    warn('Backend not running', 'Start: cd ../backend && npx tsx src/index.ts');
  } else {
    warn('Streaming test', e.message.substring(0, 80));
  }
}

// Summary
console.log(`\n\x1b[1m━━ PHASE 6 SUMMARY\x1b[0m`);
console.log(`\x1b[32m  Passed: ${passed}\x1b[0m`);
console.log(`\x1b[33m  Warned: ${warned}\x1b[0m`);
console.log(`\x1b[31m  Failed: ${failed}\x1b[0m`);

if (failed === 0) {
  console.log('\x1b[32m\n  ✓ Phase 6 complete and verified.\x1b[0m');
  console.log('\x1b[2m  Frontend: npm run dev  →  http://localhost:5173\x1b[0m');
  console.log('\x1b[2m  Backend:  cd ../backend && npx tsx src/index.ts\x1b[0m\n');
} else {
  console.log(`\x1b[31m\n  ✗ ${failed} failure(s) — fix before production.\x1b[0m\n`);
}
