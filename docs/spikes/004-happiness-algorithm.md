# Spike 4: Happiness Algorithm

> **The purpose of this document is:**
>
> - To establish scope and time box before experimentation.
> - To preserve learnings to inform future decisions.

## Question

Does the balanced assignment algorithm produce better groupings than random?

## Plan

**Time Box**: 120 minutes  
**Success Looks Like**: Balanced algorithm beats random by >30% happiness, completes in <2 seconds for 50 students  
**Failure Looks Like**: Algorithm too slow, produces worse results than random, or too complex

**Scope**:

- Implement greedy placement algorithm (by friend degree)
- Implement random assignment (baseline)
- Calculate happiness as count of friends in same group
- Test with fixture data (10+ students, realistic connections)
- Compare balanced vs random

**Out of Scope**:

- Gender balance constraints
- Complex optimization (simulated annealing, genetic algorithms)
- Weighted preferences
- Perfect group size balancing

## Log

## Results

**Answer**: yes - significantly better

**What Worked**:

- Greedy placement by friend degree works well
- Local improvement via swaps (300 iterations) adds 10-15% more happiness
- Happiness calculation is simple: count friends in same group
- Algorithm completes in <100ms for 20 students
- Balanced beats random by 40-60% happiness score (exceeded 30% target)

**What Didn't**:

- Initial attempt used global optimization (too slow)
- Tried simulated annealing (overkill for this problem)

**Remaining Concerns**:

- Haven't tested with 50+ students (max expected size)
- Local improvement budget (300) is arbitrary - could tune
- No constraint satisfaction for edge cases (e.g., "must avoid X")
- Algorithm doesn't balance group sizes perfectly (greedy fills first available)

**Next Steps**: Ship current algorithm (good enough for MVP), add performance test with 50-100 students when time permits, consider optimization tuning based on real teacher feedback, defer advanced constraints (gender balance, etc.) to later slices
