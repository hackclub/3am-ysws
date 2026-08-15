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
  const expected = sign(payload, secretOrEmpty(process.env.SESSION_SECRET));
  if (signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;

  try {
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return session.accessToken && Date.now() < session.expiresAt ? session : null;
  } catch {
    return null;
  }
}

function secretOrEmpty(value) {
  return String(value || '');
}

function normalize(value) {
  return String(value ?? '').trim().toLowerCase();
}

function numberValue(value) {
  if (typeof value === 'number') return value;
  const match = String(value ?? '').replace(/,/g, '').match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : 0;
}

function airtableConfig() {
  return {
    base: String(process.env.AIRTABLE_BASE_ID || '').trim(),
    pat: String(process.env.AIRTABLE_PAT || '').trim(),
    table: String(process.env.AIRTABLE_TABLE_NAME || 'Shop Data').trim(),
    view: String(process.env.AIRTABLE_VIEW_NAME || '').trim()
  };
}

async function getAirtableRecords(email) {
  const { base, pat, table, view } = airtableConfig();
  const records = [];
  let offset = '';
  const formulaEmail = String(email).replace(/'/g, "''");

  do {
    const params = new URLSearchParams({
      pageSize: '100',
      filterByFormula: `{Email}='${formulaEmail}'`
    });
    if (view) params.set('view', view);
    if (offset) params.set('offset', offset);

    for (const field of ['Email', 'YSWS Project Submission', 'Hours Approved', 'Coffee Beans Spent']) {
      params.append('fields[]', field);
    }

    const url = `https://api.airtable.com/v0/${encodeURIComponent(base)}/${encodeURIComponent(table)}?${params}`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${pat}`,
        Accept: 'application/json'
      }
    });

    if (!response.ok) {
      const body = await response.text();
      let detail = body.slice(0, 300);
      try {
        const json = JSON.parse(body);
        detail = json?.error?.message || json?.error?.type || detail;
      } catch {}
      throw new Error(`AIRTABLE_HTTP_${response.status}:${detail}`);
    }

    const data = await response.json();
    records.push(...(data.records || []));
    offset = data.offset || '';
  } while (offset);

  return { records, table, view: view || null };
}

module.exports = async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const session = getSession(req);
  if (!session) return res.status(401).json({ authenticated: false });

  try {
    const hcaResponse = await fetch('https://auth.hackclub.com/api/v1/me', {
      headers: { Authorization: `Bearer ${session.accessToken}` }
    });

    if (!hcaResponse.ok) {
      return res.status(401).json({ authenticated: false, errorCode: `HCA_ME_${hcaResponse.status}` });
    }

    const hca = await hcaResponse.json();
    const identity = hca.identity || {};
    const email = normalize(identity.primary_email);
    const config = airtableConfig();

    if (!config.base || !config.pat) {
      return res.status(500).json({ authenticated: true, error: 'Airtable is not configured.', errorCode: 'AIRTABLE_NOT_CONFIGURED' });
    }

    const { records, table, view } = await getAirtableRecords(email);

    const projects = records.map(record => {
      const fields = record.fields || {};
      const hours = numberValue(fields['Hours Approved']);
      const submission = fields['YSWS Project Submission'];
      const name = typeof submission === 'string' && submission.trim()
        ? submission.trim()
        : `Project ${record.id.slice(-5)}`;

      return {
        id: record.id,
        name,
        hours,
        approved: hours > 0,
        status: hours > 0 ? 'approved' : 'submitted',
        coffeeBeansSpent: numberValue(fields['Coffee Beans Spent']),
        codeUrl: typeof submission === 'string' && /^https?:\/\//i.test(submission) ? submission : null
      };
    });

    const approvedHours = projects.reduce((sum, project) => sum + project.hours, 0);

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
      },
      projects,
      approvedHours,
      beans: Math.floor(approvedHours * 5),
      matchedRecords: records.length,
      tableUsed: table,
      viewUsed: view
    });
  } catch (error) {
    console.error('Dashboard data error:', error);
    const errorText = error.message || 'UNKNOWN';
    return res.status(502).json({
      authenticated: true,
      error: 'Unable to load dashboard data.',
      errorCode: errorText.split(':')[0] || 'UNKNOWN'
    });
  }
};