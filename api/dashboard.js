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

function field(record, patterns) {
  const entries = Object.entries(record.fields || {});
  const found = entries.find(([name]) => patterns.some(pattern => pattern.test(name)));
  return found ? found[1] : null;
}

function numberValue(value) {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const match = value.replace(/,/g, '').match(/-?\d+(?:\.\d+)?/);
    return match ? Number(match[0]) : 0;
  }
  return 0;
}

function isApproved(record, tableName = '') {
  if (/shop\s*data/i.test(tableName)) return true;
  const value = field(record, [/approved/i, /status/i, /decision/i]);
  if (value === true) return true;
  if (typeof value === 'string') return /approved|accept|yes|complete/i.test(value);
  return Boolean(field(record, [/approved[_ ]?at/i]));
}

async function airtable(path, options = {}) {
  const response = await fetch(`https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${process.env.AIRTABLE_PAT}`,
      Accept: 'application/json',
      ...(options.headers || {})
    }
  });
  if (!response.ok) throw new Error(`Airtable ${response.status}: ${await response.text()}`);
  return response.json();
}

module.exports = async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const session = getSession(req);
  if (!session) return res.status(401).json({ authenticated: false });

  try {
    const hcaResponse = await fetch('https://auth.hackclub.com/api/v1/me', {
      headers: { Authorization: `Bearer ${session.accessToken}` }
    });
    if (!hcaResponse.ok) return res.status(401).json({ authenticated: false });

    const hca = await hcaResponse.json();
    const identity = hca.identity || {};
    const email = (identity.primary_email || '').trim().toLowerCase();
    const slackId = (identity.slack_id || '').trim();

    const schema = await fetch(`https://api.airtable.com/v0/meta/bases/${process.env.AIRTABLE_BASE_ID}/tables`, {
      headers: { Authorization: `Bearer ${process.env.AIRTABLE_PAT}` }
    });

    if (!schema.ok) {
      return res.status(200).json({
        authenticated: true,
        setupRequired: true,
        user: { name: [identity.first_name, identity.last_name].filter(Boolean).join(' '), email, slackId },
        projects: [], approvedHours: 0, beans: 0
      });
    }

    const { tables = [] } = await schema.json();
    const candidateTables = tables.filter(table =>
      table.fields?.some(field => /email|e-mail|slack/i.test(field.name))
    ).slice(0, 15);

    const matched = [];
    for (const table of candidateTables) {
      const identityFields = table.fields.filter(field => /email|e-mail|slack/i.test(field.name)).map(field => field.name);
      const formulaParts = [];
      for (const name of identityFields) {
        const escapedName = name.replace(/([{}])/g, '$1');
        if (email && /email|e-mail/i.test(name)) formulaParts.push(`{${escapedName}} = \"${email.replace(/\"/g, '\\\"')}\"`);
        if (slackId && /slack/i.test(name)) formulaParts.push(`{${escapedName}} = \"${slackId.replace(/\"/g, '\\\"')}\"`);
      }
      if (!formulaParts.length) continue;

      const params = new URLSearchParams({
        maxRecords: '100',
        filterByFormula: `OR(${formulaParts.join(',')})`
      });
      try {
        const data = await airtable(`${encodeURIComponent(table.id)}?${params.toString()}`);
        for (const record of data.records || []) matched.push({ table: table.name, record });
      } catch (error) {
        console.error(`Skipping Airtable table ${table.name}:`, error.message);
      }
    }

    const shopDataMatch = matched.find(({ table }) => /shop\s*data/i.test(table));
    const shopDataRecord = shopDataMatch?.record || null;
    const shopBeans = shopDataRecord ? numberValue(field(shopDataRecord, [/^coffee\s*beans$/i])) : 0;
    const shopBeansSpent = shopDataRecord ? numberValue(field(shopDataRecord, [/coffee\s*beans\s*spent/i])) : 0;

    const projects = matched.map(({ table, record }) => {
      const hours = numberValue(field(record, [
        /hours?\s*approved/i,
        /approved\s*hours?/i,
        /hours?\s*(spent|coded|worked)/i,
        /time/i
      ]));
      const name = field(record, [/project\s*name/i, /^project$/i, /project/i, /title/i, /name/i]);
      const statusValue = field(record, [/status/i, /decision/i, /approved/i]);
      const approved = /shop\s*data/i.test(table) || isApproved(record, table);
      const github = field(record, [/github\s*(username|user|handle)/i, /github/i]);
      const codeUrl = field(record, [
        /ysws\s*project\s*submission/i,
        /code\s*url/i,
        /github\s*url/i,
        /repository/i,
        /repo/i,
        /github/i,
        /url/i,
        /link/i
      ]);
      return {
        id: record.id,
        table,
        name: typeof name === 'string' ? name : `Project ${record.id.slice(-5)}`,
        hours,
        approved,
        status: approved ? 'approved' : (typeof statusValue === 'string' ? statusValue : 'submitted'),
        githubUsername: typeof github === 'string' ? github.replace(/^@/, '') : null,
        codeUrl: typeof codeUrl === 'string' && /^https?:\/\//i.test(codeUrl) ? codeUrl : null
      };
    }).filter(project => project.name);

    const approvedHours = shopDataRecord
      ? numberValue(field(shopDataRecord, [/^hours\s*approved$/i, /hours?\s*approved/i]))
      : projects.filter(project => project.approved).reduce((sum, project) => sum + project.hours, 0);

    res.setHeader('Cache-Control', 'private, no-store');
    return res.status(200).json({
      authenticated: true,
      setupRequired: false,
      user: {
        id: identity.id || null,
        name: [identity.first_name, identity.last_name].filter(Boolean).join(' ') || null,
        email: identity.primary_email || null,
        slackId: identity.slack_id || null,
        eligible: identity.ysws_eligible ?? null,
        verificationStatus: identity.verification_status || null
      },
      projects,
      approvedHours,
      beans: shopDataRecord ? shopBeans : Math.floor(approvedHours * 5),
      beansSpent: shopDataRecord ? shopBeansSpent : 0
    });
  } catch (error) {
    console.error('Dashboard data error:', error);
    return res.status(500).json({ error: 'Unable to load dashboard data' });
  }
};
