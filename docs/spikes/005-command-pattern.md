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
- Document path forward for refactoring remaining operations

**Out of Scope**:

- Refactoring all operations (just prove one works)
- Building undo UI (console.log or temp button is fine)
- Implementing redo (undo proof is sufficient)
- Command serialization (save/load later)
- Multiple command types beyond ASSIGN_STUDENT

## Log

## Results

**Answer**:

**What worked**:

**What didn't work**:

**Remaining concerns**:

**Next Steps**:
