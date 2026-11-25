# Five-site Google Search and technical SEO review — 25 November 2026

**Sources:** OpenSEO connected Google Search Console URL Inspection and Search Analytics, fresh OpenSEO crawl audits (50 pages/site; full 13-page Portfolio audit), the five site GitHub repositories, GitHub Actions, Vercel production and Google Search Central official documentation.

## Google update context

- Google's November 2026 core update finished **24 November 2026, 06:03 PST**.
- Google lists a new **December 2026 core update** starting **24 November 2026, 07:02 PST**. Rankings can still fluctuate; don't infer a completed SEO result from one day.
- Google's spam policies prohibit creating many unoriginal pages primarily to manipulate rankings; the count of posts is not itself the issue. Original usefulness and evidence are required.
- See https://status.search.google.com/ and https://developers.google.com/search/docs/essentials/spam-policies

## First-party Google Search baseline

**Finalized Search Analytics, 26 October–22 November 2026 (28 days)**

| Website | Clicks | Impressions |
| --- | ---: | ---: |
| anytool.online | 10 | 1,707 |
| scholarportal.site | 0 | 3 |
| kmafaq.site | 1 | 6 |
| kmafaq.online | 0 | 2 |
| worksheet.live | 2 | 1,204 |
| **Total** | **13** | **2,922** |

These are aggregated daily Search Console rows, not Google Page Indexing totals and not all-site traffic. Window overlaps previous baselines; newly committed code cannot explain this historical window.

## Changed and verified today

### AnyTool `KanwarAfaq/anytool-online`

- First-party GSC query `tax calculator` showed **211 impressions, 0 clicks, mean position 2.9**, associated with the Traditional Chinese income-tax URL. Position is an average and need not correspond to an exact Google search-result screen.
- Updated SSR and React-shared title for `/zh-tw/tools/income-tax`, and its Chinese meta description. New description accurately details yearly salaries, spouse salary, dependents, progressive brackets, standard and wage-income deductions, and states estimate is **not an official filed tax return**.
- Added a build-output smoke test protecting the 2026 tax snippet and the scope disclaimer. CI **passed** and Vercel production **READY**. Checked live HTTP 200, title and description.
- GSC URL Inspection now shows **`/games/starfall` submitted and indexed**, crawled on **25 November 2026**. `/games` still unknown to Google (not necessarily blocked).
- Fresh 50-page audit: no critical or broken-link issues in sample; 38 heuristic low-word-count warnings and page-limit warning. Don't pad legitimate tools or legal pages solely to reach arbitrary word limits.

### Worksheet Studio `KanwarAfaq/worksheet`

- First-party GSC query `word scramble maker` has **19 impressions, 0 clicks, mean position 21.4**. Improved `/create/word-scramble`: metadata and server-visible, genuinely actionable teaching instructions (3–25 word bank, optional hints, preview, answer keys, printing, PDF) and links to related makers.
- Build quality checks **passed**, Vercel production **READY**, and verified live HTTP 200, title, description and new guide.
- `/create` and `/create/templates` remain indexed in URL Inspection; restored `/guides/word-search-maker-guide` was discovered but not yet indexed; the cursive guide is unknown to Google.
- **Unresolved workflow:** GitHub Action `Daily worksheet agent (5 private drafts)` failed on **25 November 2026** because Actions secret `WORKSHEET_CRON_SECRET` is empty. It must be added by the owner using GitHub secret settings; do not bypass cron authentication or ask for a secret in chat.

### Portfolio `KanwarAfaq/kmafaq`

- `/article-archive` was discovered but not indexed and had a low-content audit warning; it correctly lists three existing authored articles but lacked a meaningful guide.
- Added reader-useful explanations of which technical articles to choose, how to interpret evidence, and contextual links to publications/projects/about/contact. Added regression tests.
- Verified HTTP 200 and the live HTML. Fresh complete **13-page audit** found **no thin-content flag on `/article-archive`** and no broken internal links. Heuristic thin-content warning count dropped 7→6; no index guarantee.
- The previously improved air-quality article remains indexed.

### K.M. Afaq Blog `KanwarAfaq/kmafaq_blog`

- Active production agent was correctly capped at **four posts/day** (two Urdu, two English), but installable template `agent/templates/github-action.yml` still contained **ten daily publishing slots and per-language limit 5**. Synchronised template with the active four-post workflow and added a unit test guarding schedule, caps and template synchronization.
- GitHub `KM Afaq Agent Tests` **passed** and Vercel production **READY**.
- GSC sampled blog URL `/blog` is unknown to Google; older `www` article URLs show `Crawled - currently not indexed`. GSC Search Analytics reports only 2 impressions and 0 clicks this period. Need editorial source/originality review before trying to publish more pages.
- Google warns about scaled unoriginal content, not the use of AI or automation alone; do not mistake post volume for useful search value.

### ScholarPortal `KanwarAfaq/global-scholar-portal`

- Current 50-page crawl: no broken-link or critical errors in sampled pages; two heuristic thin-content pages.
- GSC still shows `/blog` **Soft 404**, but Google's last crawl for this verdict was **5 September 2026**. Current production returns HTTP 200 with substantial pre-rendered content and internal links; do not change valid routes or redirect the blog solely because of stale evidence.
- `/pricing` shows `Crawled - currently not indexed` based on October crawl; current page is content-rich after earlier fixes.
- Existing daily agents use a shared publication lock, a hard ceiling of four new public articles/day, source-based guidance and draft validation. No new code change was justified by this audit.
- With 3 search impressions and no clicks, focus on original research, direct primary sources, reliable deadline/eligibility checking, and differentiation from source summaries, rather than high-frequency generic articles.

## Current limitations and priority

- OpenSEO free audits stop at **50 pages** for sites with larger inventories; no sitewide exclusion counts are available through these sampled inspection calls.
- GSC Wizard remains unsubscribed, but the OpenSEO Search Console integration is working. Do not interpret pages *unknown to Google* as confirmed technical errors.
- The December core update is ongoing; compare **non-overlapping finalized** Search Console windows before attributing ranking changes to these releases.
- Run a qualitative review of ScholarPortal and K.M. Afaq Blog article originality, sourcing, dates and duplication. Avoid fabricated freshness or spammy keyword-targeted page creation.
- Need owner's action only for Worksheet's missing `WORKSHEET_CRON_SECRET`.

## Official documentation
- https://status.search.google.com/
- https://developers.google.com/search/docs/essentials
- https://developers.google.com/search/docs/essentials/spam-policies
- https://developers.google.com/search/docs/crawling-indexing/troubleshoot-crawling-errors
