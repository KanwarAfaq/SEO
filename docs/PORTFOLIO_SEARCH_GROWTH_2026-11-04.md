# Portfolio search, answer-engine and discoverability plan — 2026-11-04

## Search scope and guardrails
These websites serve different intents and should not be treated as one keyword-stuffed network. The contextual "related resources" footers are optional pathways for visitors: **ScholarPortal** (scholarships and application guidance), **AnyTool** (utilities and calculators), **KM Afaq Blog** (technology and automation articles), **K.M. AFAQ portfolio** (research and projects), and **Worksheet Studio** (printable educational worksheets). A link only creates a discovery path; it does not guarantee authority, indexing, impressions, or clicks.

## Existing keyword-intent map
| Domain | Primary search intent | Practical page/topic opportunities |
|---|---|---|
| scholarportal.site | scholarships for international students, fully funded scholarships, internships, graduate funding | Verified eligibility/deadline pages, official scholarship sources, application checklists |
| anytool.online | free online calculators, PDF and image tools, Taiwan wage calculator, developer utilities | Topic-specific calculator guides, examples, formulas, date-stamped official references |
| kmafaq.site | Kanwar Muhammad Afaq AI researcher, Roman Urdu NLP, machine learning portfolio | Publications, open projects, reproducible research summaries, author profile |
| kmafaq.online | AI automation guides, tech tutorials, remote/freelance jobs, digital resources | Original step-by-step articles with authorship, sources, updated dates |
| worksheet.live | free printable worksheets Grades 1–6, worksheet maker, word search worksheets | Grade and subject collections, printable samples, answer-key and printing FAQs |

Do not add the obsolete `meta keywords` tag for Google; visible titles, accurate descriptions, headings, internal navigation, page content, and canonical indexing signals matter more. Preserve established URLs and carefully compare GSC performance before rewriting titles already earning clicks.

## AEO / GEO / IEO content standards
- Put a short factual answer or task summary after each relevant H1; organize content with descriptive H2s and useful tables/steps.
- Explain who the page is for, prerequisites and limitations; link to **actual** official sources for financial, scholarship, eligibility and technical claims.
- Include relevant FAQ content visible on the page; FAQ structured data may be used only for visible FAQs and is not a promise of rich snippets.
- Declare correct author/organization identity; use valid `Article`, `BlogPosting`, `WebPage`, `FAQPage`, `BreadcrumbList`, or `SoftwareApplication` schema **only when the content matches**.
- Keep sitemap entries canonical, 200/HTML and indexable; use Search Console URL Inspection for recent content, not the Indexing API for arbitrary blog pages.
- Avoid artificial backlink exchanges, false publication dates, filler pages, or "guaranteed first place" claims.

## Measurement and review cadence
Use the SEO Control Center's real GSC property data for 7, 28, and 90 days. Review clicks, impressions, CTR, average position, geographic/query changes, page indexing samples, sitemap health, referring traffic where GA4 is configured, and page experience. Treat a position of 8–25 with impressions as a review candidate; low CTR with significant impressions warrants title-intent review, not a guaranteed boost.

The **Growth command deck** displays aggregate CTR from summed clicks and impressions and average position weighted by impressions for reporting properties. Missing source values remain unavailable, not zero. The site-level suggestions are heuristics and should not be reported as measured ranking outcomes.

## Next manual GSC / GA4 tasks
1. Confirm each domain property and grant the configured Google service account access.
2. For each property, export Search Console Page Indexing reasons, highest-impression/low-CTR queries, and landing pages.
3. Verify server-side rendering and that deployed footers contain contextual links for Googlebot; a checked-in React component does not independently prove deployment.
4. Verify live Vercel deployments, canonical response headers, robots.txt and sitemap URLs after merging.
5. Review 28-day performance against the prior 28 days before claiming changes improved traffic.

No synthetic clicks, impressions, index counts, or ranking claims should ever appear in reports.
