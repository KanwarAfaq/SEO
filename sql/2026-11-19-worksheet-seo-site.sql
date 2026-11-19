-- Idempotent repair for SEO snapshot foreign-key failures (2026-11-19).
-- Existing dashboard monitors five sites. The seo_sites parent table previously
-- had four, causing seo_snapshots_site_id_fkey to reject Worksheet snapshots.
-- Run in the owning ScholarPortal Supabase project's SQL editor if rebuilding.
insert into public.seo_sites
  (site_id,name,domain,origin,sitemap_url,gsc_property,active)
values
  ('worksheet','Worksheet','worksheet.live','https://worksheet.live',
   'https://worksheet.live/sitemap.xml','sc-domain:worksheet.live',true)
on conflict (site_id) do nothing;
