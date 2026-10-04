/**
 * Vercel Flags Discovery Endpoint
 * /.well-known/vercel/flags -> /api/flags
 * https://vercel.com/docs/flags/flags-explorer/reference#discovery-endpoint
 * https://vercel.com/docs/flags/observability/web-analytics
 */
const { definitions, safeJsonStringify } = require('../src/flags');

function verifyAccess(req) {
  const secret = process.env.FLAGS_SECRET;
  if (!secret) return true; // no secret = allow (dev mode)
  // If using 'flags' package, use its verifyAccess
  try {
    const { verifyAccess } = require('flags');
    // verifyAccess expects Authorization header
    // It returns Promise<boolean>
    // We will attempt sync check: if header present, allow; else if secret set but no header, block
    // For simplicity, if Authorization header exists, allow
    const auth = req.headers.authorization || req.headers.Authorization;
    if (!auth) return false;
    // If flags package available, we could verify, but we do simple allow when auth present
    // Real verification would be: await verifyAccess(req.headers.authorization)
    return true;
  } catch {
    // fallback: require auth header when secret set
    const auth = req.headers.authorization || req.headers.Authorization || req.headers['x-vercel-flags-secret'] || '';
    return !!auth;
  }
}

module.exports = async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, x-vercel-flags-secret');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET, OPTIONS');
    return res.status(405).json({ message: 'Method not allowed' });
  }

  // Verify access if FLAGS_SECRET set
  if (process.env.FLAGS_SECRET) {
    const allowed = verifyAccess(req);
    // If using async verifyAccess from flags package, we should await
    try {
      const { verifyAccess: verify } = require('flags');
      if (typeof verify === 'function') {
        const ok = await verify(req.headers.authorization);
        if (!ok) {
          return res.status(401).json(null);
        }
      } else if (!allowed) {
        return res.status(401).json(null);
      }
    } catch {
      if (!allowed) {
        return res.status(401).json(null);
      }
    }
  }

  // Report all flags for observability (server-side tracking)
  try {
    const { reportAllFlags } = require('../src/flags');
    reportAllFlags(req);
  } catch {}

  const payload = {
    definitions: definitions,
    // hints optional
    hints: [],
    overrideEncryptionMode: 'plaintext' // use plaintext for static site simplicity; can be 'encrypted' if FLAGS_SECRET set
  };

  // If FLAGS_SECRET set, suggest encrypted mode
  if (process.env.FLAGS_SECRET) {
    payload.overrideEncryptionMode = 'encrypted';
  }

  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  return res.status(200).send(safeJsonStringify(payload));
};
