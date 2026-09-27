const crypto = require('crypto');

const tokenCache = new Map();

function b64url(input) {
  return Buffer.from(input).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function getServiceAccount() {
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    const cfg = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    return { client_email: cfg.client_email, private_key: cfg.private_key, token_uri: cfg.token_uri || 'https://oauth2.googleapis.com/token' };
  }
  if (process.env.GOOGLE_CLIENT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
    return {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      token_uri: 'https://oauth2.googleapis.com/token'
    };
  }
  throw new Error('Google service account is not configured');
}

async function getGoogleAccessToken(scopes) {
  const scope = [...new Set(scopes)].sort().join(' ');
  const cached = tokenCache.get(scope);
  if (cached && cached.expiresAt > Date.now() + 60_000) return cached.token;

  const sa = getServiceAccount();
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = b64url(JSON.stringify({
    iss: sa.client_email,
    scope,
    aud: sa.token_uri,
    iat: now,
    exp: now + 3600
  }));
  const unsigned = `${header}.${payload}`;
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(unsigned);
  signer.end();
  const signature = signer.sign(sa.private_key).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const assertion = `${unsigned}.${signature}`;

  const response = await fetch(sa.token_uri, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion
    })
  });
  const data = await response.json();
  if (!response.ok || !data.access_token) throw new Error(data.error_description || data.error || 'Unable to obtain Google access token');
  tokenCache.set(scope, { token: data.access_token, expiresAt: Date.now() + (data.expires_in || 3600) * 1000 });
  return data.access_token;
}

async function googleFetch(url, options = {}, scopes = []) {
  const token = await getGoogleAccessToken(scopes);
  const headers = { ...(options.headers || {}), authorization: `Bearer ${token}` };
  return fetch(url, { ...options, headers });
}

module.exports = { getGoogleAccessToken, googleFetch };
