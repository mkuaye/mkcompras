/**
 * lib/dedupe.js
 *
 * Evita postar a mesma oferta mais de uma vez por semana.
 *
 * Chave KV: "oferta:{produtoId}"  →  true
 * TTL: 7 dias — após expirar o produto pode ser postado novamente se ainda estiver em oferta.
 */

import { Redis } from '@upstash/redis';

const kv = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const PREFIXO = 'oferta:';
const TTL_S = 7 * 24 * 60 * 60; // 7 dias em segundos

/**
 * Verifica se o produto já foi postado nos últimos 7 dias.
 *
 * @param {string} produtoId
 * @returns {Promise<boolean>}
 */
export async function jaPostado(produtoId) {
  const valor = await kv.get(`${PREFIXO}${produtoId}`);
  return valor === true;
}

/**
 * Marca o produto como postado (expira em 7 dias).
 *
 * @param {string} produtoId
 */
export async function marcarPostado(produtoId) {
  await kv.set(`${PREFIXO}${produtoId}`, true, { ex: TTL_S });
}
