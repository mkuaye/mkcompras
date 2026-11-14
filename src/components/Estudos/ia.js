import { create } from 'zustand'
import { achatarArvore, filhosDe } from '../../store/estudosStore'

const CHAVE = 'mk_estudos_ia'

const lerSenha = () => {
  try {
    return localStorage.getItem(CHAVE) || ''
  } catch {
    return ''
  }
}

/** Senha da IA (guardada só neste navegador) + controle do modal de configuração */
export const useIA = create((set) => ({
  senha: lerSenha(),
  configurando: false,
  setSenha: (senha) => {
    try {
      if (senha) localStorage.setItem(CHAVE, senha)
      else localStorage.removeItem(CHAVE)
    } catch {
      /* navegador sem storage */
    }
    set({ senha, configurando: false })
  },
  abrirConfig: () => set({ configurando: true }),
  fecharConfig: () => set({ configurando: false }),
}))

export class ErroIA extends Error {
  constructor(msg, status) {
    super(msg)
    this.status = status
  }
}

async function requisitar(corpo, signal, url = '/api/estudos-ia') {
  const { senha } = useIA.getState()
  if (!senha) {
    useIA.getState().abrirConfig()
    throw new ErroIA('Configure a senha da IA para continuar.', 401)
  }
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${senha}` },
    body: JSON.stringify(corpo),
    signal,
  })
  if (!resp.ok) {
    let msg = `Erro ${resp.status}`
    try {
      msg = (await resp.json()).error || msg
    } catch {
      /* resposta sem JSON */
    }
    if (resp.status === 401) useIA.getState().abrirConfig()
    throw new ErroIA(msg, resp.status)
  }
  return resp
}

/** Pedido com resposta em streaming; chama onTexto(textoAcumulado) a cada trecho e devolve o texto final */
export async function iaStream(acao, dados, onTexto, signal) {
  const resp = await requisitar({ acao, ...dados }, signal)
  const leitor = resp.body.getReader()
  const dec = new TextDecoder()
  let buffer = ''
  let texto = ''
  let terminou = false
  for (;;) {
    const { value, done } = await leitor.read()
    if (done) break
    buffer += dec.decode(value, { stream: true })
    let i
    while ((i = buffer.indexOf('\n')) >= 0) {
      const linha = buffer.slice(0, i).trim()
      buffer = buffer.slice(i + 1)
      if (!linha) continue
      const msg = JSON.parse(linha)
      if (msg.t) {
        texto += msg.t
        onTexto?.(texto)
      } else if (msg.erro) {
        const e = new ErroIA(msg.erro)
        e.parcial = texto
        throw e
      } else if (msg.fim) terminou = true
    }
  }
  if (!terminou) {
    const e = new ErroIA('A conexão caiu antes de terminar.')
    e.parcial = texto
    throw e
  }
  return texto
}

export async function iaJson(acao, dados, signal) {
  const resp = await requisitar({ acao, ...dados }, signal)
  return resp.json()
}

/** Banco de questões compartilhado (não gasta créditos de IA, exceto 'lote-criar') */
export async function banco(acao, dados = {}, signal) {
  const resp = await requisitar({ acao, ...dados }, signal, '/api/estudos-banco')
  return resp.json()
}

/** Converte uma questão do banco para o formato local de exercício da sala de estudo */
export const exercicioDoBanco = (q, topico) => ({
  bancoId: q.id,
  enunciado: q.enunciado,
  alternativas: q.alternativas,
  correta: q.correta,
  explicacao: q.explicacao,
  dificuldade: q.dificuldade,
  estilo: q.estilo,
  disciplinaId: topico.disciplinaId,
  topicoId: topico.id,
  resposta: null,
  acertou: null,
  origem: 'banco',
})

/** Contexto do tópico enviado à IA: concurso, disciplina, caminho no edital e subtópicos */
export function contextoTopico(topico, { concurso, disciplinaPorId, topicoPorId, topicos }) {
  const caminho = []
  let atual = topico
  while (atual) {
    caminho.unshift(atual.nome)
    atual = atual.parentId ? topicoPorId[atual.parentId] : null
  }
  const filhos = filhosDe(topicos, topico.disciplinaId, topico.id)
  const subtopicos = filhos.length
    ? achatarArvore(topicos, topico.disciplinaId)
        .filter(({ topico: t }) => {
          let p = t.parentId
          while (p) {
            if (p === topico.id) return true
            p = topicoPorId[p]?.parentId
          }
          return false
        })
        .map(({ topico: t, numero }) => `${numero} ${t.nome}`)
        .slice(0, 50)
    : []
  return {
    concurso: concurso ? { nome: concurso.nome, orgao: concurso.orgao, cargo: concurso.cargo, banca: concurso.banca } : {},
    disciplina: disciplinaPorId[topico.disciplinaId]?.nome || '',
    caminho,
    subtopicos,
  }
}

/** Bancas que usam o formato certo/errado */
export const estiloPadrao = (banca = '') => (/cespe|cebraspe/i.test(banca) ? 'certo_errado' : 'multipla')
