import Anthropic from '@anthropic-ai/sdk';
import { salvarQuestoes } from '../services/bancoQuestoes.js';

/**
 * IA do módulo de Estudos: gera aulas, questões e flashcards e tira dúvidas.
 *
 * POST /api/estudos-ia  { acao: 'aula' | 'duvida' | 'questoes' | 'flashcards', ...dados }
 *  - 'aula' e 'duvida' respondem em streaming (NDJSON: {t} por trecho, {fim} ou {erro} no final)
 *  - 'questoes' e 'flashcards' respondem JSON
 *
 * Variáveis de ambiente:
 *  - ANTHROPIC_API_KEY                 chave da API da Anthropic
 *  - ESTUDOS_PASSWORD (ou ADMIN_PASSWORD) senha exigida no header Authorization: Bearer <senha>
 */

export const MODELO = 'claude-opus-5-5';
const BETAS = ['server-side-fallback-2026-07-01'];
const LIMITE_TEXTO = 80000; // caracteres de material/aula aceitos como contexto

let cliente = null;
export const getCliente = () => (cliente ??= new Anthropic());

export const SISTEMA =`Você é um professor brasileiro especialista em preparação para concursos públicos, e escreve material de estudo para um aluno que vai estudar exclusivamente por ele.

- Escreva em português do Brasil, com linguagem clara e didática, indo direto ao que cai em prova.
- Seja preciso: baseie-se na legislação vigente, na doutrina majoritária e na jurisprudência consolidada (STF/STJ e súmulas) quando a matéria for jurídica, citando artigos, leis e súmulas pelo número.
- Quando houver divergência doutrinária, mudança legislativa recente ou um dado de que você não tenha certeza (número de artigo, prazo, valor), diga isso claramente e oriente o aluno a conferir na fonte oficial. Nunca invente dispositivos, números ou julgados.
- Adapte exemplos e ênfase ao estilo da banca e ao cargo informados.`;

function contexto({ concurso = {}, disciplina, caminho = [], subtopicos = [] }) {
  const linhas = [];
  if (concurso.nome) linhas.push(`Concurso: ${concurso.nome}`);
  if (concurso.orgao) linhas.push(`Órgão: ${concurso.orgao}`);
  if (concurso.cargo) linhas.push(`Cargo: ${concurso.cargo}`);
  if (concurso.banca) linhas.push(`Banca: ${concurso.banca}`);
  if (disciplina) linhas.push(`Disciplina: ${disciplina}`);
  if (caminho.length) linhas.push(`Tópico do edital: ${caminho.join(' › ')}`);
  if (subtopicos.length) linhas.push(`Subtópicos previstos no edital:\n${subtopicos.map((s) => `- ${s}`).join('\n')}`);
  return linhas.join('\n');
}

const texto = (v, max = LIMITE_TEXTO) => (typeof v === 'string' ? v.slice(0, max) : '');
const lista = (v, max = 50) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string').slice(0, max) : []);

/* ───────────── Montagem dos pedidos ───────────── */

function pedidoAula(b) {
  const completa = b.profundidade === 'completa';
  const material = texto(b.material);
  const prompt = `${contexto(b)}

Escreva a aula deste tópico para o aluno estudar sem precisar de outra fonte.

${completa
    ? 'Profundidade: aula completa e aprofundada (cerca de 3.500 a 5.000 palavras), cobrindo todos os subpontos, exceções e detalhes que as bancas cobram.'
    : 'Profundidade: aula essencial (cerca de 1.200 a 1.800 palavras), focada no que mais cai.'}

Formato em Markdown, começando direto pela seção "## Visão geral" (sem título de nível 1):
- "## Visão geral": o que é o assunto e por que importa na prova.
- Desenvolvimento em seções "##" e "###", com explicações, exemplos práticos e base legal. Use tabelas comparativas quando ajudarem.
- "## Como a banca cobra": padrões de cobrança${b.concurso?.banca ? ` da ${b.concurso.banca}` : ''}.
- "## Pegadinhas frequentes".
- "## Resumo para revisão": lista objetiva com os pontos-chave.
- "## Para memorizar": mnemônicos, quadros ou esquemas curtos.
Não inclua questões; elas são geradas à parte.${material ? `

Use o material do aluno abaixo como base principal, organizando-o e completando o que faltar:
<material>
${material}
</material>` : ''}`;

  return {
    max_tokens: completa ? 64000 : 32000,
    system: SISTEMA,
    messages: [{ role: 'user', content: prompt }],
  };
}

function pedidoDuvida(b) {
  const aula = texto(b.aula);
  const historico = (Array.isArray(b.historico) ? b.historico : [])
    .slice(-8)
    .flatMap((h) => [
      { role: 'user', content: texto(h?.pergunta, 4000) },
      { role: 'assistant', content: texto(h?.resposta, 12000) },
    ])
    .filter((m) => m.content);
  const pergunta = texto(b.pergunta, 4000);

  const system = [
    {
      type: 'text',
      text: `${SISTEMA}

Agora você é o tutor do aluno neste tópico e responde às dúvidas dele. Responda de forma direta e didática, em Markdown, com exemplos quando ajudarem. Se a dúvida fugir do tópico, responda mesmo assim, de forma breve.

${contexto(b)}`,
    },
  ];
  if (aula) {
    system.push({
      type: 'text',
      text: `Aula que o aluno está estudando:\n<aula>\n${aula}\n</aula>`,
      cache_control: { type: 'ephemeral' },
    });
  }

  return {
    max_tokens: 16000,
    system,
    messages: [...historico, { role: 'user', content: pergunta }],
  };
}

const SCHEMA_QUESTOES = {
  type: 'object',
  properties: {
    questoes: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          enunciado: { type: 'string' },
          alternativas: { type: 'array', items: { type: 'string' } },
          correta: { type: 'integer' },
          explicacao: { type: 'string' },
          dificuldade: { type: 'string', enum: ['facil', 'media', 'dificil'] },
        },
        required: ['enunciado', 'alternativas', 'correta', 'explicacao', 'dificuldade'],
        additionalProperties: false,
      },
    },
  },
  required: ['questoes'],
  additionalProperties: false,
};

export function pedidoQuestoes(b) {
  const qtd = Math.min(20, Math.max(1, Number(b.quantidade) || 10));
  const certoErrado = b.estilo === 'certo_errado';
  const dificuldade = { facil: 'fáceis', media: 'de dificuldade média', dificil: 'difíceis' }[b.dificuldade];
  const aula = texto(b.aula);
  const evitar = lista(b.evitar, 60).map((e) => e.slice(0, 200));

  const prompt = `${contexto(b)}

Crie ${qtd} questões inéditas sobre este tópico, no estilo da banca${b.concurso?.banca ? ` ${b.concurso.banca}` : ''}, ${dificuldade ? `todas ${dificuldade}` : 'misturando fáceis, médias e difíceis'}.

${certoErrado
    ? 'Formato certo/errado: o enunciado é uma afirmação para o aluno julgar, e "alternativas" é exatamente ["Certo", "Errado"] ("correta" = 0 para Certo, 1 para Errado). Equilibre afirmações certas e erradas.'
    : 'Formato múltipla escolha: 5 alternativas (sem letras no início do texto), exatamente uma correta; "correta" é o índice (0 a 4) da alternativa certa. Varie a posição da correta.'}

Em "explicacao", explique por que a resposta está certa e, quando for o caso, por que as outras estão erradas, citando a base legal ou doutrinária. Cubra aspectos diferentes do tópico e use as pegadinhas típicas da banca.${aula ? `

Baseie-se principalmente nesta aula que o aluno estudou:
<aula>
${aula}
</aula>` : ''}${evitar.length ? `

Não repita estas questões que o aluno já tem:
${evitar.map((e) => `- ${e}`).join('\n')}` : ''}`;

  return {
    max_tokens: 32000,
    system: SISTEMA,
    messages: [{ role: 'user', content: prompt }],
    output_config: { format: { type: 'json_schema', schema: SCHEMA_QUESTOES } },
    validar: (json) => {
      const questoes = (json.questoes || []).filter(
        (q) => q.enunciado && Array.isArray(q.alternativas) && q.alternativas.length >= 2 && q.correta >= 0 && q.correta < q.alternativas.length
      );
      return { questoes: questoes.map((q) => ({ ...q, estilo: certoErrado ? 'certo_errado' : 'multipla' })) };
    },
  };
}

const SCHEMA_FLASHCARDS = {
  type: 'object',
  properties: {
    cards: {
      type: 'array',
      items: {
        type: 'object',
        properties: { frente: { type: 'string' }, verso: { type: 'string' } },
        required: ['frente', 'verso'],
        additionalProperties: false,
      },
    },
  },
  required: ['cards'],
  additionalProperties: false,
};

function pedidoFlashcards(b) {
  const qtd = Math.min(30, Math.max(1, Number(b.quantidade) || 12));
  const aula = texto(b.aula);
  const evitar = lista(b.evitar, 80).map((e) => e.slice(0, 160));
  const prompt = `${contexto(b)}

Crie ${qtd} flashcards para memorização deste tópico: conceitos, prazos, exceções, requisitos, classificações e pegadinhas que mais caem. A frente é uma pergunta curta e específica; o verso é a resposta objetiva (até 3 linhas), citando a base legal quando houver.${aula ? `

Use como base esta aula:
<aula>
${aula}
</aula>` : ''}${evitar.length ? `

Não repita estes cartões que o aluno já tem:
${evitar.map((e) => `- ${e}`).join('\n')}` : ''}`;

  return {
    max_tokens: 16000,
    system: SISTEMA,
    messages: [{ role: 'user', content: prompt }],
    output_config: { format: { type: 'json_schema', schema: SCHEMA_FLASHCARDS } },
    validar: (json) => ({ cards: (json.cards || []).filter((c) => c.frente && c.verso) }),
  };
}

const ACOES = {
  aula: { montar: pedidoAula, stream: true },
  duvida: { montar: pedidoDuvida, stream: true },
  questoes: { montar: pedidoQuestoes },
  flashcards: { montar: pedidoFlashcards },
};

/* ───────────── Chamada à API ───────────── */

async function gerar({ max_tokens, system, messages, output_config = {} }, aoTexto) {
  const stream = getCliente().beta.messages.stream({
    model: MODELO,
    max_tokens,
    betas: BETAS,
    fallbacks: 'default',
    output_config: { effort: 'medium', ...output_config },
    system,
    messages,
  });
  if (aoTexto) stream.on('text', aoTexto);
  const final = await stream.finalMessage();
  if (final.stop_reason === 'refusal') throw new Error('A IA recusou este pedido. Tente reformular.');
  if (final.stop_reason === 'max_tokens') throw new Error('A resposta ficou longa demais e foi cortada. Tente a versão mais curta.');
  return final;
}

export function mensagemErro(err) {
  if (err instanceof Anthropic.AuthenticationError) return 'Chave ANTHROPIC_API_KEY inválida ou ausente no servidor.';
  if (err instanceof Anthropic.RateLimitError) return 'Limite de uso da IA atingido. Tente de novo em instantes.';
  if (err instanceof Anthropic.APIError) return `Erro da IA (${err.status ?? 'rede'}): ${err.message}`;
  return err?.message || 'Falha ao gerar o conteúdo.';
}

export function autorizado(req) {
  const senha = process.env.ESTUDOS_PASSWORD || process.env.ADMIN_PASSWORD;
  if (!senha) return null;
  const auth = req.headers['authorization'] || req.headers['Authorization'] || '';
  return auth === `Bearer ${senha}`;
}

export default async function estudosIaHandler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido.' });

  const ok = autorizado(req);
  if (ok === null) return res.status(503).json({ error: 'Defina ESTUDOS_PASSWORD (ou ADMIN_PASSWORD) no servidor para liberar a IA.' });
  if (!ok) return res.status(401).json({ error: 'Senha da IA incorreta.' });

  const corpo = req.body || {};
  const acao = ACOES[corpo.acao];
  if (!acao) return res.status(400).json({ error: 'Ação inválida.' });
  if (!corpo.caminho?.length && corpo.acao !== 'duvida') return res.status(400).json({ error: 'Informe o tópico.' });
  if (corpo.acao === 'duvida' && !texto(corpo.pergunta).trim()) return res.status(400).json({ error: 'Escreva a pergunta.' });

  const pedido = acao.montar(corpo);

  if (!acao.stream) {
    try {
      const final = await gerar(pedido);
      const blocos = final.content.filter((b) => b.type === 'text');
      let json;
      try {
        json = JSON.parse(blocos.map((b) => b.text).join(''));
      } catch {
        json = JSON.parse(blocos.at(-1)?.text || '{}');
      }
      const resultado = pedido.validar(json);
      // Questões geradas vão para o banco compartilhado, para serem reaproveitadas sem gastar créditos
      if (corpo.acao === 'questoes' && resultado.questoes.length) {
        try {
          const { ids } = await salvarQuestoes(resultado.questoes, {
            disciplina: corpo.disciplina,
            assunto: corpo.caminho.join(' › '),
            banca: corpo.concurso?.banca,
            origem: 'ia',
          });
          resultado.questoes = resultado.questoes.map((q, i) => ({ ...q, bancoId: ids[i] }));
        } catch (err) {
          console.error('banco de questões indisponível:', err.message);
          resultado.aviso = 'As questões não foram salvas no banco (banco de dados indisponível).';
        }
      }
      return res.status(200).json(resultado);
    } catch (err) {
      console.error('estudos-ia:', err);
      return res.status(err instanceof Anthropic.APIError ? 502 : 500).json({ error: mensagemErro(err) });
    }
  }

  res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('X-Accel-Buffering', 'no');
  res.status(200);
  const enviar = (obj) => res.write(`${JSON.stringify(obj)}\n`);
  try {
    await gerar(pedido, (t) => enviar({ t }));
    enviar({ fim: true });
  } catch (err) {
    console.error('estudos-ia:', err);
    enviar({ erro: mensagemErro(err) });
  }
  res.end();
}
