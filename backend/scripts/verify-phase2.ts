// backend/scripts/verify-phase2.ts
// Run with: npx tsx scripts/verify-phase2.ts
// SERVER MUST BE RUNNING: npx tsx src/index.ts (separate terminal)

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

// ─── Colours ────────────────────────────────────────────────────────────────
const G = (s: string) => `\x1b[32m${s}\x1b[0m`;
const R = (s: string) => `\x1b[31m${s}\x1b[0m`;
const Y = (s: string) => `\x1b[33m${s}\x1b[0m`;
const B = (s: string) => `\x1b[1m${s}\x1b[0m`;
const D = (s: string) => `\x1b[2m${s}\x1b[0m`;

let passed = 0;
let failed = 0;
let warned = 0;

function pass(label: string, detail = '') {
  console.log(G('  ✓') + ` ${label}` + (detail ? D(`  → ${detail}`) : ''));
  passed++;
}
function fail(label: string, detail = '') {
  console.log(R('  ✗') + ` ${label}` + (detail ? `  ${R('→')} ${detail}` : ''));
  failed++;
}
function warn(label: string, detail = '') {
  console.log(Y('  ⚠') + ` ${label}` + (detail ? `  → ${detail}` : ''));
  warned++;
}
function section(title: string) {
  console.log(`\n${B('━━ ' + title)}`);
}
function info(msg: string) {
  console.log(D(`     ${msg}`));
}

// ─── Config ─────────────────────────────────────────────────────────────────
const SCRIPT_DIR  = path.dirname(fileURLToPath(import.meta.url));
const BACKEND_DIR = path.resolve(SCRIPT_DIR, '..');
const ROOT_DIR    = path.resolve(BACKEND_DIR, '..');

const envContent = fs.existsSync(path.join(ROOT_DIR, '.env'))
  ? fs.readFileSync(path.join(ROOT_DIR, '.env'), 'utf-8')
  : '';
const envMap: Record<string, string> = {};
for (const line of envContent.split('\n')) {
  const t = line.trim();
  if (t && !t.startsWith('#') && t.includes('=')) {
    const i = t.indexOf('=');
    envMap[t.slice(0, i).trim()] = t.slice(i + 1).trim();
  }
}

const PORT    = envMap.PORT || '3001';
const BASE    = `http://localhost:${PORT}`;
const TIMEOUT = 5000;

// ─── HTTP helpers ────────────────────────────────────────────────────────────
async function req(
  method: string,
  path: string,
  body?: object,
  token?: string
): Promise<{ status: number; data: any; raw: string }> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(TIMEOUT),
  });
  const raw = await res.text();
  let data: any = raw;
  try { data = JSON.parse(raw); } catch { /* leave as string */ }
  return { status: res.status, data, raw };
}

// ─── JWT decode (no verification — just inspect payload) ─────────────────────
function decodeJwtPayload(token: string): Record<string, any> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const padded = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(Buffer.from(padded, 'base64').toString('utf-8'));
  } catch { return null; }
}

// ════════════════════════════════════════════════════════════════════════════
// SECTION 1 — File Existence & Static Code Checks
// ════════════════════════════════════════════════════════════════════════════
section('SECTION 1 — File Existence');

const REQUIRED_FILES = [
  path.join(BACKEND_DIR, 'src', 'middleware', 'auth.ts'),
  path.join(BACKEND_DIR, 'src', 'routes', 'auth.ts'),
];

for (const f of REQUIRED_FILES) {
  if (fs.existsSync(f)) {
    pass(`File exists: ${path.relative(ROOT_DIR, f)}`);
  } else {
    fail(`File exists: ${path.relative(ROOT_DIR, f)}`);
  }
}

// ─── Static code pattern checks ─────────────────────────────────────────────
section('SECTION 1b — Static Code Analysis');

const authMiddlewarePath = path.join(BACKEND_DIR, 'src', 'middleware', 'auth.ts');
const authRoutePath      = path.join(BACKEND_DIR, 'src', 'routes', 'auth.ts');
const indexPath          = path.join(BACKEND_DIR, 'src', 'index.ts');

if (fs.existsSync(authMiddlewarePath)) {
  const mw = fs.readFileSync(authMiddlewarePath, 'utf-8');

  if (mw.includes('jwt.verify') || mw.includes('verify(')) {
    pass('auth middleware calls jwt.verify');
  } else {
    fail('auth middleware calls jwt.verify', 'Token is never verified — security hole');
  }

  if (mw.includes('Bearer')) {
    pass('auth middleware checks Bearer prefix');
  } else {
    fail('auth middleware checks Bearer prefix');
  }

  if (mw.includes('is_active') || mw.includes('isActive')) {
    pass('auth middleware checks is_active');
  } else {
    fail('auth middleware checks is_active', 'Disabled users can still authenticate');
  }

  if (mw.includes('req.user')) {
    pass('auth middleware attaches req.user');
  } else {
    fail('auth middleware attaches req.user', 'Downstream routes will have no user context');
  }
}

if (fs.existsSync(authRoutePath)) {
  const ar = fs.readFileSync(authRoutePath, 'utf-8');

  // Scrypt params must exactly match Phase 1 verified values
  if (ar.includes('N:16384') || ar.includes('N: 16384')) {
    pass('auth route uses scrypt N=16384');
  } else {
    fail('auth route uses scrypt N=16384', 
      'Param mismatch = every login fails silently. Must match seed.ts exactly.');
  }

  if (ar.includes('r:8') || ar.includes('r: 8')) {
    pass('auth route uses scrypt r=8');
  } else {
    fail('auth route uses scrypt r=8', 'Param mismatch');
  }

  if (ar.includes('p:1') || ar.includes('p: 1')) {
    pass('auth route uses scrypt p=1');
  } else {
    fail('auth route uses scrypt p=1', 'Param mismatch');
  }

  if (ar.includes('64') && ar.includes('scrypt')) {
    pass('auth route uses scrypt keylen=64');
  } else {
    warn('auth route keylen', 'Verify keylen=64 matches seed.ts');
  }

  if (ar.includes('activity_log') || ar.includes('activityLog')) {
    pass('auth route writes to activity_log');
  } else {
    fail('auth route writes to activity_log', 'Login events will be invisible to admin dashboard');
  }

  if (ar.includes('jwt.sign') || ar.includes('sign(')) {
    pass('auth route signs JWT');
  } else {
    fail('auth route signs JWT', 'No token generated on login');
  }
}

if (fs.existsSync(indexPath)) {
  const idx = fs.readFileSync(indexPath, 'utf-8');
  // Look for app.use('/api/auth' and app.use('/api', authMiddleware)
  const authRouterMatch = idx.match(/app\.use\(['"]\/api\/auth['"],\s*authRouter/);
  const authMiddlewareMatch = idx.match(/app\.use\(['"]\/api['"],\s*authMiddleware/);

  if (authRouterMatch && authMiddlewareMatch) {
    const authRouterPos = idx.indexOf(authRouterMatch[0]);
    const authMiddlewarePos = idx.indexOf(authMiddlewareMatch[0]);
    
    if (authRouterPos < authMiddlewarePos) {
      pass('Auth router registered BEFORE authMiddleware in index.ts');
    } else {
      fail('Auth router registered BEFORE authMiddleware in index.ts',
        'Order is reversed — /api/auth/login will require a token to log in');
    }
  } else {
    warn('Route registration order', 'Could not determine order from index.ts — verify manually');
  }
}

// ════════════════════════════════════════════════════════════════════════════
// SECTION 2 — Server Reachability
// ════════════════════════════════════════════════════════════════════════════
section('SECTION 2 — Server Reachability');

let serverUp = false;
try {
  const health = await req('GET', '/api/health');
  if (health.status === 200) {
    pass(`Server running on port ${PORT}`);
    serverUp = true;
  } else {
    fail(`Server running on port ${PORT}`, `Status ${health.status}`);
  }
} catch {
  fail(`Server running on port ${PORT}`, 'Connection refused — start the server first');
}

if (!serverUp) {
  console.log(R('\n  Server is not running. Start it with: npx tsx src/index.ts\n'));
  console.log(Y(`  Passed so far: ${passed} | Warned: ${warned} | Failed: ${failed}\n`));
  process.exit(1);
}

// ════════════════════════════════════════════════════════════════════════════
// SECTION 3 — Login Endpoint (POST /api/auth/login)
// ════════════════════════════════════════════════════════════════════════════
section('SECTION 3 — POST /api/auth/login');

// 3a. Correct credentials
let validToken = '';
let loginUser: any = null;

const loginOk = await req('POST', '/api/auth/login', {
  username: 'admin',
  password: 'admin123',
});
info(`Status: ${loginOk.status}`);

if (loginOk.status === 200) {
  pass('Login with correct credentials → 200');
} else {
  fail('Login with correct credentials → 200',
    `Got ${loginOk.status}: ${JSON.stringify(loginOk.data)}`);
}

if (loginOk.data?.token && typeof loginOk.data.token === 'string') {
  pass('Response contains token string');
  validToken = loginOk.data.token;
} else {
  fail('Response contains token string', 'No token in response body');
}

if (loginOk.data?.user) {
  loginUser = loginOk.data.user;
  pass('Response contains user object');

  if (!loginUser.password_hash && !loginUser.passwordHash) {
    pass('User object does NOT expose password_hash');
  } else {
    fail('User object does NOT expose password_hash',
      'SECURITY: password hash is being returned to the client');
  }

  if (loginUser.role === 'admin') {
    pass('User role is correct', 'admin');
  } else {
    fail('User role is correct', `Got "${loginUser.role}"`);
  }

  if (loginUser.id && loginUser.username && loginUser.displayName) {
    pass('User object has required fields', 'id, username, displayName present');
  } else {
    fail('User object has required fields',
      `Missing: ${['id','username','displayName'].filter(k => !loginUser[k]).join(', ')}`);
  }
} else {
  fail('Response contains user object');
}

if (loginOk.data?.settings) {
  const s = loginOk.data.settings;
  pass('Response contains settings object');
  if (s.defaultModel === 'claude-haiku-4-5-20251001') {
    pass('Settings defaultModel correct', 'claude-haiku-4-5-20251001');
  } else {
    warn('Settings defaultModel', `Got "${s.defaultModel}"`);
  }
} else {
  fail('Response contains settings object');
}

// 3b. JWT structure
section('SECTION 3b — JWT Structure');

if (validToken) {
  const parts = validToken.split('.');
  if (parts.length === 3) {
    pass('Token is 3-part JWT (header.payload.signature)');
  } else {
    fail('Token is 3-part JWT', `Has ${parts.length} parts`);
  }

  const payload = decodeJwtPayload(validToken);
  if (payload) {
    pass('JWT payload is valid JSON');
    info(`Payload: ${JSON.stringify(payload)}`);

    if (payload.userId) {
      pass('JWT payload contains userId', payload.userId);
    } else {
      fail('JWT payload contains userId',
        `Payload keys: ${Object.keys(payload).join(', ')} — must be "userId" exactly`);
    }

    if (payload.exp) {
      const expiresAt = new Date(payload.exp * 1000);
      const now = new Date();
      const daysUntilExpiry = (expiresAt.getTime() - now.getTime()) / 86400000;
      pass('JWT has expiry (exp claim)', `Expires ${expiresAt.toISOString()} (~${Math.round(daysUntilExpiry)} days)`);
      if (daysUntilExpiry > 1 && daysUntilExpiry < 400) {
        pass('JWT expiry is reasonable', `${Math.round(daysUntilExpiry)} days`);
      } else {
        warn('JWT expiry duration', `${Math.round(daysUntilExpiry)} days — check JWT_EXPIRY in .env`);
      }
    } else {
      fail('JWT has expiry (exp claim)', 'Token never expires — security risk');
    }

    if (payload.iat) {
      pass('JWT has issued-at (iat claim)');
    } else {
      warn('JWT missing iat claim', 'Minor — jsonwebtoken adds this by default');
    }
  } else {
    fail('JWT payload is valid JSON');
  }
}

// 3c. Wrong password
const loginWrongPw = await req('POST', '/api/auth/login', {
  username: 'admin',
  password: 'wrongpassword',
});
info(`Wrong password status: ${loginWrongPw.status}`);

if (loginWrongPw.status === 401) {
  pass('Wrong password → 401');
} else {
  fail('Wrong password → 401', `Got ${loginWrongPw.status}`);
}

// 3d. Wrong username
const loginWrongUser = await req('POST', '/api/auth/login', {
  username: 'doesnotexist',
  password: 'admin123',
});
info(`Wrong username status: ${loginWrongUser.status}`);

if (loginWrongUser.status === 401) {
  pass('Non-existent username → 401');
} else {
  fail('Non-existent username → 401', `Got ${loginWrongUser.status}`);
}

// 3e. No user enumeration
const msgWrongPw   = JSON.stringify(loginWrongPw.data?.error || loginWrongPw.data);
const msgWrongUser = JSON.stringify(loginWrongUser.data?.error || loginWrongUser.data);

if (msgWrongPw === msgWrongUser) {
  pass('No user enumeration — identical error messages for wrong password vs wrong username',
    msgWrongPw);
} else {
  fail('No user enumeration',
    `Wrong password: "${msgWrongPw}" | Wrong username: "${msgWrongUser}" — these must be identical`);
}

// 3f. Empty body
const loginEmpty = await req('POST', '/api/auth/login', {});
if (loginEmpty.status >= 400) {
  pass('Empty body → error response', `Status ${loginEmpty.status}`);
} else {
  fail('Empty body → error response', `Got ${loginEmpty.status}`);
}

// 3g. Missing password field
const loginNoPassword = await req('POST', '/api/auth/login', { username: 'admin' });
if (loginNoPassword.status >= 400) {
  pass('Missing password field → error response', `Status ${loginNoPassword.status}`);
} else {
  fail('Missing password field → error response', `Got ${loginNoPassword.status}`);
}

// ════════════════════════════════════════════════════════════════════════════
// SECTION 4 — GET /api/auth/me
// ════════════════════════════════════════════════════════════════════════════
section('SECTION 4 — GET /api/auth/me');

// 4a. Valid token
const meOk = await req('GET', '/api/auth/me', undefined, validToken);
if (meOk.status === 200) {
  pass('Valid token → 200');
} else {
  fail('Valid token → 200', `Got ${meOk.status}: ${JSON.stringify(meOk.data)}`);
}

if (meOk.data?.user && meOk.data?.settings) {
  pass('Response contains user and settings');
} else {
  fail('Response contains user and settings',
    `Keys: ${Object.keys(meOk.data || {}).join(', ')}`);
}

// 4b. No token
const meNoToken = await req('GET', '/api/auth/me');
if (meNoToken.status === 401) {
  pass('No token → 401');
} else {
  fail('No token → 401', `Got ${meNoToken.status}`);
}

// 4c. Invalid token (random string)
const meInvalidToken = await req('GET', '/api/auth/me', undefined, 'not.a.real.token');
if (meInvalidToken.status === 401) {
  pass('Invalid token → 401');
} else {
  fail('Invalid token → 401', `Got ${meInvalidToken.status}`);
}

// 4d. Malformed bearer (missing 'Bearer ' prefix)
const meMalformed = await req('GET', '/api/auth/me', undefined, undefined);
// Manually add wrong header format
const malformedRes = await fetch(`${BASE}/api/auth/me`, {
  headers: { 'Authorization': validToken },  // no "Bearer " prefix
  signal: AbortSignal.timeout(TIMEOUT),
});
if (malformedRes.status === 401) {
  pass('Token without "Bearer " prefix → 401');
} else {
  fail('Token without "Bearer " prefix → 401',
    `Got ${malformedRes.status} — missing Bearer prefix check`);
}

// 4e. Expired token (manually crafted)
// We can't easily create an expired JWT without the secret, so we just verify
// the error response shape for invalid tokens
if (meInvalidToken.data?.error) {
  pass('401 response has error field', meInvalidToken.data.error);
} else {
  warn('401 response shape', 'No error field in 401 response body');
}

// ════════════════════════════════════════════════════════════════════════════
// SECTION 5 — POST /api/auth/logout
// ════════════════════════════════════════════════════════════════════════════
section('SECTION 5 — POST /api/auth/logout');

const logoutOk = await req('POST', '/api/auth/logout', undefined, validToken);
if (logoutOk.status === 200) {
  pass('Logout with valid token → 200');
} else {
  fail('Logout with valid token → 200', `Got ${logoutOk.status}`);
}

if (logoutOk.data?.ok === true) {
  pass('Logout response body is { ok: true }');
} else {
  fail('Logout response body is { ok: true }', JSON.stringify(logoutOk.data));
}

// JWT is stateless — token still works after "logout" (client-side only)
const meAfterLogout = await req('GET', '/api/auth/me', undefined, validToken);
if (meAfterLogout.status === 200) {
  pass('Token still valid after logout (stateless JWT — correct)');
  info('Client discards the token; server has no blocklist. This is expected and correct.');
} else {
  warn('Post-logout token behaviour',
    'Token rejected after logout — this would break multi-tab usage. JWT should be stateless.');
}

// Logout without token
const logoutNoToken = await req('POST', '/api/auth/logout');
if (logoutNoToken.status === 401) {
  pass('Logout without token → 401');
} else {
  fail('Logout without token → 401', `Got ${logoutNoToken.status}`);
}

// ════════════════════════════════════════════════════════════════════════════
// SECTION 6 — PUT /api/auth/password
// ════════════════════════════════════════════════════════════════════════════
section('SECTION 6 — PUT /api/auth/password');

const NEW_PASSWORD = 'NewSecurePass99!';

// 6a. Wrong current password
const pwWrongCurrent = await req('PUT', '/api/auth/password', {
  currentPassword: 'wrongpassword',
  newPassword: NEW_PASSWORD,
}, validToken);

if (pwWrongCurrent.status === 400 || pwWrongCurrent.status === 401) {
  pass('Wrong currentPassword → error', `Status ${pwWrongCurrent.status}`);
} else {
  fail('Wrong currentPassword → error',
    `Got ${pwWrongCurrent.status} — should reject wrong current password`);
}

// 6b. New password too short
const pwTooShort = await req('PUT', '/api/auth/password', {
  currentPassword: 'admin123',
  newPassword: 'abc',
}, validToken);

if (pwTooShort.status === 400) {
  pass('Short newPassword (<8 chars) → 400');
} else {
  fail('Short newPassword (<8 chars) → 400',
    `Got ${pwTooShort.status} — minimum length not enforced`);
}

// 6c. Successful password change
const pwChange = await req('PUT', '/api/auth/password', {
  currentPassword: 'admin123',
  newPassword: NEW_PASSWORD,
}, validToken);

if (pwChange.status === 200) {
  pass('Password change with correct currentPassword → 200');
} else {
  fail('Password change with correct currentPassword → 200',
    `Got ${pwChange.status}: ${JSON.stringify(pwChange.data)}`);
}

if (pwChange.data?.ok === true) {
  pass('Password change response is { ok: true }');
} else {
  fail('Password change response is { ok: true }', JSON.stringify(pwChange.data));
}

// 6d. Login with new password works
const loginNewPw = await req('POST', '/api/auth/login', {
  username: 'admin',
  password: NEW_PASSWORD,
});

if (loginNewPw.status === 200 && loginNewPw.data?.token) {
  pass('Login with new password succeeds after change');
  validToken = loginNewPw.data.token; // update token for remaining tests
} else {
  fail('Login with new password succeeds after change',
    `Got ${loginNewPw.status} — hash may not have been saved correctly`);
}

// 6e. Login with OLD password now fails
const loginOldPw = await req('POST', '/api/auth/login', {
  username: 'admin',
  password: 'admin123',
});

if (loginOldPw.status === 401) {
  pass('Login with OLD password fails after change');
} else {
  fail('Login with OLD password fails after change',
    `Got ${loginOldPw.status} — old password still works, change was not persisted`);
}

// 6f. Restore original password for subsequent phases
const restorePass = await req('PUT', '/api/auth/password', {
  currentPassword: NEW_PASSWORD,
  newPassword: 'admin123',
}, validToken);

if (restorePass.status === 200) {
  pass('Password restored to admin123 for subsequent phases');
  const reLogin = await req('POST', '/api/auth/login', {
    username: 'admin', password: 'admin123'
  });
  if (reLogin.status === 200) {
    validToken = reLogin.data.token;
    pass('Re-login with admin123 succeeds after restore');
  } else {
    fail('Re-login with admin123 succeeds after restore');
  }
} else {
  warn('Password restore', 'Could not restore to admin123 — do it manually before Phase 3');
}

// 6g. Password change without token
const pwNoToken = await req('PUT', '/api/auth/password', {
  currentPassword: 'admin123',
  newPassword: NEW_PASSWORD,
});
if (pwNoToken.status === 401) {
  pass('Password change without token → 401');
} else {
  fail('Password change without token → 401', `Got ${pwNoToken.status}`);
}

// ════════════════════════════════════════════════════════════════════════════
// SECTION 7 — Activity Log Verification
// ════════════════════════════════════════════════════════════════════════════
section('SECTION 7 — Activity Log Entries');
info('Reading activity_log directly from database file...');

try {
  const initSqlJs = (await import('sql.js')).default;
  const SQL = await initSqlJs();
  const DB_PATH = path.join(ROOT_DIR, 'data', 'familyai.db');
  const db = new SQL.Database(fs.readFileSync(DB_PATH));

  const queryAll = (sql: string, params: any[] = []): Record<string, any>[] => {
    const stmt = db.prepare(sql);
    const rows: Record<string, any>[] = [];
    stmt.bind(params);
    while (stmt.step()) rows.push(stmt.getAsObject());
    stmt.free();
    return rows;
  };

  const loginEvents = queryAll(
    `SELECT * FROM activity_log WHERE event_type = 'login' ORDER BY created_at DESC LIMIT 5`
  );
  if (loginEvents.length > 0) {
    pass('Login events recorded in activity_log', `${loginEvents.length} entries found`);
    info(`Most recent: user_id=${loginEvents[0].user_id} at ${loginEvents[0].created_at}`);
  } else {
    fail('Login events recorded in activity_log',
      'No login events found — activity logging is broken');
  }

  const logoutEvents = queryAll(
    `SELECT * FROM activity_log WHERE event_type = 'logout' ORDER BY created_at DESC LIMIT 5`
  );
  if (logoutEvents.length > 0) {
    pass('Logout events recorded in activity_log', `${logoutEvents.length} entries found`);
  } else {
    fail('Logout events recorded in activity_log');
  }

  const pwEvents = queryAll(
    `SELECT * FROM activity_log WHERE event_type = 'password_changed' ORDER BY created_at DESC LIMIT 5`
  );
  if (pwEvents.length > 0) {
    pass('Password change events recorded in activity_log');
  } else {
    fail('Password change events recorded in activity_log');
  }

  // Check event_data is valid JSON
  const loginEvent = loginEvents[0];
  if (loginEvent?.event_data) {
    try {
      const parsed = JSON.parse(loginEvent.event_data);
      pass('Login event_data is valid JSON', JSON.stringify(parsed));
    } catch {
      fail('Login event_data is valid JSON', `Raw: ${loginEvent.event_data}`);
    }
  }

  // Check ip_address was captured
  if (loginEvent?.ip_address) {
    pass('Login event has ip_address', loginEvent.ip_address);
  } else {
    warn('Login event ip_address', 'Not captured — admin visibility is reduced');
  }

  db.close();
} catch (err: any) {
  warn('Activity log DB check', `Could not read DB: ${err.message}`);
}

// ════════════════════════════════════════════════════════════════════════════
// SECTION 8 — Protected Route Coverage
// ════════════════════════════════════════════════════════════════════════════
section('SECTION 8 — Auth Middleware Coverage');
info('Verifying authMiddleware is applied to non-auth routes...');

// These routes don't exist yet but the auth middleware should reject them
// before they 404 — a 401 means auth ran, a 404 means auth was skipped
const protectedRoutes = [
  { method: 'GET',  path: '/api/projects' },
  { method: 'GET',  path: '/api/chats' },
  { method: 'GET',  path: '/api/models' },
  { method: 'GET',  path: '/api/admin/stats' },
];

for (const route of protectedRoutes) {
  try {
    const res = await req(route.method, route.path);
    if (res.status === 401) {
      pass(`${route.method} ${route.path} → 401 without token (auth middleware active)`);
    } else if (res.status === 404) {
      warn(`${route.method} ${route.path} → 404`,
        'Route not found — could not verify if auth middleware runs before 404. Check index.ts ordering.');
    } else {
      fail(`${route.method} ${route.path} → 401 without token`,
        `Got ${res.status} — route accessible without authentication`);
    }
  } catch {
    warn(`${route.method} ${route.path}`, 'Request failed — server may have crashed');
  }
}

// ════════════════════════════════════════════════════════════════════════════
// SECTION 9 — Response Shape Consistency
// ════════════════════════════════════════════════════════════════════════════
section('SECTION 9 — Response Shape Consistency');

// All errors should have an 'error' field, not 'message' or 'msg'
const errorResponses = [
  { label: 'wrong credentials', data: loginWrongPw.data },
  { label: 'no token on /me', data: meNoToken.data },
  { label: 'invalid token on /me', data: meInvalidToken.data },
];

for (const { label, data } of errorResponses) {
  if (data?.error && typeof data.error === 'string') {
    pass(`Error response for "${label}" has { error: string }`, data.error);
  } else if (data?.message) {
    warn(`Error response for "${label}"`,
      'Uses "message" field instead of "error" — frontend error handling must be consistent');
  } else {
    fail(`Error response for "${label}" has { error: string }`,
      `Got: ${JSON.stringify(data)}`);
  }
}

// ════════════════════════════════════════════════════════════════════════════
// SUMMARY
// ════════════════════════════════════════════════════════════════════════════
console.log(`\n${B('━━ PHASE 2 VERIFICATION SUMMARY')}`);
console.log(G(`  Passed: ${passed}`));
console.log(Y(`  Warned: ${warned}`));
console.log(R(`  Failed: ${failed}`));

if (failed === 0 && warned === 0) {
  console.log(G('\n  ✓ Phase 2 is clean. Proceed to Phase 3.\n'));
  console.log(D('  Phase 3: Projects and Chats CRUD routes + hard data isolation\n'));
  process.exit(0);
} else if (failed === 0) {
  console.log(Y('\n  ⚠ Phase 2 has warnings — review before Phase 3.\n'));
  process.exit(0);
} else {
  console.log(R(`\n  ✗ ${failed} failure(s) — fix before Phase 3.\n`));
  process.exit(1);
}
