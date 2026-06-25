import { put, list } from '@vercel/blob';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';
import { convertByPlatform } from '../services/platformConverters.js';
import { recordEvent, extractTags } from '../services/analyticsService.js';

const BLOB_PATHNAME = 'mkcompras-products.json';
const __dir = dirname(fileURLToPath(import.meta.url));

async function readProducts() {
  if (process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID) {
    try {
      const { blobs } = await list({ prefix: BLOB_PATHNAME });
      const blob = blobs.find((b) => b.pathname === BLOB_PATHNAME);
      if (blob) {
        const res = await fetch(blob.url);
        return await res.json();
      }
    } catch (e) {
      console.error('Blob read error, falling back to file:', e.message);
    }
  }

  try {
    const filePath = join(__dir, '../../../data/products.json');
    return JSON.parse(readFileSync(filePath, 'utf-8'));
  } catch {
    return [];
  }
}

async function writeProducts(products) {
  if (!process.env.BLOB_READ_WRITE_TOKEN && !process.env.BLOB_STORE_ID) {
    throw new Error('Configure BLOB_READ_WRITE_TOKEN ou BLOB_STORE_ID nas variáveis de ambiente do Vercel.');
  }
  await put(BLOB_PATHNAME, JSON.stringify(products), {
    access: 'public',
    addRandomSuffix: false,
  });
}

function detectPlatform(hostname) {
  if (hostname.includes('shopee')) return 'shopee';
  if (hostname.includes('mercadolivre') || hostname.includes('mercadolibre')) return 'mercadolivre';
  if (hostname.includes('amazon') || hostname.includes('amzn')) return 'amazon';
  return 'outros';
}

function isAdmin(req) {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) return false;
  const auth = req.headers['authorization'] || req.headers['Authorization'] || '';
  return auth === `Bearer ${pw}`;
}

export default async function productsHandler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    const products = await readProducts();
    const { category, platform, search, featured } = req.query || {};

    let filtered = [...products];
    if (category) filtered = filtered.filter((p) => p.category === category);
    if (platform) filtered = filtered.filter((p) => p.platform === platform);
    if (featured === 'true') filtered = filtered.filter((p) => p.featured);
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (p) => p.name.toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q)
      );
    }

    const categories = [...new Set(products.map((p) => p.category).filter(Boolean))];
    return res.status(200).json({ products: filtered, categories });
  }

  if (!isAdmin(req)) {
    return res.status(401).json({ error: 'Não autorizado.' });
  }

  if (req.method === 'POST') {
    const { originalUrl, name, description, image, price, category, featured, affiliateUrl: given } = req.body || {};

    if (!originalUrl || !name) {
      return res.status(400).json({ error: 'URL original e nome são obrigatórios.' });
    }

    let affiliateUrl = given || '';
    let platform = req.body.platform || '';

    try {
      const parsedUrl = new URL(originalUrl);
      platform = platform || detectPlatform(parsedUrl.hostname.toLowerCase());
      if (!affiliateUrl) {
        const result = await convertByPlatform(originalUrl, parsedUrl);
        if (result.affiliateUrl) affiliateUrl = result.affiliateUrl;
      }
    } catch (e) {
      console.error('Conversão automática falhou:', e.message);
    }

    const products = await readProducts();
    const product = {
      id: randomUUID(),
      name,
      description: description || '',
      image: image || '',
      price: price || '',
      platform: platform || 'outros',
      originalUrl,
      affiliateUrl: affiliateUrl || originalUrl,
      category: category || 'geral',
      featured: Boolean(featured),
      createdAt: new Date().toISOString(),
    };

    products.push(product);
    try {
      await writeProducts(products);
    } catch (e) {
      console.error('writeProducts failed:', e.message);
      return res.status(500).json({ error: e.message });
    }

    // Fire-and-forget: registra métricas do produto adicionado
    recordEvent({
      type: 'product_added',
      platform: product.platform,
      category: product.category,
      tags: extractTags(product.name, product.description),
      productName: product.name,
    }).catch(() => {});

    return res.status(201).json(product);
  }

  if (req.method === 'PUT') {
    const { id, ...updates } = req.body || {};
    if (!id) return res.status(400).json({ error: 'ID obrigatório.' });

    const products = await readProducts();
    const idx = products.findIndex((p) => p.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Produto não encontrado.' });

    products[idx] = { ...products[idx], ...updates, id };
    try {
      await writeProducts(products);
    } catch (e) {
      console.error('writeProducts failed:', e.message);
      return res.status(500).json({ error: e.message });
    }
    return res.status(200).json(products[idx]);
  }

  if (req.method === 'DELETE') {
    const { id } = req.query || {};
    if (!id) return res.status(400).json({ error: 'ID obrigatório.' });

    const products = await readProducts();
    const filtered = products.filter((p) => p.id !== id);
    try {
      await writeProducts(filtered);
    } catch (e) {
      console.error('writeProducts failed:', e.message);
      return res.status(500).json({ error: e.message });
    }
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Método não permitido.' });
}
