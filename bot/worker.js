/**
 * worker.js — Processo principal do bot de ofertas gamer.
 *
 * Fluxo por ciclo:
 *   1. Busca produtos em Shopee, Mercado Livre e Amazon
 *   2. Para cada produto:
 *      a. Checa dedupe (já postado nos últimos 7 dias?)
 *      b. Valida promoção real (preço atual <= mínima dos últimos 30 dias?)
 *      c. Converte URL para link de afiliado
 *      d. Formata e posta no grupo do WhatsApp
 *      e. Marca como postado no KV
 *   3. Aguarda 2 horas e repete
 *
 * CONFIGURAÇÃO:
 *   1. Copie .env.example para .env e preencha as variáveis
 *   2. npm install
 *   3. npm start
 *      → Na primeira execução, escaneie o QR code com o WhatsApp Business
 *      → Se WHATSAPP_GROUP_ID não estiver preenchido, rode antes:
 *        npm run listar-grupos
 */

import 'dotenv/config';
import cron from 'node-cron';

import { conectar, postarNoGrupo } from './lib/whatsapp.js';
import { buscarOfertasShopee } from './lib/sources/shopee.js';
import { buscarOfertasML } from './lib/sources/mercadolivre.js';
import { buscarOfertasAmazon } from './lib/sources/amazon.js';
import { converterLink } from './lib/converter.js';
import { validarPromocaoReal } from './lib/historico-preco.js';
import { jaPostado, marcarPostado } from './lib/dedupe.js';
import { formatarMensagem } from './lib/formatter.js';

// ─── Configuração ─────────────────────────────────────────────────────────────

const GRUPO_ID = process.env.WHATSAPP_GROUP_ID;

// Delay entre posts para não parecer spam (15 segundos)
const DELAY_ENTRE_POSTS_MS = 15_000;

// Máximo de posts por ciclo (evita inundar o grupo)
const MAX_POSTS_POR_CICLO = 5;

// Rotação de keywords por ciclo para cobrir diferentes produtos Amazon
let cicloAtual = 0;

// ─── Utilitários ──────────────────────────────────────────────────────────────

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function log(msg) {
  console.log(`[${new Date().toLocaleString('pt-BR')}] ${msg}`);
}

// ─── Processamento ────────────────────────────────────────────────────────────

/**
 * Tenta processar um produto e postá-lo no grupo.
 * Retorna true se foi postado, false caso contrário.
 */
async function processarProduto(produto) {
  // 1. Dedupe
  if (await jaPostado(produto.id)) return false;

  // 2. Valida promoção real
  if (produto.preco == null || isNaN(produto.preco)) return false;
  const validacao = await validarPromocaoReal(produto.id, produto.preco);

  if (!validacao.valido) {
    log(
      `⏭  Ignorado (preço inflado): ${produto.titulo.slice(0, 50)} ` +
      `— atual R$${produto.preco}, mínima R$${validacao.minimaHistorica}`
    );
    return false;
  }

  // 3. Converte link de afiliado
  const linkAfiliado = await converterLink(produto);

  // 4. Formata e posta
  const mensagem = formatarMensagem(produto, linkAfiliado);
  await postarNoGrupo(GRUPO_ID, mensagem);

  // 5. Marca como postado
  await marcarPostado(produto.id);

  log(`✅ Postado: ${produto.titulo.slice(0, 60)} — R$${produto.preco}`);
  return true;
}

// ─── Ciclo principal ──────────────────────────────────────────────────────────

async function cicloOfertas() {
  if (!GRUPO_ID) {
    log('⚠️  WHATSAPP_GROUP_ID não configurado. Execute: npm run listar-grupos');
    return;
  }

  log('🔍 Iniciando ciclo de busca de ofertas...');

  const keywords = ['headset gamer', 'teclado gamer', 'mouse gamer', 'cadeira gamer', 'monitor gamer'];
  const keyword = keywords[cicloAtual % keywords.length];
  cicloAtual++;

  // Busca todas as fontes em paralelo
  const [shopee, ml, amazon] = await Promise.allSettled([
    buscarOfertasShopee({ keyword, limit: 15 }),
    buscarOfertasML({ limit: 15 }),
    buscarOfertasAmazon({ keywordIndex: cicloAtual }),
  ]);

  const produtos = [
    ...(shopee.status === 'fulfilled' ? shopee.value : []),
    ...(ml.status === 'fulfilled' ? ml.value : []),
    ...(amazon.status === 'fulfilled' ? amazon.value : []),
  ];

  if (shopee.status === 'rejected') log(`❌ Shopee: ${shopee.reason?.message}`);
  if (ml.status === 'rejected')     log(`❌ Mercado Livre: ${ml.reason?.message}`);
  if (amazon.status === 'rejected') log(`❌ Amazon: ${amazon.reason?.message}`);

  log(`📦 Total de produtos encontrados: ${produtos.length}`);

  let postados = 0;

  for (const produto of produtos) {
    if (postados >= MAX_POSTS_POR_CICLO) {
      log(`🛑 Limite de ${MAX_POSTS_POR_CICLO} posts/ciclo atingido.`);
      break;
    }

    try {
      const postado = await processarProduto(produto);
      if (postado) {
        postados++;
        // Pausa entre posts para não acionar filtros anti-spam do WhatsApp
        await sleep(DELAY_ENTRE_POSTS_MS);
      }
    } catch (err) {
      log(`❌ Erro ao processar produto "${produto.titulo?.slice(0, 40)}": ${err.message}`);
    }
  }

  log(`✔  Ciclo concluído — ${postados} oferta(s) postada(s).`);
}

// ─── Inicialização ────────────────────────────────────────────────────────────

log('🤖 MKCompras Bot iniciando...');

await conectar();

// Roda imediatamente ao iniciar
await cicloOfertas();

// Agenda: a cada 2 horas
cron.schedule('0 */2 * * *', cicloOfertas);

log('⏰ Agendamento ativo — próximo ciclo em 2 horas.');
