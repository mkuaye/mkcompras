import { convertByPlatform } from '../services/platformConverters.js';
import { recordEvent } from '../services/analyticsService.js';

function detectPlatform(hostname) {
  if (hostname.includes('shopee') || hostname.includes('shp.ee')) return 'shopee';
  if (hostname.includes('mercadolivre') || hostname.includes('mercadolibre')) return 'mercadolivre';
  if (hostname.includes('amazon') || hostname.includes('amzn')) return 'amazon';
  return 'outros';
}

export default async function convertHandler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Metodo nao permitido.' });
  }

  const { url } = req.body || {};

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'URL invalida.' });
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(url);
  } catch {
    return res.status(400).json({ error: 'O link nao parece ser uma URL valida.' });
  }

  try {
    const result = await convertByPlatform(url, parsedUrl);

    if (result.error) {
      return res.status(400).json({ error: result.error });
    }

    // Fire-and-forget: registra intenção de compra por plataforma
    recordEvent({
      type: 'link_converted',
      platform: detectPlatform(parsedUrl.hostname.toLowerCase()),
    }).catch(() => {});

    return res.status(200).json(result);
  } catch (err) {
    console.error('Erro na conversao:', err);
    return res.status(500).json({ error: 'Erro interno ao converter o link. Tente novamente.' });
  }
}
