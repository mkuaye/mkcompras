/**
 * lib/converter.js
 *
 * Gera o link de afiliado para cada plataforma.
 *
 * - Shopee  : offerLink já vem pronto da productOfferV2 — retorna direto.
 * - Amazon  : injeta ?tag=mkcompras-20 na URL limpa do produto.
 * - ML      : injeta ?matt_word=mkuaye&matt_tool=41938087 na URL do produto.
 *
 * Lógica portada de src/server/services/platformConverters.js do site principal.
 */

import crypto from 'crypto';

// ─── Shopee ───────────────────────────────────────────────────────────────────

/**
 * Converte uma URL de produto Shopee avulsa (não vinda da productOfferV2)
 * em link de afiliado via mutation generateShortLink.
 * Raramente necessário no bot — use quando o produto vier de outra fonte.
 */
export async function converterShopeeUrl(originalUrl) {
  const appId = process.env.SHOPEE_APP_ID;
  const secret = process.env.SHOPEE_SECRET;
  if (!appId || !secret) throw new Error('SHOPEE_APP_ID / SHOPEE_SECRET não configurados');

  const timestamp = Math.floor(Date.now() / 1000);
  const mutation = `mutation { generateShortLink(input: { originUrl: "${originalUrl}" }) { shortLink } }`;
  const payload = JSON.stringify({ query: mutation });
  const base = `${appId}${timestamp}${payload}${secret}`;
  const signature = crypto.createHash('sha256').update(base).digest('hex');

  const res = await fetch('https://open-api.affiliate.shopee.com.br/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `SHA256 Credential=${appId}, Timestamp=${timestamp}, Signature=${signature}`,
    },
    body: payload,
  });

  if (!res.ok) throw new Error(`Shopee API HTTP ${res.status}`);
  const data = await res.json();
  if (data?.errors?.length) throw new Error(`Shopee: ${data.errors[0]?.message}`);

  const link = data?.data?.generateShortLink?.shortLink;
  if (!link) throw new Error('Shopee não retornou shortLink');
  return link;
}

// ─── Mercado Livre ────────────────────────────────────────────────────────────

function converterML(originalUrl) {
  const username = process.env.ML_USERNAME ?? 'mkuaye';
  const toolId = process.env.ML_TOOL_ID ?? '41938087';

  const url = new URL(originalUrl);

  // Remove parâmetros de rastreamento anteriores para evitar conflito
  ['matt_word', 'matt_tool', 'ref', 'deal', 'tracking_id'].forEach((p) =>
    url.searchParams.delete(p)
  );
  url.hash = '';

  url.searchParams.set('matt_word', username);
  url.searchParams.set('matt_tool', toolId);

  return url.toString();
}

// ─── Amazon ───────────────────────────────────────────────────────────────────

function converterAmazon(originalUrl) {
  const tag = process.env.AMAZON_TAG ?? 'mkcompras-20';
  const url = new URL(originalUrl);

  // Remove tags anteriores para não empilhar
  url.searchParams.delete('tag');
  url.searchParams.delete('linkCode');
  url.searchParams.delete('linkId');

  url.searchParams.set('tag', tag);
  return url.toString();
}

// ─── Dispatcher ──────────────────────────────────────────────────────────────

/**
 * Recebe um objeto produto normalizado e retorna a URL com link de afiliado.
 *
 * @param {object} produto
 * @param {'shopee'|'mercadolivre'|'amazon'} produto.plataforma
 * @param {string} [produto.linkAfiliado]  - Shopee: offerLink já pronto
 * @param {string} [produto.linkOriginal]  - ML / Amazon: link sem tag
 * @returns {Promise<string>}
 */
export async function converterLink(produto) {
  switch (produto.plataforma) {
    case 'shopee':
      // offerLink já é afiliado — não há necessidade de chamada extra à API
      if (produto.linkAfiliado) return produto.linkAfiliado;
      return converterShopeeUrl(produto.linkOriginal);

    case 'mercadolivre':
      return converterML(produto.linkOriginal);

    case 'amazon':
      return converterAmazon(produto.linkOriginal);

    default:
      throw new Error(`Plataforma desconhecida: ${produto.plataforma}`);
  }
}
