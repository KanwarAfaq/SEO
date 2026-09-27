# SEO Control Center — credentials checklist

Keep real secrets in your own password manager / local file. Do **not** commit them to GitHub.

## 1) LINE — needed first for alerts

- `LINE_CHANNEL_ACCESS_TOKEN`
  - LINE Developers Console → your Provider → Messaging API channel → **Messaging API** → Channel access token → Issue/reissue token.
- `LINE_USER_ID`
  - This must be **your user ID for that LINE Official Account**, not the bot/channel ID.
  - If you already use the same LINE bot for ScholarPortal, reuse the working admin recipient user ID.
  - Otherwise, add/follow the Official Account, send it a message, and read `source.userId` from the Messaging API webhook event.

Save locally as:

```text
LINE_CHANNEL_ACCESS_TOKEN=
LINE_USER_ID=
```

## 2) Google Search Console + GA4

Recommended: use **one Google Cloud service account** for the four websites.

### Create the service account
1. Open Google Cloud Console.
2. Create/select a project for SEO Control Center.
3. APIs & Services → Library.
4. Enable **Google Search Console API**.
5. Enable **Google Analytics Data API**.
6. IAM & Admin → Service Accounts → Create service account.
7. Open the service account → Keys → Add key → Create new key → JSON.
8. Keep the downloaded JSON private.

Needed later:

```text
GOOGLE_SERVICE_ACCOUNT_JSON=<entire JSON, converted to one line>
```

### Give it GSC access
For each of the 4 Search Console properties:

Search Console → property → Settings → Users and permissions → Add user → enter the service account email.

Use sufficient permission for the actions you want. The current app reads Search Analytics / URL Inspection and can submit sitemaps.

### Give it GA4 access
For each GA4 property:

Google Analytics → Admin → Property Access Management → + → Add users → enter service account email → Viewer.

Also record the numeric **Property ID** for each website:

```text
anytool.online GA4_PROPERTY_ID=
kmafaq.online GA4_PROPERTY_ID=
kmafaq.site GA4_PROPERTY_ID=
scholarportal.site GA4_PROPERTY_ID=
```

## 3) GitHub repository

The ChatGPT GitHub connector available in this chat can edit/push to existing repositories but does not expose repository creation.

Repository created and connected:

```text
KanwarAfaq/SEO
```

The project files are now pushed to the `main` branch.

## 4) Vercel

After the GitHub repo exists:

- Import `KanwarAfaq/SEO` into Vercel.
- We will add these Environment Variables:
  - `ADMIN_ACTION_KEY`
  - `MONITOR_SECRET`
  - `LINE_CHANNEL_ACCESS_TOKEN`
  - `LINE_USER_ID`
  - `GOOGLE_SERVICE_ACCOUNT_JSON`
  - `SITE_CONFIG_JSON`
  - `INDEXNOW_KEY` (optional at first)

Do not paste secrets into frontend code.

## 5) GitHub Actions secrets (for the independent 5-minute monitor)

Repository → Settings → Secrets and variables → Actions → New repository secret:

```text
LINE_CHANNEL_ACCESS_TOKEN=
LINE_USER_ID=
SITE_CONFIG_JSON=   # optional; defaults to the 4 known websites
```

The monitor is intentionally independent of Vercel so it can alert you even if the dashboard/Vercel is having an outage.

## 6) Values you can prepare now

```text
LINE_CHANNEL_ACCESS_TOKEN=
LINE_USER_ID=

GOOGLE_SERVICE_ACCOUNT_JSON=
GOOGLE_SERVICE_ACCOUNT_EMAIL=

GA4_ANYTOOL=
GA4_KMAFAQ_ONLINE=
GA4_KMAFAQ_SITE=
GA4_SCHOLARPORTAL=

ADMIN_ACTION_KEY=<generate a long random value>
MONITOR_SECRET=<generate a different long random value>
INDEXNOW_KEY=<can be generated later>
```


## Current automation secrets for GitHub Actions

The scheduled jobs need their own GitHub secret copies. Add these under
Repository → Settings → Secrets and variables → Actions:

```text
ADMIN_ACTION_KEY       # required by the daily SEO analysis agent
SEO_STORAGE_SECRET     # lets the 4/day LINE digest store its history
VERCEL_AUTOMATION_BYPASS_SECRET
LINE_CHANNEL_ACCESS_TOKEN
LINE_USER_ID
```

Do not create new values for ADMIN_ACTION_KEY or SEO_STORAGE_SECRET here; use the
same values already configured in Vercel/Supabase.

### Notification schedule

LINE digests are scheduled at:

- 08:00 Asia/Taipei
- 12:00 Asia/Taipei
- 18:00 Asia/Taipei
- 22:00 Asia/Taipei

The daily SEO analysis agent runs separately and does not send an extra LINE message.
