# Spike 6: Migration from sveltednd to Atlassian Pragmatic Drag and Drop

> **The purpose of this document is:**
>
> - To establish scope and time box before experimentation.
> - To preserve learnings to inform future decisions.

## Question

Can we migrate from `@thisux/sveltednd` to Atlassian's Pragmatic Drag and Drop without breaking existing functionality?

## Plan

**Time Box**: 180 minutes  
**Success Looks Like**: All drag-and-drop features work identically, production deployment succeeds, no regressions  
**Failure Looks Like**: Breaking changes to UI, production deployment failures, or performance degradation

**Scope**:

- Install `@atlaskit/pragmatic-drag-and-drop` library
- Create Svelte action wrappers for pragmatic-dnd API
- Refactor drag-and-drop in StudentCard, GroupColumn, UnassignedList
- Update main page to initialize drag monitor
- Remove `@thisux/sveltednd` dependency
- Test all drag-and-drop scenarios (unassigned→group, group→group, undo/redo)
- Fix production deployment issues

**Out of Scope**:

- Adding new drag-and-drop features
- Mobile touch optimization beyond library defaults
- Animation enhancements
- Multi-select drag

## Log

### Phase 1: Library Installation & Wrapper Creation (30 min)

**Actions:**

- Installed `@atlaskit/pragmatic-drag-and-drop@1.7.7`
- Created `src/lib/utils/pragmatic-dnd.ts` with Svelte action wrappers:
  - `draggable(element, config)` - Makes elements draggable
  - `droppable(element, config)` - Makes elements drop targets
  - `initializeDragMonitor()` - Global state tracking for currently dragging item
- Designed API to match existing usage patterns (minimal code changes required)

**Key Design Decision:**
Used Svelte actions (functions that take an element and return lifecycle methods) rather than components. This kept the integration surgical and allowed reuse across StudentCard, GroupColumn, and UnassignedList without changing component structure.

### Phase 2: Component Refactoring (60 min)

**Actions:**

- Updated `+page.svelte`: Changed imports, initialized drag monitor in `onMount()`
- Updated `StudentCard.svelte`: Replaced sveltednd directive with `use:draggable`
- Updated `GroupColumn.svelte`: Replaced drop handling with `use:droppable`
- Updated `UnassignedList.svelte`: Replaced drop handling with `use:droppable`
- Maintained all existing props and callbacks (backward compatible)

**Observations:**

- API translation was straightforward - both libraries use similar concepts (drag data, drop targets, callbacks)
- Existing `currentlyDragging` state and `handleDrop` logic required no changes
- Undo/redo system (command pattern) completely decoupled, worked without modification

### Phase 3: Testing & Validation (30 min)

**Manual Testing:**

- ✅ Loaded test data (20 students, 5 groups)
- ✅ Dragged student from Unassigned to Group 1
- ✅ Dragged student from Unassigned to Group 2
- ✅ Dragged student between groups (Group 1 → Group 2)
- ✅ Verified capacity checking prevents drops to full groups
- ✅ Undo/redo functionality works correctly
- ✅ Inspector panel opens on drag and shows correct student info
- ✅ Visual feedback (opacity, outline) works during drag

**Build Validation:**

- ✅ `pnpm run build` succeeds
- ✅ `pnpm run lint` passes
- ✅ No TypeScript errors

### Phase 4: Production Deployment Issues (60 min)

**Issue #1 - Lockfile Conflict:**

```
Cannot install with frozen-lockfile because pnpm-lock.yaml is not up to date
```

**Root Cause:** Residual `package-lock.json` from earlier npm usage conflicted with pnpm.

**Solution:**

- Removed `package-lock.json`
- Updated `pnpm-lock.yaml`
- Added `package-lock.json` to `.gitignore`

**Issue #2 - ES Module Import Error:**

```
ERR_UNSUPPORTED_DIR_IMPORT: Cannot require() directory
```

**Root Cause:** Pragmatic DnD uses complex module structure with subpath exports. Serverless Node.js couldn't resolve `@atlaskit/pragmatic-drag-and-drop/element/adapter` at runtime.

**Attempted Solution #1 (Failed):**
Added Vite resolve alias:

```ts
resolve: {
  alias: {
    '@atlaskit/pragmatic-drag-and-drop/element/adapter':
      '@atlaskit/pragmatic-drag-and-drop/dist/esm/element/adapter.js'
  }
}
```

**Why it failed:** Alias pointed to ESM but Node tried loading as CommonJS, causing syntax errors.

**Final Solution (Successful):**
Added to `vite.config.ts`:

```ts
ssr: {
	noExternal: ['@atlaskit/pragmatic-drag-and-drop'];
}
```

**Why this works:**

1. Vite bundles the library into SSR output during build
2. All module resolution happens at build time (not runtime)
3. Library code transpiled to target Node.js version
4. Eliminates CommonJS/ESM compatibility issues
5. No external imports remain in production bundle

**Trade-offs:**

- Server bundle increased from 15.70 kB → 30.59 kB (acceptable)
- Slightly longer build time (negligible)
- Benefit: Robust deployment across serverless platforms

## Results

**Answer**: Yes - migration successful with production ready

**What Worked**:

- Pragmatic DnD API is clean and framework-agnostic (easy to wrap for Svelte)
- Svelte actions pattern provided surgical integration point
- Backward compatible - all existing functionality preserved
- Performance identical to sveltednd (no regression)
- Touch events handled by library (tested via desktop dev tools)
- `ssr.noExternal` configuration solved deployment issues cleanly
- Industry-standard library (used by Atlassian: Jira, Trello, Confluence)

**What Didn't Work**:

- Initial deployment attempts failed due to module resolution
- Vite resolve alias approach incompatible with SSR (CJS/ESM mismatch)
- Required understanding of Vite bundling to solve production issues
- Documentation didn't clearly indicate SSR bundling requirement

**Decisions Made**:

- Use `@atlaskit/pragmatic-drag-and-drop@1.7.7` (latest stable)
- Bundle library into SSR output via `ssr.noExternal` config
- Keep existing drag-and-drop logic and state management
- Use Svelte actions for wrapper API (not components)
- Maintain `currentlyDragging` state pattern from original implementation
- Keep command pattern decoupled (undo/redo unchanged)

**Risks Retired**:

- Pragmatic DnD works with Svelte 5 runes ✓
- Production deployment on Vercel serverless ✓
- Performance acceptable for target dataset sizes ✓
- Touch events supported ✓
- Migration path exists without major refactor ✓

**Remaining Concerns**:

- Haven't tested on actual mobile devices (only desktop dev tools simulation)
- Library version 1.x (stable but could have breaking changes in future)
- Server bundle size increased by ~15 kB (acceptable but worth monitoring)
- No official Svelte bindings (maintaining custom wrapper)

**Time**: 180/180 minutes

**Next Steps**: Monitor for issues in production, consider contributing Svelte bindings to pragmatic-dnd ecosystem, defer advanced features (nested drop zones, custom animations) to future spikes
