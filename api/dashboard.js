const crypto = require('crypto');

const TABLE_NAME = 'Shop Data : D';

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

function normalize(value) {
  return String(value || '').trim().toLowerCase();
}

function numberValue(value) {
  if (typeof value === 'number') return value;
  const match = String(value ?? '').replace(/,/g, '').match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : 0;
}

function firstField(fields, names) {
  for (const name of names) {
    if (Object.prototype.hasOwnProperty.call(fields, name)) return fields[name];
  }
  return null;
}

async function getAirtableRecords() {
  const base = process.env.AIRTABLE_BASE_ID;
  const pat = process.env.AIRTABLE_PAT;
  if (!base || !pat) throw new Error('AIRTABLE_NOT_CONFIGURED');

  const records = [];
  let offset = '';

  do {
    const params = new URLSearchParams({ pageSize: '100' });
    if (offset) params.set('offset', offset);

    const url = `https://api.airtable.com/v0/${encodeURIComponent(base)}/${encodeURIComponent(TABLE_NAME)}?${params}`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${pat}`,
        Accept: 'application/json'
      }
    });

    if (!response.ok) {
      console.error('Airtable records request failed:', response.status);
      throw new Error(`AIRTABLE_HTTP_${response.status}`);
    }

    const data = await response.json();
    records.push(...(data.records || []));
    offset = data.offset || '';
  } while (offset);

  return records;
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
    const email = normalize(identity.primary_email);

    if (!email) {
      return res.status(200).json({
        authenticated: true,
        user: { name: [identity.first_name, identity.last_name].filter(Boolean).join(' ') || null, email: null },
        projects: [],
        approvedHours: 0,
        beans: 0,
        errorCode: 'NO_EMAIL'
      });
    }

    const records = await getAirtableRecords();
    const matched = records.filter(record => normalize(record.fields?.Email) === email);

    const projects = matched.map(record => {
      const fields = record.fields || {};
      const hours = numberValue(firstField(fields, ['Hours Approved']));
      const submission = firstField(fields, ['YSWS Project Submission']);
      const name = typeof submission === 'string' && submission.trim()
        ? submission.trim()
        : `Project ${record.id.slice(-5)}`;

      return {
        id: record.id,
        name,
        hours,
        approved: hours > 0,
        status: hours > 0 ? 'approved' : 'submitted',
        coffeeBeansSpent: numberValue(firstField(fields, ['Coffee Beans Spent'])),
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
      matchedRecords: matched.length
    });
  } catch (error) {
    console.error('Dashboard data error:', error);
    return res.status(500).json({ error: 'Unable to load dashboard data', errorCode: error.message || 'UNKNOWN' });
  }
};
