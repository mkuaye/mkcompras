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

  const mutation = `mutation { generateShortLink( input: { originUrl: "${originalUrl}" } ) { shortLink } }`;
  const payload = JSON.stringify({ query: mutation });

  const crypto = await import('crypto');
  // Assinatura correta: SHA256(AppId + Timestamp + Payload + Secret)
  const baseString = `${appId}${timestamp}${payload}${secret}`;
  const signature = crypto
    .createHash('sha256')
    .update(baseString)
    .digest('hex');

  const response = await fetch('https://open-api.affiliate.shopee.com.br/graphql', {
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

  if (data?.errors?.length) {
    throw new Error(`Shopee API error: ${data.errors[0]?.message || 'Erro desconhecido'}`);
  }

  const link = data?.data?.generateShortLink?.shortLink;

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
  productUrl.hash = '';

  productUrl.searchParams.set('matt_word', username);
  productUrl.searchParams.set('matt_tool', toolId);

  return productUrl.toString();
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
