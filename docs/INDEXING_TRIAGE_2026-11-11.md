# Five-site Google SEO / indexing investigation — 2026-11-11

This record separates **Google's last-known URL Inspection state** from **current public HTTP/on-page checks**. A zero-impression URL is not automatically unindexed. Google decides when to crawl and whether to index.

## Scope and first-party data

- Properties: `sc-domain:anytool.online`, `sc-domain:scholarportal.site`, `sc-domain:kmafaq.site`, `sc-domain:kmafaq.online`, `sc-domain:worksheet.live`.
- GSC sample: 24 representative URLs freshly inspected on November 11. The inspection API returns Google's most recent stored crawl, not an instantaneous recrawl.
- A separate live on-page audit retrieved 11 public URLs and confirmed HTTP responses, HTML, canonicals, metadata, and content.
- All five GSC Wizard trackers were expanded with the current sitemap URLs: **288 / 571 / 13 / 553 / 64** (1,489 sitemap URLs total). Newly registered URLs initially have *pending* inspection status. ScholarPortal additionally retains a tracked URL not in its current sitemap.
- GSC sitemap performance (28-day search period, ending approximately November 8) found **23 / 34 / 1 / 6 / 15** sitemap URLs receiving search impressions across the five sites in that order. These counts measure recent search visibility, **not** Google's overall indexed-page count.

## Issue triage by website

| Site | Google inspection evidence | Current live HTML findings | Fix / next action |
| --- | --- | --- | --- |
| anytool.online | `/tools` and `/zh-tw` unknown to Google; `/tools/qr-generator`, `/tools/taiwan-elder-care` indexed | `/tools` responds 200 with self-canonical, 1,138 words; sample tool has a missing Organization publisher logo | Add real publisher logo to tool schema; keep category hubs linked; monitor pending page discovery |
| scholarportal.site | Google classified `/blog` as **Soft 404**, last crawl **2026-09-05**; `/programs` unknown; home indexed | Today `/blog` responds 200, self-canonical, ~1,836 words and crawlable article links; `/programs` had ~68 words | Add fallback article listing for transient database errors; add program comparison guidance; check again after Google's recrawl |
| kmafaq.site | `/about`, `/publications`, `/projects`, `/blog` indexed; a Roman Urdu blog article unknown | `/blog` and `/publications` previously served thin initial HTML (7 and 4 words) | Add factual topic/explanation text and contextual links to initial HTML; inspect project/article pages as the tracking queue advances |
| kmafaq.online | `/blog` unknown; one article "Crawled - currently not indexed", last Google crawl **2026-10-14**, user canonical then pointed to home | Today article responds 200 with its own canonical and ~1,277 words; public `/blog` has ~7,893 words | Remove homepage rewrites for 12 public landing pages; serve route-specific prerenders; add publisher logo and test canonical before Google's next crawl |
| worksheet.live | `/worksheets/addition-within-twenty` unknown; `/create` and relevant guides indexed | `/create` had a title ~86 characters; worksheet sample has missing Organization provider logo | Shorten title; enrich provider schema; keep worksheet pages directly linked and crawlable |

### Verified host redirects

- `https://www.anytool.online/tools/qr-generator` → **308** → `https://anytool.online/tools/qr-generator`; landing page declares its own canonical.
- `https://www.kmafaq.online/blog/meta-muse-ai-agent-pakistan-guide` → **308** → canonical non-www URL.

These redirects help consolidate duplicate hosts. They do **not** erase existing Search Console coverage errors instantly.

## Code and workflows

### Per-repository audits

Each website repository contains:

- `.github/workflows/seo-three-day.yml`: daily 05:37 UTC schedule trigger, with a third-day UTC gate; manual `workflow_dispatch` also supported.
- `scripts/seo-three-day.mjs`: read-only public checks, up to 100 rotating sitemap URLs per run, JSON+Markdown output, and a 60-day GitHub artifact.
- Tests cover homepage, robots, sitemap, public page HTTP 200, canonical and noindex, title, H1. These are **live content tests**, not Google URL Inspection API calls. They will not classify an uninspected URL as indexed or excluded.

### SEO central hub

- `https://seo-kmafaq.vercel.app` **Overview**: live five-site table with HTTP/sitemap health, settled 28-day Google clicks/impressions/CTR, saved inspected-indexed/not-indexed and unchecked counts, top causes.
- **Indexing** tab: filter saved per-URL Google Inspection records by site and status, with cause, canonical difference and recommended investigation.
- `.github/workflows/three-day-review.yml`: consolidated five-site review on the same three-day UTC cadence. Adds **one additional LINE message** to the four existing daily notifications.
- `scripts/three-day-review.mjs`: calls existing health/GSC/inspection APIs, saves Markdown+JSON+LINE preview artifacts. Does not request indexing, submit unchanged sitemaps, or modify web pages.
- Check **Actions → Three-day portfolio SEO + LINE report → Run workflow → dry_run** to validate health data without contacting LINE. Then run the normal workflow to test the actual recipient.
- GitHub Actions must have `LINE_CHANNEL_ACCESS_TOKEN`, `LINE_USER_ID`, and preferably `ADMIN_ACTION_KEY` and `VERCEL_AUTOMATION_BYPASS_SECRET` if deployment protection is enabled. Configure secrets using GitHub Settings; **never commit tokens**.
- `get_site_summary` uses settled GSC metrics; no claims of realtime clicks. `GET /api/index-progress?details=1&site=<site-id>` reads previously persisted inspections; its results do **not** automatically synchronize with the separate GSC Wizard tracker.

## Follow-up live retest (November 11)

- **Portfolio article recovery:** The first deployment of static portfolio snapshots exposed a template mismatch for dynamic `/blog/:slug` pages: the article function expected the original empty React root, but the build had replaced it with the homepage snapshot. The affected sample pages temporarily served HTTP 503. Fixed by emitting `dist/app-shell.html` before prerendering and having `api/blog-page.js` use that pristine shell, plus regression coverage. A subsequent live audit confirmed **HTTP 200, correct article canonicals, and indexable pages** for `/blog/roman-urdu-nlp-challenges` and `/blog/github-pages-react-deployment`. Their live visible text (~48 and ~56 words) remains thin and merits real editorial expansion; do not invent material or pad with generic text.
- **ScholarPortal:** `/programs` now serves ~314 words of original admissions/funding guidance and the sampled scholarship article has valid publisher/editorial organization schema. Both were HTTP 200, self-canonical, indexable, and reported zero on-page audit issues.
- **Worksheet Studio:** `/create` now has a concise SERP title and ~405 words of instructions, with zero issues in the latest audit.
- **Blog:** `/blog/meta-muse-ai-agent-pakistan-guide` serves 200, self-canonical, noindex=false, and ~1,277 words with no remaining sampled on-page schema errors.
- **AnyTool:** `/tools/qr-generator` serves 200, self-canonical and passed the latest sampled on-page audit. Its legacy `www` URL returns a 308 redirect.
- **Indexing tracker:** GSC Wizard now contains 288 AnyTool, 572 ScholarPortal (including one older URL no longer in the sitemap), 13 Portfolio, 553 K.M. Afaq Blog and 64 Worksheet tracked URLs. Most newly added URLs remain pending Google URL inspection. The current list is more comprehensive but is **not** a claim that all pages are already inspected.

## Verification and limitations

- Confirmed Vercel deployment statuses are **not** a substitute for reviewing the next GitHub Actions audit logs and the live rendered experience.
- The recurring workflows are committed but their first scheduled execution and **LINE delivery to a device** were not yet verified.
- Not all pages have completed a new Google URL inspection. Expanded tracking produces results progressively as Google/API quotas permit.
- Some pages are unknown to Google because they are relatively new, weakly discovered, or not crawled yet; for those, internal linking, original useful content and patience are appropriate. A bad canonical, 404, noindex or robots block must be corrected before requesting recrawl.
- Continue watching rankings/clicks over multiple complete 28-day periods rather than attributing immediate improvements to one deployment. A sitemap or HTML fix **cannot guarantee** Google indexing or increased clicks.

## Authoritative resources

- [Google — Learn about sitemaps](https://developers.google.com/search/docs/crawling-indexing/sitemaps/overview)
- [Google — Technical requirements](https://developers.google.com/search/docs/essentials/technical)
- [Google — Crawling and indexing troubleshooting](https://developers.google.com/search/docs/crawling-indexing/troubleshoot-crawling-errors)
- [Google — Organization structured data](https://developers.google.com/search/docs/appearance/structured-data/organization)
- [Google — Request recrawling](https://developers.google.com/search/docs/crawling-indexing/ask-google-to-recrawl)

*Prepared from repository inspection, connected Google Search Console data and live on-page tests on 2026-11-11. No ranking/indexing results have been fabricated.*


## Second indexing repair pass (November 11, 2026, 13:52–13:57 Taipei)

Google's latest official guidance: [documentation updates](https://developers.google.com/search/updates), [technical requirements](https://developers.google.com/search/docs/essentials/technical), [people-first content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content), [crawl troubleshooting](https://developers.google.com/search/docs/crawling-indexing/troubleshoot-crawling-errors).

### Implemented and committed

- AnyTool: direct localized navigation to tool hubs, source and methodology pages; links to the four language editions in initial HTML. Live check: Arabic and Traditional Chinese tool hubs both HTTP 200 and self-canonical. Google canonical conflict records still require recrawl.
- ScholarPortal: exclude duplicate and redirected article paths from crawlable discovery hubs and related-article links, consistent with canonical sitemap generation. Live checks: the blog hub, two previously excluded article samples and the historic article Soft 404 all HTTP 200 with self-canonicals. Content quality and recrawl remain separate.
- Portfolio: link the public article archive from initial navigation; add original practical guides to the two previously very short Roman Urdu and Vite/GitHub Pages articles, in both React and server HTML. The guides preserve the existing stored articles and include relevant resources.
- K.M. Afaq Blog: use actual article update timestamps (fallback to publication date) for sitemap lastmod. Two sampled articles are HTTP 200, self-canonical and indexable. Large discovery backlog remains.
- Worksheet Studio: real printable subject hubs can be indexable even without uploaded database records; sitemap includes subjects supported by genuine printable worksheets. Live math hub and addition-within-20 worksheet HTTP 200, self-canonical, no sampled on-page issues.

### Search Console sitemap submissions (all accepted and confirmed)

| Canonical sitemap | Google accepted at UTC |
|---|---|
| https://anytool.online/sitemap.xml | 2026-11-11 05:55:02 |
| https://scholarportal.site/sitemap.xml | 2026-11-11 05:55:04 |
| https://kmafaq.site/sitemap.xml | 2026-11-11 05:55:06 |
| https://kmafaq.online/sitemap.xml | 2026-11-11 05:55:09 |
| https://worksheet.live/sitemap.xml | 2026-11-11 05:55:11 |

All returned accepted, confirmed, zero submission errors, and pending download. Google controls subsequent indexing. The portfolio also has an erroneous historical sitemap registration at /blog (HTML, one GSC error). It should be removed in Search Console Sitemaps; the current integration offers submission/listing, not sitemap removal. Prefer the canonical non-www sitemap for AnyTool and K.M. Afaq Blog.

The saved dashboard baseline was refreshed at 05:56:46 UTC: 1,490 tracked URLs, 60 indexed, 178 not indexed, 1,252 pending, zero errors. These are tracked URL counts, not sitewide coverage. The previous 12:37 Taipei snapshot is superseded. Continue the existing three-day review, compare the exact Google crawl date on changed pages, and prioritize excluded pages with real user demand and original content.
