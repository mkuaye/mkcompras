import { getAnalyticsSummary } from '../services/analyticsService.js';

function isAdmin(req) {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) return false;
  const auth = req.headers['authorization'] || req.headers['Authorization'] || '';
  return auth === `Bearer ${pw}`;
}

export default async function analyticsHandler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (!isAdmin(req)) {
    return res.status(401).json({ error: 'Não autorizado.' });
  }

  if (req.method === 'GET') {
    const summary = await getAnalyticsSummary();
    return res.status(200).json(summary);
  }

  return res.status(405).json({ error: 'Método não permitido.' });
}
