# SEO Control Center

A multi-site SEO operations dashboard for **anytool.online**, **kmafaq.online**, **kmafaq.site**, and **scholarportal.site**.

## What is already implemented

- Modern responsive visual dashboard for all four sites.
- Live website and sitemap health checks.
- Google Search Console 28-day overview endpoint.
- GA4 Realtime endpoint.
- Basic technical SEO audit: HTTP, latency, title, meta description, canonical, H1, robots meta, robots.txt, sitemap, Open Graph, and JSON-LD.
- GSC quick-win opportunity finder for high-impression queries/pages around positions 4–20.
- Google URL Inspection action endpoint.
- Google sitemap submission action endpoint.
- IndexNow submission endpoint.
- LINE Messaging API test and monitoring alerts.
- 5-minute GitHub Actions uptime/sitemap monitor (independent of Vercel).
- Integration-status screen and secure action-key protection.

## GSC accuracy and indexing workflow

- The daily LINE digest is a **single visual Flex card** scheduled at **08:00 Asia/Taipei**. It includes health, per-site clicks and impressions, verified **URL Inspection sample** results, and sitemap submissions; it does not enumerate page links.
- GSC figures come from the **Web search**, **property-level aggregated**, **finalized** Search Analytics API. The dashboard and notification must be compared with the **exact date range** shown in the digest (Pacific calendar, 28 days ending 3 days before the run). GSC's last-24-hours view and GA4 Realtime are different metrics.
- Indexing progress is a URL-by-URL inspection of pages found in live sitemaps; it is **not the same as the GSC Pages index coverage total**. Errors are not counted as checked and are eligible for retry after six hours.
- During the digest, the secure `POST /api/indexing-submit` operation checks each configured HTTPS sitemap against the GSC Sitemaps API. It submits when Google does not have the sitemap or when a trustworthy sitemap `lastmod` is newer than the recorded submission. It does **not** spam unchanged sitemaps or auto-resubmit an unresolved error.
- Authorized manual resubmission for a configured site is `POST /api/indexing-submit` with `{"site":"scholarportal","force":true}` and an `x-admin-key` header. The GSC response confirms **submission, not indexing**.
- Google's direct Indexing API only supports qualifying `JobPosting` and livestream `BroadcastEvent` pages. Ordinary scholarship, blog, and tool URLs must use sitemaps, internal links and regular crawling. See https://developers.google.com/search/apis/indexing-api/v3/using-api
- Run `node --test tests/*.test.mjs` to test reconciliation and submission safeguards.

**GitHub Actions secrets required for daily digest:** `LINE_CHANNEL_ACCESS_TOKEN`, `LINE_USER_ID`, `ADMIN_ACTION_KEY` (the same key configured on Vercel), and optionally `SITE_CONFIG_JSON`, `SEO_STORAGE_SECRET`, `VERCEL_AUTOMATION_BYPASS_SECRET`. Google's service account remains in **Vercel**, never in the repository or LINE message.

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
