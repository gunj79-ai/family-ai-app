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

// ── Section 1: Files ────────────────────────────────────
console.log(B('SECTION 1 — Required Files'));

const files = [
  // Frontend source
  'src/components/ui/PwaInstallPrompt.tsx',
  'src/hooks/usePwaUpdate.ts',

  // Frontend public (icons must be here for Vite to include)
  'public/icon-192.png',
  'public/icon-512.png',
  'public/favicon.png',

  // Build output (backend/public/)
  '../backend/public/index.html',
  '../backend/public/sw.js',
  '../backend/public/icon-192.png',
  '../backend/public/icon-512.png',

  // Backend
  '../backend/scripts/generate-icons.ts',
  '../start.bat',
];

for (const f of files) {
  if (fs.existsSync(f)) {
    const stat = fs.statSync(f);
    pass(f, `${(stat.size / 1024).toFixed(1)} KB`);
  } else {
    fail(f, 'MISSING');
  }
}

// Icon size validation
for (const icon of ['public/icon-192.png', 'public/icon-512.png']) {
  if (fs.existsSync(icon)) {
    const size = fs.statSync(icon).size;
    size > 100
      ? pass(`${icon} is valid size`, `${size} bytes`)
      : fail(`${icon} appears empty or corrupt`, `${size} bytes`);
  }
}

// ── Section 2: Build Output ─────────────────────────────
console.log(B('SECTION 2 — Build Output (backend/public/)'));

const distDir = '../backend/public';
if (fs.existsSync(distDir)) {
  const files = fs.readdirSync(distDir);

  files.includes('index.html')
    ? pass('index.html in build output')
    : fail('index.html missing from build output',
        'Run: cd frontend && npm run build');

  files.includes('sw.js')
    ? pass('sw.js (service worker) in build output')
    : fail('sw.js missing',
        'vite-plugin-pwa not generating service worker — check vite.config.ts');

  const assetsDir = path.join(distDir, 'assets');
  if (fs.existsSync(assetsDir)) {
    const assets = fs.readdirSync(assetsDir);
    const jsFiles = assets.filter(f => f.endsWith('.js'));
    const cssFiles = assets.filter(f => f.endsWith('.css'));
    pass(`assets/ has ${jsFiles.length} JS chunks and ${cssFiles.length} CSS files`);

    // Check chunk splitting worked
    jsFiles.some(f => f.startsWith('vendor'))
      ? pass('vendor chunk exists (React/React-DOM split)')
      : warn('No vendor chunk', 'Check rollupOptions.manualChunks in vite.config.ts');
  } else {
    fail('assets/ directory missing from build output');
  }

  files.includes('icon-192.png') && files.includes('icon-512.png')
    ? pass('Icons copied to build output')
    : fail('Icons missing from build output',
        'Put icons in frontend/public/ not backend/public/ — Vite copies from public/');
} else {
  fail('backend/public/ does not exist', 'Run: cd frontend && npm run build');
}

// Check index.html for manifest link
const indexHtml = fs.existsSync('../backend/public/index.html')
  ? fs.readFileSync('../backend/public/index.html', 'utf8') : '';
indexHtml.includes('/api/manifest.webmanifest')
  ? pass('index.html links to dynamic manifest (/api/manifest.webmanifest)')
  : fail('index.html missing manifest link',
      'Should be: <link rel="manifest" href="/api/manifest.webmanifest" />');
indexHtml.includes('apple-touch-icon')
  ? pass('index.html has apple-touch-icon (iOS PWA)')
  : fail('apple-touch-icon missing — iOS "Add to Home Screen" will use screenshot');
indexHtml.includes('apple-mobile-web-app-capable')
  ? pass('index.html has apple-mobile-web-app-capable meta tag')
  : warn('Missing apple-mobile-web-app-capable',
      'iOS may not offer full-screen mode when installed');

// ── Section 3: Code patterns ────────────────────────────
console.log(B('SECTION 3 — Code Patterns'));

const patterns = [
  ['src/components/ui/PwaInstallPrompt.tsx', 'beforeinstallprompt',
    'PwaInstallPrompt listens for beforeinstallprompt event'],
  ['src/components/ui/PwaInstallPrompt.tsx', 'display-mode: standalone',
    'PwaInstallPrompt checks if already installed (standalone mode)'],
  ['src/components/ui/PwaInstallPrompt.tsx', 'isIos',
    'PwaInstallPrompt handles iOS separately (no beforeinstallprompt)'],
  ['src/hooks/usePwaUpdate.ts', 'useRegisterSW',
    'usePwaUpdate uses Workbox useRegisterSW hook'],
  ['src/hooks/usePwaUpdate.ts', 'updateServiceWorker',
    'usePwaUpdate auto-applies updates'],
  ['src/App.tsx', 'PwaInstallPrompt',
    'App.tsx renders PwaInstallPrompt'],
  ['src/App.tsx', 'usePwaUpdate',
    'App.tsx calls usePwaUpdate hook'],
  ['../backend/src/index.ts', 'manifest.webmanifest',
    'Backend serves dynamic manifest endpoint'],
  ['../backend/src/index.ts', 'application/manifest+json',
    'Manifest endpoint sets correct Content-Type'],
  ['../backend/src/index.ts', 'express.static',
    'Express serves static files from public/'],
  ['../backend/src/index.ts', 'index.html',
    'Express has SPA fallback to index.html'],
  ['vite.config.ts', 'vite-plugin-pwa',
    'vite.config.ts imports VitePWA'],
  ['vite.config.ts', 'manifest: false',
    'VitePWA manifest generation disabled (using dynamic backend manifest)'],
  ['vite.config.ts', 'NetworkOnly',
    'API routes cached as NetworkOnly in service worker'],
];

for (const [file, pattern, label] of patterns) {
  const content = fs.existsSync(file)
    ? fs.readFileSync(file, 'utf8') : '';
  content.includes(pattern) ? pass(label) : fail(label, `"${pattern}" not in ${file}`);
}

// ── Section 4: TypeScript ───────────────────────────────
console.log(B('SECTION 4 — TypeScript Compilation'));

try {
  execSync('npx tsc --noEmit', { stdio: 'pipe' });
  pass('Zero TypeScript errors');
} catch (e) {
  const out = (e.stdout?.toString() || '') + (e.stderr?.toString() || '');
  const lines = out.split('\n').filter(Boolean);
  fail(`${lines.length} TypeScript error(s)`);
  lines.slice(0, 8).forEach(l => console.log('    ' + l));
}

// ── Section 5: Live API tests ───────────────────────────
console.log(B('SECTION 5 — Live API (server must be running)'));

try {
  // Health check
  const healthRes = await fetch('http://localhost:3001/api/health',
    { signal: AbortSignal.timeout(5000) });
  healthRes.ok
    ? pass('Backend health check')
    : fail('Backend not responding');

  // Dynamic manifest
  const manifestRes = await fetch('http://localhost:3001/api/manifest.webmanifest',
    { signal: AbortSignal.timeout(5000) });
  if (manifestRes.ok) {
    const ct = manifestRes.headers.get('content-type') || '';
    ct.includes('manifest+json') || ct.includes('json')
      ? pass('Manifest Content-Type correct', ct)
      : warn('Manifest Content-Type', `Got: ${ct} — should include manifest+json`);

    const manifest = await manifestRes.json();
    manifest.name
      ? pass('manifest.name present', manifest.name)
      : fail('manifest.name missing');
    manifest.icons?.length >= 2
      ? pass('manifest.icons has 2+ entries', `${manifest.icons.length} icons`)
      : fail('manifest.icons', `Got ${manifest.icons?.length} — need at least 2`);
    manifest.display === 'standalone'
      ? pass('manifest.display = standalone')
      : fail('manifest.display', `Got: ${manifest.display}`);
    manifest.start_url
      ? pass('manifest.start_url present', manifest.start_url)
      : fail('manifest.start_url missing');
    manifest.theme_color?.startsWith('#')
      ? pass('manifest.theme_color is hex', manifest.theme_color)
      : fail('manifest.theme_color missing or wrong format');
  } else {
    fail('GET /api/manifest.webmanifest', `Status ${manifestRes.status}`);
  }

  // Frontend served by Express (production mode check)
  const frontendRes = await fetch('http://localhost:3001/',
    { signal: AbortSignal.timeout(5000) });
  if (frontendRes.ok) {
    const html = await frontendRes.text();
    html.includes('<div id="root">')
      ? pass('Express serves React app at /')
      : warn('Express responds at / but may not be serving React',
          'Check backend/public/index.html exists');
    html.includes('manifest.webmanifest')
      ? pass('Served HTML includes manifest link')
      : fail('Served HTML missing manifest link');
  } else {
    warn('Express not serving frontend at /',
      'If running in dev mode this is expected — production mode needed');
  }

  // Service worker accessible
  const swRes = await fetch('http://localhost:3001/sw.js',
    { signal: AbortSignal.timeout(5000) });
  swRes.ok
    ? pass('sw.js accessible at /sw.js')
    : fail('sw.js not accessible', `Status ${swRes.status} — build may not be deployed`);

  // Icons accessible
  const icon192Res = await fetch('http://localhost:3001/icon-192.png',
    { signal: AbortSignal.timeout(5000) });
  icon192Res.ok
    ? pass('/icon-192.png accessible')
    : fail('/icon-192.png not accessible', 'Icons may not be in frontend/public/');

  const icon512Res = await fetch('http://localhost:3001/icon-512.png',
    { signal: AbortSignal.timeout(5000) });
  icon512Res.ok
    ? pass('/icon-512.png accessible')
    : fail('/icon-512.png not accessible');

} catch (e) {
  if (e.code === 'ECONNREFUSED' || e.message?.includes('fetch failed')) {
    warn('Backend not running',
      'Start: cd ../backend && set NODE_ENV=production && npx tsx src/index.ts');
  } else {
    fail('Live API tests', e.message);
  }
}

// ── Section 6: Tailscale ────────────────────────────────
console.log(B('SECTION 6 — Tailscale (informational)'));

try {
  const tsStatus = execSync('tailscale status --self 2>&1', { encoding: 'utf8' });
  if (tsStatus.includes('ts.net')) {
    pass('Tailscale is running and connected');
    const hostname = tsStatus.match(/[\w-]+\.[\w-]+\.ts\.net/)?.[0];
    hostname
      ? pass('Tailscale hostname found', hostname)
      : warn('Could not parse Tailscale hostname from status output');
  } else {
    warn('Tailscale status unclear', 'Install from tailscale.com/download/windows');
  }
} catch {
  warn('Tailscale not installed or not in PATH',
    'Install from tailscale.com/download/windows then run: tailscale serve https / http://localhost:3001');
}

try {
  const tsServe = execSync('tailscale serve status 2>&1', { encoding: 'utf8' });
  tsServe.includes('https://') && tsServe.includes('localhost:3001')
    ? pass('Tailscale Serve configured (HTTPS → localhost:3001)',
        tsServe.match(/https:\/\/[\w.-]+/)?.[0] || '')
    : warn('Tailscale Serve not configured',
        'Run: tailscale serve https / http://localhost:3001');
} catch {
  warn('Could not check Tailscale Serve status');
}

// ── Summary ─────────────────────────────────────────────
console.log(`\n\x1b[1m━━ PHASE 10 SUMMARY\x1b[0m`);
console.log(`\x1b[32m  Passed: ${passed}\x1b[0m`);
console.log(`\x1b[33m  Warned: ${warned}\x1b[0m`);
console.log(`\x1b[31m  Failed: ${failed}\x1b[0m`);

if (failed === 0) {
  console.log('\x1b[32m\n  ✓ Phase 10 complete.\x1b[0m');
  console.log('\x1b[32m  FamilyAI is production-ready.\x1b[0m\n');
  console.log('\x1b[2m  Install on Windows: open http://localhost:3001 in Edge → address bar install icon\x1b[0m');
  console.log('\x1b[2m  Install on iPhone: open Tailscale URL in Safari → Share → Add to Home Screen\x1b[0m');
  console.log('\x1b[2m  Install on Android: open Tailscale URL in Chrome → install banner\x1b[0m\n');
} else {
  console.log(`\x1b[31m\n  ✗ ${failed} failure(s).\x1b[0m`);
  console.log('\x1b[31m  Priority order:\x1b[0m');
  console.log('\x1b[31m  1. Section 2 build output failures — sw.js or icons missing\x1b[0m');
  console.log('\x1b[31m  2. Section 5 manifest or frontend serving failures\x1b[0m');
  console.log('\x1b[31m  3. Section 3 code pattern failures\x1b[0m');
  console.log('\x1b[31m  Tailscale warnings in Section 6 do not block local use.\x1b[0m\n');
}
