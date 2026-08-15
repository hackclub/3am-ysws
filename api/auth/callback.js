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

module.exports = async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { code } = req.query;
  const { HCA_CLIENT_ID, HCA_CLIENT_SECRET, HCA_REDIRECT_URI, SESSION_SECRET } = process.env;
  const cookies = parseCookies(req);
  const stateCookie = cookies.oauth_state || '';
  const [state, stateSignature] = stateCookie.split('.');

  if (!code || !state || !stateSignature || !HCA_CLIENT_ID || !HCA_CLIENT_SECRET || !HCA_REDIRECT_URI || !SESSION_SECRET) {
    return res.status(400).send('Invalid authentication request.');
  }

  if (!crypto.timingSafeEqual(Buffer.from(stateSignature), Buffer.from(sign(state, SESSION_SECRET)))) {
    return res.status(400).send('Invalid authentication state.');
  }

  try {
    const tokenResponse = await fetch('https://auth.hackclub.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        client_id: HCA_CLIENT_ID,
        client_secret: HCA_CLIENT_SECRET,
        redirect_uri: HCA_REDIRECT_URI,
        code,
        grant_type: 'authorization_code'
      })
    });

    if (!tokenResponse.ok) {
      const detail = await tokenResponse.text();
      console.error('HCA token exchange failed:', detail);
      return res.status(502).send('Hack Club authentication failed.');
    }

    const token = await tokenResponse.json();
    if (!token.access_token) return res.status(502).send('Hack Club did not return an access token.');

    const sessionPayload = Buffer.from(JSON.stringify({
      accessToken: token.access_token,
      expiresAt: Date.now() + ((token.expires_in || 15778800) * 1000)
    })).toString('base64url');
    const sessionSignature = sign(sessionPayload, SESSION_SECRET);

    res.setHeader('Set-Cookie', [
      `session=${sessionPayload}.${sessionSignature}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${Math.floor((token.expires_in || 15778800))}`,
      'oauth_state=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0'
    ]);

    res.writeHead(302, { Location: '/dash' });
    res.end();
  } catch (error) {
    console.error('HCA callback error:', error);
    res.status(500).send('Authentication service error.');
  }
};
