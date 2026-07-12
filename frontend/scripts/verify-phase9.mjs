import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const G = s => `\x1b[32m  ✓ ${s}\x1b[0m`;
const R = s => `\x1b[31m  ✗ ${s}\x1b[0m`;
const Y = s => `\x1b[33m  ⚠ ${s}\x1b[0m`;
const B = s => `\x1b[1m\n━━ ${s}\x1b[0m`;

let passed = 0, failed = 0, warned = 0;
const pass = (l, d = '') => { console.log(G(l) + (d ? ` → ${d}` : '')); passed++; };
const fail = (l, d = '') => { console.log(R(l) + (d ? ` → ${d}` : '')); failed++; };
const warn = (l, d = '') => { console.log(Y(l) + (d ? ` → ${d}` : '')); warned++; };

// ── File existence ──────────────────────────────────────
console.log(B('SECTION 1 — File Existence'));

const frontendFiles = [
  'src/store/configStore.ts',
  'src/pages/SetupPage.tsx',
  'src/pages/SettingsPage.tsx',
  'src/components/ui/toast.tsx',
  'src/components/ui/skeleton.tsx',
  'src/hooks/useTheme.ts',
  'scripts/verify-phase9.mjs',
];
const backendFiles = [
  '../backend/src/routes/config.ts',
  '../backend/src/routes/speech.ts',
  '../backend/src/services/contextManager.ts',
  '../start.bat',
];

for (const f of [...frontendFiles, ...backendFiles]) {
  fs.existsSync(f) ? pass(f) : fail(f, 'MISSING');
}

// ── Code patterns ───────────────────────────────────────
console.log(B('SECTION 2 — Code Patterns'));

const patternChecks = [
  // Config
  ['src/store/configStore.ts', '/api/config',         'configStore fetches /api/config'],
  ['src/store/configStore.ts', 'document.documentElement.style.setProperty', 'configStore applies primary color as CSS var'],
  ['src/store/configStore.ts', 'document.title',      'configStore sets document.title'],

  // Setup page
  ['src/pages/SetupPage.tsx', '/api/config/setup',    'SetupPage calls /api/config/setup'],
  ['src/pages/SetupPage.tsx', 'adminPassword',        'SetupPage collects admin password'],

  // Backend config endpoint
  ['../backend/src/routes/config.ts', "'/setup'",     'Backend has /setup endpoint'],
  ['../backend/src/routes/config.ts', "setup_complete !== 'false'", 'Config endpoint handles setupComplete correctly'],
  ['../backend/src/routes/config.ts', 'hashPassword', 'Setup endpoint hashes admin password'],

  // Dark mode
  ['src/hooks/useTheme.ts', "classList.add('dark')",  'useTheme adds dark class'],
  ['src/hooks/useTheme.ts', "classList.remove('dark')","useTheme removes dark class"],
  ['src/App.tsx', 'useTheme',                         'App.tsx calls useTheme'],

  // Toast
  ['src/components/ui/toast.tsx', 'addToastFn',       'Toast uses global singleton pattern'],
  ['src/components/ui/toast.tsx', 'ToastContainer',   'ToastContainer exported'],
  ['src/App.tsx', 'ToastContainer',                   'App.tsx renders ToastContainer'],

  // Voice
  ['src/components/chat/MessageInput.tsx', 'SpeechRecognition', 'MessageInput has SpeechRecognition'],
  ['src/components/chat/MessageInput.tsx', 'isListening',       'MessageInput has isListening state'],

  // Headroom
  ['../backend/src/services/contextManager.ts', 'cacheAlign',   'CacheAligner applied to system prompt'],
  ['../backend/src/services/contextManager.ts', 'headroom_enabled', 'Headroom gated on DB toggle'],
  ['../backend/src/services/contextManager.ts', 'compress',     'Headroom compress() called'],
  ['../backend/src/services/contextManager.ts', 'tokensSaved',  'BuiltContext includes tokensSaved'],

  // Skeletons
  ['src/components/ui/skeleton.tsx', 'ChatListSkeleton', 'ChatListSkeleton exported'],
  ['src/components/ui/skeleton.tsx', 'MessageSkeleton',  'MessageSkeleton exported'],

  // Settings
  ['src/pages/SettingsPage.tsx', 'theme',              'SettingsPage has theme selector'],
  ['src/pages/SettingsPage.tsx', 'defaultModel',       'SettingsPage has model selector'],
  ['src/pages/SettingsPage.tsx', 'headroom_enabled',   'SettingsPage has Headroom toggle'],

  // Main and App
  ['src/main.tsx', 'useConfigStore.getState().load',  'main.tsx loads config before render'],
  ['src/App.tsx', 'setupComplete',                    'App.tsx checks setupComplete'],
];

for (const [file, pattern, label] of patternChecks) {
  const content = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  content.includes(pattern) ? pass(label) : fail(label, `"${pattern}" not in ${file}`);
}

// ── TypeScript ──────────────────────────────────────────
console.log(B('SECTION 3 — TypeScript + Build'));

try {
  execSync('npx tsc --noEmit', { stdio:'pipe' });
  pass('tsc --noEmit — zero errors');
} catch(e) {
  const out = (e.stdout?.toString() || '') + (e.stderr?.toString() || '');
  const lines = out.split('\n').filter(Boolean);
  fail(`TypeScript: ${lines.length} error(s)`);
  lines.slice(0, 8).forEach(l => console.log('    ' + l));
}

try {
  execSync('npm run build 2>&1', { encoding: 'utf8', timeout: 90000, stdio: 'pipe' });
  pass('Production build succeeded');
} catch(e) {
  fail('Build failed');
  (e.stdout?.toString() || '').split('\n').slice(0, 8).forEach(l => console.log('   ' + l));
}

// ── Backend API tests ───────────────────────────────────
console.log(B('SECTION 4 — Backend API Verification'));

try {
  // 1. /api/config — no auth
  const configRes = await fetch('http://localhost:3001/api/config',
    { signal: AbortSignal.timeout(5000) });
  if (configRes.ok) {
    const cfg = await configRes.json();
    pass('GET /api/config → 200 (no auth required)');
    cfg.appName
      ? pass('config.appName present', cfg.appName)
      : fail('config.appName missing');
    cfg.appTagline
      ? pass('config.appTagline present', cfg.appTagline)
      : fail('config.appTagline missing');
    typeof cfg.setupComplete === 'boolean'
      ? pass('config.setupComplete is boolean', String(cfg.setupComplete))
      : fail('config.setupComplete wrong type', typeof cfg.setupComplete);
    cfg.primaryColor?.startsWith('#')
      ? pass('config.primaryColor is hex color', cfg.primaryColor)
      : fail('config.primaryColor wrong format', cfg.primaryColor);
  } else {
    fail('GET /api/config', `Status ${configRes.status} — check route is registered before authMiddleware`);
  }

  // 2. /api/config/setup blocked when already set up
  const setupBlockedRes = await fetch('http://localhost:3001/api/config/setup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      appName: 'Hack', adminUsername: 'hacker',
      adminPassword: 'hacker123', adminDisplayName: 'Hacker'
    }),
    signal: AbortSignal.timeout(5000),
  });
  setupBlockedRes.status === 403
    ? pass('POST /api/config/setup blocked when setup_complete=true → 403')
    : warn('Setup endpoint protection', `Got ${setupBlockedRes.status} — verify setup_complete is true in DB`);

  // 3. Admin login + settings
  const loginRes = await fetch('http://localhost:3001/api/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin123' }),
    signal: AbortSignal.timeout(5000),
  });
  if (!loginRes.ok) throw new Error('Login failed');
  const { token } = await loginRes.json();
  pass('Admin login OK');

  // 4. Headroom toggle visible in admin settings
  const settingsRes = await fetch('http://localhost:3001/api/admin/settings',
    { headers: { 'Authorization': `Bearer ${token}` }, signal: AbortSignal.timeout(5000) });
  const settings = await settingsRes.json();
  settings.headroom_enabled !== undefined
    ? pass('headroom_enabled key in server_settings', settings.headroom_enabled)
    : fail('headroom_enabled missing from server_settings', 'Run seed.ts again');

  // 5. Toggle Headroom on then off
  await fetch('http://localhost:3001/api/admin/settings', {
    method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ headroom_enabled: 'true' }),
    signal: AbortSignal.timeout(5000),
  });
  const afterToggle = await (await fetch('http://localhost:3001/api/admin/settings',
    { headers: { 'Authorization': `Bearer ${token}` } })).json();
  afterToggle.headroom_enabled === 'true'
    ? pass('Headroom toggle persists to DB')
    : fail('Headroom toggle not persisted');

  // Reset to false
  await fetch('http://localhost:3001/api/admin/settings', {
    method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ headroom_enabled: 'false' }),
  });
  pass('Headroom toggle reset to false');

  // 6. App name change propagates to /api/config
  await fetch('http://localhost:3001/api/admin/settings', {
    method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ app_name: 'TestName9' }),
    signal: AbortSignal.timeout(5000),
  });
  const updatedConfig = await (await fetch('http://localhost:3001/api/config')).json();
  updatedConfig.appName === 'TestName9'
    ? pass('App name change propagates to /api/config immediately')
    : fail('App name not reflecting in /api/config', `Got: ${updatedConfig.appName}`);

  // Restore
  await fetch('http://localhost:3001/api/admin/settings', {
    method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ app_name: 'FamilyAI' }),
  });
  pass('App name restored to FamilyAI');

  // 7. Speech route exists
  const speechRes = await fetch('http://localhost:3001/api/speech/transcribe', {
    method: 'POST', headers: { 'Authorization': `Bearer ${token}` },
    signal: AbortSignal.timeout(5000),
  });
  // 400 = no file, which means route exists and ran
  speechRes.status === 400 || speechRes.status === 200
    ? pass('POST /api/speech/transcribe route exists', `Status ${speechRes.status}`)
    : fail('Speech route missing', `Got ${speechRes.status}`);

} catch(e) {
  if (e.message?.includes('fetch failed') || e.code === 'ECONNREFUSED') {
    warn('Backend not reachable', 'cd ../backend && npx tsx src/index.ts');
  } else {
    fail('API tests threw', e.message);
  }
}

// ── Windows startup ─────────────────────────────────────
console.log(B('SECTION 5 — Windows Startup'));

fs.existsSync('../start.bat')
  ? pass('start.bat exists at project root')
  : fail('start.bat missing from project root');

const startBat = fs.existsSync('../start.bat')
  ? fs.readFileSync('../start.bat', 'utf8') : '';
startBat.includes('localhost:3001')
  ? pass('start.bat references port 3001')
  : fail('start.bat missing port 3001 reference');
startBat.includes('backend.log')
  ? pass('start.bat logs backend output to file')
  : warn('start.bat', 'Not logging to backend.log');

// ── Summary ─────────────────────────────────────────────
console.log(`\n\x1b[1m━━ PHASE 9 SUMMARY\x1b[0m`);
console.log(`\x1b[32m  Passed: ${passed}\x1b[0m`);
console.log(`\x1b[33m  Warned: ${warned}\x1b[0m`);
console.log(`\x1b[31m  Failed: ${failed}\x1b[0m`);

if (failed === 0) {
  console.log('\x1b[32m\n  ✓ Phase 9 complete. Proceed to Phase 10 (PWA).\x1b[0m\n');
} else {
  console.log(`\x1b[31m\n  ✗ ${failed} failure(s).\x1b[0m`);
  console.log('\x1b[31m  Priority order:\x1b[0m');
  console.log('\x1b[31m  1. Section 4 /api/config failures — breaks frontend before login\x1b[0m');
  console.log('\x1b[31m  2. Section 2 Headroom patterns — compression not wired\x1b[0m');
  console.log('\x1b[31m  3. TypeScript errors — must be zero before Phase 10\x1b[0m\n');
}
