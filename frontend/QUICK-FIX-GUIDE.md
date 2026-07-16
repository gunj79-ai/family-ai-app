# QUICK FIX GUIDE - START HERE

## ⚠️ CRITICAL: Fix These 5 Issues FIRST (Next 6 Hours)

### 1. STOP THE REFRESH LOOP (30 min)
**File**: [src/pages/ChatPage.tsx](src/pages/ChatPage.tsx#L13-L28)

**Problem**: Dependencies cause infinite re-renders
```typescript
// ❌ REMOVE THIS
useEffect(() => {
  async function init() {
    // ...
  }
  init();
}, [chatId, chats, activeChat, loadChat, navigate]); // TOO MANY DEPS!
```

**Fix**: Add ref to prevent re-initialization
```typescript
// ✅ ADD THIS
const isInitializedRef = useRef(false);

useEffect(() => {
  if (isInitializedRef.current && chatId === activeChat?.id) return;
  
  async function init() {
    if (chatId) {
      const found = chats.find((c: Chat) => c.id === chatId);
      if (found) await loadChat(found);
    } else if (chats.length > 0 && !activeChat) {
      await loadChat(chats[0]);
      navigate(`/chat/${chats[0].id}`, { replace: true });
    }
    isInitializedRef.current = true;
  }
  init();
}, [chatId]); // ONLY chatId dependency
```

---

### 2. FIX iOS INPUT (45 min)
**Files**: 
- [src/components/chat/MessageInput.tsx](src/components/chat/MessageInput.tsx#L34)
- [src/index.css](src/index.css)

**Problem**: Font size < 16px causes iOS zoom, touch events broken

**Fix A**: Update textarea styles
```typescript
// In MessageInput.tsx, find the textarea and add:
<textarea
  ref={textareaRef}
  value={text}
  onChange={(e) => {
    setText(e.target.value);
    autoResize();
  }}
  onKeyDown={handleKeyDown}
  onPaste={handlePaste}
  // ADD THESE:
  inputMode="text"
  autoComplete="off"
  autoCorrect="off"
  autoCapitalize="sentences"
  style={{ fontSize: '16px', minHeight: '44px' }} // iOS minimum
  className="..."
/>
```

**Fix B**: Add to index.css
```css
/* Add at the end of index.css */

/* CRITICAL: Prevent iOS zoom on input focus */
input, textarea, select {
  font-size: 16px !important;
}

/* Fix iOS keyboard layout issues */
@supports (-webkit-touch-callout: none) {
  html, body, #root {
    height: -webkit-fill-available;
    position: relative;
  }
}

/* Disable double-tap zoom */
* {
  touch-action: manipulation;
}

/* Better touch targets (minimum 44x44px) */
button, a[role="button"], [role="button"] {
  min-height: 44px;
  min-width: 44px;
}
```

---

### 3. ADD ERROR BOUNDARY (30 min)
**Files**: Create new file + update App.tsx

**Step 1**: Create [src/components/ErrorBoundary.tsx](src/components/ErrorBoundary.tsx)
```typescript
import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-screen bg-gray-50">
          <div className="text-center p-8">
            <h1 className="text-2xl font-bold text-gray-800 mb-4">
              Something went wrong
            </h1>
            <p className="text-gray-600 mb-6">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-primary-500 text-white rounded-lg"
            >
              Reload App
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
```

**Step 2**: Wrap App in [src/App.tsx](src/App.tsx)
```typescript
// Add import at top
import { ErrorBoundary } from '@/components/ErrorBoundary';

// Wrap the return in default function App()
export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
        <ToastContainer />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
```

---

### 4. FIX INITIALIZATION RACE (1 hour)
**Files**: [src/main.tsx](src/main.tsx), create new [src/AppInitializer.tsx](src/AppInitializer.tsx)

**Step 1**: Create AppInitializer.tsx
```typescript
import { useState, useEffect } from 'react';
import { useConfigStore } from '@/store/configStore';
import App from './App';

export function AppInitializer() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    useConfigStore
      .getState()
      .load()
      .then(() => setReady(true))
      .catch((err) => {
        console.error('Failed to load config:', err);
        setError(err);
        // Continue anyway with defaults
        setReady(true);
      });
  }, []);

  if (error) {
    console.warn('App starting with default config due to error:', error);
  }

  if (!ready) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return <App />;
}
```

**Step 2**: Update main.tsx
```typescript
// Change from this:
import App from './App';

useConfigStore.getState().load().catch((err) => {
  console.warn('Config load failed, using defaults:', err);
}).then(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
});

// To this:
import { AppInitializer } from './AppInitializer';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppInitializer />
  </React.StrictMode>
);
```

---

### 5. DOWNGRADE REACT (15 min)
**File**: [package.json](package.json)

**Problem**: React 19.2.7 is too new and unstable

**Fix**: Change versions
```json
{
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    // ... rest unchanged
  },
  "devDependencies": {
    "@types/react": "^18.3.5",
    "@types/react-dom": "^18.3.0",
    // ... rest unchanged
  }
}
```

**Run**:
```bash
# Delete node_modules and package-lock
rm -rf node_modules package-lock.json

# Reinstall with new versions
npm install
```

---

## Testing After Each Fix

Run these checks after EACH change:

### 1. Check Console
```bash
# Start dev server
npm run dev
```
- Open browser DevTools Console
- Should see NO red errors
- Should see NO infinite loops of logs

### 2. Test iPhone 17 Pro
- Open on device
- Navigate between chats
- Should NOT continuously refresh
- Should be stable for 30 seconds

### 3. Test iPhone SE  
- Tap on message input
- Keyboard should appear
- Should be able to type immediately
- Text should appear in input

### 4. Test Buttons
- Tap "New Chat" button
- Should respond within 100ms
- Should create new chat
- Should NOT freeze or ignore tap

### 5. Check React DevTools Profiler
- Install React DevTools extension
- Go to Profiler tab
- Record a session
- Click around for 10 seconds
- Stop recording
- Check: Should see < 50 renders per action

---

## If Something Breaks

### Rollback Process
```bash
# Revert last change
git checkout -- <filename>

# Or revert last commit
git revert HEAD
```

### Emergency Stabilization
If app is completely broken:

1. Comment out broken code
2. Deploy last working version
3. Fix in development
4. Test thoroughly
5. Deploy fix

### Get Help
- Check browser console for errors
- Check React DevTools Profiler
- Check Network tab for failed requests
- Check Performance tab for memory leaks

---

## Next Steps After These 5 Fixes

Once these critical issues are fixed and tested:

1. Read full [STABILITY-PLAN.md](STABILITY-PLAN.md)
2. Implement Phase 2 (State Management)
3. Implement Phase 3 (Performance)
4. Continue through all phases

**DO NOT SKIP** these 5 critical fixes. Everything else depends on these being stable first.

---

## Success Criteria

Before moving to Phase 2, verify:

- ✅ No continuous refresh on any device
- ✅ Input works on all devices
- ✅ All buttons respond within 100ms
- ✅ No console errors for 5 minutes
- ✅ App stays responsive for 5 minutes
- ✅ Memory usage stays stable (check DevTools)
- ✅ React Profiler shows reasonable render counts

If ANY of these fail, DO NOT proceed. Debug and fix first.
