// ── Security: block SSRF to private/internal IP ranges ───────────────────────
const ALLOWED_PROTOCOLS = ['http:', 'https:'];
const BLOCKED_HOST_RE = /^(localhost|127\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.)/;

function sanitizeUrl(raw) {
  let parsed;
  try { parsed = new URL(raw); } catch { throw new Error('URL inválida.'); }
  if (!ALLOWED_PROTOCOLS.includes(parsed.protocol)) throw new Error('Protocolo não suportado. Use http ou https.');
  if (BLOCKED_HOST_RE.test(parsed.hostname)) throw new Error('URL interna não permitida.');
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
    return num.toLocaleString('pt-BR', { style: 'currency', currency: currency || 'BRL', minimumFractionDigits: 2 });
  } catch {
    return `R$ ${num.toFixed(2).replace('.', ',')}`;
  }
}

// Convert a URL slug ("tela-mosquiteira-com-velcro") to a readable name
function slugToName(slug) {
  return decodeURIComponent(slug)
    .replace(/[-_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

// ── Mercado Livre ─────────────────────────────────────────────────────────────
// ML product pages include JSON-LD structured data for bots/crawlers.
// Fetching with a Googlebot UA bypasses the login-wall redirect.
const BOT_HEADERS = {
  'User-Agent': 'Googlebot/2.1 (+http://www.google.com/bot.html)',
  Accept: 'text/html,application/xhtml+xml',
  From: 'googlebot@googlebot.com',
};

function extractJsonLdProduct(html) {
  const blocks = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  for (const b of blocks) {
    try {
      const d = JSON.parse(b[1]);
      const item = d['@type'] === 'Product' ? d : d['@graph']?.find?.(x => x['@type'] === 'Product');
      if (item?.name) return item;
    } catch {}
  }
  return null;
}

async function fetchMLProduct(url) {
  // Name fallback: clean up the URL slug
  const slugMatch = url.match(/mercadolivre\.com\.br\/([^/?#]+)/);
  const nameFromSlug = slugMatch ? slugToName(slugMatch[1]) : '';

  try {
    const res = await fetch(url, { headers: BOT_HEADERS, redirect: 'follow' });
    if (!res.ok) return { name: nameFromSlug, price: '', image: '', platform: 'mercadolivre' };

    const html = await res.text();
    const product = extractJsonLdProduct(html);
    if (!product) return { name: nameFromSlug, price: '', image: '', platform: 'mercadolivre' };

    const rawPrice = product.offers?.price ?? product.offers?.lowPrice ?? null;
    const currency = product.offers?.priceCurrency || 'BRL';

    return {
      name: product.name || nameFromSlug,
      price: rawPrice != null ? formatPrice(rawPrice, currency) : '',
      image: (Array.isArray(product.image) ? product.image[0] : product.image) || '',
      platform: 'mercadolivre',
    };
  } catch {
    return { name: nameFromSlug, price: '', image: '', platform: 'mercadolivre' };
  }
}

// ── Shopee ────────────────────────────────────────────────────────────────────
// Shopee blocks all unauthenticated API and bot requests (returns 403).
// We extract the product name from the URL slug, which Shopee encodes
// descriptively (e.g. "Fone-Bluetooth-XYZ-i.123.456" → "Fone Bluetooth Xyz").
// Price and image must be filled in manually by the admin.
async function fetchShopeeProduct(url) {
  const decoded = decodeURIComponent(url);

  // URL pattern: /Product-Name-i.shopId.itemId
  const slugMatch = decoded.match(/shopee\.com\.br\/(.+?)(?=-i\.\d+\.\d+)/);
  const name = slugMatch ? slugToName(slugMatch[1]) : '';

  return { name, price: '', image: '', platform: 'shopee' };
}

// ── Amazon ────────────────────────────────────────────────────────────────────
// Uses microlink.io (free tier: 100 req/day) with CSS selectors for structured
// extraction. Set MICROLINK_API_KEY env var to increase the rate limit.
async function fetchAmazonProduct(url) {
  const endpoint = new URL('https://api.microlink.io/');
  endpoint.searchParams.set('url', url);
  // #productTitle — the actual product title (not the page <title> which has "Amazon.com.br:")
  endpoint.searchParams.set('data.title.selector', '#productTitle');
  endpoint.searchParams.set('data.title.type', 'text');
  // .a-offscreen — hidden span Amazon writes for screen readers: "R$45,00"
  endpoint.searchParams.set('data.price.selector', '.a-offscreen');
  endpoint.searchParams.set('data.price.type', 'text');

  const apiKey = process.env.MICROLINK_API_KEY;
  if (apiKey) endpoint.searchParams.set('apiKey', apiKey);

  const res = await fetch(endpoint.toString(), { headers: { Accept: 'application/json' } });
  if (!res.ok) return null;

  const { status, data } = await res.json();
  if (status !== 'success' || !data) return null;

  // data.title may be empty if selector didn't match → fall back to page title
  const name = (data.title?.trim() || '').replace(/\s+/g, ' ');
  // data.price may return the first .a-offscreen value; strip accidental HTML
  const price = (data.price || '').replace(/<[^>]+>/g, '').trim();

  return {
    name,
    price,
    image: data.image?.url || '',
    platform: 'amazon',
  };
}

// ── Generic microlink fallback ─────────────────────────────────────────────────
async function fetchWithMicrolink(url, platform) {
  const endpoint = new URL('https://api.microlink.io/');
  endpoint.searchParams.set('url', url);
  const apiKey = process.env.MICROLINK_API_KEY;
  if (apiKey) endpoint.searchParams.set('apiKey', apiKey);

  try {
    const res = await fetch(endpoint.toString(), { headers: { Accept: 'application/json' } });
    if (!res.ok) return null;
    const { status, data } = await res.json();
    if (status !== 'success' || !data) return null;
    return { name: data.title || '', price: '', image: data.image?.url || '', platform };
  } catch {
    return null;
  }
}

// ── Handler ───────────────────────────────────────────────────────────────────
export default async function previewHandler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido.' });

  const { url } = req.body || {};
  if (!url || typeof url !== 'string') return res.status(400).json({ error: 'URL é obrigatória.' });

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
    } else if (platform === 'shopee') {
      data = await fetchShopeeProduct(url);
    } else if (platform === 'amazon') {
      data = await fetchAmazonProduct(url);
    }

    // For unrecognised platforms or if platform-specific fetch returned nothing, use microlink
    if (!data?.name) {
      const fallback = await fetchWithMicrolink(url, platform);
      if (fallback) data = { ...fallback, ...(data || {}) };
    }

    return res.status(200).json(data || { name: '', price: '', image: '', platform });
  } catch (err) {
    console.error('Preview error:', err.message);
    return res.status(500).json({ error: 'Não foi possível buscar informações do produto.' });
  }
}
