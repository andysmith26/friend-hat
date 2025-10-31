# Week of 2025-10-28

## Purpose
This journal captures what I learned, struggled with, and want to explore next. It's my portfolio evidence of growth and my reference when revisiting decisions. Written weekly in ~15 minutes to balance detail with sustainability.

---

## What I Built
*What concrete progress did I make this week?*

- Integrated svelte-dnd-action library for drag-and-drop functionality
- Fixed Svelte 5 reactivity bugs in group management (array mutation issues)
- Built auto-assign algorithm using greedy approach + local swap optimization
- Added happiness calculation based on friend co-location
- Created test data loader with 20 students and friend connections

---

## What I Learned
*What technical concepts or patterns did I understand better?*

- **Svelte 5 runes reactivity:** Must use `arr = arr` pattern instead of `arr.push()`. Took me 30 minutes of debugging to realize mutations don't trigger updates. The `$state` rune needs reassignment to detect changes.
- **Drag-drop event flow:** Both source and destination handlers fire on a single drag operation. Need defensive checks (was item added or removed?) to prevent duplicate processing.
- **Library evaluation heuristic:** Check GitHub issues *before* committing. svelte-dnd-action has 40+ open issues but 3k stars. Decided it's mature enough despite some rough edges—better than building from scratch.
- **Algorithm design:** Greedy local search (assign then improve via swaps) is simple and "good enough." Perfect optimization would be too slow for real-time UI.

---

## What Was Hard
*Where did I struggle, and what does that reveal about my knowledge gaps?*

- **Debugging the duplicate key error:** Error message said "duplicate key at indexes 0 and 1" but didn't explain *why*. Took 2 hours to trace through event handlers and realize both source/destination were adding the same student. Need better mental model of event bubbling.
- **Understanding googleapis auth:** Docs assume you know GCP service accounts, OAuth flows, and credential scopes. Spent 1 hour reading before I understood service accounts are simpler than OAuth for server-to-server. My mental model of authentication was too simple.
- **Type safety in Svelte 5:** TypeScript complained about `$state` types until I explicitly typed the initial value. Need to review TS generics and how Svelte's compiler does type inference.

---

## Questions/Next Learning
*What do I want to understand better?*

- How do you handle race conditions in drag-drop events? Current fix feels fragile.
- Best practices for SvelteKit API route error handling? Should I use try-catch everywhere or let errors bubble?
- How to structure tests for UI components with drag-drop? Integration vs unit testing trade-offs?
- What's the "right" way to do local optimization algorithms? Did I reinvent simulated annealing badly?
- Read: SvelteKit docs on form actions and progressive enhancement
