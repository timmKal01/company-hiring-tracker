# Company Hiring Tracker — Job Openings via Greenhouse & Lever

Give it a list of companies. It pulls their current open roles straight from
the public job board API behind Greenhouse or Lever — the same data that
powers `boards.greenhouse.io/{company}` and `jobs.lever.co/{company}` pages,
just as clean JSON instead of a webpage.

Built for recruiters, sales teams reading hiring activity as a buying
signal, and market researchers tracking headcount growth by department.

## Input

| Field | Type | Description |
|---|---|---|
| `boards` | array | `{ "ats": "greenhouse"\|"lever", "slug": "company-slug" }`. The slug is the company identifier in the board's own URL. |
| `keywordFilter` | array of strings | Only keep jobs whose title contains one of these (case-insensitive). Leave empty for all jobs. |
| `includeDescription` | boolean | Fetch the full job description text. Off by default (smaller, faster runs). |

```json
{
  "boards": [
    { "ats": "greenhouse", "slug": "stripe" },
    { "ats": "lever", "slug": "palantir" }
  ],
  "keywordFilter": ["engineer", "product manager"]
}
```

Finding a company's slug: open their careers page, look for a link to
`boards.greenhouse.io/<slug>` or `jobs.lever.co/<slug>` — many companies
embed their board directly on their own `/careers` page, so check the page
source if it's not obvious from the URL bar.

## Output

One record per job:

```json
{
  "company": "stripe",
  "ats": "greenhouse",
  "jobId": "8023928",
  "title": "Account Executive, Bridge",
  "location": "London",
  "department": "8589 Bridge - S&M",
  "commitment": null,
  "url": "https://stripe.com/jobs/search?gh_jid=8023928",
  "postedAt": "2026-07-30T06:59:38-04:00",
  "updatedAt": "2026-08-06T12:10:12-04:00",
  "description": null,
  "discoveredAt": "2026-08-07T00:00:00.000Z"
}
```

## How it works

Direct calls to each ATS's own public JSON API — no scraping, no headless
browser, no proxy:

- Greenhouse: `https://boards-api.greenhouse.io/v1/boards/{slug}/jobs`
- Lever: `https://api.lever.co/v0/postings/{slug}?mode=json`

Both are the same endpoints the company's own public careers page calls to
render its job list; `robots.txt` on both API hosts explicitly allows this
usage (Greenhouse only excludes an unrelated `/embed/` path; Lever's is a
blanket `Allow: /`).

## Pricing note

Job counts per company vary enormously (a large company can have 500+ open
roles in one call). Billing is per **board queried**, not per job returned,
so pulling a big company's full board doesn't multiply the cost.
