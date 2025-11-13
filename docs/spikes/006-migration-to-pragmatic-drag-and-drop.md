# Spike 6: Migration to Pragmatic Drag and Drop

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
- Test all drag-and-drop scenarios (unassigned→group, group→group, undo/redo)
- Deploy to production

**Out of Scope**:

- New drag-and-drop features
- Mobile touch optimization beyond library defaults
- Custom animations
- Multi-select drag

## Log

## Results

**Answer**: yes - migration successful and production ready

**What worked**:

- pragmatic-dnd API is framework-agnostic, easy to wrap with svelte actions
- backward compatible - all existing functionality preserved
- production deployment worked after adding `ssr.noExternal` config in vite
- performance identical to sveltednd
- industry-standard library (atlassian uses it for jira/trello/confluence)

**What didn't work**:

- initial deployment failed due to ES module resolution in serverless
- vite resolve alias approach didn't work (CJS/ESM mismatch)
- needed `ssr.noExternal: ['@atlaskit/pragmatic-drag-and-drop']` to bundle library into SSR output

**Remaining concerns**:

- haven't tested on actual mobile devices (only desktop dev tools)
- library is 1.x (stable but could have breaking changes)
- server bundle increased by ~15 kB (acceptable)
- maintaining custom wrapper since no official svelte bindings

**Next steps**:

- monitor production for issues
- consider contributing svelte bindings to pragmatic-dnd ecosystem
- defer advanced features (nested drop zones, custom animations) to future work
