# Spike 01: Google Sheets Integration

**Date:** 2025-10-29
**Time Box:** 2 hours
**Time Spent:** 1 hour 40 min

---

## Question

Can we authenticate and read from Google Sheets in production?

---

## Success Criteria

_How will I know if this spike succeeded?_

- Successfully authenticate with Google Sheets API in Vercel environment
- Read student data from real Google Sheet
- Performance acceptable for 20-50 students (response time <2-3 seconds)

---

## Approach

_What did I try?_

- Followed Claude's instructions to set up Google API access to Sheets
- Built integration and tested locally
- Deployed to Vercel to test in production environment

## Findings

### What Worked

_What succeeded or showed promise?_

- Google API setup process was straightforward
- Quick load time after first load (<1 second)
- Authentication worked successfully in Vercel

### What Didn't Work

_What failed or created blockers?_

- Direct Vercel CLI deploy carried .env file (security issue)
- First load was slow (~4 seconds), though subsequent loads were fast

### Key Insights

_What non-obvious things did I learn?_

- Deploy from GitHub instead of CLI to avoid environment variable leaks
- Normalized data structure in sheet improves reliability
- First-load performance may be caching issue rather than fundamental problem
- Large student counts (>50) still need performance validation

---

## Answer

_What's the answer to the question at the top?_

**Short Answer:** YES

**Full Answer:** Google Sheets API authentication works in Vercel production environment. Performance is acceptable for target audience (20-50 students) with <1 second load times after initial request. First load slowness (~4 seconds) is likely caching-related and doesn't block MVP.

**Implications:** We can proceed with Google Sheets as primary data source. The spike retired the authentication and performance risks. Deploy via GitHub (not CLI) to avoid environment variable leaks. Large class sizes (>50 students) still need validation but aren't blocking current work.

---

> **The purpose of this document is:**
>
> - To establish scope and time box before experimentation.
> - To preserve learnings to inform future decisions.
