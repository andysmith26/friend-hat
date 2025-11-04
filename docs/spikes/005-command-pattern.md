# Spike 5: Command Pattern for Undo/Redo

> **The purpose of this document is:**
>
> - To establish scope and time box before experimentation.
> - To preserve learnings to inform future decisions.

## Question

Can we refactor current direct state to command pattern without breaking existing functionality?

## Plan

**Time Box**: 120 minutes  
**Success Looks Like**: Drag student → undo → student returns to original location, existing UI still works, clear path forward for refactoring remaining operations

**Scope**:

- Create command store structure with dispatch/undo/redo
- Extract ONE existing operation into a command (drag-drop)
- Prove undo works for that one command
- Verify existing UI still works (no regressions)

**Out of Scope**:

- Refactoring all operations (just prove one works)
- Command serialization (save/load later)
- Multiple command types beyond ASSIGN_STUDENT

## Log

## Results

**Answer**:
yes

**What worked**:

- command refactor not too much of a headache. faster than planned (45/120)
- command pattern solved buggy behavior found in previous approach

**What didn't work**:

- svelte-devtools. built a debug panel instead

**Remaining concerns**:

- pay attention to what user interactions should have undo/redo. like rename group. I assume yes for that, but maybe there are others where not? do we want undo/redo on auto-assign, and if not do we need a warning message before applying?

**Next Steps**:

- expand scope of data in debug panel.
- add toggle in UI to shrink debug panel
- add const in code to control display of it or not? or rd a canonical way to approach this kind of thing.?
