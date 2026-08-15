const crypto = require('crypto');

module.exports = (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const clientId = process.env.HCA_CLIENT_ID;
  const redirectUri = process.env.HCA_REDIRECT_URI;
  const sessionSecret = process.env.SESSION_SECRET;

  if (!clientId || !redirectUri || !sessionSecret) {
    return res.status(500).json({ error: 'Authentication is not configured' });
  }

  const state = crypto.randomBytes(32).toString('hex');
  const signature = crypto.createHmac('sha256', sessionSecret).update(state).digest('hex');

  res.setHeader('Set-Cookie', `oauth_state=${state}.${signature}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`);

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid profile email'
  });

  res.writeHead(302, { Location: `https://auth.hackclub.com/oauth/authorize?${params}` });
  res.end();
};
