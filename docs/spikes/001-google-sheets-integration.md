# Spike 1: Google Sheets Integration

> **The purpose of this document is:**
>
> - To establish scope and time box before experimentation.
> - To preserve learnings to inform future decisions.

## Question

Can we authenticate and read from Google Sheets in production?

## Plan

**Time Box**: 120 minutes  
**Success Looks Like**: Deploy to Vercel, `/api/data` returns student data from real Sheet, env vars work in production  
**Failure Looks Like**: Auth fails in production, or need OAuth (too complex for server-side)

**Scope**:

- Set up Google Cloud service account
- Create SvelteKit API route to read from Sheets
- Deploy to Vercel with environment variables
- Fetch Students and Connections tabs

**Out of Scope**:

- Writing to Sheets (read-only for now)
- Complex data transformations
- Error retry logic
- Multiple sheet support

## Log

## Results

**Answer**: yes

**What Worked**:

- Service account authentication setup was straightforward
- googleapis library integrated cleanly with SvelteKit
- Parallel fetching of multiple tabs (Students + Connections) works well
- Quick load times after first request (~1 second)
- Deployed to Vercel successfully
- Environment variables work correctly in production

**What Didn't**:

- Vercel CLI deploy bundled .env file into deployment (security risk)
- Initial cold start takes ~4 seconds (acceptable but noticeable)

**Decisions Made**:

- Deploy from GitHub (not CLI) to avoid .env leakage
- Use service account auth (not OAuth) for simpler server-side access
- Normalize data in separate tabs (Students, Connections) rather than denormalized
- Fetch both tabs in parallel using Promise.all
- Store credentials in Vercel environment variables

**Remaining Concerns**:

- Cold start latency (~4s first load) - need to test with real users
- Haven't tested with 50+ students (max expected dataset size)
- No error recovery if Sheets API is down
- Credentials in Vercel env vars (need to document rotation process)

**Time**: 100/120 minutes

**Next Steps**: Continue to spike 2
