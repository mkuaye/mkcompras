/**
 * /api/convert.js
 * Função serverless (Vercel) que converte links de produtos
 * em links de afiliado para Shopee, Mercado Livre e Amazon.
 *
 * Variáveis de ambiente necessárias (configure na Vercel):
 *   SHOPEE_APP_ID       → App ID do programa de afiliados Shopee
 *   SHOPEE_SECRET       → Secret do programa de afiliados Shopee
 *   ML_TRACKING_ID      → Seu tracking ID do Mercado Livre (via Impact)
 *   AMAZON_TAG          → Seu Associates Tag da Amazon (ex: seusite-20)
 */

export default async function handler(req, res) {
  // Aceita apenas POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido.' });
  }

  const { url } = req.body;

  // Validação básica
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'URL inválida.' });
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(url);
  } catch {
    return res.status(400).json({ error: 'O link não parece ser uma URL válida.' });
  }

  const hostname = parsedUrl.hostname.toLowerCase();

  try {
    // ─────────────────────────────────────────────
    // SHOPEE
    // ─────────────────────────────────────────────
    if (hostname.includes('shopee.com.br')) {
      const affiliateUrl = await convertShopee(url);
      return res.status(200).json({ affiliateUrl });
    }

    // ─────────────────────────────────────────────
    // MERCADO LIVRE / MERCADO LIBRE
    // ─────────────────────────────────────────────
    if (
      hostname.includes('mercadolivre.com.br') ||
      hostname.includes('mercadolibre.com') ||
      hostname.includes('mercadopago.com')
    ) {
      const affiliateUrl = convertMercadoLivre(url);
      return res.status(200).json({ affiliateUrl });
    }

    // ─────────────────────────────────────────────
    // AMAZON
    // ─────────────────────────────────────────────
    if (
      hostname.includes('amazon.com.br') ||
      hostname.includes('amzn.to') ||
      hostname.includes('amzn.com')
    ) {
      const affiliateUrl = convertAmazon(url, parsedUrl);
      return res.status(200).json({ affiliateUrl });
    }

    // Plataforma não suportada
    return res.status(400).json({
      error: 'Plataforma não suportada. Aceitamos links da Shopee, Mercado Livre e Amazon.'
    });

  } catch (err) {
    console.error('Erro na conversão:', err);
    return res.status(500).json({ error: 'Erro interno ao converter o link. Tente novamente.' });
  }
}

// ═══════════════════════════════════════════════
// SHOPEE — via API oficial de afiliados
// Documentação: https://affiliate.shopee.com.br
// ═══════════════════════════════════════════════
async function convertShopee(originalUrl) {
  const appId  = process.env.SHOPEE_APP_ID;
  const secret = process.env.SHOPEE_SECRET;

  if (!appId || !secret) {
    throw new Error('Credenciais da Shopee não configuradas.');
  }

  // A Shopee Affiliate API usa HMAC-SHA256 para autenticação
  const timestamp = Math.floor(Date.now() / 1000);
  const path      = '/open/v1/affiliate/link/generate';
  const payload   = JSON.stringify({ originUrl: originalUrl });

  // Gera a assinatura HMAC-SHA256
  const crypto = await import('crypto');
  const baseString = `${appId}${timestamp}${payload}`;
  const signature  = crypto
    .createHmac('sha256', secret)
    .update(baseString)
    .digest('hex');

  const response = await fetch(`https://open-api.affiliate.shopee.com.br${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `SHA256 Credential=${appId}, Timestamp=${timestamp}, Signature=${signature}`
    },
    body: payload
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Shopee API error: ${err}`);
  }

  const data = await response.json();

  // A resposta contém o link gerado em data.data.shortLink ou data.data.affiliateLink
  const link = data?.data?.shortLink || data?.data?.affiliateLink;
  if (!link) throw new Error('Shopee não retornou um link válido.');

  return link;
}

// ═══════════════════════════════════════════════
// MERCADO LIVRE — via link social de afiliado
// Formato: mercadolivre.com.br/social/{username}?matt_tool={tool_id}&matt_word={url_produto}
// ═══════════════════════════════════════════════
function convertMercadoLivre(originalUrl) {
  const username = process.env.ML_USERNAME;   // ex: mkuaye
  const toolId   = process.env.ML_TOOL_ID;    // ex: 41938087

  if (!username || !toolId) {
    throw new Error('Credenciais do Mercado Livre não configuradas.');
  }

  // Extrai só o caminho do produto original para usar como matt_word
  const productUrl = new URL(originalUrl);
  // Remove parâmetros de rastreamento de terceiros
  ['matt_word','matt_tool','ref','deal','tracking_id'].forEach(p => productUrl.searchParams.delete(p));
  const cleanProductUrl = productUrl.toString();

  // Monta o link de afiliado no formato oficial do ML
  const affiliateUrl = new URL(`https://www.mercadolivre.com.br/social/${username}`);
  affiliateUrl.searchParams.set('matt_word',  cleanProductUrl);
  affiliateUrl.searchParams.set('matt_tool',  toolId);
  affiliateUrl.searchParams.set('forceInApp', 'true');

  return affiliateUrl.toString();
}

// ═══════════════════════════════════════════════
// AMAZON — via tag de associado
// Programa: https://associados.amazon.com.br
// ═══════════════════════════════════════════════
function convertAmazon(originalUrl, parsedUrl) {
  const tag = process.env.AMAZON_TAG;

  if (!tag) {
    throw new Error('Tag da Amazon não configurada.');
  }

  // Para links curtos (amzn.to), idealmente expandir antes — por simplicidade,
  // retornamos o link com redirect preservando a tag
  if (parsedUrl.hostname.includes('amzn.to') || parsedUrl.hostname.includes('amzn.com')) {
    // Adiciona tag como parâmetro (funciona na maioria dos casos)
    const url = new URL(originalUrl);
    url.searchParams.set('tag', tag);
    return url.toString();
  }

  // Para links completos amazon.com.br
  const url = new URL(originalUrl);

  // Remove tags de outros afiliados se houver
  url.searchParams.delete('tag');
  url.searchParams.delete('linkCode');
  url.searchParams.delete('linkId');

  // Injeta a sua tag
  url.searchParams.set('tag', tag);

  return url.toString();
}
