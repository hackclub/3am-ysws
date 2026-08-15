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
    return session.accessToken && Date.now() < session.expiresAt ? session : null;
  } catch {
    return null;
  }
}

function numberValue(value) {
  if (typeof value === 'number') return value;
  if (Array.isArray(value)) return numberValue(value[0]);
  if (value && typeof value === 'object') return numberValue(value.value ?? value.name ?? value.text);
  if (typeof value === 'string') {
    const match = value.replace(/,/g, '').match(/-?\d+(?:\.\d+)?/);
    return match ? Number(match[0]) : 0;
  }
  return 0;
}

function escapeXml(value) {
  return String(value).replace(/[<>&'\"]/g, char => ({
    '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;'
  }[char]));
}

function field(record, patterns) {
  const entry = Object.entries(record?.fields || {}).find(([name]) => patterns.some(pattern => pattern.test(name)));
  return entry ? entry[1] : null;
}

async function airtable(path) {
  const response = await fetch(`https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/${path}`, {
    headers: { Authorization: `Bearer ${process.env.AIRTABLE_PAT}`, Accept: 'application/json' }
  });
  if (!response.ok) throw new Error(`Airtable ${response.status}`);
  return response.json();
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');

  const session = getSession(req);
  if (!session) {
    return res.status(200).send('<svg xmlns="http://www.w3.org/2000/svg" width="170" height="60"><text x="0" y="42" font-size="32" font-family="sans-serif" fill="#f7e9a8">sign in</text></svg>');
  }

  try {
    const hcaResponse = await fetch('https://auth.hackclub.com/api/v1/me', {
      headers: { Authorization: `Bearer ${session.accessToken}` }
    });
    if (!hcaResponse.ok) throw new Error('HCA auth failed');
    const hca = await hcaResponse.json();
    const email = (hca.identity?.primary_email || '').trim().toLowerCase();

    const schemaResponse = await fetch(`https://api.airtable.com/v0/meta/bases/${process.env.AIRTABLE_BASE_ID}/tables`, {
      headers: { Authorization: `Bearer ${process.env.AIRTABLE_PAT}` }
    });
    if (!schemaResponse.ok) throw new Error('Airtable schema failed');

    const { tables = [] } = await schemaResponse.json();
    const shopTable = tables.find(table => /^shop\s*data\s*:\s*d$/i.test(String(table.name || '').trim()));
    if (!shopTable) throw new Error('Shop Data table not found');

    const emailFields = (shopTable.fields || []).filter(field => /email|e-mail/i.test(field.name));
    if (!emailFields.length) throw new Error('Email field not found');

    const escapedEmail = email.replace(/"/g, '\\"');
    const formulas = emailFields.map(field => `LOWER({${field.name}} & "") = "${escapedEmail}"`);
    const filter = formulas.length === 1 ? formulas[0] : `OR(${formulas.join(',')})`;
    const params = new URLSearchParams({ pageSize: '100', filterByFormula: filter });
    const data = await airtable(`${encodeURIComponent(shopTable.id)}?${params.toString()}`);
    const record = data.records?.[0];
    const beans = record ? numberValue(field(record, [/^coffee\s*beans$/i])) : 0;
    const text = escapeXml(Number.isInteger(beans) ? String(beans) : String(Number(beans.toFixed(2))));

    return res.status(200).send(`<svg xmlns="http://www.w3.org/2000/svg" width="190" height="60"><text x="2" y="45" font-size="52" font-weight="700" font-family="sans-serif" fill="#f7e9a8">${text}</text></svg>`);
  } catch (error) {
    console.error('Shop balance error:', error);
    return res.status(200).send('<svg xmlns="http://www.w3.org/2000/svg" width="190" height="60"><text x="2" y="40" font-size="24" font-family="sans-serif" fill="#d6b8dc">unavailable</text></svg>');
  }
};