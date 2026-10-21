# SEO Control Center

A multi-site SEO operations dashboard for **anytool.online**, **kmafaq.online**, **kmafaq.site**, **scholarportal.site**, and **worksheet.live**.

## What is already implemented

- Modern responsive visual dashboard for all five sites.
- Live website and sitemap health checks.
- Google Search Console 28-day overview endpoint.
- GA4 Realtime endpoint.
- Basic technical SEO audit: HTTP, latency, title, meta description, canonical, H1, robots meta, robots.txt, sitemap, Open Graph, and JSON-LD.
- GSC quick-win opportunity finder for high-impression queries/pages around positions 4–20.
- Google URL Inspection action endpoint.
- Google sitemap submission action endpoint.
- IndexNow submission endpoint.
- LINE Messaging API test and monitoring alerts.
- Four-times-daily GitHub Actions uptime/sitemap monitor (independent of Vercel).
- Integration-status screen and secure action-key protection.

## Visual digest and dashboard (new)

- **LINE digest, 4× daily** (08:15 / 12:15 / 18:15 / 22:15 Taipei) is labelled Morning / Midday / Evening / Night. The summary card shows a 14-day clicks sparkline and, per site, a **0–100 health score bar** with the week-over-week click change. Each site card adds colour-coded check dots (HTTP, Sitemap, Robots, GSC, Index, CWV, Issues). Checks with no data are grey and are never counted as a pass; GSC dates and the "inspection is a sample" caveats are unchanged.
- **Visual report per run:** every digest run also saves `reports/digest-preview.html` (standalone, light/dark) next to `digest.md/json` and `line-payload.json` in the workflow artifact. Open it to see exactly what the digest says, including on dry runs.
- **Dashboard:** site cards show a health-score ring, a 14-day sparkline and the 7-day change; a "Next LINE digest" countdown with today's four slots; CSV export on Google Search; an optional 5-minute auto-refresh (remembered per browser); five-site layout (3+2) and fixes for old "4/4" labels.
- Health score weights: HTTP 25, Sitemap 15, Robots 10, GSC 15, Index sample ≥50% indexed 15, CWV 10, no open issues 10 — normalised over the checks that have data.

## GSC accuracy and indexing workflow

- The LINE digest is a **single Flex carousel (summary + five site cards)** scheduled at **08:15, 12:15, 18:15 and 22:15 Asia/Taipei**. It includes health, per-site clicks and impressions, verified **URL Inspection sample** results, and sitemap submissions; it does not enumerate page links.
- GSC figures come from the **Web search**, **property-level aggregated**, **finalized** Search Analytics API. The dashboard and notification must be compared with the **exact date range** shown in the digest (Pacific calendar, 28 days ending 3 days before the run). GSC's last-24-hours view and GA4 Realtime are different metrics.
- Indexing progress is a URL-by-URL inspection of pages found in live sitemaps; it is **not the same as the GSC Pages index coverage total**. Errors are not counted as checked and are eligible for retry after six hours.
- During the digest, the secure `POST /api/indexing-submit` operation checks each configured HTTPS sitemap against the GSC Sitemaps API. It submits when Google does not have the sitemap or when a trustworthy sitemap `lastmod` is newer than the recorded submission. It does **not** spam unchanged sitemaps or auto-resubmit an unresolved error.
- Authorized manual resubmission for a configured site is `POST /api/indexing-submit` with `{"site":"scholarportal","force":true}` and an `x-admin-key` header. The GSC response confirms **submission, not indexing**.
- Google's direct Indexing API only supports qualifying `JobPosting` and livestream `BroadcastEvent` pages. Ordinary scholarship, blog, and tool URLs must use sitemaps, internal links and regular crawling. See https://developers.google.com/search/apis/indexing-api/v3/using-api
- Run `node --test tests/*.test.mjs` to test reconciliation and submission safeguards.

**GitHub Actions secrets required for scheduled digests:** `LINE_CHANNEL_ACCESS_TOKEN`, `LINE_USER_ID`, `ADMIN_ACTION_KEY` (the same key configured on Vercel), and optionally `SITE_CONFIG_JSON`, `SEO_STORAGE_SECRET`, `VERCEL_AUTOMATION_BYPASS_SECRET`. Google's service account remains in **Vercel**, never in the repository or LINE message.

## Growth audit agents (new)

### Weekly technical and off-page review

Every Sunday at **09:30 Asia/Taipei**, `.github/workflows/weekly-audit.yml` runs separate audits across **five sites** and publishes a human-readable GitHub Actions job summary plus downloadable Markdown/JSON reports.

- **On-page SEO (sampled HTML):** titles and descriptions, canonical mismatch, noindex meta and HTTP header, JSON-LD syntax, hreflang-ready language tag, social metadata, mixed content, duplicate snippets, sampled internal 404/410 links, and prioritized fixes. The audit checks **fetched source HTML**, not the fully rendered DOM; 403/timeout link checks are treated as *inconclusive*.
- **Indexability triage:** Groups Search Console URL Inspection results by noindex, robots.txt, server/404, canonical conflict, discovered-but-not-indexed, and crawled-but-not-indexed; provides top fixes. Data remains an **inspected sitemap sample**, not the complete Search Console Pages report.
- **Off-page signals:** Admin-only `GET /api/referral-audit?site=scholarportal` uses existing GA4 read permissions to compare the last 28 days against the previous 28 days of **Referral** sessions, and shows which referring sources send visitors. Referral traffic is **not** a backlink inventory or third-party domain-authority score; an export from Search Console **Links** or an Ahrefs/Semrush/Moz integration is required for a complete backlink audit.
- **Actions:** `topFixes` and `indexingReasons` identify highest-priority issues, without buying links, building automated spam backlinks, or deploying edits into a website without review.
- **Report-only:** The weekly workflow stores reports as GitHub Actions artifacts for **60 days** and adds a short run summary. It does not send additional LINE notifications.

### Inspect manually

Go to **GitHub → Actions → Weekly SEO growth audit → Run workflow** or open the latest scheduled run and download `seo-audit-<site>`. This workflow reuses `ADMIN_ACTION_KEY` and `VERCEL_AUTOMATION_BYPASS_SECRET` from your existing GitHub Secrets. GA4 property IDs and Google access remain in Vercel.

### What is not automated

Google chooses whether/when to crawl or index; forcing ordinary content with the restricted Google Indexing API is not supported. Backlink outreach should involve useful content, legitimate publishers and human approval, not bulk backlink creation or paid link schemes.

## Security model

Secrets are server-side only. Never add credentials to `index.html`, `app.js`, or commit an `.env` file. Use Vercel Environment Variables and GitHub Actions Secrets.

## Required setup

Copy `.env.example` values into Vercel Environment Variables. For GitHub Actions, add `LINE_CHANNEL_ACCESS_TOKEN`, `LINE_USER_ID`, and optionally `SITE_CONFIG_JSON` in Repository → Settings → Secrets and variables → Actions.

### Google service account

1. In Google Cloud Console, create/select a project.
2. Enable **Google Search Console API** and **Google Analytics Data API**.
3. Create a service account and download its JSON key.
4. Add the service account email to each Search Console property with sufficient permission.
5. Add the same service account email as a Viewer to each GA4 property.
6. Put the JSON as one line into Vercel variable `GOOGLE_SERVICE_ACCOUNT_JSON`.
7. Add each numeric GA4 Property ID to `SITE_CONFIG_JSON`.

## Deploy

This repository is intentionally dependency-light: static frontend + native Node.js Vercel functions. Connect the repository to Vercel and add the environment variables before testing Google/LINE actions.

## Next build phases

1. Persist snapshots + alert deduplication in Supabase.
2. Query/page/keyword opportunity engine.
3. Technical crawler + Core Web Vitals/CrUX/PageSpeed.
4. GitHub PR actions for SEO fixes.
5. Change-impact tracking before/after SEO edits.
6. AI-assisted content and internal-link recommendations with approval queue.

## Four daily per-site reports (October 2026 upgrade)

- Schedule: **08:15, 12:15, 18:15, 22:15 Asia/Taipei**, cron `15 0,4,10,14 * * *` in UTC. GitHub schedules can be delayed; these are target start times, not guaranteed delivery times.
- One LINE notification per run, containing a summary and five swipeable site cards. Each includes homepage response time, robots/sitemap checks, canonical conflict warnings, dated GSC clicks/impressions/CTR/position, calendar-week click changes, GA4 realtime availability, CrUX field metrics, inspection sample counts and up to three prioritized next actions. Search-query opportunities are suggestions to review, not automatic content edits or ranking promises.
- Missing GSC/GA4/CrUX data is explicitly unavailable, never interpreted as healthy zero. A successfully fetched sitemap is checked for XML and entries; sitemap-index child counts are not called page totals. Inspection results display the last saved scan timestamp.
- All five default sites are merged with `SITE_CONFIG_JSON` overrides, preserving existing property IDs. This upgrades older four-site secrets automatically. Set `{"id":"worksheet","enabled":false}` as an override only if you intentionally want to exclude it. Add Worksheet's actual GA4 property ID and grant the existing service account access to `sc-domain:worksheet.live` for its private Google metrics; public checks work without these.
- Each scheduled run attempts up to five new/stale URL inspections per site (20 per site daily), and submits only new/changed sitemaps using the existing protected API. This does **not** force Google indexing. The separate daily SEO agent and Sunday deep audit remain unchanged in frequency; the weekly audit now includes Worksheet.
- Transient LINE failures have bounded retries with an unchanged payload and a retry key to prevent duplicate retry delivery. Concurrent workflow runs are serialized. Independent manual reruns can send a new notification.
- `reports/digest.md`, `reports/digest.json` and `reports/line-payload.json` are retained as Actions artifacts for 30 days. The Markdown report is also in the workflow summary. Reports contain site metrics; respect repository/artifact access when sharing them.
- Test without sending or changing remote state: `npm run monitor:dry`, or **Actions → SEO digest monitor → Run workflow → dry_run**. Dry run reads live data and writes local reports only. `npm test` runs isolated transport tests without real credentials or network.
- The existing LINE recipient and channel secrets are reused. A successful API acceptance does not prove device delivery (for example if the bot is blocked). Check the workflow log for `LINE_DIGEST_OK`; missing/invalid secrets cause a visible failed run, not silent success.

References: [GitHub schedule behavior](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule), [LINE retry semantics](https://developers.line.biz/en/docs/messaging-api/retrying-api-request/).

## Visual portfolio intelligence

Open **Growth Intelligence** (or **Explore portfolio** on Overview) for:

- All-site or individual-site filters and 7/28/90-day date ranges.
- Current and previous period search charts, exact daily data tables, website contribution bars, CTR and weighted average position.
- Per-site stacked indexing progress with unknown/error counts kept separate from confirmed exclusions.
- Prioritized actions, real API connection checks, referral traffic, historical snapshots and recorded LINE digest history (history/referrals require the session admin key).
- A CSV export of the selected websites and date range, including missing-data status and spreadsheet-formula escaping.

The GSC endpoint accepts `compare=1` to fetch two equal calendar periods in one Google request, while its default response remains current-period-only. Zero-traffic dates are included in charts; missing API data is not zero. Ninety-day comparisons use 180 days of input, rather than comparing an incomplete prior range. All values come from the APIs; no demo dataset is shown on the production dashboard.

The data-source table distinguishes configuration from successful access. When a property is newly added, verify the matching GA4 property ID in Vercel's `SITE_CONFIG_JSON`, service-account access in GA4 and Search Console, and redeploy. Public `config-status` exposes only site metadata/boolean flags and the deployed commit SHA, never credentials.

Validation includes model tests for date boundaries, missing data, weighting and CSV safety, plus a DOM-controller integration test for charts, filters, exports and partial failures. The existing production smoke workflow waits for the matching deployed commit and then verifies all five properties. A successful smoke test verifies API access and response shapes; it does not prove a complete browser visual review, indexing, traffic growth, or notification delivery to a device.
