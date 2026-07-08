/**
 * lib/sources/mercadolivre.js
 *
 * Busca ofertas gamer via API pública do Mercado Livre (sem autenticação).
 * Filtra por desconto mínimo nas categorias de games e informática.
 *
 * Endpoint: GET https://api.mercadolibre.com/sites/MLB/search
 */

const ML_BASE = 'https://api.mercadolibre.com';

// Categorias de produtos gamer no Mercado Livre Brasil
const CATEGORIAS = [
  { id: 'MLB1648', nome: 'Videogames' },
  { id: 'MLB1051', nome: 'Computadores e Acessórios' },
];

// Termos de busca rodados em paralelo para cobrir mais produtos
const KEYWORDS_GAMER = [
  'headset gamer',
  'teclado gamer',
  'mouse gamer',
  'cadeira gamer',
  'monitor gamer',
];

const DESCONTO_MINIMO = 15; // % — não busca produtos com menos de 15% off

async function buscarPorCategoria(categoriaId, limit = 20) {
  const params = new URLSearchParams({
    category: categoriaId,
    sort: 'relevance',
    discount: String(DESCONTO_MINIMO),
    limit: String(limit),
  });

  const res = await fetch(`${ML_BASE}/sites/MLB/search?${params}`);
  if (!res.ok) throw new Error(`ML API HTTP ${res.status} (categoria ${categoriaId})`);
  const data = await res.json();
  return data.results ?? [];
}

async function buscarPorKeyword(keyword, limit = 10) {
  const params = new URLSearchParams({
    q: keyword,
    sort: 'relevance',
    discount: String(DESCONTO_MINIMO),
    limit: String(limit),
  });

  const res = await fetch(`${ML_BASE}/sites/MLB/search?${params}`);
  if (!res.ok) throw new Error(`ML API HTTP ${res.status} (keyword: ${keyword})`);
  const data = await res.json();
  return data.results ?? [];
}

function normalizarProduto(p) {
  return {
    id: `ml_${p.id}`,
    plataforma: 'mercadolivre',
    titulo: p.title,
    linkOriginal: p.permalink,
    preco: p.price,
    precoOriginal: p.original_price ?? null,
    desconto: p.discount_percentage ?? null,
    // Substitui thumbnail pequeno pelo maior disponível
    imagem: p.thumbnail?.replace('I.jpg', 'O.jpg') ?? p.thumbnail,
    avaliacao: null,
    loja: p.official_store_name ?? 'Mercado Livre',
  };
}

/**
 * @param {object} opts
 * @param {number} opts.limit - Produtos por fonte (padrão 10)
 * @returns {Promise<Array>}  - Array de produtos normalizados, sem duplicatas
 */
export async function buscarOfertasML({ limit = 10 } = {}) {
  const resultados = await Promise.allSettled([
    ...CATEGORIAS.map((c) => buscarPorCategoria(c.id, limit)),
    ...KEYWORDS_GAMER.map((kw) => buscarPorKeyword(kw, limit)),
  ]);

  // Junta tudo, descarta erros, remove duplicatas por ID
  const todos = resultados
    .filter((r) => r.status === 'fulfilled')
    .flatMap((r) => r.value);

  const unicos = new Map();
  for (const p of todos) {
    if (!unicos.has(p.id) && p.price && p.permalink) {
      unicos.set(p.id, normalizarProduto(p));
    }
  }

  // Ordena por maior desconto
  return [...unicos.values()].sort(
    (a, b) => (b.desconto ?? 0) - (a.desconto ?? 0)
  );
}
