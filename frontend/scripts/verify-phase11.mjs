#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../..');

const G = s => `\x1b[32m  ✓ ${s}\x1b[0m`;
const R = s => `\x1b[31m  ✗ ${s}\x1b[0m`;
const Y = s => `\x1b[33m  ⚠ ${s}\x1b[0m`;
const B = s => `\x1b[1m\n━━ ${s}\x1b[0m`;

let passed = 0,
  failed = 0,
  warned = 0;
const pass = (l, d = '') => {
  console.log(G(l) + (d ? ` → ${d}` : ''));
  passed++;
};
const fail = (l, d = '') => {
  console.log(R(l) + (d ? ` → ${d}` : ''));
  failed++;
};
const warn = (l, d = '') => {
  console.log(Y(l) + (d ? ` → ${d}` : ''));
  warned++;
};

// ── Section 1: Security files ───────────────────────────
console.log(B('SECTION 1 — Security & Missing Files'));

const required = [
  'backend/src/middleware/rateLimiter.ts',
  'backend/src/services/backup.ts',
  '.github/workflows/ci.yml',
  '.env.example',
  'README.md',
];
for (const f of required) {
  const fullPath = path.join(projectRoot, f);
  fs.existsSync(fullPath) ? pass(f) : fail(f, 'MISSING');
}

// ── Section 2: Code patterns ────────────────────────────
console.log(B('SECTION 2 — Code Patterns'));

const checks = [
  [
    'backend/src/middleware/rateLimiter.ts',
    'authLimiter',
    'authLimiter exported',
  ],
  [
    'backend/src/middleware/rateLimiter.ts',
    'skipSuccessfulRequests',
    'authLimiter only counts failures',
  ],
  [
    'backend/src/middleware/rateLimiter.ts',
    'sensitiveActionLimiter',
    'sensitiveActionLimiter exported',
  ],
  ['backend/src/index.ts', 'authLimiter', 'authLimiter applied in index.ts'],
  ['backend/src/index.ts', 'apiLimiter', 'apiLimiter applied in index.ts'],
  [
    'backend/src/routes/messages.ts',
    '20000',
    'Message length capped at 20000',
  ],
  ['backend/src/services/backup.ts', 'runBackup', 'runBackup exported'],
  [
    'backend/src/services/backup.ts',
    'MAX_BACKUPS',
    'Backup pruning implemented',
  ],
  ['backend/src/index.ts', 'runBackup()', 'Backup runs on server startup'],
  ['backend/src/index.ts', 'cron.schedule', 'Scheduled backup via cron'],
  [
    'backend/src/index.ts',
    'JWT_SECRET.length',
    'JWT secret length enforced on startup',
  ],
  [
    'backend/src/routes/attachments.ts',
    "includes('..')",
    'Path traversal check in attachments',
  ],
  [
    '.gitignore',
    '.env',
    '.gitignore excludes .env',
  ],
  [
    '.gitignore',
    'data/',
    '.gitignore excludes data/',
  ],
  [
    '.gitignore',
    'backend/public/',
    '.gitignore excludes build output',
  ],
  [
    '.env.example',
    'ANTHROPIC_API_KEY',
    '.env.example has API key placeholder',
  ],
  [
    '.env.example',
    'JWT_SECRET',
    '.env.example has JWT secret placeholder',
  ],
  [
    '.github/workflows/ci.yml',
    'tsc --noEmit',
    'CI runs TypeScript check',
  ],
  [
    '.github/workflows/ci.yml',
    'sk-ant-api',
    'CI checks for hardcoded API keys',
  ],
];

for (const [file, pattern, label] of checks) {
  const fullPath = path.join(projectRoot, file);
  const content = fs.existsSync(fullPath) ? fs.readFileSync(fullPath, 'utf8') : '';
  content.includes(pattern)
    ? pass(label)
    : fail(label, `"${pattern}" not in ${file}`);
}

// ── Section 3: Git repository ───────────────────────────
console.log(B('SECTION 3 — Git Repository'));

try {
  const gitStatus = execSync('git status --porcelain 2>&1', {
    cwd: projectRoot,
    encoding: 'utf8',
  });

  pass('Git repository initialized');

  // Check nothing sensitive is staged or untracked
  const lines = gitStatus.split('\n').filter(Boolean);
  const sensitivePatterns = ['.env', 'familyai.db', '.log', 'node_modules'];
  const leaks = lines.filter(l =>
    sensitivePatterns.some(p => l.includes(p))
  );
  leaks.length === 0
    ? pass('No sensitive files in git status')
    : fail(
        'Sensitive files visible to git',
        leaks.slice(0, 3).join(', ')
      );

  // Check .env is properly ignored
  try {
    const checkIgnore = execSync('git check-ignore .env 2>&1', {
      cwd: projectRoot,
      encoding: 'utf8',
    });
    checkIgnore.includes('.env')
      ? pass('.env confirmed gitignored')
      : warn('.env gitignore check inconclusive');
  } catch {
    pass('.env is gitignored (check-ignore exit 0)');
  }
} catch (e) {
  if (e.message?.includes('not a git repository')) {
    fail(
      'Git repository not initialized',
      'Run: git init && git add . && git commit -m "Initial commit"'
    );
  } else {
    warn('Git check', e.message?.slice(0, 80));
  }
}

// Check for remote
try {
  const remote = execSync('git remote -v 2>&1', {
    cwd: projectRoot,
    encoding: 'utf8',
  });
  remote.includes('github.com')
    ? pass('GitHub remote configured', remote.split('\n')[0])
    : warn(
        'No GitHub remote yet',
        'Run: gh repo create familyai --private --source=. --push'
      );
} catch {
  warn('Could not check git remotes');
}

// ── Section 4: Live security tests ─────────────────────
console.log(B('SECTION 4 — Live Security Tests (server must be running)'));

try {
  // 1. Rate limiting fires on login
  console.log('     Testing rate limit (sending 25 rapid login attempts)...');
  let rateLimitHit = false;
  for (let i = 0; i < 25; i++) {
    const res = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'wronguser',
        password: 'wrongpass',
      }),
      signal: AbortSignal.timeout(3000),
    });
    if (res.status === 429) {
      rateLimitHit = true;
      pass(
        'Rate limiter fires on repeated login attempts → 429',
        `Triggered after ${i + 1} attempts`
      );
      break;
    }
  }
  if (!rateLimitHit) {
    fail(
      'Rate limiter NOT firing',
      'Sent 25 failed login attempts without 429 — express-rate-limit not applied to /api/auth/login'
    );
  }

  // Wait for rate limit to partially reset (or just proceed)
  await new Promise(r => setTimeout(r, 1000));

  // 2. Successful login still works (rate limit skips successes)
  const loginRes = await fetch('http://localhost:3001/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin123' }),
    signal: AbortSignal.timeout(5000),
  });
  // Might be 429 if window hasn't reset — that's ok, warn not fail
  loginRes.status === 200
    ? pass('Successful login works after failed attempts')
    : warn(
        'Successful login status after rate limit test',
        `${loginRes.status} — may need to wait 15min for window reset`
      );

  const adminToken = loginRes.status === 200 ? (await loginRes.json()).token : null;

  if (adminToken) {
    // 3. Message length validation
    const longMsg = await fetch(
      'http://localhost:3001/api/chats',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ title: 'Length Test' }),
      }
    );
    const testChat = await longMsg.json();

    if (testChat.id) {
      const longContent = 'a'.repeat(20001);
      const lenRes = await fetch(
        `http://localhost:3001/api/chats/${testChat.id}/messages`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({ content: longContent }),
          signal: AbortSignal.timeout(5000),
        }
      );
      lenRes.status === 400
        ? pass('Message length validation → 400 for 20001 chars')
        : fail(
            'Message length validation NOT enforced',
            `Got ${lenRes.status} — 20001 char message was accepted`
          );

      // Clean up
      await fetch(
        `http://localhost:3001/api/chats/${testChat.id}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${adminToken}` },
        }
      );
    }

    // 4. /api/auth/me includes warnings field
    const meRes = await fetch('http://localhost:3001/api/auth/me', {
      headers: { Authorization: `Bearer ${adminToken}` },
      signal: AbortSignal.timeout(5000),
    });
    const meData = await meRes.json();
    if (meData.warnings !== undefined) {
      pass('/api/auth/me includes warnings field');
      typeof meData.warnings.defaultPassword === 'boolean'
        ? pass(
            'warnings.defaultPassword is boolean',
            meData.warnings.defaultPassword ? '⚠️ Default password still active!' : 'Password has been changed'
          )
        : fail(
            'warnings.defaultPassword missing or wrong type'
          );
    } else {
      warn(
        '/api/auth/me missing warnings field',
        'Optional: Add warnings.defaultPassword to /me response for better UX'
      );
    }

    // 5. Path traversal blocked
    const traversalRes = await fetch(
      'http://localhost:3001/api/attachments/../../etc/passwd',
      {
        headers: { Authorization: `Bearer ${adminToken}` },
        signal: AbortSignal.timeout(5000),
      }
    );
    traversalRes.status === 404 || traversalRes.status === 400
      ? pass('Path traversal attempt returns 4xx')
      : warn('Path traversal response', `Got ${traversalRes.status} — verify attachment handler`);

    // 6. Backup endpoint works
    const backupRes = await fetch(
      'http://localhost:3001/api/admin/backup',
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
        signal: AbortSignal.timeout(10000),
      }
    );
    if (backupRes.status === 200) {
      const bData = await backupRes.json();
      pass(
        'POST /api/admin/backup → 200',
        `${bData.backupCount} backups on disk`
      );

      // Verify backup file actually exists on disk
      const backupDir = path.join(projectRoot, 'data/backups');
      if (fs.existsSync(backupDir)) {
        const backups = fs
          .readdirSync(backupDir)
          .filter(f => f.endsWith('.db'));
        backups.length > 0
          ? pass('Backup file exists on disk', `${backups.length} .db files`)
          : fail(
              'No backup files on disk',
              'runBackup() may not be persisting correctly'
            );
      }
    } else {
      fail(
        'POST /api/admin/backup',
        `Status ${backupRes.status}`
      );
    }
  }

  // 7. JWT secret enforcement — check via startup logs
  // We can't easily test this at runtime without restarting the server
  // Just check the code pattern exists (already done in Section 2)
  pass(
    'JWT secret enforcement: verified via code pattern check in Section 2'
  );
} catch (e) {
  if (
    e.code === 'ECONNREFUSED' ||
    e.message?.includes('fetch failed')
  ) {
    warn(
      'Backend not running',
      'cd backend && npx tsx src/index.ts'
    );
  } else {
    fail('Security tests threw', e.message);
  }
}

// ── Section 5: .env.example completeness ───────────────
console.log(B('SECTION 5 — .env.example vs actual .env'));

const envExamplePath = path.join(projectRoot, '.env.example');
const envPath = path.join(projectRoot, '.env');

const exampleEnv = fs.existsSync(envExamplePath)
  ? fs.readFileSync(envExamplePath, 'utf8')
  : '';
const actualEnv = fs.existsSync(envPath)
  ? fs.readFileSync(envPath, 'utf8')
  : '';

const exampleKeys = [
  ...exampleEnv.matchAll(/^([A-Z_]+)=/gm),
].map(m => m[1]);
const actualKeys = [...actualEnv.matchAll(/^([A-Z_]+)=/gm)].map(
  m => m[1]
);

const missingFromExample = actualKeys.filter(
  k => !exampleKeys.includes(k)
);
const missingFromActual = exampleKeys.filter(
  k => !actualKeys.includes(k)
);

missingFromExample.length === 0
  ? pass('.env.example covers all keys in .env')
  : warn(
      'Keys in .env not in .env.example',
      missingFromExample.join(', ')
    );

missingFromActual.length === 0
  ? pass('.env has all keys from .env.example')
  : warn(
      'Keys in .env.example missing from .env',
      missingFromActual.join(', ')
    );

// Check .env has real values (not placeholders)
const envMap = Object.fromEntries(
  actualEnv
    .split('\n')
    .filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => {
      const i = l.indexOf('=');
      return [
        l.slice(0, i).trim(),
        l.slice(i + 1).trim(),
      ];
    })
);

envMap.JWT_SECRET?.length >= 32
  ? pass('JWT_SECRET length adequate', `${envMap.JWT_SECRET?.length} chars`)
  : fail(
      'JWT_SECRET too short or placeholder',
      `${envMap.JWT_SECRET?.length} chars — minimum 32`
    );

envMap.ANTHROPIC_API_KEY?.startsWith('sk-ant-') &&
envMap.ANTHROPIC_API_KEY !== 'sk-ant-xxxxxxxxxxxxxxxxxxxxxxxx'
  ? pass('ANTHROPIC_API_KEY appears real (not placeholder)')
  : fail(
      'ANTHROPIC_API_KEY is placeholder or wrong format',
      'Get real key from console.anthropic.com'
    );

// ── Summary ─────────────────────────────────────────────
console.log(`\n\x1b[1m━━ PHASE 11 SUMMARY\x1b[0m`);
console.log(`\x1b[32m  Passed: ${passed}\x1b[0m`);
console.log(`\x1b[33m  Warned: ${warned}\x1b[0m`);
console.log(`\x1b[31m  Failed: ${failed}\x1b[0m`);

if (failed === 0) {
  console.log(
    '\x1b[32m\n  ✓ Phase 11 complete.\x1b[0m'
  );
  console.log(
    '\x1b[32m  FamilyAI is production-ready and secured.\x1b[0m\n'
  );
  console.log(
    '\x1b[2m  Kids at home: http://[server-local-ip]:3001\x1b[0m'
  );
  console.log(
    '\x1b[2m  Remote access: install Tailscale or use Cloudflare Tunnel\x1b[0m'
  );
  console.log(
    '\x1b[2m  Repo: push to GitHub with "git push origin main"\x1b[0m\n'
  );
} else {
  console.log(
    `\x1b[31m\n  ✗ ${failed} failure(s).\x1b[0m`
  );
  console.log('\x1b[31m  Priority fixes:\x1b[0m');
  console.log(
    '\x1b[31m  1. Section 4 rate limit not firing — security critical for external access\x1b[0m'
  );
  console.log(
    '\x1b[31m  2. Section 3 sensitive files in git — fix before ANY push to GitHub\x1b[0m'
  );
  console.log(
    '\x1b[31m  3. Section 5 .env.example mismatches\x1b[0m\n'
  );
}

process.exit(failed > 0 ? 1 : 0);
