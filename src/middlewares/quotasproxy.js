const axios = require('axios');

async function quotaProxy(req, res, next) {
  try {
    const userId = req.body?.userId || req.user?.id;
    if (!userId) return res.status(400).json({ error: 'userId requis' });

    const token = req.headers.authorization || '';
    const base = process.env.DB_SERVICE_URL || 'http://localhost:3001';

    const r = await axios.post(
      `${base}/api/quotas/consume`,
      { userId },
      { headers: { Authorization: token } }
    );

    // Propager les headers
    res.setHeader('X-RateLimit-Limit', r.headers['x-ratelimit-limit']);
    res.setHeader('X-RateLimit-Remaining', r.headers['x-ratelimit-remaining']);

    return next();
  } catch (e) {
    if (e.response && e.response.status === 429) {
      res.setHeader('X-RateLimit-Limit', e.response.headers['x-ratelimit-limit']);
      res.setHeader('X-RateLimit-Remaining', e.response.headers['x-ratelimit-remaining']);
      return res.status(429).json(e.response.data);
    }
    console.error('Erreur quotaProxy:', e.message);
    return res.status(500).json({ error: 'Erreur quota' });
  }
}

module.exports = { quotaProxy };
