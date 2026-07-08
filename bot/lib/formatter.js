/**
 * lib/formatter.js
 *
 * Formata a mensagem da oferta para o WhatsApp.
 * Usa a sintaxe de formatação do WhatsApp: *negrito*, _itálico_, ~tachado~.
 */

const EMOJI = {
  shopee: '🟠',
  mercadolivre: '🟡',
  amazon: '🟠',
};

const NOME_PLATAFORMA = {
  shopee: 'Shopee',
  mercadolivre: 'Mercado Livre',
  amazon: 'Amazon',
};

function brl(valor) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/**
 * Gera o texto da mensagem a ser enviada no grupo.
 *
 * @param {object} produto      - Produto normalizado
 * @param {string} linkAfiliado - URL de afiliado já convertida
 * @returns {string}
 */
export function formatarMensagem(produto, linkAfiliado) {
  const emoji = EMOJI[produto.plataforma] ?? '🛒';
  const plataforma = NOME_PLATAFORMA[produto.plataforma] ?? produto.plataforma;

  // Linha de preço
  let linhaPraco;
  if (produto.precoOriginal && produto.precoOriginal > produto.preco * 1.05) {
    const pct = Math.round((1 - produto.preco / produto.precoOriginal) * 100);
    linhaPraco = `~${brl(produto.precoOriginal)}~ → *${brl(produto.preco)}* (-${pct}% OFF)`;
  } else {
    linhaPraco = `*${brl(produto.preco)}*`;
  }

  const linhaAvaliacao = produto.avaliacao
    ? `⭐ ${Number(produto.avaliacao).toFixed(1)}\n`
    : '';

  return (
    `${emoji} *${produto.titulo}*\n` +
    `\n` +
    `💸 ${linhaPraco}\n` +
    `${linhaAvaliacao}` +
    `\n` +
    `🔗 ${linkAfiliado}\n` +
    `\n` +
    `_Oferta via ${plataforma} | mkcompras.com.br_`
  );
}
