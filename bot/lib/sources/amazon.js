/**
 * lib/sources/amazon.js
 *
 * Busca ofertas via Amazon Product Advertising API 5.0 (PA API).
 *
 * PRÉ-REQUISITOS:
 *   - Conta no programa de afiliados da Amazon BR com PA API habilitada
 *   - Gerar credenciais em: https://affiliate-program.amazon.com.br/assoc_credentials/home
 *   - Definir AMAZON_ACCESS_KEY, AMAZON_SECRET_KEY e AMAZON_TAG no .env
 *
 * A assinatura usa AWS Signature Version 4 (implementada aqui sem SDK externo).
 */

import crypto from 'crypto';

const HOST = 'webservices.amazon.com.br';
const REGION = 'us-east-1';
const SERVICE = 'ProductAdvertisingAPI';
const PATH = '/paapi5/searchitems';

// Palavras-chave de produtos gamer rodados por ciclo
const KEYWORDS = [
  'headset gamer',
  'teclado gamer',
  'mouse gamer',
  'cadeira gamer',
  'monitor gamer',
];

// ─── AWS Signature V4 ────────────────────────────────────────────────────────

function hmac(key, data, encoding) {
  return crypto.createHmac('sha256', key).update(data).digest(encoding);
}

function sha256hex(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function chaveAssinatura(secretKey, dateStamp) {
  const kDate = hmac(`AWS4${secretKey}`, dateStamp);
  const kRegion = hmac(kDate, REGION);
  const kService = hmac(kRegion, SERVICE);
  return hmac(kService, 'aws4_request');
}

function assinarRequisicao(body, accessKey, secretKey) {
  const target = 'com.amazon.paapi5.v1.ProductAdvertisingAPIv1.SearchItems';
  const now = new Date();
  const amzdate = now.toISOString().replace(/[:\-]|\.\d{3}/g, '').slice(0, 15) + 'Z';
  const datestamp = amzdate.slice(0, 8);

  const headersMap = {
    'content-type': 'application/json; charset=utf-8',
    'host': HOST,
    'x-amz-date': amzdate,
    'x-amz-target': target,
  };

  const signedHeaderNames = Object.keys(headersMap).sort();
  const canonicalHeaders = signedHeaderNames.map((k) => `${k}:${headersMap[k]}`).join('\n') + '\n';
  const signedHeaders = signedHeaderNames.join(';');
  const bodyHash = sha256hex(body);

  const canonicalRequest = ['POST', PATH, '', canonicalHeaders, signedHeaders, bodyHash].join('\n');
  const credentialScope = `${datestamp}/${REGION}/${SERVICE}/aws4_request`;
  const stringToSign = ['AWS4-HMAC-SHA256', amzdate, credentialScope, sha256hex(canonicalRequest)].join('\n');

  const signingKey = chaveAssinatura(secretKey, datestamp);
  const signature = hmac(signingKey, stringToSign, 'hex');

  const authorization = `AWS4-HMAC-SHA256 Credential=${accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return {
    'Content-Type': headersMap['content-type'],
    'Host': HOST,
    'X-Amz-Date': amzdate,
    'X-Amz-Target': target,
    Authorization: authorization,
  };
}

// ─── Busca ───────────────────────────────────────────────────────────────────

async function searchItems(keyword, partnerTag, accessKey, secretKey) {
  const body = JSON.stringify({
    Keywords: keyword,
    Resources: [
      'Images.Primary.Medium',
      'ItemInfo.Title',
      'Offers.Listings.Price',
      'Offers.Listings.SavingBasis',
    ],
    SearchIndex: 'Electronics',
    ItemCount: 5,
    PartnerTag: partnerTag,
    PartnerType: 'Associates',
    Marketplace: 'www.amazon.com.br',
    MinReviewsRating: 3,
    MinSavingPercent: 15,
  });

  const headers = assinarRequisicao(body, accessKey, secretKey);

  const res = await fetch(`https://${HOST}${PATH}`, {
    method: 'POST',
    headers,
    body,
  });

  if (!res.ok) {
    const texto = await res.text();
    throw new Error(`Amazon PA API HTTP ${res.status}: ${texto.slice(0, 300)}`);
  }

  return res.json();
}

/**
 * @param {object} opts
 * @param {number} opts.keywordIndex - Índice da keyword a usar neste ciclo (rotação)
 * @returns {Promise<Array>}         - Array de produtos normalizados
 */
export async function buscarOfertasAmazon({ keywordIndex = 0 } = {}) {
  if (process.env.AMAZON_ENABLED === 'false') return [];

  const accessKey = process.env.AMAZON_ACCESS_KEY;
  const secretKey = process.env.AMAZON_SECRET_KEY;
  const partnerTag = process.env.AMAZON_TAG ?? 'mkcompras-20';

  if (!accessKey || !secretKey) {
    console.warn('[Amazon] AMAZON_ACCESS_KEY / AMAZON_SECRET_KEY não configurados — fonte desabilitada.');
    return [];
  }

  const keyword = KEYWORDS[keywordIndex % KEYWORDS.length];
  const data = await searchItems(keyword, partnerTag, accessKey, secretKey);
  const items = data?.SearchResult?.Items ?? [];

  return items
    .map((item) => {
      const listing = item.Offers?.Listings?.[0];
      const preco = listing?.Price?.Amount;
      const precoOriginal = listing?.SavingBasis?.Amount ?? null;
      const asin = item.ASIN;

      if (!preco || !asin) return null;

      return {
        id: `amazon_${asin}`,
        plataforma: 'amazon',
        titulo: item.ItemInfo?.Title?.DisplayValue ?? '',
        linkOriginal: `https://www.amazon.com.br/dp/${asin}`,
        preco,
        precoOriginal,
        imagem: item.Images?.Primary?.Medium?.URL ?? null,
        avaliacao: null,
        loja: 'Amazon',
        asin,
      };
    })
    .filter(Boolean);
}
