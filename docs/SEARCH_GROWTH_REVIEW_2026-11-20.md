# Search growth and indexing review — 20 November 2026

## Source-of-truth and current Google guidance
- This audit uses connected OpenSEO → Google Search Console URL Inspection and Search Analytics, previous evening's 50-page OpenSEO crawl per project, five GitHub repositories, and Vercel production checks.
- Google announced the **November 2026 core ranking update** starting 10 November, with rollout up to two weeks; do not interpret day-to-day volatility during rollout as a confirmed site penalty.
- On 19 November Google clarified page-level and site-wide ranking signals and strengthened site-reputation-abuse policy wording. Build genuine first-party information, and do not host third-party promotional content for the purpose of exploiting existing ranking signals.
- Google says sitemap submission does not guarantee crawl, index or ranking; normal pages cannot use its special Indexing API. Distinguish "discovered not indexed" from "crawled not indexed" and old soft-404 results.
- Reference: https://status.search.google.com/incidents/WLxcJyC6jMWMfryxsKMc and https://developers.google.com/search/updates and https://developers.google.com/search/docs/fundamentals/creating-helpful-content

## Search Console performance baseline
**Finalized Google Search web data** 20 October–16 November 2026, 28 days:
| Site | Clicks | Impressions | Note |
| --- | ---: | ---: | --- |
| anytool.online | 9 | 1,656 | Homepage, selected Taiwan tools indexed; /games hub and Starfall discovered-not-indexed |
| scholarportal.site | 0 | 9 | Homepage indexed; /blog retains soft-404 verdict from 5 September crawl although 20 November live response is 200 with substantial HTML |
| kmafaq.site | 3 | 7 | Homepage and air-quality article indexed; /article-archive & /scholarships discovered-not-indexed |
| kmafaq.online | 0 | 2 | Existing homepage/articles indexed; /blog unknown in inspected GSC snapshot; historical www URLs and deleted articles can remain in legacy reports |
| worksheet.live | 2 | 798 | Homepage, /create, /create/templates indexed; restored guides discovered but not yet indexed |

Totals: **14 clicks / 2,472 impressions across five sites** (Google Search only, not all traffic). GSC performance reporting lags days; URL Inspection shows Google's **last known** crawl, not necessarily current production status. Full indexed/excluded Pages-report totals are not available through the connected apps. The old GSC Wizard connection requires a renewed subscription, but OpenSEO GSC access worked.

## Changes committed during this review

1. **AnyTool** `KanwarAfaq/anytool-online`
   - Fixed three duplicate localized metadata descriptions on /platforms across English, Arabic and Urdu: new native-language, distinctive Arabic/Urdu snippets. Live 200 HTML verified.
   - Added a built-output test guarding against duplication on /platforms. A temporary CI failure came from an over-strict 50-character test on Traditional Chinese, not from the site's content; replaced it with a locale-appropriate check and verified Vercel production deployed the corrected build.
   - Actionable opportunities: new games URLs need Google crawl; established /tools/taiwan-elder-care has real impressions, so avoid changing official financial/benefit rules merely to target search terms.

2. **Worksheet Studio** `KanwarAfaq/worksheet`
   - GSC query samples include "create your own worksheet template free" and "create online worksheet for grade 4 template free" with impressions but weak ranks. Existing product supports editable tracing, word search, scramble and missing-letter activities and PDF/PNG downloads without an account.
   - Updated /create/templates with accurate custom-template title, description, structured step-by-step teacher guidance and internal links to printing and worksheet library.
   - Updated /create title, description and visible content with a direct crawlable internal link to the custom templates.
   - Live 200 self-canonical HTML confirmed and repository Quality checks succeeded.

3. **Portfolio** `KanwarAfaq/kmafaq`
   - The indexed /blog/air-quality-deep-learning article had a very short, unreplicable summary. Added six substantial sections explaining target definition, data quality, time-series leakage, benchmark baselines, model differences, MAE/RMSE and reproducibility limits; links to AirNow and OpenAQ.
   - Supplements appear in the visible React article and prerendered server HTML; no fabricated new experimental measurements. Live 200 and production READY confirmed.

4. **K.M. Afaq Blog** `KanwarAfaq/kmafaq_blog`
   - /shop included a real, active /shop/ai-prompt-pack product but server-rendered HTML was only a short generic description with no product listing. The static renderer now includes real crawlable product links sourced from active product records and descriptions.
   - Also added first-party commercial guidance to /services and /pricing based on the services and partnership features actually present in the React UI; no invented price/availability information.
   - Live 200 pages with linked product markup verified. Tests assert that when products exist the shop hub contains links; the sitemap-safety workflow and Vercel deployed successfully.

5. **ScholarPortal** `KanwarAfaq/global-scholar-portal`
   - /pricing crawled-not-indexed after a thin crawl snapshot, although the React app has actual plan options. Added a source-grounded guidance section to initial prerendered HTML and a matching visible section in React explaining free opportunity links, matching/alerts and AI-credit limitations, and no admission/scholarship guarantee.
   - Current pricing values remain dynamic database-driven (no invented prices). Vercel production READY verified.
   - /blog Google soft-404 result is based on a 5 September crawl. Current /blog returns 200 and substantial crawlable article links. No speculative redirect or mass sitemap resubmission.

## Operational checks
- All five websites reported Vercel production READY after the substantive content/metadata changes; runtime error scan showed **no errors** within the last 24 hours for the checked projects.
- Full-volume OpenSEO crawl is capped at 50 pages and does not represent whole-site coverage on any of the larger sites. Treat "thin content" thresholds and title length as heuristic warnings, not Google ranking rules.
- New Google indexing and ranking gains require later Google crawling, content evaluation, relevant exposure and measured traffic. These fixes do **not** guarantee new rankings, inclusion or ad revenue.
- Do not repeatedly submit unchanged XML sitemaps, remove old articles solely to manipulate "freshness", fabricate sponsor endorsements, or copy competitors' content.

## Next measured tasks
- Reinspect /games/starfall, /games, ScholarPortal /blog, Worksheet restored guides and /create/templates after Google revisits them.
- Use GSC page/query combinations and real engagement data (when GA4 account is connected) to prioritize original tutorial pages.
- Review dated scholarship content and historical blog URLs for genuinely expired deadlines or duplicates; retain valid 404/410 for intentionally deleted content with no proper replacement.
- Monitor impressions and clicks in rolling 28-day windows, comparing complete windows after the November core update finishes, not same-day results.
