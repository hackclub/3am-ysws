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
  if (typeof value === 'string') {
    const match = value.replace(/,/g, '').match(/-?\d+(?:\.\d+)?/);
    return match ? Number(match[0]) : 0;
  }
  return 0;
}

function cleanUrl(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : null;
}

async function airtableTable(tableName, params) {
  const url = new URL(`https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/${encodeURIComponent(tableName)}`);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${process.env.AIRTABLE_PAT}`,
      Accept: 'application/json'
    }
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Airtable ${response.status}: ${detail}`);
  }

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

    if (!email) {
      return res.status(200).json({
        authenticated: true,
        setupRequired: true,
        user: { name: [identity.first_name, identity.last_name].filter(Boolean).join(' '), email: null },
        projects: [],
        approvedHours: 0,
        beans: 0,
        message: 'Your Hack Club account does not have an email available.'
      });
    }

    // This is the table shown in the YSWS Airtable base. We intentionally
    // query it directly so the PAT only needs record read access; schema
    // metadata access is not required.
    const table = 'Shop Data : D';
    const formula = `LOWER(TRIM({Email})) = "${email.replace(/"/g, '\\"')}"`;
    const data = await airtableTable(table, {
      maxRecords: '100',
      filterByFormula: formula
    });

    const records = data.records || [];

    const projects = records.map(record => {
      const fields = record.fields || {};
      const hours = numberValue(fields['Hours Approved']);
      const submission = fields['YSWS Project Submission'];
      const codeUrl = cleanUrl(submission);
      const projectName = codeUrl
        ? codeUrl.replace(/\/$/, '').split('/').filter(Boolean).pop() || 'approved project'
        : 'approved project';

      return {
        id: record.id,
        name: projectName,
        hours,
        approved: hours > 0,
        status: hours > 0 ? 'approved' : 'submitted',
        codeUrl
      };
    });

    const approvedProjects = projects.filter(project => project.approved);
    const approvedHours = approvedProjects.reduce((sum, project) => sum + project.hours, 0);

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
      projects: approvedProjects,
      approvedHours,
      beans: Math.floor(approvedHours * 5)
    });
  } catch (error) {
    console.error('Dashboard data error:', error);
    return res.status(500).json({
      error: 'Unable to load dashboard data',
      detail: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
