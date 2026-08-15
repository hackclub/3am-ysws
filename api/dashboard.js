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
  if (Array.isArray(value)) return numberValue(value[0]);
  if (value && typeof value === 'object') return numberValue(value.value ?? value.name ?? value.text);
  if (typeof value === 'string') {
    const match = value.replace(/,/g, '').match(/-?\d+(?:\.\d+)?/);
    return match ? Number(match[0]) : 0;
  }
  return 0;
}

function textValue(value) {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number') return String(value);
  if (Array.isArray(value)) return value.map(textValue).filter(Boolean).join(', ');
  if (value && typeof value === 'object') return textValue(value.name ?? value.text ?? value.value);
  return '';
}

function isTruthy(value) {
  if (value === true) return true;
  if (typeof value === 'string') return /^(true|yes|checked|approved|1)$/i.test(value.trim());
  return Boolean(value);
}

function isUnified(record) {
  return isTruthy(field(record, [/^submit\s*to\s*unified$/i]));
}

function internalReview(record) {
  return textValue(field(record, [/^internal\s*review$/i, /internal\s*review/i])).toLowerCase();
}

function automationStatus(record) {
  return textValue(field(record, [/^automation\s*status$/i, /automation\s*status/i])).toLowerCase();
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

function tableByName(tables, pattern) {
  return tables.find(table => pattern.test(String(table.name || '').trim()));
}

async function recordsForTable(table, email) {
  if (!table) return [];
  const emailFields = (table.fields || []).filter(field => /^(email|e-mail)$/i.test(field.name) || /email|e-mail/i.test(field.name));
  const formulaParts = emailFields.map(field => `{${field.name.replace(/([{}])/g, '$1')}} = "${email.replace(/"/g, '\\"')}"`);
  if (!formulaParts.length) return [];

  const params = new URLSearchParams({
    pageSize: '100',
    filterByFormula: formulaParts.length === 1 ? formulaParts[0] : `OR(${formulaParts.join(',')})`
  });

  const records = [];
  let offset = null;
  do {
    if (offset) params.set('offset', offset);
    const data = await airtable(`${encodeURIComponent(table.id)}?${params.toString()}`);
    records.push(...(data.records || []));
    offset = data.offset || null;
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
    const email = (identity.primary_email || '').trim().toLowerCase();
    const slackId = (identity.slack_id || '').trim();

    const schema = await fetch(`https://api.airtable.com/v0/meta/bases/${process.env.AIRTABLE_BASE_ID}/tables`, {
      headers: { Authorization: `Bearer ${process.env.AIRTABLE_PAT}` }
    });

    if (!schema.ok) {
      return res.status(200).json({ authenticated: true, setupRequired: true, user: { name: [identity.first_name, identity.last_name].filter(Boolean).join(' '), email, slackId }, projects: [], approvedHours: 0, beans: 0 });
    }

    const { tables = [] } = await schema.json();
    const projectsTable = tableByName(tables, /^ysws\s*project\s*submission$/i);
    const shopTable = tableByName(tables, /^shop\s*data\s*:\s*d$/i);

    // These are deliberately separate tables. Never take Coffee Beans from an arbitrary
    // table that happens to contain a similarly named field.
    const [projectRecords, shopRecords] = await Promise.all([
      recordsForTable(projectsTable, email),
      recordsForTable(shopTable, email)
    ]);

    const shopDataRecord = shopRecords[0] || null;
    const beans = shopDataRecord ? numberValue(field(shopDataRecord, [/^coffee\s*beans$/i])) : 0;
    const beansSpent = shopDataRecord ? numberValue(field(shopDataRecord, [/^coffee\s*beans\s*spent$/i])) : 0;
    const approvedHours = shopDataRecord
      ? numberValue(field(shopDataRecord, [/^hours\s*approved$/i, /hours?\s*approved/i]))
      : 0;

    const projects = projectRecords.map(record => {
      const review = internalReview(record);
      const automation = automationStatus(record);
      const unified = isUnified(record);

      let status = 'submitted';
      let approved = false;
      if (/reject|rejected|deny|denied/i.test(review)) {
        status = 'rejected';
      } else if (unified) {
        status = 'approved';
        approved = true;
      } else if (/pending/i.test(automation)) {
        status = 'pending';
      }

      const nameValue = field(record, [/project\s*name/i, /^project$/i, /title/i, /^name$/i]);
      const codeValue = field(record, [/ysws\s*project\s*submission/i, /code\s*url/i, /github\s*url/i, /repository/i, /repo/i, /url/i, /link/i]);
      const hours = numberValue(field(record, [/^hours\s*approved$/i, /hours?\s*approved/i, /approved\s*hours?/i, /hours?\s*(spent|coded|worked)/i]));

      return {
        id: record.id,
        table: projectsTable?.name || 'YSWS Project Submission',
        name: textValue(nameValue) || `Project ${record.id.slice(-5)}`,
        hours,
        approved,
        unified,
        status,
        codeUrl: /^https?:\/\//i.test(textValue(codeValue)) ? textValue(codeValue) : null
      };
    });

    res.setHeader('Cache-Control', 'private, no-store');
    return res.status(200).json({
      authenticated: true,
      setupRequired: !projectsTable || !shopTable,
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
      beans,
      beansSpent
    });
  } catch (error) {
    console.error('Dashboard data error:', error);
    return res.status(500).json({ error: 'Unable to load dashboard data' });
  }
};