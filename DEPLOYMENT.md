# Vercel deployment

Repository: `KanwarAfaq/SEO`

## Import

1. Open Vercel.
2. Select **Add New → Project**.
3. Import the GitHub repository **KanwarAfaq/SEO**.
4. Framework preset: **Other** (this project is a static frontend plus Vercel Node functions).
5. Leave Build Command empty.
6. Leave Output Directory empty.
7. Add environment variables before testing protected integrations.

## Required environment variables

```text
ADMIN_ACTION_KEY=
MONITOR_SECRET=

LINE_CHANNEL_ACCESS_TOKEN=
LINE_USER_ID=

GOOGLE_SERVICE_ACCOUNT_JSON=
SITE_CONFIG_JSON=

INDEXNOW_KEY=
PUBLIC_APP_URL=
```

`INDEXNOW_KEY` and `PUBLIC_APP_URL` can be added later. Google and LINE pages will clearly show "Needs setup" until credentials are configured.

## First deployment without secrets

The UI, health endpoint and basic technical audit can deploy without Google/LINE secrets. Google Search, GA4, LINE test and protected write actions will remain inactive until their environment variables are configured.

## After deployment

1. Open `/api/config-status` and verify the intended integrations show configured.
2. Open the dashboard and run **Check all sites**.
3. Run **Technical audit**.
4. Set the dashboard session admin key under **Settings**.
5. Send one **Test LINE alert**.
6. Refresh GSC and GA4.
7. Test one URL Inspection request.
8. Test sitemap submission only on an existing sitemap.

## GitHub Actions monitor

Add these repository secrets under **Settings → Secrets and variables → Actions**:

```text
LINE_CHANNEL_ACCESS_TOKEN
LINE_USER_ID
SITE_CONFIG_JSON    # optional; the known five sites are defaults
```

The independent monitor is scheduled every 5 minutes.


## Environment configuration checkpoint

Production environment variables configured for the first live integration test.


<!-- production redeploy requested 2026-09-28 -->
