# Technical Debt Tracker

## Current Critical Debt (Must Fix for Stability)

### 🔴 P0 - Blocking Production Use
- [ ] Infinite re-render loops in ChatPage.tsx
- [ ] iOS input non-functional (font-size zoom issue)
- [ ] Race condition in app initialization (main.tsx)
- [ ] No error boundaries (crashes unrecoverable)
- [ ] React 19 instability issues

### 🟠 P1 - Severe Quality Issues  
- [ ] Memory leaks (event listeners, AbortControllers, Object URLs)
- [ ] Missing memoization causing excessive re-renders
- [ ] Improper Zustand store access patterns
- [ ] No request retry logic
- [ ] Missing loading states throughout app

### 🟡 P2 - Performance & UX Issues
- [ ] No virtual scrolling for long chat histories
- [ ] Unoptimized animations on low-end devices
- [ ] No code splitting (large bundle size)
- [ ] Missing debouncing on inputs
- [ ] No offline detection/handling

## Anti-Patterns to Eliminate

### State Management
```typescript
// ❌ BAD - Will cause re-renders
const { user, token, settings } = useAuthStore();

// ✅ GOOD - Only subscribe to what you need  
const user = useAuthStore(state => state.user);
```

### useEffect Dependencies
```typescript
// ❌ BAD - Circular dependencies
useEffect(() => {
  // ...
}, [chats, activeChat, loadChat, navigate]);

// ✅ GOOD - Minimal dependencies + refs
const isInitialized = useRef(false);
useEffect(() => {
  if (isInitialized.current) return;
  // ...
  isInitialized.current = true;
}, [chatId]);
```

### Component Optimization
```typescript
// ❌ BAD - No memoization
export function MessageBubble({ message }: Props) {
  return <div>...</div>;
}

// ✅ GOOD - Memoized with comparison
export const MessageBubble = React.memo(({ message }: Props) => {
  return <div>...</div>;
}, (prev, next) => prev.message.id === next.message.id);
```

### Event Handlers
```typescript
// ❌ BAD - Creates new function every render
<button onClick={() => handleClick(id)}>Click</button>

// ✅ GOOD - Stable reference
const handleClickWithId = useCallback(() => {
  handleClick(id);
}, [id, handleClick]);

<button onClick={handleClickWithId}>Click</button>
```

### Mobile Touch Events
```typescript
// ❌ BAD - No passive listeners, no cleanup
element.addEventListener('touchstart', handler);

// ✅ GOOD - Passive + cleanup
useEffect(() => {
  const handler = (e: TouchEvent) => { /* ... */ };
  element.addEventListener('touchstart', handler, { passive: true });
  return () => element.removeEventListener('touchstart', handler);
}, []);
```

## Architecture Decisions to Revisit

### Why React 18 Instead of 19?
- React 19 is too new (released late 2024)
- Limited ecosystem compatibility
- Unknown stability issues
- Stick with battle-tested React 18.3.x

### Why Not Use PWA Right Now?
- Service worker caching causing refresh loops
- HMR conflicts with PWA
- Need stable foundation first
- Re-enable after core stability achieved

### State Management Strategy
- **Current**: Zustand (good choice)
- **Issue**: Improper usage patterns
- **Fix**: Use selectors, not destructuring
- **Future**: Consider adding Immer for complex updates

### Query Caching Strategy  
- **Current**: React Query (good choice)
- **Issue**: Default staleTime too short
- **Fix**: Increase to 30s-5min based on data type
- **Add**: Request deduplication

## Missing Production Requirements

### Observability
- [ ] Error logging service (Sentry, LogRocket)
- [ ] Performance monitoring (Web Vitals)
- [ ] User session replay
- [ ] Analytics integration
- [ ] Health check monitoring

### Resilience
- [ ] Request retry with exponential backoff
- [ ] Circuit breaker for failing endpoints
- [ ] Graceful degradation when backend down
- [ ] Optimistic updates with rollback
- [ ] Offline mode support

### Security
- [ ] XSS protection audit
- [ ] CSRF token handling
- [ ] Content Security Policy
- [ ] Rate limiting on client
- [ ] Secure token storage review

### Testing
- [ ] Unit tests for critical paths
- [ ] Integration tests for user flows
- [ ] E2E tests for core features
- [ ] Performance regression tests
- [ ] Mobile device test coverage

### Accessibility
- [ ] Keyboard navigation
- [ ] Screen reader support
- [ ] ARIA labels audit
- [ ] Color contrast compliance
- [ ] Focus management

## Code Quality Improvements Needed

### Type Safety
```typescript
// Current: Lots of `any` types
// Goal: 100% type coverage, no `any`

// ❌ BAD
const data: any = await response.json();

// ✅ GOOD
interface ApiResponse {
  success: boolean;
  data: MessageData;
}
const data: ApiResponse = await response.json();
```

### Error Handling
```typescript
// Current: Silent failures, console.error
// Goal: Proper error boundaries, user feedback

// ❌ BAD
try {
  await api.call();
} catch (err) {
  console.error(err); // User sees nothing
}

// ✅ GOOD
try {
  await api.call();
} catch (err) {
  reportError(err, { context: 'messageSync' });
  toast.error('Failed to send message');
  rollbackOptimisticUpdate();
  throw err; // Let error boundary handle if critical
}
```

### Component Organization
```
Current structure:
src/
  components/ (flat, 20+ files)
  
Proposed structure:
src/
  features/
    chat/
      components/
        ChatWindow/
          ChatWindow.tsx
          ChatWindow.test.tsx
          ChatWindow.module.css
      hooks/
        useChat.ts
        useChat.test.ts
      store/
        chatStore.ts
      types/
        chat.types.ts
```

## Dependencies to Review

### Current Version Issues
- `react`: 19.2.7 → Downgrade to 18.3.1
- `framer-motion`: 12.x → May be too heavy, consider alternatives
- `@formkit/auto-animate`: May conflict with Framer Motion

### Missing Dependencies
- `react-error-boundary` - Better error boundaries
- `react-window` - Virtual scrolling
- `use-debounce` - Input debouncing
- `axios-retry` - Request retry logic
- `@tanstack/react-query-devtools` - Debug React Query

### Consider Adding
- `zod` - Runtime type validation
- `react-hook-form` - Better form handling
- `@sentry/react` - Error tracking
- `workbox-webpack-plugin` - Better PWA control

## Performance Budgets

### Current (Unknown)
- Time to Interactive: ?
- First Contentful Paint: ?
- Largest Contentful Paint: ?
- Cumulative Layout Shift: ?
- Bundle size: ?

### Target
- Time to Interactive: < 3s on 3G
- First Contentful Paint: < 1.5s
- Largest Contentful Paint: < 2.5s  
- Cumulative Layout Shift: < 0.1
- Bundle size: < 200KB gzipped
- Lighthouse score: > 90

### Measure
```bash
# Run Lighthouse
npm run build
npx serve -s build
# Open Chrome DevTools > Lighthouse > Analyze

# Bundle size analysis
npx vite-bundle-visualizer
```

## Refactoring Opportunities

### High Impact
1. **Split ChatPage into smaller components**
   - Current: 50+ lines, multiple responsibilities
   - Target: < 30 lines, single responsibility

2. **Extract custom hooks from components**
   - MessageInput has too much logic
   - Move upload, voice, drag-drop to separate hooks

3. **Normalize store state**
   - Avoid nested objects
   - Use ID-based lookups
   - Prevent duplicate data

4. **Simplify Sidebar**
   - 200+ lines, 10+ state variables
   - Break into sub-components
   - Extract context menu logic

### Medium Impact
1. Consolidate API clients
2. Create reusable form components
3. Standardize error handling patterns
4. Implement consistent loading states

### Low Impact (After Stability)
1. Add animations polish
2. Improve theme system
3. Add more customization options
4. Enhance accessibility

## Decision Log

### Why These Decisions Were Made

**Disabled HMR**: Causing refresh loops, needs investigation
**Disabled PWA**: Service worker conflicts, re-enable later  
**React 19 → 18**: Stability over features
**No animations on mobile**: Performance concerns
**Simple error messages**: Better than crashes

### Decisions to Reverse Later

- [ ] Re-enable HMR after fixing refresh loops
- [ ] Re-enable PWA after core stability
- [ ] Add back animations after performance optimization
- [ ] Upgrade to React 19 after ecosystem matures

## Maintenance Checklist

### Before Each Release
- [ ] Run full test suite
- [ ] Check bundle size
- [ ] Run Lighthouse audit
- [ ] Test on all target devices
- [ ] Review error logs
- [ ] Update dependencies (minor versions only)

### Monthly
- [ ] Review this technical debt document
- [ ] Update stability plan progress
- [ ] Check for security updates
- [ ] Performance audit
- [ ] Accessibility audit

### Quarterly
- [ ] Major dependency updates
- [ ] Architecture review
- [ ] Code quality review
- [ ] User feedback analysis
- [ ] Technical debt reduction sprint

## Resources

- [React 18 Migration Guide](https://react.dev/blog/2022/03/29/react-v18)
- [Zustand Best Practices](https://github.com/pmndrs/zustand#best-practices)
- [React Query Best Practices](https://tkdodo.eu/blog/practical-react-query)
- [Web Vitals](https://web.dev/vitals/)
- [iOS Web App Guidelines](https://developer.apple.com/design/human-interface-guidelines/ios)

---

**Last Updated**: {{ Current Date }}
**Next Review**: After Phase 1 completion
**Owner**: Development Team
