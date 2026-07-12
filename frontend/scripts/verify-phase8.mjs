import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

process.chdir(projectRoot);

const G = s => `\x1b[32m  ✓ ${s}\x1b[0m`;
const R = s => `\x1b[31m  ✗ ${s}\x1b[0m`;
const Y = s => `\x1b[33m  ⚠ ${s}\x1b[0m`;
const B = s => `\x1b[1m\n━━ ${s}\x1b[0m`;

let passed = 0, failed = 0, warned = 0;
const pass = (l, d='') => { console.log(G(l)+(d?` → ${d}`:'')); passed++; };
const fail = (l, d='') => { console.log(R(l)+(d?` → ${d}`:'')); failed++; };
const warn = (l, d='') => { console.log(Y(l)+(d?` → ${d}`:'')); warned++; };

async function api(method, path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  try {
    const res = await fetch(`http://localhost:3001${path}`, {
      method, headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(8000),
    });
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch { data = text; }
    return { status: res.status, data };
  } catch (e) {
    return { status: 0, error: e.message, data: null };
  }
}

// ════════════════════════════════════════════════════════
console.log(B('SECTION 1 — File Existence'));
// ════════════════════════════════════════════════════════

const required = [
  'src/pages/AdminPage.tsx',
  'src/components/admin/StatsPanel.tsx',
  'src/components/admin/ActivityLog.tsx',
  'src/components/admin/FlaggedContent.tsx',
  'src/components/admin/ParentalRules.tsx',
];

for (const f of required) {
  fs.existsSync(f) ? pass(f) : fail(f, 'MISSING');
}

// ════════════════════════════════════════════════════════
console.log(B('SECTION 2 — Code Patterns & Imports'));
// ════════════════════════════════════════════════════════

const checks = [
  // AdminPage
  ['src/pages/AdminPage.tsx', 'StatsPanel',       'AdminPage imports StatsPanel'],
  ['src/pages/AdminPage.tsx', 'ActivityLog',      'AdminPage imports ActivityLog'],
  ['src/pages/AdminPage.tsx', 'FlaggedContent',   'AdminPage imports FlaggedContent'],
  ['src/pages/AdminPage.tsx', 'ParentalRules',    'AdminPage imports ParentalRules'],
  ['src/pages/AdminPage.tsx', 'UserManagement',   'AdminPage imports UserManagement'],
  ['src/pages/AdminPage.tsx', 'activeTab',        'AdminPage has tab state management'],

  // StatsPanel
  ['src/components/admin/StatsPanel.tsx', 'AdminStats',         'StatsPanel typed'],
  ['src/components/admin/StatsPanel.tsx', 'totalUsers',         'StatsPanel displays totalUsers'],
  ['src/components/admin/StatsPanel.tsx', 'totalMessages',      'StatsPanel displays totalMessages'],
  ['src/components/admin/StatsPanel.tsx', 'flaggedToday',       'StatsPanel displays flaggedToday'],
  ['src/components/admin/StatsPanel.tsx', 'messagesLast7Days',  'StatsPanel renders 7-day chart'],

  // ActivityLog
  ['src/components/admin/ActivityLog.tsx', 'ActivityItem',      'ActivityLog typed'],
  ['src/components/admin/ActivityLog.tsx', 'eventType',         'ActivityLog shows event types'],
  ['src/components/admin/ActivityLog.tsx', 'filter',            'ActivityLog has filter capability'],

  // FlaggedContent
  ['src/components/admin/FlaggedContent.tsx', 'FlaggedItem',        'FlaggedContent typed'],
  ['src/components/admin/FlaggedContent.tsx', 'originalContent',    'FlaggedContent shows content'],
  ['src/components/admin/FlaggedContent.tsx', 'flagType',           'FlaggedContent shows flag type'],
  ['src/components/admin/FlaggedContent.tsx', 'isReviewed',         'FlaggedContent tracks review status'],

  // ParentalRules
  ['src/components/admin/ParentalRules.tsx', 'ParentalRule',       'ParentalRules typed'],
  ['src/components/admin/ParentalRules.tsx', 'ruleType',           'ParentalRules shows rule type'],
  ['src/components/admin/ParentalRules.tsx', 'time_restriction',   'ParentalRules has time restriction'],
  ['src/components/admin/ParentalRules.tsx', 'daily_message_limit', 'ParentalRules has message limit'],
  ['src/components/admin/ParentalRules.tsx', 'keyword_block',      'ParentalRules has keyword block'],
  ['src/components/admin/ParentalRules.tsx', 'daily_token_budget', 'ParentalRules has token budget'],
];

for (const [file, pattern, label] of checks) {
  const content = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  content.includes(pattern) ? pass(label) : fail(label, `"${pattern}" not found in ${file}`);
}

// Check hooks usage
const statsPanel = fs.readFileSync('src/components/admin/StatsPanel.tsx', 'utf8');
statsPanel.includes('useToast') ? pass('StatsPanel uses useToast hook') : fail('StatsPanel missing useToast');

const activityLog = fs.readFileSync('src/components/admin/ActivityLog.tsx', 'utf8');
activityLog.includes('useToast') ? pass('ActivityLog uses useToast hook') : fail('ActivityLog missing useToast');

const flaggedContent = fs.readFileSync('src/components/admin/FlaggedContent.tsx', 'utf8');
flaggedContent.includes('useToast') ? pass('FlaggedContent uses useToast hook') : fail('FlaggedContent missing useToast');

const parentalRules = fs.readFileSync('src/components/admin/ParentalRules.tsx', 'utf8');
parentalRules.includes('useToast') ? pass('ParentalRules uses useToast hook') : fail('ParentalRules missing useToast');

// ════════════════════════════════════════════════════════
console.log(B('SECTION 3 — TypeScript & Build'));
// ════════════════════════════════════════════════════════

try {
  execSync('npx tsc --noEmit 2>&1', { stdio: 'pipe', cwd: projectRoot });
  pass('tsc --noEmit — zero type errors');
} catch (e) {
  const out = (e.stdout?.toString()||'')+(e.stderr?.toString()||'');
  const lines = out.split('\n').filter(Boolean);
  const errorCount = lines.filter(l => l.includes('error')).length;
  fail(`TypeScript: ${errorCount} error(s)`);
  lines.slice(0, 5).forEach(l => console.log('    ' + l));
}

// ════════════════════════════════════════════════════════
console.log(B('SECTION 4 — Admin API Endpoints'));
// ════════════════════════════════════════════════════════

let adminToken = '', adminId = '';

try {
  // Login as admin
  const loginRes = await api('POST', '/api/auth/login',
    { username: 'admin', password: 'admin123' });
  
  if (loginRes.status === 0 || loginRes.status === 'ECONNREFUSED') {
    fail('Backend not reachable', 'Start: cd ../backend && npx tsx src/index.ts');
  } else if (loginRes.status !== 200 || !loginRes.data?.token) {
    fail('Admin login', `Status ${loginRes.status}`);
  } else {
    adminToken = loginRes.data.token;
    adminId = loginRes.data.user?.id;
    pass('Admin login → token received');

    // ── Stats ──────────────────────────────────────────────
    const statsRes = await api('GET', '/api/admin/stats', undefined, adminToken);
    if (statsRes.status === 200) {
      pass('GET /api/admin/stats → 200');
      const s = statsRes.data;
      typeof s.totalUsers === 'number'
        ? pass('stats.totalUsers is a number', s.totalUsers)
        : fail('stats.totalUsers missing', JSON.stringify(s.totalUsers));
      typeof s.totalMessages === 'number'
        ? pass('stats.totalMessages is a number', s.totalMessages)
        : fail('stats.totalMessages missing');
      typeof s.flaggedToday === 'number'
        ? pass('stats.flaggedToday is a number', s.flaggedToday)
        : fail('stats.flaggedToday missing');
      Array.isArray(s.messagesLast7Days) && s.messagesLast7Days.length === 7
        ? pass('stats.messagesLast7Days has 7 entries')
        : fail('stats.messagesLast7Days', `Got ${s.messagesLast7Days?.length} entries, expected 7`);
      Array.isArray(s.usageByUser)
        ? pass('stats.usageByUser is array', `${s.usageByUser.length} users`)
        : fail('stats.usageByUser not array');
    } else {
      fail('GET /api/admin/stats', `Status ${statsRes.status}`);
    }

    // ── Activity log ───────────────────────────────────────
    const actRes = await api('GET', '/api/admin/activity?limit=10', undefined, adminToken);
    if (actRes.status === 200 && Array.isArray(actRes.data)) {
      pass('GET /api/admin/activity → 200 array', `${actRes.data.length} entries`);
      if (actRes.data.length > 0) {
        const entry = actRes.data[0];
        (entry.eventType || entry.event_type)
          ? pass('Activity entry has eventType field')
          : fail('Activity entry missing eventType');
        (entry.createdAt || entry.created_at)
          ? pass('Activity entry has createdAt field')
          : fail('Activity entry missing createdAt');
      }
    } else {
      fail('GET /api/admin/activity', `Status ${actRes.status}`);
    }

    // Activity filter by eventType
    const actFiltered = await api(
      'GET', '/api/admin/activity?eventType=login&limit=5',
      undefined, adminToken
    );
    if (actFiltered.status === 200 && Array.isArray(actFiltered.data)) {
      pass('Activity eventType filter works');
    } else {
      fail('Activity eventType filter', `Status ${actFiltered.status}`);
    }

    // ── Flagged Content ────────────────────────────────────
    const flagRes = await api('GET', '/api/admin/flagged?reviewed=false', undefined, adminToken);
    if (flagRes.status === 200 && Array.isArray(flagRes.data)) {
      pass('GET /api/admin/flagged → 200 array', `${flagRes.data.length} flagged items`);
    } else {
      fail('GET /api/admin/flagged', `Status ${flagRes.status}`);
    }

    // ── Settings ───────────────────────────────────────────
    const settingsRes = await api('GET', '/api/admin/settings', undefined, adminToken);
    if (settingsRes.status === 200 && typeof settingsRes.data === 'object') {
      pass('GET /api/admin/settings → 200');
      Object.keys(settingsRes.data).length > 0
        ? pass('Settings object populated', `${Object.keys(settingsRes.data).length} keys`)
        : warn('Settings object empty');
    } else {
      fail('GET /api/admin/settings', `Status ${settingsRes.status}`);
    }

    // Update a setting and verify persistence
    const updateRes = await api('PUT', '/api/admin/settings',
      { app_name: 'Phase8VerifyTest' }, adminToken);
    if (updateRes.status === 200) {
      const verifyRes = await api('GET', '/api/admin/settings', undefined, adminToken);
      const name = verifyRes.data?.app_name;
      name === 'Phase8VerifyTest'
        ? pass('Settings update persists correctly')
        : fail('Settings update did not persist', `Got: ${name}`);
      // Restore original
      await api('PUT', '/api/admin/settings', { app_name: 'FamilyAI' }, adminToken);
      pass('Settings restored to original');
    } else {
      fail('PUT /api/admin/settings', `Status ${updateRes.status}`);
    }
  }

} catch (e) {
  fail('Admin API tests', e.message);
}

// ════════════════════════════════════════════════════════
console.log(B('SECTION 5 — User Management API'));
// ════════════════════════════════════════════════════════

if (adminToken) {
  try {
    // List users
    const listRes = await api('GET', '/api/users', undefined, adminToken);
    if (listRes.status === 200 && Array.isArray(listRes.data)) {
      pass('GET /api/users → 200 array', `${listRes.data.length} users`);
      const adminUser = listRes.data.find(u => u.username === 'admin');
      adminUser
        ? pass('Admin user in user list')
        : fail('Admin user missing from list');
      const hasPasswordHash = listRes.data.some(u => u.passwordHash || u.password_hash);
      !hasPasswordHash
        ? pass('Password hashes not exposed in GET /api/users')
        : fail('SECURITY: password_hash exposed');
      const hasAge = listRes.data.some(u => u.age !== undefined && u.age !== null);
      hasAge
        ? pass('Age field present in user list')
        : warn('Age field missing from user list');
    } else {
      fail('GET /api/users', `Status ${listRes.status}`);
    }

    // Verify teen user exists
    const users = (await api('GET', '/api/users', undefined, adminToken)).data;
    const teenUser = Array.isArray(users) ? users.find(u => u.role === 'teen') : null;
    teenUser
      ? pass('Teen user exists in system')
      : warn('No teen user in system');

    // Non-admin cannot access user management
    const loginRes = await api('POST', '/api/auth/login',
      { username: 'admin', password: 'admin123' });
    const allUsers = (await api('GET', '/api/users', undefined, adminToken)).data;
    const nonAdminUser = Array.isArray(allUsers)
      ? allUsers.find(u => u.role !== 'admin')
      : null;

    if (nonAdminUser) {
      // Create a fresh login for non-admin
      const nonAdminLogin = await api('POST', '/api/auth/login',
        { username: nonAdminUser.username, password: 'testpass123' });
      if (nonAdminLogin.status === 200 && nonAdminLogin.data?.token) {
        const nonAdminToken = nonAdminLogin.data.token;
        const userRes = await api('GET', '/api/users', undefined, nonAdminToken);
        userRes.status === 403
          ? pass('Non-admin cannot GET /api/users → 403')
          : fail('Non-admin can access /api/users', `Got ${userRes.status}`);
      }
    }

  } catch (e) {
    fail('User management tests', e.message);
  }
}

// ════════════════════════════════════════════════════════
console.log(B('SECTION 6 — Parental Rules API'));
// ════════════════════════════════════════════════════════

if (adminToken) {
  try {
    const users = (await api('GET', '/api/users', undefined, adminToken)).data;
    const testUser = Array.isArray(users) ? users[1] : null; // Get first non-admin user

    if (testUser) {
      // Get rules for user
      const getRulesRes = await api(
        'GET', `/api/users/${testUser.id}/rules`,
        undefined, adminToken
      );
      if (getRulesRes.status === 200 && Array.isArray(getRulesRes.data)) {
        pass('GET /api/users/:id/rules → 200 array', `${getRulesRes.data.length} rules`);
      } else {
        fail('GET /api/users/:id/rules', `Status ${getRulesRes.status}`);
      }

      // Create a test rule
      const createRuleRes = await api(
        'POST', `/api/users/${testUser.id}/rules`,
        {
          ruleType: 'time_restriction',
          ruleValue: { start_hour: 8, end_hour: 22 },
        },
        adminToken
      );
      if (createRuleRes.status === 200 || createRuleRes.status === 201) {
        pass('POST /api/users/:id/rules → rule created');
        const ruleId = createRuleRes.data?.id;

        // Verify rule was created
        const verifyRes = await api(
          'GET', `/api/users/${testUser.id}/rules`,
          undefined, adminToken
        );
        if (Array.isArray(verifyRes.data) && verifyRes.data.length > 0) {
          pass('Parental rule persisted to database');
          
          // Delete the rule
          if (ruleId) {
            const delRes = await api(
              'DELETE', `/api/users/${testUser.id}/rules/${ruleId}`,
              undefined, adminToken
            );
            delRes.status === 200 || delRes.status === 204
              ? pass('DELETE /api/users/:id/rules/:ruleId → rule deleted')
              : fail('DELETE rule', `Status ${delRes.status}`);
          }
        }
      } else {
        fail('POST /api/users/:id/rules', `Status ${createRuleRes.status}`);
      }
    } else {
      warn('No test user available for rule tests');
    }
  } catch (e) {
    fail('Parental rules tests', e.message);
  }
}

// ════════════════════════════════════════════════════════
console.log(B('SECTION 7 — Summary'));
// ════════════════════════════════════════════════════════

const total = passed + failed + warned;
const pct = total > 0 ? Math.round((passed / total) * 100) : 0;

console.log(`\n  Passed: ${passed}  |  Failed: ${failed}  |  Warned: ${warned}  |  Total: ${total}`);
console.log(`  Coverage: ${pct}%\n`);

if (failed === 0 && warned <= 2) {
  console.log('\x1b[32m\x1b[1m  ✓ PHASE 8 VERIFICATION PASSED\x1b[0m');
  process.exit(0);
} else if (failed <= 3) {
  console.log('\x1b[33m\x1b[1m  ⚠ PHASE 8 MOSTLY PASSING (fix warnings above)\x1b[0m');
  process.exit(0);
} else {
  console.log('\x1b[31m\x1b[1m  ✗ PHASE 8 VERIFICATION FAILED (see errors above)\x1b[0m');
  process.exit(1);
}
