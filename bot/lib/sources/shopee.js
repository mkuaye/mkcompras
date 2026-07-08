/**
 * lib/sources/shopee.js
 *
 * Busca ofertas gamer via Shopee Affiliate Open API (GraphQL).
 * Usa productOfferV2 — já retorna offerLink com o link de afiliado pronto.
 *
 * Refs:
 *   https://open-api.affiliate.shopee.com.br/graphql
 *   Assinatura: SHA256(AppId + Timestamp + Payload + Secret)
 */

import crypto from 'crypto';

const API_URL = 'https://open-api.affiliate.shopee.com.br/graphql';

// Preços na API Shopee vêm como inteiros em centavos (÷100 = BRL)
const PRECO_DIVISOR = 100;

function assinar(appId, timestamp, payload, secret) {
  const base = `${appId}${timestamp}${payload}${secret}`;
  return crypto.createHash('sha256').update(base).digest('hex');
}

async function graphql(query) {
  const appId = process.env.SHOPEE_APP_ID;
  const secret = process.env.SHOPEE_SECRET;

  if (!appId || !secret) throw new Error('SHOPEE_APP_ID / SHOPEE_SECRET não configurados');

  const timestamp = Math.floor(Date.now() / 1000);
  const payload = JSON.stringify({ query });
  const signature = assinar(appId, timestamp, payload, secret);

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `SHA256 Credential=${appId}, Timestamp=${timestamp}, Signature=${signature}`
    },
    body: payload
  });

  if (!res.ok) {
    const texto = await res.text();
    throw new Error(`Shopee API HTTP ${res.status}: ${texto.slice(0, 200)}`);
  }

  const data = await res.json();
  if (data?.errors?.length) throw new Error(`Shopee: ${data.errors[0]?.message}`);
  return data.data;
}

/**
 * @param {object} opts
 * @param {string} opts.keyword  - Palavra-chave de busca
 * @param {number} opts.limit    - Máximo de produtos (padrão 10)
 * @returns {Promise<Array>}     - Array de produtos normalizados
 */
export async function buscarOfertasShopee({ keyword = 'gamer', limit = 10 } = {}) {
  const query = `
    query {
      productOfferV2(
        listType: 1
        sortType: 2
        limit: ${limit}
        keyword: "${keyword.replace(/"/g, '')}"
      ) {
        nodes {
          itemId
          productName
          imageUrl
          priceMin
          priceMax
          priceSale
          ratingStar
          offerLink
          commissionRate
          shopName
        }
      }
    }
  `;

  const data = await graphql(query);
  const nodes = data?.productOfferV2?.nodes ?? [];

  return nodes
    .filter((p) => p.priceSale && p.offerLink && p.productName)
    .map((p) => ({
      id: `shopee_${p.itemId}`,
      plataforma: 'shopee',
      titulo: p.productName,
      // offerLink já é o link de afiliado — não precisa converter
      linkAfiliado: p.offerLink,
      preco: Number(p.priceSale) / PRECO_DIVISOR,
      precoOriginal: Number(p.priceMin) / PRECO_DIVISOR,
      imagem: p.imageUrl,
      avaliacao: p.ratingStar ? Number(p.ratingStar) : null,
      loja: p.shopName ?? 'Shopee'
    }));
}
