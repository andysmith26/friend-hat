# Friend Hat Documentation System

## Purpose

This documentation system serves three goals: ship good product (stay focused), learn engineering (capture growth), and build portfolio (show judgment). Designed for solo development with ≤1 hour/week overhead.

---

## The System: Four Doc Types

| Doc Type                | Purpose                                                   | Frequency              | Time/Week | File Location                    |
| ----------------------- | --------------------------------------------------------- | ---------------------- | --------- | -------------------------------- |
| **Roadmap**             | Product focus: NOW/NEXT/LATER priorities                  | Weekly update          | 5 min     | `/docs/roadmap.md`               |
| **Decision Records**    | Strategic choices (scope, architecture, product, process) | 1-2 per week max       | 10 min    | `/docs/decisions/*.md`           |
| **Spike Logs**          | Time-boxed technical experiments (does X work?)           | Per spike (~1-2/month) | 30 min    | `/docs/spikes/*.md`              |
| **Engineering Journal** | Personal learning, reflections, struggles                 | Weekly                 | 15 min    | `/docs/journal/YYYY-MM-weekN.md` |

**Total:** ~50 min/week (under 1 hour)

---

## File Structure

```
friend-hat/
├── docs/
│   ├── roadmap.md                    # Current priorities
│   │
│   ├── decisions/
│   │   ├── README.md                 # Format guide, rubric, examples
│   │   ├── template.md               # Copy-paste template
│   │   └── YYYY-MM-DD-title.md       # Actual decision records
│   │
│   ├── spikes/
│   │   ├── template.md               # Copy-paste template
│   │   └── NN-title.md               # Actual spike logs (numbered)
│   │
│   ├── journal/
│   │   ├── template.md               # Copy-paste template
│   │   └── YYYY-MM-weekN.md          # Weekly entries
│   │
│   └── archive/                      # Move old docs here after 3 months
│
└── [rest of project]
```

---

## When to Use Each Doc Type

### Use **Roadmap** when:

- Starting your weekly work session (check NOW)
- Finishing a major task (update NOW, review NEXT)
- Capturing a new idea without committing (add to LATER)

### Use **Decision Record** when:

- Making strategic choices (defer feature, prioritize A over B)
- Making architectural decisions (use pattern X, choose library Y)
- Making product trade-offs (ship simple version vs wait for polish)
- Making process decisions (timebox spikes, change workflow)

### Use **Spike Log** when:

- Running time-boxed technical experiment
- Testing feasibility of approach (does API work? is library good enough?)
- Validating performance/quality assumptions
- Answering "can we do X?" before committing to build it

### Use **Engineering Journal** when:

- Completing your weekly work (every Friday or Sunday)
- Want to reflect on what you learned
- Struggled with something and want to capture the resolution
- Building interview stories about growth and problem-solving

---

## Templates

Each doc type has a template in its folder:

- `docs/roadmap.md` (update in place—only one roadmap exists)
- `docs/decisions/template.md` (copy and rename)
- `docs/spikes/template.md` (copy and rename)
- `docs/journal/template.md` (copy and rename)

All templates include:

- **Purpose section** (kept in every document)
- **Subtitle questions** (kept in every document—make it conversational)
- **Triggering questions** (replaced with your content—jog your thinking)

---

## Examples

See example files for reference:

- `roadmap-example.md` - Shows realistic NOW/NEXT/LATER for Friend Hat
- `spike-log-example.md` - Google Sheets API spike
- `journal-example.md` - Weekly learning capture

These examples show what "good" looks like but aren't part of the working docs.

---

## Stay Lean Rules

1. **Max 1 Decision Record per week** - If more, you're overthinking
2. **Spike logs only for time-boxed experiments** - Not every technical choice
3. **Journal is weekly, not daily** - Daily is unsustainable
4. **Roadmap: 3 sections, max 5 bullets each** - Don't hoard ideas
5. **Archive after 3 months** - Keep only recent context visible
6. **Total doc time: ≤1 hour/week** - If more, cut something

---

## Philosophy

### Why This System

**Product focus:** Minimal overhead, maximum coding time. Roadmap prevents wandering.

**Learning capture:** Journal for interviews, Decision Records show judgment. Evidence of growth.

**Portfolio value:** Shows mature decision-making, reflective practice, not just code.

**Solo dev friendly:** No coordination overhead, can pivot instantly. Built for one person.

**Time-boxed:** Each doc type has strict time limit. Sustainability over perfection.

---

## What's NOT Included

### Tests (Managed Separately)

- Tests live in `/tests` directory with code
- Follow software testing best practices
- Decision Records might reference "we chose Jest" but don't duplicate test specs
- Tests are code quality, not documentation overhead

### Planning Approaches NOT Used

- Phase-based planning (too rigid)
- Full ADRs (too heavy, 15-30 min each)
- Daily journaling (unsustainable)
- Detailed roadmaps with milestones (too much overhead)

### Why Spike-Driven + Vertical Slices

- Retire risks early (Google Sheets API, algorithm quality)
- Always have working software
- Can adapt every 8-12 hours
- Suitable for solo projects with unknowns

## Weekly Workflow (50 minutes/week)

**Every morning (5 min):**

- Review roadmap NOW section
- Move completed items to archive or delete
- Pull 1-2 items from NEXT to NOW

**During week (variable):**

- Write Decision Record when making strategic choice (10 min each, max 1-2/week)
- Write Spike Log after completing experiment (30 min each, ~1-2/month)

**Friday afternoon (15 min):**

- Write journal entry
- Update roadmap (move NOW → archive, NEXT → NOW, capture new LATER ideas)

---

## Success Metrics

You're using this system well if:

- ✅ You can answer "what should I work on next?" in 5 seconds (check roadmap NOW)
- ✅ You can explain trade-offs from 3 months ago (Decision Records preserved context)
- ✅ You don't repeat failed experiments (Spike Logs prevented retries)
- ✅ You can tell interview stories about growth (Journal captured learning)
- ✅ Documentation takes <1 hour/week (system is sustainable)

You're over-documenting if:

- ❌ Writing docs feels like more work than coding
- ❌ You're writing Decision Records for trivial choices
- ❌ Journal entries take >20 minutes
- ❌ Roadmap has >15 total items across all sections

---

## Adaptation Guidelines

**If you skip weeks consistently:**

- Drop Spike Logs first (important but not critical)
- Keep Roadmap + Journal as core minimum
- Re-evaluate if you actually need formal docs

**If you're writing too many Decision Records:**

- Raise the bar for "strategic choice"
- Ask: "Will I care about this in 3 months?"
- Combine related decisions into one record

**If journal feels like obligation:**

- Switch to biweekly instead of weekly
- Focus only on "What I Learned" section
- Make it shorter (5-10 bullets total)

---

## Portfolio Value

When showing Friend Hat to employers, this documentation demonstrates:

**From Decision Records:**

- Mature judgment (evaluating trade-offs explicitly)
- Product thinking (scope decisions, user impact reasoning)
- Engineering leadership (architecture choices with rationale)

**From Spike Logs:**

- Risk management (validating assumptions before building)
- Learning velocity (completing experiments in time boxes)
- Pragmatic decision-making (GO/NO-GO based on findings)

**From Journal:**

- Self-awareness (honest about struggles and gaps)
- Growth mindset (actively learning from challenges)
- Communication skill (articulating technical concepts clearly)

**From Roadmap:**

- Focus and prioritization (resisting scope creep)
- Iterative development (shipping NOW before thinking about LATER)
- Product sense (distinguishing critical from nice-to-have)

---

## Questions?

This system is designed to evolve. If something doesn't work:

1. Try it for 3 weeks before changing
2. Ask: "What problem am I solving?"
3. Adjust one thing at a time
4. Keep the 1-hour/week budget sacred

The best documentation system is the one you actually use.
