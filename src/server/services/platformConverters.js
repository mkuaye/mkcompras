export async function convertByPlatform(originalUrl, parsedUrl) {
  const hostname = parsedUrl.hostname.toLowerCase();

  if (hostname.includes('shopee.com.br')) {
    const affiliateUrl = await convertShopee(originalUrl);
    return { affiliateUrl };
  }

  if (
    hostname.includes('mercadolivre.com.br') ||
    hostname.includes('mercadolibre.com') ||
    hostname.includes('mercadopago.com')
  ) {
    const affiliateUrl = convertMercadoLivre(originalUrl);
    return { affiliateUrl };
  }

  if (
    hostname.includes('amazon.com.br') ||
    hostname.includes('amzn.to') ||
    hostname.includes('amzn.com')
  ) {
    const affiliateUrl = convertAmazon(originalUrl, parsedUrl);
    return { affiliateUrl };
  }

  return {
    error: 'Plataforma nao suportada. Aceitamos links da Shopee, Mercado Livre e Amazon.'
  };
}

async function convertShopee(originalUrl) {
  const appId = process.env.SHOPEE_APP_ID;
  const secret = process.env.SHOPEE_SECRET;

  if (!appId || !secret) {
    throw new Error('Credenciais da Shopee nao configuradas.');
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const path = '/open/v1/affiliate/link/generate';
  const payload = JSON.stringify({ originUrl: originalUrl });

  const crypto = await import('crypto');
  const baseString = `${appId}${timestamp}${payload}`;
  const signature = crypto
    .createHmac('sha256', secret)
    .update(baseString)
    .digest('hex');

  const response = await fetch(`https://open-api.affiliate.shopee.com.br${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `SHA256 Credential=${appId}, Timestamp=${timestamp}, Signature=${signature}`
    },
    body: payload
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Shopee API error: ${err}`);
  }

  const data = await response.json();
  const link = data?.data?.shortLink || data?.data?.affiliateLink;

  if (!link) {
    throw new Error('Shopee nao retornou um link valido.');
  }

  return link;
}

function convertMercadoLivre(originalUrl) {
  const username = process.env.ML_USERNAME;
  const toolId = process.env.ML_TOOL_ID;

  if (!username || !toolId) {
    throw new Error('Credenciais do Mercado Livre nao configuradas.');
  }

  const productUrl = new URL(originalUrl);
  ['matt_word', 'matt_tool', 'ref', 'deal', 'tracking_id'].forEach((p) => productUrl.searchParams.delete(p));

  const cleanProductUrl = productUrl.toString();
  const affiliateUrl = new URL(`https://www.mercadolivre.com.br/social/${username}`);

  affiliateUrl.searchParams.set('matt_word', cleanProductUrl);
  affiliateUrl.searchParams.set('matt_tool', toolId);
  affiliateUrl.searchParams.set('forceInApp', 'true');

  return affiliateUrl.toString();
}

function convertAmazon(originalUrl, parsedUrl) {
  const tag = process.env.AMAZON_TAG;

  if (!tag) {
    throw new Error('Tag da Amazon nao configurada.');
  }

  if (parsedUrl.hostname.includes('amzn.to') || parsedUrl.hostname.includes('amzn.com')) {
    const url = new URL(originalUrl);
    url.searchParams.set('tag', tag);
    return url.toString();
  }

  const url = new URL(originalUrl);
  url.searchParams.delete('tag');
  url.searchParams.delete('linkCode');
  url.searchParams.delete('linkId');
  url.searchParams.set('tag', tag);

  return url.toString();
}
