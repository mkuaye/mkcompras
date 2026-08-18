/**
 * lib/historico-preco.js
 *
 * Registra o histórico de preços no Vercel KV e valida se uma oferta é
 * uma promoção real (preço atual <= mínima dos últimos 30 dias).
 *
 * Chave KV: "historico:{produtoId}"  →  Array<{ preco: number, ts: number }>
 * TTL: 30 dias (renovado a cada registro)
 */

import { Redis } from '@upstash/redis';

const kv = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const PREFIXO = 'historico:';
const JANELA_MS = 30 * 24 * 60 * 60 * 1000; // 30 dias em ms
const TTL_S = 30 * 24 * 60 * 60;             // TTL para o KV em segundos
// Tolerância de 1% — aceita se o preço for até 1% acima da mínima histórica
const TOLERANCIA = 0.01;

/**
 * Registra o preço atual no histórico e retorna os registros dos últimos 30 dias.
 *
 * @param {string} produtoId - ID único do produto (ex: "amazon_B08X...")
 * @param {number} preco     - Preço atual
 * @returns {Promise<Array>} - Histórico atualizado
 */
export async function registrarPreco(produtoId, preco) {
  const chave = `${PREFIXO}${produtoId}`;
  const agora = Date.now();

  const historico = (await kv.get(chave)) ?? [];

  // Descarta registros mais antigos que 30 dias
  const corte = agora - JANELA_MS;
  const filtrado = historico.filter((e) => e.ts >= corte);
  filtrado.push({ preco, ts: agora });

  await kv.set(chave, filtrado, { ex: TTL_S });
  return filtrado;
}

/**
 * Verifica se o preço atual é uma promoção real.
 * Também registra o preço no histórico.
 *
 * @param {string} produtoId  - ID único do produto
 * @param {number} precoAtual - Preço atual do produto
 * @returns {Promise<{ valido: boolean, motivo: string, minimaHistorica?: number }>}
 */
export async function validarPromocaoReal(produtoId, precoAtual) {
  const chave = `${PREFIXO}${produtoId}`;
  const historico = (await kv.get(chave)) ?? [];

  // Produto novo — nenhum histórico ainda. Aceita e começa a rastrear.
  if (historico.length === 0) {
    await registrarPreco(produtoId, precoAtual);
    return { valido: true, motivo: 'produto_novo' };
  }

  const minimaHistorica = Math.min(...historico.map((e) => e.preco));
  const limiteAceito = minimaHistorica * (1 + TOLERANCIA);

  // Preço atual precisa ser <= mínima histórica (com tolerância de 1%)
  const valido = precoAtual <= limiteAceito;

  // Registra independente de aceitar ou não (para melhorar o histórico futuro)
  await registrarPreco(produtoId, precoAtual);

  return {
    valido,
    motivo: valido ? 'minima_historica' : 'preco_inflado',
    precoAtual,
    minimaHistorica,
  };
}
