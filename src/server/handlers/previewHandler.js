const ALLOWED_PROTOCOLS = ['http:', 'https:'];
// Block SSRF to private/internal IP ranges
const BLOCKED_HOST_RE = /^(localhost|127\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.)/;

function sanitizeUrl(raw) {
  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error('URL inválida.');
  }
  if (!ALLOWED_PROTOCOLS.includes(parsed.protocol)) {
    throw new Error('Protocolo não suportado. Use http ou https.');
  }
  if (BLOCKED_HOST_RE.test(parsed.hostname)) {
    throw new Error('URL interna não permitida.');
  }
  return parsed;
}

function detectPlatform(hostname) {
  if (hostname.includes('shopee')) return 'shopee';
  if (hostname.includes('mercadolivre') || hostname.includes('mercadolibre')) return 'mercadolivre';
  if (hostname.includes('amazon') || hostname.includes('amzn')) return 'amazon';
  return 'outros';
}

function formatPrice(value, currency = 'BRL') {
  if (!value) return '';
  const num = parseFloat(String(value).replace(',', '.'));
  if (isNaN(num)) return String(value);
  try {
    return num.toLocaleString('pt-BR', {
      style: 'currency',
      currency: currency || 'BRL',
      minimumFractionDigits: 2,
    });
  } catch {
    return `R$ ${num.toFixed(2).replace('.', ',')}`;
  }
}

async function fetchMLProduct(url) {
  const idMatch = url.match(/MLB-?(\d+)/i);
  if (!idMatch) return null;

  const itemId = `MLB${idMatch[1]}`;
  const res = await fetch(`https://api.mercadolibre.com/items/${itemId}`, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) return null;

  const data = await res.json();
  if (data.error) return null;

  return {
    name: data.title || '',
    price: data.price ? formatPrice(data.price, data.currency_id) : '',
    image: data.pictures?.[0]?.url || data.thumbnail || '',
    platform: 'mercadolivre',
  };
}

function extractMeta(html, ...props) {
  for (const prop of props) {
    const escaped = prop.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const patterns = [
      new RegExp(`<meta[^>]+property=["']${escaped}["'][^>]+content=["']([^"'<>]+)["']`, 'i'),
      new RegExp(`<meta[^>]+content=["']([^"'<>]+)["'][^>]+property=["']${escaped}["']`, 'i'),
      new RegExp(`<meta[^>]+name=["']${escaped}["'][^>]+content=["']([^"'<>]+)["']`, 'i'),
      new RegExp(`<meta[^>]+content=["']([^"'<>]+)["'][^>]+name=["']${escaped}["']`, 'i'),
    ];
    for (const re of patterns) {
      const m = html.match(re);
      if (m?.[1]?.trim()) return m[1].trim();
    }
  }
  return '';
}

async function fetchOGTags(url, platform) {
  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
    },
    redirect: 'follow',
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  // Read only the first 150KB — enough for <head> meta tags
  const reader = res.body?.getReader?.();
  let html = '';
  if (reader) {
    const decoder = new TextDecoder();
    let bytes = 0;
    while (bytes < 150_000) {
      const { done, value } = await reader.read();
      if (done) break;
      html += decoder.decode(value, { stream: true });
      bytes += value.length;
    }
    reader.cancel().catch(() => {});
  } else {
    html = await res.text();
  }

  const name = extractMeta(html, 'og:title', 'twitter:title');
  const image = extractMeta(html, 'og:image', 'twitter:image:src', 'twitter:image');
  const priceRaw = extractMeta(
    html,
    'product:price:amount',
    'og:price:amount',
    'twitter:data1'
  );
  const priceCurrency =
    extractMeta(html, 'product:price:currency', 'og:price:currency') || 'BRL';

  return {
    name,
    price: priceRaw ? formatPrice(priceRaw, priceCurrency) : '',
    image,
    platform,
  };
}

export default async function previewHandler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido.' });

  const { url } = req.body || {};
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'URL é obrigatória.' });
  }

  let parsedUrl;
  try {
    parsedUrl = sanitizeUrl(url);
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }

  const hostname = parsedUrl.hostname.toLowerCase();
  const platform = detectPlatform(hostname);

  try {
    let data = null;

    if (platform === 'mercadolivre') {
      data = await fetchMLProduct(url);
    }

    if (!data) {
      data = await fetchOGTags(url, platform);
    }

    return res.status(200).json(data);
  } catch (err) {
    console.error('Preview error:', err.message);
    return res.status(500).json({ error: 'Não foi possível buscar informações do produto.' });
  }
}
