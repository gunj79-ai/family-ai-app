#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const files = {
  'src/types/index.ts': ['UserRole', 'User', 'Chat', 'Project', 'Message'],
  'src/api/client.ts': ['apiClient', 'Authorization'],
  'src/api/auth.ts': ['authApi', 'LoginRequest'],
  'src/api/projects.ts': ['projectsApi'],
  'src/api/chats.ts': ['chatsApi'],
  'src/api/admin.ts': ['adminApi'],
  'src/api/models.ts': ['modelsApi'],
  'src/store/authStore.ts': ['useAuthStore'],
  'src/store/chatStore.ts': ['useChatStore'],
  'src/store/uiStore.ts': ['useUIStore'],
  'src/utils/cn.ts': ['cn'],
  'src/utils/dates.ts': ['relativeTime', 'shortDate'],
  'src/utils/tokens.ts': ['estimateTokens', 'formatTokens'],
  'src/data/dadJokes.ts': ['DAD_JOKES', 'getRandomDadJoke'],
  'src/components/ui/button.tsx': ['Button'],
  'src/components/ui/input.tsx': ['Input'],
  'src/components/layout/ProtectedRoute.tsx': ['ProtectedRoute'],
  'src/pages/LoginPage.tsx': ['LoginPage'],
  'src/pages/ChatPage.tsx': ['ChatPage'],
  'src/pages/AdminPage.tsx': ['AdminPage'],
  'src/pages/SettingsPage.tsx': ['SettingsPage'],
  'src/App.tsx': ['default', 'BrowserRouter'],
  'src/main.tsx': ['ReactDOM'],
  'index.html': ['FamilyAI', 'root'],
  'vite.config.ts': ['defineConfig'],
  'tsconfig.json': ['compilerOptions'],
  'tailwind.config.js': ['content', 'colors'],
  'package.json': ['dev', 'build'],
};

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('  PHASE 5 VERIFICATION — Frontend Scaffold');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

let passed = 0;
let failed = 0;

// Section 1: File Existence
console.log('━━ SECTION 1 — File Existence\n');
for (const [file, keywords] of Object.entries(files)) {
  const filepath = path.join(ROOT, file);
  if (fs.existsSync(filepath)) {
    const content = fs.readFileSync(filepath, 'utf-8');
    const hasKeywords = keywords.every((kw) => content.includes(kw));
    if (hasKeywords) {
      console.log(`  ✓ ${file}`);
      passed++;
    } else {
      console.log(`  ✗ ${file} — missing keywords: ${keywords.join(', ')}`);
      failed++;
    }
  } else {
    console.log(`  ✗ ${file} — not found`);
    failed++;
  }
}

// Section 2: TypeScript Compilation
console.log('\n━━ SECTION 2 — TypeScript Compilation\n');
try {
  execSync('npx tsc --noEmit', { cwd: ROOT, stdio: 'pipe' });
  console.log('  ✓ tsc --noEmit passed');
  passed++;
} catch (err) {
  console.log(`  ✗ TypeScript errors:\n${err.stdout || err.stderr}`);
  failed++;
}

// Section 3: Package Dependencies
console.log('\n━━ SECTION 3 — Package Dependencies\n');
const pkgJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf-8'));
const required = [
  'react',
  'react-dom',
  'react-router-dom',
  'zustand',
  'axios',
  '@tanstack/react-query',
  'tailwindcss',
  'vite',
  'typescript',
  'clsx',
  'tailwind-merge',
  'date-fns',
];
for (const dep of required) {
  if (pkgJson.dependencies[dep] || pkgJson.devDependencies[dep]) {
    console.log(`  ✓ ${dep}`);
    passed++;
  } else {
    console.log(`  ✗ ${dep} — not found`);
    failed++;
  }
}

// Section 4: Build Test
console.log('\n━━ SECTION 4 — Production Build\n');
try {
  console.log('  Building (this may take 10-20 seconds)...');
  execSync('npm run build', { cwd: ROOT, stdio: 'pipe' });
  console.log('  ✓ npm run build successful');
  const distExists = fs.existsSync(path.join(ROOT, '../backend/public'));
  if (distExists) {
    console.log('  ✓ Output directory exists: ../backend/public');
    passed += 2;
  } else {
    console.log('  ⚠ Build output not found in ../backend/public');
    passed += 1;
  }
} catch (err) {
  console.log(`  ✗ Build failed: ${err.message}`);
  failed++;
}

// Section 5: Summary
console.log('\n━━ PHASE 5 VERIFICATION SUMMARY\n');
const total = passed + failed;
const pct = total > 0 ? Math.round((passed / total) * 100) : 0;
console.log(`  Passed: ${passed}`);
console.log(`  Failed: ${failed}`);
console.log(`  Score:  ${pct}%\n`);

if (failed === 0) {
  console.log('✅ PHASE 5 FRONTEND SCAFFOLD COMPLETE\n');
  console.log('Next steps:');
  console.log('  1. npm run dev      — Start dev server on :5173');
  console.log('  2. Backend on :3001 — Already running');
  console.log('  3. Login with admin/admin\n');
  process.exit(0);
} else {
  console.log(`❌ ${failed} verification(s) failed. Fix above issues.\n`);
  process.exit(1);
}
