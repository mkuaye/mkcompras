async function resolveRedirect(url) {
  try {
    const response = await fetch(url, { method: 'HEAD', redirect: 'follow' });
    return response.url || url;
  } catch {
    return url;
  }
}

export async function convertByPlatform(originalUrl, parsedUrl) {
  let hostname = parsedUrl.hostname.toLowerCase();
  let effectiveUrl = originalUrl;

  // Resolve Shopee short links (e.g. br.shp.ee)
  if (hostname.includes('shp.ee')) {
    effectiveUrl = await resolveRedirect(originalUrl);
    hostname = new URL(effectiveUrl).hostname.toLowerCase();
  }

  if (hostname.includes('shopee.com.br')) {
    const affiliateUrl = await convertShopee(effectiveUrl);
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
    const affiliateUrl = convertAmazon(originalUrl);
    return { affiliateUrl };
  }

  return {
    error: 'Plataforma nao suportada. Aceitamos links da Shopee, Mercado Livre e Amazon.'
  };
}

// Shopee affiliate/tracking params to strip from product URLs before sending to API
const SHOPEE_AFFILIATE_PARAMS = [
  'af_siteid', 'af_sub_siteid', 'af_click_lookback', 'af_sub5',
  'pid', 'c', 'shopeeParam',
];

function cleanShopeeUrl(url) {
  const cleaned = new URL(url);
  for (const param of SHOPEE_AFFILIATE_PARAMS) {
    cleaned.searchParams.delete(param);
  }
  cleaned.hash = '';
  return cleaned.toString();
}

async function convertShopee(originalUrl) {
  const appId = process.env.SHOPEE_APP_ID;
  const secret = process.env.SHOPEE_SECRET;

  if (!appId || !secret) {
    throw new Error('Credenciais da Shopee nao configuradas.');
  }

  // Strip other affiliates' tracking params before sending to Shopee API
  const cleanUrl = cleanShopeeUrl(originalUrl);

  const timestamp = Math.floor(Date.now() / 1000);

  // Use variables to avoid GraphQL injection from URL contents
  const mutation = `mutation GenerateLink($url: String!) { generateShortLink( input: { originUrl: $url } ) { shortLink } }`;
  const payload = JSON.stringify({ query: mutation, variables: { url: cleanUrl } });

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

// Amazon affiliate/tracking params to remove (covers own tag + other affiliates)
const AMAZON_AFFILIATE_PARAMS = ['tag', 'linkCode', 'linkId', 'ref', 'btn_ref', 'smid'];

function convertMercadoLivre(originalUrl) {
  const username = process.env.ML_USERNAME;
  const toolId = process.env.ML_TOOL_ID;

  if (!username || !toolId) {
    throw new Error('Credenciais do Mercado Livre nao configuradas.');
  }

  const productUrl = new URL(originalUrl);

  // Remove ALL query params from the original link (may belong to other affiliates)
  for (const key of [...productUrl.searchParams.keys()]) {
    productUrl.searchParams.delete(key);
  }

  // Remove hash fragment (also carries affiliate/reco tracking from other affiliates)
  productUrl.hash = '';

  // Add our affiliate parameters
  productUrl.searchParams.set('matt_word', username);
  productUrl.searchParams.set('matt_tool', toolId);

  return productUrl.toString();
}

function convertAmazon(originalUrl) {
  const tag = process.env.AMAZON_TAG;

  if (!tag) {
    throw new Error('Tag da Amazon nao configurada.');
  }

  const url = new URL(originalUrl);

  // Remove all known affiliate/tracking params (our old tag + other affiliates' params)
  for (const param of AMAZON_AFFILIATE_PARAMS) {
    url.searchParams.delete(param);
  }
  url.hash = '';

  // Add our affiliate tag
  url.searchParams.set('tag', tag);

  return url.toString();
}
