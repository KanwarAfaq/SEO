const STORE_URL = process.env.SEO_STORE_URL || 'https://wikbbpvhvevcbqkpnikj.supabase.co/functions/v1/seo-store-v2';

async function seoStore(action, payload = {}) {
  const secret = process.env.SEO_STORAGE_SECRET;
  if (!secret) throw new Error('SEO_STORAGE_SECRET is not configured');
  const r = await fetch(STORE_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-seo-storage-secret': secret },
    body: JSON.stringify({ action, ...payload })
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || ('SEO store HTTP ' + r.status));
  return data;
}

module.exports = { seoStore };
