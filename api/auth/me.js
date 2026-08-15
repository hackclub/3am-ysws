const crypto = require('crypto');

function parseCookies(req) {
  const header = req.headers.cookie || '';
  return Object.fromEntries(header.split(';').filter(Boolean).map(part => {
    const index = part.indexOf('=');
    return [part.slice(0, index).trim(), decodeURIComponent(part.slice(index + 1).trim())];
  }));
}

function sign(value, secret) {
  return crypto.createHmac('sha256', secret).update(value).digest('hex');
}

function getSession(req) {
  const raw = parseCookies(req).session || '';
  const separator = raw.lastIndexOf('.');
  if (separator < 1) return null;

  const payload = raw.slice(0, separator);
  const signature = raw.slice(separator + 1);
  const expected = sign(payload, process.env.SESSION_SECRET || '');
  if (signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;

  try {
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!session.accessToken || Date.now() >= session.expiresAt) return null;
    return session;
  } catch {
    return null;
  }
}

module.exports = async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const session = getSession(req);
  if (!session) return res.status(401).json({ authenticated: false });

  try {
    const response = await fetch('https://auth.hackclub.com/api/v1/me', {
      headers: { Authorization: `Bearer ${session.accessToken}` }
    });

    if (!response.ok) return res.status(401).json({ authenticated: false });
    const data = await response.json();
    const identity = data.identity || {};

    res.setHeader('Cache-Control', 'private, no-store');
    return res.status(200).json({
      authenticated: true,
      user: {
        id: identity.id || null,
        name: [identity.first_name, identity.last_name].filter(Boolean).join(' ') || null,
        email: identity.primary_email || null,
        slackId: identity.slack_id || null,
        eligible: identity.ysws_eligible ?? null,
        verificationStatus: identity.verification_status || null
      }
    });
  } catch (error) {
    console.error('HCA me error:', error);
    return res.status(502).json({ error: 'Unable to contact Hack Club Auth' });
  }
};
