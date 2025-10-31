# Spike: Google Sheets API Integration

**Date:** 2025-10-31  
**Time Box:** 3 hours  
**Time Spent:** 2.5 hours

## Purpose
This spike log documents time-boxed technical experiments. It captures what I tried, what worked, what didn't, and the decision I made. Written in ~30 minutes after completing the spike while findings are fresh. These logs prevent repeating failed approaches and provide context for future architectural decisions.

---

## Question
*What specific technical question does this spike answer?*

Can we authenticate with Google Sheets API in production (Vercel) and read student data with <2 second response time?

---

## Success Criteria
*How will I know if this spike succeeded?*

- Successfully authenticate using service account credentials in Vercel environment
- Read student roster from a real Google Sheet (20+ rows)
- API response time < 2 seconds
- Paste fallback still works (offline mode preserved)

---

## Approach
*What did I try?*

- Created Google Cloud service account with Sheets API enabled
- Stored credentials as Vercel environment variable (JSON string)
- Built SvelteKit API route at `/api/data/+server.ts`
- Added "Load from Sheet" button alongside paste textarea
- Tested locally first, then deployed to Vercel preview

---

## Findings

### What Worked
*What succeeded or showed promise?*

- Service account auth is straightforward—no OAuth dance needed
- `googleapis` npm package works seamlessly in Vercel serverless functions
- Environment variable approach keeps credentials secure
- Response time averaged 1.2 seconds (well under budget)
- Error handling caught invalid sheet IDs gracefully

### What Didn't Work
*What failed or created blockers?*

- Initially tried OAuth flow—too complex for this use case, abandoned after 45 minutes
- First deploy failed because I forgot to add env variable in Vercel dashboard
- Sheet must be shared with service account email or API returns 403 error (not obvious from docs)

### Key Insights
*What non-obvious things did I learn?*

- Service accounts have email addresses (looks like `projectname@...gserviceaccount.com`) that need explicit share access
- JSON credentials can be stored as single env variable string—no need for separate key file
- SvelteKit API routes are perfect for this—keeps sensitive logic server-side
- Paste fallback is essential: teachers won't always have internet, need offline mode

---

## Decision
*What's the call based on these findings?*

**GO**

**Rationale:** Service account auth is simple enough to integrate without technical debt, performance is excellent, and we preserved paste fallback for offline use. No blockers discovered—ready for production implementation.

---

## Related Decision Records
*Did this spike lead to any architectural or product decisions?*

- 2025-10-31-use-service-accounts-for-sheets-auth.md (chose service accounts over OAuth)
- 2025-10-31-keep-paste-fallback-for-offline-mode.md (dual input modes)
