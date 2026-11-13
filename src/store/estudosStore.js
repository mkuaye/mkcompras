import { useMemo } from 'react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/* ───────────────────────── Helpers ───────────────────────── */

export const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`

export const CORES = ['#4f8ef7', '#a78bfa', '#34d399', '#f87171', '#fbbf24', '#f472b6', '#22d3ee', '#fb923c', '#a3e635', '#e879f9']

/** Chave de dia local no formato YYYY-MM-DD */
export const diaKey = (d = new Date()) => {
  const x = new Date(d)
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`
}

/** Converte YYYY-MM-DD em Date local (sem deslocamento de fuso) */
export const keyParaData = (key) => {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export const somaDias = (key, n) => {
  const d = keyParaData(key)
  d.setDate(d.getDate() + n)
  return diaKey(d)
}

export const diasEntre = (deKey, ateKey) => Math.round((keyParaData(ateKey) - keyParaData(deKey)) / 86400000)

export const formatMinutos = (min) => {
  const total = Math.round(min || 0)
  const h = Math.floor(total / 60)
  const m = total % 60
  if (!h) return `${m}min`
  return m ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`
}

export const formatDataHora = (iso) =>
  new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })

export const formatDia = (key) =>
  keyParaData(key).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })

export const formatDiaCurto = (key) =>
  keyParaData(key).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })

export const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0)

export const corDesempenho = (p) => (p >= 70 ? 'var(--success)' : p >= 50 ? '#fbbf24' : 'var(--error)')

export const TIPOS_SESSAO = [
  { id: 'teoria', label: 'Teoria' },
  { id: 'questoes', label: 'Questões' },
  { id: 'revisao', label: 'Revisão' },
  { id: 'lei', label: 'Lei seca' },
  { id: 'video', label: 'Videoaula' },
  { id: 'resumo', label: 'Resumo / mapa' },
  { id: 'simulado', label: 'Simulado' },
]

export const STATUS_TOPICO = {
  pendente: { label: 'Não iniciado', cor: 'var(--muted)' },
  estudando: { label: 'Estudando', cor: '#fbbf24' },
  concluido: { label: 'Concluído', cor: 'var(--success)' },
}

export const TIPOS_NOTA = [
  { id: 'resumo', label: 'Resumo', cor: '#4f8ef7' },
  { id: 'erro', label: 'Caderno de erros', cor: '#f87171' },
  { id: 'lei', label: 'Lei seca', cor: '#fbbf24' },
  { id: 'mnemonico', label: 'Mnemônico', cor: '#a78bfa' },
  { id: 'dica', label: 'Dica / pegadinha', cor: '#34d399' },
]

export const DIFICULDADES = [
  { id: 1, label: 'Fácil' },
  { id: 2, label: 'Média' },
  { id: 3, label: 'Difícil' },
]

/** Intervalos (dias) das revisões espaçadas criadas ao concluir um tópico */
export const INTERVALOS_REVISAO = [1, 7, 30, 90]

/** Intervalos (dias) de cada caixa do sistema Leitner dos flashcards */
export const INTERVALOS_LEITNER = [0, 1, 3, 7, 15, 30]

/* ───────────────────────── Árvore de tópicos ───────────────────────── */

export const filhosDe = (topicos, disciplinaId, parentId = null) =>
  topicos.filter((t) => t.disciplinaId === disciplinaId && (t.parentId || null) === parentId)

/** Lista a árvore em profundidade: [{ topico, nivel, numero }] */
export const achatarArvore = (topicos, disciplinaId) => {
  const out = []
  const visita = (parentId, nivel, prefixo) => {
    filhosDe(topicos, disciplinaId, parentId).forEach((t, i) => {
      const numero = prefixo ? `${prefixo}.${i + 1}` : `${i + 1}`
      out.push({ topico: t, nivel, numero })
      visita(t.id, nivel + 1, numero)
    })
  }
  visita(null, 0, '')
  return out
}

export const descendentesDe = (topicos, id) => {
  const ids = []
  const visita = (pid) =>
    topicos.forEach((t) => {
      if (t.parentId === pid) {
        ids.push(t.id)
        visita(t.id)
      }
    })
  visita(id)
  return ids
}

/** Progresso considerando apenas as folhas (tópicos sem subtópicos) */
export const progressoTopicos = (topicos) => {
  const comFilhos = new Set(topicos.map((t) => t.parentId).filter(Boolean))
  const folhas = topicos.filter((t) => !comFilhos.has(t.id))
  const feitas = folhas.filter((t) => t.status === 'concluido').length
  return { feitas, total: folhas.length, pct: pct(feitas, folhas.length) }
}

/**
 * Converte texto colado do edital em estrutura hierárquica.
 * - Linhas iniciando com "#" viram disciplinas (só na importação geral).
 * - Numeração "1.", "1.2", "1.2.3" ou recuo (2 espaços / tab) define o nível.
 */
export const parseEdital = (texto, permitirDisciplinas = false) => {
  const disciplinas = []
  let atual = { nome: null, itens: [] }
  let recuoPorNivel = [] // recuo (em espaços) usado em cada nível, para linhas sem numeração
  texto.split(/\r?\n/).forEach((linhaBruta) => {
    if (!linhaBruta.trim()) return
    if (permitirDisciplinas && linhaBruta.trim().startsWith('#')) {
      if (atual.nome || atual.itens.length) disciplinas.push(atual)
      atual = { nome: linhaBruta.trim().replace(/^#+\s*/, ''), itens: [] }
      recuoPorNivel = []
      return
    }
    const recuo = linhaBruta.match(/^[\t ]*/)[0].replace(/\t/g, '  ').length
    let linha = linhaBruta.trim().replace(/^[-•*–]\s*/, '')
    let nivel
    const num = linha.match(/^(\d+(?:\.\d+)*)[.)]?\s+(.*)$/)
    if (num) {
      nivel = num[1].split('.').length - 1
      linha = num[2]
    } else if (!recuoPorNivel.length) {
      nivel = 0
    } else {
      // Recuo relativo ao item anterior: mais recuado = filho; menos = sobe até o nível compatível
      nivel = recuoPorNivel.length - 1
      if (recuo > recuoPorNivel[nivel]) nivel += 1
      else while (nivel > 0 && recuoPorNivel[nivel] > recuo) nivel--
    }
    recuoPorNivel[nivel] = recuo
    recuoPorNivel.length = nivel + 1
    if (linha) atual.itens.push({ nome: linha.replace(/[;.]$/, ''), nivel })
  })
  if (atual.nome || atual.itens.length) disciplinas.push(atual)
  return disciplinas
}

/* ───────────────────────── Estado inicial ───────────────────────── */

const COLECOES = ['disciplinas', 'topicos', 'sessoes', 'questoes', 'revisoes', 'simulados', 'flashcards', 'notas']

const TIMER_INICIAL = { inicio: null, acumulado: 0, disciplinaId: '', topicoId: '', tipo: 'teoria', metaMin: 50 }

const estadoInicial = () => ({
  concursos: [],
  concursoAtivoId: null,
  ...Object.fromEntries(COLECOES.map((c) => [c, []])),
  timer: { ...TIMER_INICIAL },
})

export const novoConcurso = (dados = {}) => ({
  id: uid(),
  nome: 'Novo concurso',
  orgao: '',
  banca: '',
  cargo: '',
  dataProva: '',
  metaHorasSemana: 20,
  metaQuestoesSemana: 200,
  cor: CORES[0],
  arquivado: false,
  criadoEm: new Date().toISOString(),
  ciclo: { itens: [], rodadaInicio: new Date().toISOString(), rodadas: 0 },
  semana: [[], [], [], [], [], [], []], // dom..sáb → [{ id, disciplinaId, minutos }]
  ...dados,
})

/* ───────────────────────── Store ───────────────────────── */

export const useEstudosStore = create(
  persist(
    (set, get) => ({
      ...estadoInicial(),

      /* Genéricos — preenchem concursoId com o concurso ativo */
      add: (colecao, item) => {
        const novo = { id: uid(), criadoEm: new Date().toISOString(), concursoId: get().concursoAtivoId, ...item }
        set((s) => ({ [colecao]: [...s[colecao], novo] }))
        return novo
      },
      addMuitos: (colecao, itens) => {
        const novos = itens.map((item) => ({ id: uid(), criadoEm: new Date().toISOString(), concursoId: get().concursoAtivoId, ...item }))
        set((s) => ({ [colecao]: [...s[colecao], ...novos] }))
        return novos
      },
      update: (colecao, id, patch) =>
        set((s) => ({ [colecao]: s[colecao].map((x) => (x.id === id ? { ...x, ...patch } : x)) })),
      remove: (colecao, id) => set((s) => ({ [colecao]: s[colecao].filter((x) => x.id !== id) })),

      /* Concursos */
      addConcurso: (dados) => {
        const c = novoConcurso({ cor: CORES[get().concursos.length % CORES.length], ...dados })
        set((s) => ({ concursos: [...s.concursos, c], concursoAtivoId: c.id }))
        return c
      },
      updateConcurso: (id, patch) =>
        set((s) => ({ concursos: s.concursos.map((c) => (c.id === id ? { ...c, ...patch } : c)) })),
      removeConcurso: (id) =>
        set((s) => {
          const concursos = s.concursos.filter((c) => c.id !== id)
          const limpo = Object.fromEntries(COLECOES.map((col) => [col, s[col].filter((x) => x.concursoId !== id)]))
          return {
            ...limpo,
            concursos,
            concursoAtivoId: s.concursoAtivoId === id ? concursos[0]?.id || null : s.concursoAtivoId,
            timer: s.concursoAtivoId === id ? { ...TIMER_INICIAL } : s.timer,
          }
        }),
      setConcursoAtivo: (id) => set({ concursoAtivoId: id, timer: { ...TIMER_INICIAL } }),

      /* Disciplinas */
      addDisciplina: (dados) => {
        const qtd = get().disciplinas.filter((d) => d.concursoId === get().concursoAtivoId).length
        return get().add('disciplinas', { nome: '', peso: 1, dificuldade: 2, qtdQuestoes: 0, cor: CORES[qtd % CORES.length], ...dados })
      },
      removeDisciplina: (id) =>
        set((s) => ({
          disciplinas: s.disciplinas.filter((d) => d.id !== id),
          ...Object.fromEntries(
            COLECOES.filter((c) => c !== 'disciplinas' && c !== 'simulados').map((c) => [c, s[c].filter((x) => x.disciplinaId !== id)])
          ),
          concursos: s.concursos.map((c) => ({
            ...c,
            ciclo: { ...c.ciclo, itens: c.ciclo.itens.filter((i) => i.disciplinaId !== id) },
            semana: c.semana.map((dia) => dia.filter((i) => i.disciplinaId !== id)),
          })),
          timer: s.timer.disciplinaId === id ? { ...TIMER_INICIAL } : s.timer,
        })),

      /* Tópicos */
      addTopico: (disciplinaId, nome, parentId = null) =>
        get().add('topicos', { disciplinaId, parentId, nome, status: 'pendente', notas: '' }),

      /** Importa itens [{ nome, nivel }] respeitando a hierarquia */
      importarTopicos: (disciplinaId, itens, parentRaiz = null) => {
        const pilha = [] // pilha[nivel] = id do último tópico naquele nível
        const novos = itens.map((it) => {
          const nivel = Math.min(it.nivel, pilha.length)
          const parentId = nivel === 0 ? parentRaiz : pilha[nivel - 1]
          const id = uid()
          pilha[nivel] = id
          pilha.length = nivel + 1
          return {
            id, disciplinaId, parentId, nome: it.nome, status: 'pendente', notas: '',
            concursoId: get().concursoAtivoId, criadoEm: new Date().toISOString(),
          }
        })
        set((s) => ({ topicos: [...s.topicos, ...novos] }))
      },

      removeTopico: (id) =>
        set((s) => {
          const ids = new Set([id, ...descendentesDe(s.topicos, id)])
          return {
            topicos: s.topicos.filter((t) => !ids.has(t.id)),
            revisoes: s.revisoes.filter((r) => !ids.has(r.topicoId)),
          }
        }),

      setStatusTopico: (id, status) => {
        get().update('topicos', id, { status, concluidoEm: status === 'concluido' ? new Date().toISOString() : null })
        if (status === 'concluido') get().agendarRevisoes(id)
      },

      /* Revisões espaçadas */
      agendarRevisoes: (topicoId, intervalos = INTERVALOS_REVISAO) => {
        const s = get()
        const topico = s.topicos.find((t) => t.id === topicoId)
        if (!topico) return
        if (s.revisoes.some((r) => r.topicoId === topicoId && !r.feita)) return
        const hoje = diaKey()
        get().addMuitos(
          'revisoes',
          intervalos.map((dias, i) => ({
            topicoId,
            disciplinaId: topico.disciplinaId,
            concursoId: topico.concursoId,
            dataPrevista: somaDias(hoje, dias),
            etapa: i + 1,
            feita: false,
          }))
        )
      },

      /* Flashcards (Leitner) */
      responderFlashcard: (id, resultado) => {
        const card = get().flashcards.find((f) => f.id === id)
        if (!card) return
        const max = INTERVALOS_LEITNER.length - 1
        const caixa = resultado === 'errei' ? 1 : Math.min(max, card.caixa + (resultado === 'facil' ? 2 : 1))
        get().update('flashcards', id, {
          caixa,
          proximaRevisao: somaDias(diaKey(), INTERVALOS_LEITNER[caixa]),
          acertos: (card.acertos || 0) + (resultado === 'errei' ? 0 : 1),
          erros: (card.erros || 0) + (resultado === 'errei' ? 1 : 0),
        })
      },

      /* Cronômetro global (persiste entre páginas e recarregamentos) */
      timerConfig: (patch) => set((s) => ({ timer: { ...s.timer, ...patch } })),
      timerIniciar: () => set((s) => ({ timer: { ...s.timer, inicio: Date.now() } })),
      timerPausar: () =>
        set((s) => (s.timer.inicio ? { timer: { ...s.timer, acumulado: s.timer.acumulado + Date.now() - s.timer.inicio, inicio: null } } : {})),
      timerZerar: () => set((s) => ({ timer: { ...s.timer, inicio: null, acumulado: 0 } })),

      /* Ciclo de estudos */
      completarRodadaCiclo: () => {
        const c = get().concursos.find((x) => x.id === get().concursoAtivoId)
        if (!c) return
        get().updateConcurso(c.id, { ciclo: { ...c.ciclo, rodadas: (c.ciclo.rodadas || 0) + 1, rodadaInicio: new Date().toISOString() } })
      },

      /* Backup */
      exportar: () => {
        const s = get()
        return { versao: 2, exportadoEm: new Date().toISOString(), concursos: s.concursos, concursoAtivoId: s.concursoAtivoId, ...Object.fromEntries(COLECOES.map((c) => [c, s[c]])) }
      },
      importar: (dados) => {
        if (!dados || !Array.isArray(dados.concursos)) throw new Error('Arquivo inválido')
        set({
          ...estadoInicial(),
          concursos: dados.concursos,
          concursoAtivoId: dados.concursoAtivoId || dados.concursos[0]?.id || null,
          ...Object.fromEntries(COLECOES.map((c) => [c, Array.isArray(dados[c]) ? dados[c] : []])),
        })
      },
      resetar: () => set(estadoInicial()),
    }),
    {
      name: 'mk_estudos',
      version: 2,
      // Migra a versão simples anterior (matérias + tópicos planos)
      migrate: (antigo, versao) => {
        if (versao >= 2 || !antigo) return antigo
        const base = estadoInicial()
        if (!antigo.materias?.length) return base
        const concurso = novoConcurso({ nome: 'Meu concurso' })
        const cid = concurso.id
        return {
          ...base,
          concursos: [concurso],
          concursoAtivoId: cid,
          disciplinas: antigo.materias.map((m) => ({ id: m.id, concursoId: cid, nome: m.nome, cor: m.cor, peso: 1, dificuldade: 2, qtdQuestoes: 0 })),
          topicos: antigo.materias.flatMap((m) =>
            m.topicos.map((t) => ({ id: t.id, concursoId: cid, disciplinaId: m.id, parentId: null, nome: t.nome, status: t.feito ? 'concluido' : 'pendente', notas: '' }))
          ),
          sessoes: (antigo.sessoes || []).map((s) => ({ id: s.id, concursoId: cid, disciplinaId: s.materiaId, minutos: s.minutos, data: s.data, tipo: 'teoria' })),
          questoes: (antigo.questoes || []).map((q) => ({ id: q.id, concursoId: cid, disciplinaId: q.materiaId, total: q.total, acertos: q.acertos, data: q.data })),
        }
      },
      partialize: (s) => ({
        concursos: s.concursos,
        concursoAtivoId: s.concursoAtivoId,
        timer: s.timer,
        ...Object.fromEntries(COLECOES.map((c) => [c, s[c]])),
      }),
    }
  )
)

/** Dados já filtrados pelo concurso ativo */
export function useConcurso() {
  const s = useEstudosStore()
  return useMemo(() => {
    const id = s.concursoAtivoId
    const f = (arr) => arr.filter((x) => x.concursoId === id)
    const disciplinas = f(s.disciplinas)
    return {
      concurso: s.concursos.find((c) => c.id === id) || null,
      disciplinas,
      disciplinaPorId: Object.fromEntries(disciplinas.map((d) => [d.id, d])),
      topicos: f(s.topicos),
      topicoPorId: Object.fromEntries(f(s.topicos).map((t) => [t.id, t])),
      sessoes: f(s.sessoes),
      questoes: f(s.questoes),
      revisoes: f(s.revisoes),
      simulados: f(s.simulados),
      flashcards: f(s.flashcards),
      notas: f(s.notas),
    }
  }, [s])
}
