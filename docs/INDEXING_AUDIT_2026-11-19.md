# Five-site GSC and production SEO review — 19 November 2026

## Evidence and limitations

- Google Search Console access was checked using **OpenSEO connected GSC properties**. GSC Wizard refuses requests because the account's trial/subscription has expired. Ahrefs GSC tool access returned "Insufficient plan".
- Google URL Inspection describes Google's **last known indexing decision**, often from older crawl dates. Production HTTP testing reports what works **now**; it does not guarantee new Google crawling/indexing.
- OpenSEO crawled up to **50 pages per site**; AnyTool, ScholarPortal, KM Afaq Blog and Worksheet crawls reached that page limit. Portfolio's 13 known pages were all crawled.
- Full sitewide Google "indexed" and "not indexed" totals are unavailable from these tools; do not substitute tracked-URL counts, sitemap counts, Search performance impression counts, or sampled inspections for the Google Pages report.
- Search performance below uses identical **2026-10-20 to 2026-11-16** GSC date ranges (28 days; final data).
- All five Vercel websites were showing production deployment READY when checked.

## 28-day GSC web performance

| Site | Clicks | Impressions | Representative URL indexing results |
|---|---:|---:|---|
| anytool.online | 9 | 1,656 | Homepage and labor-insurance tool indexed; /games unknown; /games/starfall discovered, not indexed |
| scholarportal.site | 0 | 9 | Homepage indexed; /blog soft 404 from a **2026-09-05 Google crawl** despite current HTTP 200 and substantial content; three sampled scholarship articles crawled, not indexed |
| kmafaq.site | 3 | 7 | Homepage, /blog, /publications indexed; one article unknown and another discovered, not indexed |
| kmafaq.online | 0 | 2 | Homepage and two sampled older articles indexed; /blog unknown; some old www articles crawled, not indexed |
| worksheet.live | 2 | 798 | Six of six sampled important pages indexed, including /create, /reading and the handwriting guide |

## Verified fixes

### Worksheet Studio

- First 50-page OpenSEO audit: **96 broken-internal-link findings** on 48 source pages, all pointing to two missing routes: `/guides/word-search-maker-guide` and `/guides/cursive-writing-practice-worksheets`.
- Content for both guides already existed in `src/lib/guides.ts`, but their Next.js page files were absent. Created both routes with canonical metadata and the existing Article/FAQ markup.
- Post-deployment HTTPS checks returned **200** and proper self-canonicals for both.
- New 50-page OpenSEO crawl: **zero broken internal links or broken pages**. Remaining flags: 21 long titles and 3 long meta descriptions (informational, not direct indexing blockers), plus the crawl page limit.
- Separate operational issue: daily worksheet draft agent GitHub Action fails because its required **WORKSHEET_CRON_SECRET** is absent from the repository Action secrets. This must be configured from the user's environment; do not bypass authentication or disclose secret values.

### Portfolio

- Initial complete 13-page OpenSEO crawl flagged three orphaned pages: `/certifications`, `/gallery`, `/scholarships`.
- Expanded crawlable navigation links in `scripts/generate-static-pages.mjs` to cover these pages.
- Live homepage HTML now contains links to all three.
- Follow-up complete 13-page crawl: **zero orphan-page warnings**. Eight low-word-count pages and two long titles remain; don't pad low-value copy simply to hit a numeric threshold.

### SEO Control Center

- Daily LINE Flex carousel was rejected by LINE with HTTP 400. Using the official `/v2/bot/message/validate/push` API, identified missing `contents` arrays on bar component boxes.
- Corrected both daily and three-day Flex chart renderers; official API validation now returns **HTTP 200 for all three formats** (daily summary, daily six-card carousel, three-day six-card carousel). This confirms schema validity **without sending**; delivery still needs next live run verification.
- Daily SEO analysis agent had returned HTTP 503 since November 7. Queried `public.seo_agent_runs` in the connected Supabase project: repeated `seo_snapshots_site_id_fkey` violation. Found `public.seo_sites` missing **worksheet** while dashboard config listed all five sites. Inserted missing `worksheet` site row, then verified `seo_sites` contains five active site IDs. Next full agent run must verify its storage writes.
- LINE failure fallback now tries the validated summary Flex if a future rich carousel is rejected, rather than silently skipping the notification.

## Problems requiring recrawling, content review, or access

- **AnyTool:** newly added Games pages are live, server-rendered and self-canonical, but Google has not indexed them yet. Improve authentic game-specific instructions/internal links and wait for Google recrawl. No forced indexing API exists for these ordinary pages.
- **ScholarPortal:** old /blog soft-404 classification likely reflects the September crawl, not current production HTML; confirm in Search Console after Google crawls again. Older scholarship guides marked "Crawled — currently not indexed" need a human review of original sources, current eligibility/deadlines and distinction from generic aggregated articles. Avoid mass submission or invented deadlines.
- **K.M. Afaq Blog:** historical `www` articles in Google history redirect to the non-www host. Two sampled old slugs are genuine HTTP 404 and not in current sitemap. Do not misdirect them to the homepage unless a truly equivalent replacement is verified; Google recommends true 404/410 for genuinely removed pages.
- **Worksheet:** GSC currently indexes the tested key URLs; the most urgent defect was crawlable internal links to 404s and is fixed.
- **Full indexing totals:** GSC Wizard renewal at https://tool.gscwizard.com/settings/subscription or manual Google Search Console Pages exports are needed for authoritative full-site exclusion counts. OpenSEO provides useful live URL inspections without needing to renew GSC Wizard.

## Follow-up audit priority

1. Check the next GitHub workflow run for daily SEO agent persistence and daily LINE delivery.
2. Track Google recrawls of updated Worksheet guides, Portfolio hub links and ScholarPortal /blog.
3. Review GSC's crawled-not-indexed Scholarship/Blog articles for actual originality, freshness and primary-source accuracy; improve or consolidate only when editorial value justifies it.
4. Review long titles/descriptions as presentation improvements, not as guaranteed indexing fixes.
5. Continue three-day crawl and indexing watch without interpreting "pending" URL inspections as "not indexed".

Official references: [Google Search Central crawling troubleshooting](https://developers.google.com/search/docs/crawling-indexing/troubleshoot-crawling-errors), [Google Search Console Page indexing report](https://support.google.com/webmasters/answer/7440203), [LINE Messaging API validation](https://developers.line.biz/en/reference/messaging-api/#validate-message-objects-of-push-message).
