const routes = {
  'analytics-admin': require('./_lib/routes/analytics-admin'),
  'pagespeed': require('./_lib/routes/pagespeed'),
  'crux': require('./_lib/routes/crux'),
  'seo-history': require('./_lib/routes/seo-history'),
  'agent-run': require('./_lib/routes/agent-run'),
  'action-update': require('./_lib/routes/action-update'),
  'system-status': require('./_lib/routes/system-status'),
  'facebook-insights': require('./_lib/routes/facebook-insights'),
  'deep-audit': require('./_lib/routes/deep-audit'),
  'search-intelligence': require('./_lib/routes/search-intelligence'),
  'index-coverage': require('./_lib/routes/index-coverage'),
  'index-progress': require('./_lib/routes/index-progress'),
  'indexing-monitor': require('./_lib/routes/indexing-monitor'),
  'indexing-submit': require('./_lib/routes/indexing-submit'),
  'referral-audit': require('./_lib/routes/referral-audit')
};

module.exports = async function handler(req, res) {
  const op = req.query?.op || req.body?.op;
  const route = routes[op];
  if (!route) return res.status(404).json({ error: 'Unknown control operation' });
  return route(req, res);
};
