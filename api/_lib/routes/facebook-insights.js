const GRAPH = 'https://graph.facebook.com';

function env(name) {
  return String(process.env[name] || '').trim();
}

async function graph(path, params = {}, accessToken = env('FACEBOOK_PAGE_ACCESS_TOKEN')) {
  const url = new URL(GRAPH + '/' + String(path).replace(/^\/+/, ''));
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
  }
  if (accessToken) url.searchParams.set('access_token', accessToken);
  const r = await fetch(url, { headers: { 'user-agent': 'SEO-Control-Center/1.0' } });
  const data = await r.json().catch(() => ({}));
  if (!r.ok || data.error) {
    const message = data?.error?.message || ('Meta Graph API HTTP ' + r.status);
    const e = new Error(message);
    e.code = data?.error?.code;
    e.type = data?.error?.type;
    throw e;
  }
  return data;
}

function iso(d) {
  return d.toISOString().slice(0, 10);
}

function numericValues(metricData) {
  const values = metricData?.data?.[0]?.values || [];
  return values
    .map(v => ({ value: typeof v.value === 'number' ? v.value : Number(v.value), endTime: v.end_time || null }))
    .filter(v => Number.isFinite(v.value));
}

async function getMetric(pageId, metric, since, until) {
  const data = await graph(pageId + '/insights', { metric, period: 'day', since, until });
  const values = numericValues(data);
  return {
    metric,
    available: values.length > 0,
    latest: values.length ? values[values.length - 1].value : null,
    sum: values.length ? values.reduce((a, x) => a + x.value, 0) : null,
    points: values
  };
}

module.exports = async function handler(req, res) {
  res.setHeader('cache-control', 'no-store');

  const pageId = env('FACEBOOK_PAGE_ID');
  const pageToken = env('FACEBOOK_PAGE_ACCESS_TOKEN');
  if (!pageId || !pageToken) {
    return res.status(503).json({ error: 'Facebook Page credentials are not configured' });
  }

  try {
    const untilDate = new Date();
    const sinceDate = new Date(untilDate.getTime() - 27 * 86400000);
    const since = iso(sinceDate);
    const until = iso(untilDate);

    const pagePromise = graph(pageId, {
      fields: 'id,name,link,followers_count,fan_count,picture.type(large)'
    });

    const postsPromise = graph(pageId + '/posts', {
      fields: 'id,message,created_time,permalink_url,shares,reactions.limit(0).summary(true),comments.limit(0).summary(true)',
      limit: 10
    }).catch(error => ({ data: [], _error: error.message }));

    const metricNames = [
      'page_post_engagements',
      'page_impressions',
      'page_impressions_unique',
      'page_views_total',
      'page_follows',
      'page_engaged_users'
    ];

    const metricResultsPromise = Promise.all(metricNames.map(async metric => {
      try {
        return [metric, await getMetric(pageId, metric, since, until), null];
      } catch (error) {
        return [metric, null, error.message];
      }
    }));

    const appId = env('META_APP_ID');
    const appSecret = env('META_APP_SECRET');
    const tokenPromise = appId && appSecret
      ? graph('debug_token', { input_token: pageToken }, appId + '|' + appSecret)
          .then(d => ({
            checked: true,
            valid: Boolean(d?.data?.is_valid),
            appId: d?.data?.app_id || null,
            type: d?.data?.type || null,
            expiresAt: d?.data?.expires_at || null,
            scopes: Array.isArray(d?.data?.scopes) ? d.data.scopes : []
          }))
          .catch(error => ({ checked: true, valid: false, error: error.message }))
      : Promise.resolve({ checked: false });

    const [pageRaw, postsRaw, metricRows, token] = await Promise.all([
      pagePromise,
      postsPromise,
      metricResultsPromise,
      tokenPromise
    ]);

    const metrics = {};
    const metricErrors = {};
    for (const [name, value, error] of metricRows) {
      if (value) metrics[name] = value;
      if (error) metricErrors[name] = error;
    }

    const posts = (postsRaw.data || []).map(p => {
      const reactions = Number(p.reactions?.summary?.total_count || 0);
      const comments = Number(p.comments?.summary?.total_count || 0);
      const shares = Number(p.shares?.count || 0);
      return {
        id: p.id,
        message: p.message || '',
        createdTime: p.created_time || null,
        permalink: p.permalink_url || null,
        reactions,
        comments,
        shares,
        engagement: reactions + comments + shares
      };
    }).sort((a, b) => b.engagement - a.engagement);

    const page = {
      id: pageRaw.id,
      name: pageRaw.name,
      link: pageRaw.link || 'https://www.facebook.com/DailyFunUpdates',
      followers: pageRaw.followers_count ?? null,
      likes: pageRaw.fan_count ?? null,
      picture: pageRaw.picture?.data?.url || null
    };

    const summary = {
      engagements28d: metrics.page_post_engagements?.sum ?? null,
      impressions28d: metrics.page_impressions?.sum ?? null,
      dailyReach: metrics.page_impressions_unique?.latest ?? null,
      views28d: metrics.page_views_total?.sum ?? null,
      follows28d: metrics.page_follows?.sum ?? null,
      dailyEngagedUsers: metrics.page_engaged_users?.latest ?? null
    };

    res.status(200).json({
      source: 'Meta Graph API',
      fetchedAt: new Date().toISOString(),
      range: { since, until },
      page,
      summary,
      token,
      metrics,
      metricErrors,
      posts,
      postsError: postsRaw._error || null
    });
  } catch (error) {
    res.status(502).json({ error: error.message || 'Unable to load Facebook Page data' });
  }
};
