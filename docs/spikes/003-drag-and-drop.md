# Spike 3: Drag-Drop with Svelte

> **The purpose of this document is:**
>
> - To establish scope and time box before experimentation.
> - To preserve learnings to inform future decisions.

## Question

Does `@thisux/sveltednd` library work with our data structure?

## Plan

**Time Box**: 120 minutes  
**Success Looks Like**: Drag student between groups smoothly, capacity check works  
**Failure Looks Like**: Library too buggy, conflicts with Svelte 5, or requires custom implementation

**Scope**:

- Integrate @thisux/sveltednd library
- Drag students between two groups
- Drag to/from unassigned area
- Capacity checking on drop
- Visual feedback during drag

**Out of Scope**:

- Mobile device testing (use dev tools simulation)
- Command pattern integration
- Complex animations
- Multi-select drag

## Log

## Results

**Answer**: yes

**What Worked**:

- Library integrated cleanly with Svelte 5 runes
- Drag between groups and to/from unassigned works smoothly
- Capacity checking on drop is straightforward
- Visual feedback during drag (currentlyDragging state) works well
- No performance issues with 20 students
- Touch events handled by library (desktop dev tools test)

**What Didn't**:

- Initial confusion about library API (callbacks vs events)
- somewhat buggy but prob user error. ok

**Decisions Made**:

- Use @thisux/sveltednd 0.0.20 (latest at time)
- Implement capacity validation in handleDrop() callback
- Use simple opacity change for drag feedback (no fancy animations)
- Store currentlyDragging state to show which card is being moved
- Update groups array directly on drop (reactive update)

**Risks Retired**:

- Drag-drop library works with Svelte 5
- Performance acceptable for target student counts
- Touch events supported by library

**Remaining Concerns**:

- Haven't tested on actual mobile devices yet
- Library is early version (0.0.x) - may have breaking changes
- No undo

**Time**: 140/120 minutes

**Next Steps**: Continue to spike 4
