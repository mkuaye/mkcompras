import { createHash } from 'crypto';
import { join } from 'path';

/**
 * Banco de questões compartilhado (Postgres).
 *
 * - Produção: Postgres via DATABASE_URL (ou POSTGRES_URL), ex.: Neon criado pela Vercel (Storage → Neon).
 * - Desenvolvimento sem DATABASE_URL: Postgres embutido (PGlite) gravado em data/banco-questoes/.
 *
 * Toda questão gerada pela IA é salva aqui; depois ela é reaproveitada sem gastar créditos.
 */

const SCHEMA = [
  `create table if not exists banco_questoes (
    id serial primary key,
    hash text not null unique,
    disciplina text not null,
    assunto text not null,
    disciplina_norm text not null,
    assunto_norm text not null,
    banca text not null default '',
    estilo text not null,
    dificuldade text,
    enunciado text not null,
    alternativas jsonb not null,
    correta integer not null,
    explicacao text not null,
    origem text not null default 'ia',
    ativa boolean not null default true,
    criado_em timestamptz not null default now(),
    assunto_tsv tsvector generated always as (to_tsvector('simple', assunto_norm)) stored
  )`,
  `create index if not exists banco_questoes_disc_idx on banco_questoes (disciplina_norm)`,
  `create index if not exists banco_questoes_assunto_idx on banco_questoes using gin (assunto_tsv)`,
  `create index if not exists banco_questoes_estilo_idx on banco_questoes (estilo, ativa)`,
  `create table if not exists banco_lotes (
    id text primary key,
    criado_em timestamptz not null default now(),
    status text not null,
    itens jsonb not null,
    quantidade integer not null,
    estilo text not null,
    importado boolean not null default false,
    resumo jsonb
  )`,
];

let conexao = null;

/** Devolve uma função query(sql, params) => rows, criando as tabelas na primeira vez */
export function getDb() {
  if (conexao) return conexao;
  conexao = (async () => {
    const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    let query;
    if (url) {
      const { neon } = await import('@neondatabase/serverless');
      const sql = neon(url);
      query = (texto, params = []) => sql.query(texto, params);
    } else {
      if (process.env.VERCEL) throw new Error('Banco de questões sem DATABASE_URL. Crie um Postgres (Neon) em Storage na Vercel.');
      // Nome em variável para o empacotador da Vercel não incluir o PGlite (26 MB, só usado em desenvolvimento)
      const pacote = '@electric-sql/pglite';
      const { PGlite } = await import(pacote);
      const db = new PGlite(process.env.BANCO_LOCAL_DIR || join(process.cwd(), 'data', 'banco-questoes'));
      query = async (texto, params = []) => (await db.query(texto, params)).rows;
    }
    for (const stmt of SCHEMA) await query(stmt);
    return query;
  })().catch((e) => {
    conexao = null;
    throw e;
  });
  return conexao;
}

/* ───────────── Normalização e busca ───────────── */

const STOPWORDS = new Set('a o as os e de da do das dos em no na nos nas para por com sem um uma ao aos ou que se sua seu suas seus lei n art arts'.split(' '));

/** minúsculas, sem acento e sem pontuação */
const semAcento = (texto = '') =>
  String(texto)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

/**
 * Radical simples de uma palavra, para "licitação" = "licitações", "ato" = "atos",
 * "administrativo" = "administrativa". O stemmer do Postgres não unifica bem esses casos.
 */
function radical(p) {
  if (p.length <= 3 || /^\d+$/.test(p)) return p;
  let r = p.replace(/(coes|cao)$/, 'c').replace(/(oes|aos|aes|ao)$/, '');
  if (r.length > 3 && r.endsWith('s')) r = r.slice(0, -1);
  if (r.length > 4 && /[aoe]$/.test(r)) r = r.slice(0, -1);
  return r;
}

/** Texto normalizado: sem acento, sem palavras vazias, cada palavra reduzida ao radical */
export function normalizar(texto = '') {
  return semAcento(texto)
    .split(' ')
    .filter((p) => p && !STOPWORDS.has(p))
    .map(radical)
    .join(' ');
}

// Palavras que não identificam a disciplina ("Noções de Direito Administrativo" = "Direito Administrativo")
const GENERICAS = new Set(
  'nocoes nocao conhecimento conhecimentos geral gerais basico basicos basica basicas especifico especificos especifica especificas fundamento fundamentos introducao elemento elementos legislacao aplicada'
    .split(' ')
    .map(radical)
);

const termos = (texto, ignorar = new Set()) => [...new Set(normalizar(texto).split(' '))].filter((t) => t.length > 1 && !ignorar.has(t) && !/^\d+$/.test(t));

/** Termos que identificam a disciplina, com sinônimos comuns unificados */
const termosDisciplina = (texto) =>
  new Set(
    termos(
      semAcento(texto)
        .replace(/\blingua portuguesa\b/g, 'portugues')
        .replace(/\bportuguesa\b/g, 'portugues')
        .replace(/\binformatica basica\b/g, 'informatica'),
      GENERICAS
    )
  );

/**
 * Duas disciplinas são a mesma se os termos de uma estão contidos nos da outra:
 * "Raciocínio Lógico" = "Raciocínio Lógico-Matemático", mas "Direito Administrativo" ≠ "Direito Constitucional".
 */
function mesmaDisciplina(a, b) {
  if (!a.size || !b.size) return false;
  let comuns = 0;
  a.forEach((t) => b.has(t) && comuns++);
  return comuns > 0 && (comuns === a.size || comuns === b.size);
}

/** Nomes normalizados de disciplina no banco que correspondem à disciplina pedida */
async function disciplinasDoBanco(query, disciplina) {
  const alvo = termosDisciplina(disciplina);
  const linhas = await query(`select distinct disciplina, disciplina_norm from banco_questoes where ativa`);
  return [...new Set(linhas.filter((l) => mesmaDisciplina(alvo, termosDisciplina(l.disciplina))).map((l) => l.disciplina_norm))];
}

/** Assunto: qualquer termo conta; o ranking põe primeiro as que batem mais */
const consultaAssunto = (assunto) => termos(assunto).join(' | ');

const hashQuestao = (q) =>
  createHash('sha1')
    .update(`${normalizar(q.enunciado)}|${(q.alternativas || []).map(normalizar).join('|')}`)
    .digest('hex');

const COLUNAS = 'id, disciplina, assunto, banca, estilo, dificuldade, enunciado, alternativas, correta, explicacao, origem';

/** Valida uma questão vinda da IA ou de importação; devolve null se inválida */
export function validarQuestao(q) {
  if (!q || typeof q.enunciado !== 'string' || !q.enunciado.trim()) return null;
  if (!Array.isArray(q.alternativas) || q.alternativas.length < 2 || q.alternativas.length > 6) return null;
  const alternativas = q.alternativas.map((a) => String(a).trim());
  if (alternativas.some((a) => !a)) return null;
  const correta = Number(q.correta);
  if (!Number.isInteger(correta) || correta < 0 || correta >= alternativas.length) return null;
  const certoErrado = alternativas.length === 2 && /^certo$/i.test(alternativas[0]) && /^errado$/i.test(alternativas[1]);
  return {
    enunciado: q.enunciado.trim(),
    alternativas,
    correta,
    explicacao: String(q.explicacao || '').trim(),
    dificuldade: ['facil', 'media', 'dificil'].includes(q.dificuldade) ? q.dificuldade : null,
    estilo: q.estilo === 'certo_errado' || certoErrado ? 'certo_errado' : 'multipla',
  };
}

/**
 * Salva questões no banco (ignora as repetidas) e devolve os ids na mesma ordem.
 * Cada questão precisa de disciplina e assunto (ou usa os padrões informados).
 */
export async function salvarQuestoes(questoes, padrao = {}) {
  const query = await getDb();
  const linhas = [];
  for (const bruta of questoes) {
    const q = validarQuestao(bruta);
    const disciplina = String(bruta.disciplina || padrao.disciplina || '').trim();
    const assunto = String(bruta.assunto || padrao.assunto || '').trim();
    if (!q || !disciplina || !assunto) {
      linhas.push(null);
      continue;
    }
    linhas.push({
      ...q,
      hash: hashQuestao(q),
      disciplina,
      assunto,
      disciplina_norm: normalizar(disciplina),
      assunto_norm: normalizar(assunto),
      banca: String(bruta.banca || padrao.banca || '').trim(),
      origem: padrao.origem || bruta.origem || 'ia',
    });
  }
  const validas = linhas.filter(Boolean);
  if (!validas.length) return { ids: linhas.map(() => null), novas: 0 };

  const inseridas = await query(
    `insert into banco_questoes (hash, disciplina, assunto, disciplina_norm, assunto_norm, banca, estilo, dificuldade, enunciado, alternativas, correta, explicacao, origem)
     select hash, disciplina, assunto, disciplina_norm, assunto_norm, banca, estilo, dificuldade, enunciado, alternativas, correta, explicacao, origem
     from jsonb_to_recordset($1::jsonb) as x(hash text, disciplina text, assunto text, disciplina_norm text, assunto_norm text, banca text, estilo text,
       dificuldade text, enunciado text, alternativas jsonb, correta integer, explicacao text, origem text)
     on conflict (hash) do nothing
     returning id`,
    [JSON.stringify(validas)]
  );
  const existentes = await query(`select id, hash from banco_questoes where hash = any($1::text[])`, [validas.map((v) => v.hash)]);
  const idPorHash = Object.fromEntries(existentes.map((r) => [r.hash, r.id]));
  return { ids: linhas.map((l) => (l ? idPorHash[l.hash] ?? null : null)), novas: inseridas.length };
}

/**
 * assunto: nome do tópico (ao menos um termo dele precisa aparecer)
 * contexto: caminho completo no edital (só para ordenar pelas mais parecidas)
 */
/**
 * Monta o WHERE (e, se pedido, a expressão de ranking).
 * Devolve null quando nenhuma disciplina do banco corresponde (resultado vazio).
 */
async function filtros(query, { disciplina, assunto, contexto, estilo, excluir = [] }, params, { comRank = false } = {}) {
  const where = ['ativa'];
  const p = (v) => {
    params.push(v);
    return `$${params.length}`;
  };
  if (disciplina) {
    const nomes = await disciplinasDoBanco(query, disciplina);
    if (!nomes.length) return null;
    where.push(`disciplina_norm = any(${p(nomes)}::text[])`);
  }
  if (estilo) where.push(`estilo = ${p(estilo)}`);
  let rank = '0';
  const qa = assunto ? consultaAssunto(assunto) : '';
  if (qa) {
    where.push(`assunto_tsv @@ to_tsquery('simple', ${p(qa)})`);
    if (comRank) rank = `ts_rank(assunto_tsv, to_tsquery('simple', ${p(consultaAssunto(`${contexto || ''} ${assunto}`))}))`;
  }
  const ids = excluir.map(Number).filter(Number.isInteger);
  if (ids.length) where.push(`not (id = any(${p(ids)}::int[]))`);
  return { where: where.join(' and '), rank };
}

/** Quantas questões do banco servem para um tópico (excluindo as que o aluno já tem) */
export async function contar(criterios) {
  const query = await getDb();
  const params = [];
  const f = await filtros(query, criterios, params);
  if (!f) return 0;
  const [r] = await query(`select count(*)::int as total from banco_questoes where ${f.where}`, params);
  return r.total;
}

/** Questões de um tópico, das mais parecidas com o assunto para as menos */
export async function buscar({ limite = 10, ...criterios }) {
  const query = await getDb();
  const params = [];
  const f = await filtros(query, criterios, params, { comRank: true });
  if (!f) return [];
  params.push(Math.min(50, Math.max(1, Number(limite) || 10)));
  return query(`select ${COLUNAS} from banco_questoes where ${f.where} order by ${f.rank} desc, random() limit $${params.length}`, params);
}

/** Sorteio para simulado: por disciplina, priorizando questões que o aluno ainda não viu */
export async function sortear({ disciplina, estilo, quantidade, evitar = [] }) {
  const query = await getDb();
  const params = [];
  const f = await filtros(query, { disciplina, estilo }, params);
  if (!f) return [];
  const { where } = f;
  params.push(evitar.map(Number).filter(Number.isInteger));
  const refEvitar = `$${params.length}`;
  params.push(Math.min(120, Math.max(1, Number(quantidade) || 10)));
  return query(
    `select ${COLUNAS} from banco_questoes where ${where}
     order by (id = any(${refEvitar}::int[])), random() limit $${params.length}`,
    params
  );
}

export async function porIds(ids) {
  const query = await getDb();
  const lista = ids.map(Number).filter(Number.isInteger).slice(0, 500);
  if (!lista.length) return [];
  return query(`select ${COLUNAS} from banco_questoes where id = any($1::int[])`, [lista]);
}

export async function desativar(id) {
  const query = await getDb();
  await query(`update banco_questoes set ativa = false where id = $1`, [Number(id)]);
}

export async function estatisticas() {
  const query = await getDb();
  const porDisciplina = await query(
    `select disciplina, estilo, count(*)::int as total from banco_questoes where ativa group by disciplina, estilo order by total desc limit 200`
  );
  const [t] = await query(`select count(*)::int as total, count(*) filter (where not ativa)::int as reportadas from banco_questoes`);
  return { total: t.total - t.reportadas, reportadas: t.reportadas, porDisciplina };
}

/* ───────────── Lotes (geração em massa pela Batch API) ───────────── */

export async function salvarLote(lote) {
  const query = await getDb();
  await query(`insert into banco_lotes (id, status, itens, quantidade, estilo) values ($1, $2, $3::jsonb, $4, $5)`, [
    lote.id,
    lote.status,
    JSON.stringify(lote.itens),
    lote.quantidade,
    lote.estilo,
  ]);
}

export async function atualizarLote(id, campos) {
  const query = await getDb();
  await query(`update banco_lotes set status = $2, importado = $3, resumo = $4::jsonb where id = $1`, [
    id,
    campos.status,
    !!campos.importado,
    campos.resumo ? JSON.stringify(campos.resumo) : null,
  ]);
}

export async function lerLote(id) {
  const query = await getDb();
  const [l] = await query(`select * from banco_lotes where id = $1`, [id]);
  return l || null;
}

export async function listarLotes() {
  const query = await getDb();
  return query(
    `select id, criado_em, status, quantidade, estilo, importado, resumo, jsonb_array_length(itens)::int as topicos from banco_lotes order by criado_em desc limit 30`
  );
}
