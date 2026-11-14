import {
  atualizarLote, buscar, contar, desativar, estatisticas, lerLote, listarLotes, porIds, salvarLote, salvarQuestoes, sortear,
} from '../services/bancoQuestoes.js';
import { MODELO, autorizado, getCliente, mensagemErro, pedidoQuestoes } from './estudosIaHandler.js';

/**
 * Banco de questões compartilhado do módulo de Estudos.
 *
 * POST /api/estudos-banco { acao, ...dados }
 *  contar | buscar      questões de um tópico (sem custo de IA)
 *  simulado             sorteio por disciplina para montar um simulado
 *  porIds               questões pelo id (correção de simulados antigos)
 *  importar             adiciona questões próprias (JSON)
 *  reportar             tira do banco uma questão com erro
 *  estatisticas         total por disciplina
 *  lote-criar           gera questões para vários tópicos de uma vez pela Batch API (metade do preço)
 *  lote-status | lotes  acompanha os lotes e importa o resultado quando terminam
 */

const LIMITE_TOPICOS_LOTE = 400;

const criteriosTopico = (b) => {
  const caminho = Array.isArray(b.caminho) ? b.caminho.map(String) : [];
  return {
    disciplina: b.disciplina,
    assunto: caminho.at(-1) || '',
    contexto: caminho.slice(0, -1).join(' '),
    estilo: b.estilo,
    excluir: Array.isArray(b.excluir) ? b.excluir : [],
  };
};

const acoes = {
  async contar(b) {
    return { total: await contar(criteriosTopico(b)) };
  },

  async buscar(b) {
    return { questoes: await buscar({ ...criteriosTopico(b), limite: b.quantidade }) };
  },

  async simulado(b) {
    const itens = (Array.isArray(b.itens) ? b.itens : []).slice(0, 40);
    if (!itens.length) throw new ErroUso('Escolha ao menos uma disciplina.');
    const resultado = [];
    for (const it of itens) {
      const questoes = await sortear({ disciplina: it.disciplina, estilo: b.estilo, quantidade: it.quantidade, evitar: b.evitar || [] });
      resultado.push({ disciplinaId: it.disciplinaId, disciplina: it.disciplina, pedidas: Number(it.quantidade) || 0, questoes });
    }
    return { itens: resultado };
  },

  async porIds(b) {
    return { questoes: await porIds(Array.isArray(b.ids) ? b.ids : []) };
  },

  async importar(b) {
    const lista = Array.isArray(b.questoes) ? b.questoes.slice(0, 2000) : [];
    if (!lista.length) throw new ErroUso('Nenhuma questão para importar.');
    const { ids, novas } = await salvarQuestoes(lista, { disciplina: b.disciplina, assunto: b.assunto, banca: b.banca, origem: b.origem || 'importada' });
    return { ids, novas, invalidas: ids.filter((id) => id === null).length };
  },

  async reportar(b) {
    if (!b.id) throw new ErroUso('Informe a questão.');
    await desativar(b.id);
    return { ok: true };
  },

  async estatisticas() {
    return estatisticas();
  },

  async 'lote-criar'(b) {
    const itens = (Array.isArray(b.itens) ? b.itens : [])
      .filter((it) => it?.disciplina && Array.isArray(it.caminho) && it.caminho.length)
      .slice(0, LIMITE_TOPICOS_LOTE);
    if (!itens.length) throw new ErroUso('Escolha ao menos um tópico.');
    const quantidade = Math.min(20, Math.max(1, Number(b.quantidade) || 10));
    const estilo = b.estilo === 'certo_errado' ? 'certo_errado' : 'multipla';

    const requests = itens.map((it, i) => {
      // eslint-disable-next-line no-unused-vars
      const { validar, ...params } = pedidoQuestoes({ ...it, concurso: b.concurso, quantidade, estilo, dificuldade: b.dificuldade });
      // Batch API não aceita streaming nem fallbacks; o restante é igual ao pedido normal
      return { custom_id: `t${i}`, params: { model: MODELO, ...params, output_config: { effort: 'medium', ...params.output_config } } };
    });
    const lote = await getCliente().messages.batches.create({ requests });
    await salvarLote({
      id: lote.id,
      status: lote.processing_status,
      quantidade,
      estilo,
      itens: itens.map((it) => ({ disciplina: it.disciplina, assunto: it.caminho.join(' › '), banca: b.concurso?.banca || '' })),
    });
    return { id: lote.id, status: lote.processing_status, topicos: itens.length, questoes: itens.length * quantidade };
  },

  async 'lote-status'(b) {
    const registro = await lerLote(b.id);
    if (!registro) throw new ErroUso('Lote não encontrado.');
    if (registro.importado) return registro;
    const lote = await getCliente().messages.batches.retrieve(registro.id);
    if (lote.processing_status !== 'ended') {
      await atualizarLote(registro.id, { status: lote.processing_status, resumo: lote.request_counts });
      return { ...registro, status: lote.processing_status, resumo: lote.request_counts };
    }
    // Terminou: lê os resultados e grava as questões no banco
    let importadas = 0;
    let falhas = 0;
    const { validar } = pedidoQuestoes({ caminho: ['x'], estilo: registro.estilo });
    for await (const r of await getCliente().messages.batches.results(registro.id)) {
      const item = registro.itens[Number(r.custom_id.slice(1))];
      if (!item || r.result.type !== 'succeeded' || r.result.message.stop_reason !== 'end_turn') {
        falhas++;
        continue;
      }
      try {
        const texto = r.result.message.content.filter((c) => c.type === 'text').map((c) => c.text).join('');
        const { questoes } = validar(JSON.parse(texto));
        const { novas } = await salvarQuestoes(questoes, { ...item, origem: 'ia-lote' });
        importadas += novas;
      } catch {
        falhas++;
      }
    }
    const resumo = { ...lote.request_counts, importadas, falhas };
    await atualizarLote(registro.id, { status: 'ended', importado: true, resumo });
    return { ...registro, status: 'ended', importado: true, resumo };
  },

  async lotes() {
    return { lotes: await listarLotes() };
  },
};

class ErroUso extends Error {}

export default async function estudosBancoHandler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido.' });

  const ok = autorizado(req);
  if (ok === null) return res.status(503).json({ error: 'Defina ESTUDOS_PASSWORD (ou ADMIN_PASSWORD) no servidor.' });
  if (!ok) return res.status(401).json({ error: 'Senha da IA incorreta.' });

  const corpo = req.body || {};
  const acao = acoes[corpo.acao];
  if (!acao) return res.status(400).json({ error: 'Ação inválida.' });

  try {
    return res.status(200).json(await acao(corpo));
  } catch (err) {
    if (err instanceof ErroUso) return res.status(400).json({ error: err.message });
    console.error('estudos-banco:', err);
    const ia = corpo.acao.startsWith('lote');
    return res.status(500).json({ error: ia ? mensagemErro(err) : `Banco de questões indisponível: ${err.message}` });
  }
}
