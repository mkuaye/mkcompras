import { useEffect, useMemo } from 'react'
import { NavLink, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { useConcurso, useEstudosStore, diaKey } from '../store/estudosStore'
import { useTimer, formatRelogio } from '../components/Estudos/useTimer'
import { cx } from '../components/Estudos/ui'
import Painel from '../components/Estudos/paginas/Painel'
import Concursos from '../components/Estudos/paginas/Concursos'
import Edital from '../components/Estudos/paginas/Edital'
import Planejamento from '../components/Estudos/paginas/Planejamento'
import Cronometro from '../components/Estudos/paginas/Cronometro'
import Revisoes from '../components/Estudos/paginas/Revisoes'
import Questoes from '../components/Estudos/paginas/Questoes'
import Simulados from '../components/Estudos/paginas/Simulados'
import Flashcards from '../components/Estudos/paginas/Flashcards'
import Caderno from '../components/Estudos/paginas/Caderno'
import Estatisticas from '../components/Estudos/paginas/Estatisticas'
import Dados from '../components/Estudos/paginas/Dados'
import Conteudo from '../components/Estudos/paginas/Conteudo'
import BancoQuestoes from '../components/Estudos/paginas/BancoQuestoes'
import { ModalConfigIA } from '../components/Estudos/sala/comum'

const SECOES = [
  {
    grupo: 'Visão geral',
    itens: [
      { to: '', label: 'Painel', icone: '◧', Componente: Painel },
      { to: 'estatisticas', label: 'Estatísticas', icone: '▤', Componente: Estatisticas },
    ],
  },
  {
    grupo: 'Organização',
    itens: [
      { to: 'edital', label: 'Edital verticalizado', icone: '☰', Componente: Edital },
      { to: 'planejamento', label: 'Ciclo & semana', icone: '↻', Componente: Planejamento },
    ],
  },
  {
    grupo: 'Estudo',
    itens: [
      { to: 'conteudo', label: 'Conteúdo', icone: '✦', Componente: Conteudo },
      { to: 'cronometro', label: 'Cronômetro', icone: '◷', Componente: Cronometro },
      { to: 'revisoes', label: 'Revisões', icone: '⟲', Componente: Revisoes, badge: 'revisoes' },
      { to: 'flashcards', label: 'Flashcards', icone: '▣', Componente: Flashcards, badge: 'flashcards' },
      { to: 'caderno', label: 'Caderno', icone: '✎', Componente: Caderno },
    ],
  },
  {
    grupo: 'Desempenho',
    itens: [
      { to: 'questoes', label: 'Questões', icone: '✓', Componente: Questoes },
      { to: 'simulados', label: 'Simulados', icone: '◎', Componente: Simulados },
      { to: 'banco', label: 'Banco de questões', icone: '▥', Componente: BancoQuestoes },
    ],
  },
  {
    grupo: 'Configuração',
    itens: [
      { to: 'concursos', label: 'Concursos', icone: '⚑', Componente: Concursos },
      { to: 'dados', label: 'Backup', icone: '⇅', Componente: Dados },
    ],
  },
]

const TODAS = SECOES.flatMap((s) => s.itens)

function SeletorConcurso() {
  const { concursos, concursoAtivoId, setConcursoAtivo } = useEstudosStore()
  const { concurso } = useConcurso()
  const navigate = useNavigate()
  const ativos = concursos.filter((c) => !c.arquivado || c.id === concursoAtivoId)
  const diasProva = concurso?.dataProva ? Math.ceil((new Date(`${concurso.dataProva}T00:00`) - new Date(`${diaKey()}T00:00`)) / 86400000) : null

  return (
    <div className="bg-surface border border-border rounded-2xl p-3">
      <div className="text-[10px] font-semibold uppercase tracking-widest text-muted mb-1.5 px-1">Concurso ativo</div>
      <select
        value={concursoAtivoId || ''}
        onChange={(e) => (e.target.value === '__novo' ? navigate('/estudos/concursos?novo=1') : setConcursoAtivo(e.target.value))}
        className="w-full bg-bg border border-border rounded-xl px-3 py-2 text-sm font-semibold outline-none focus:border-accent"
      >
        {ativos.map((c) => (
          <option key={c.id} value={c.id}>
            {c.nome}
          </option>
        ))}
        <option value="__novo">+ Novo concurso</option>
      </select>
      {concurso && (concurso.banca || diasProva !== null) && (
        <div className="flex justify-between text-[11px] text-muted mt-2 px-1">
          <span className="truncate">{[concurso.banca, concurso.cargo].filter(Boolean).join(' · ')}</span>
          {diasProva !== null && (
            <span className={cx('font-semibold whitespace-nowrap', diasProva <= 30 ? 'text-error' : 'text-accent')}>
              {diasProva > 0 ? `${diasProva} dias` : diasProva === 0 ? 'Prova hoje!' : 'Prova realizada'}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

function TimerFlutuante() {
  const { timer, rodando, segundos, atingiuMeta } = useTimer()
  const { disciplinaPorId } = useConcurso()
  const { timerPausar, timerIniciar } = useEstudosStore()
  const location = useLocation()
  const navigate = useNavigate()

  if (!segundos || location.pathname.startsWith('/estudos/cronometro')) return null
  const d = disciplinaPorId[timer.disciplinaId]
  // Na sala de estudo o cronômetro já aparece no painel lateral (no desktop)
  const naSala = /^\/estudos\/conteudo\/[^/]+/.test(location.pathname)

  return (
    <div className={cx('fixed bottom-4 right-4 z-40 bg-surface border border-border rounded-2xl shadow-2xl px-4 py-3 flex items-center gap-3', naSala && 'lg:hidden')}>
      <button onClick={() => navigate('/estudos/cronometro')} className="text-left">
        <div className="text-[10px] text-muted uppercase tracking-widest truncate max-w-[140px]">{d?.nome || 'Estudo'}</div>
        <div className={cx('font-syne text-xl font-black tabular-nums', atingiuMeta && 'text-success')}>{formatRelogio(segundos)}</div>
      </button>
      <button
        onClick={rodando ? timerPausar : timerIniciar}
        className="w-9 h-9 rounded-full border border-border flex items-center justify-center hover:bg-bg text-sm"
        aria-label={rodando ? 'Pausar' : 'Continuar'}
      >
        {rodando ? '❚❚' : '▶'}
      </button>
    </div>
  )
}

export default function EstudosPage() {
  const { concursos } = useEstudosStore()
  const { revisoes, flashcards } = useConcurso()
  const location = useLocation()

  // Página oculta: fora dos buscadores e com título próprio
  useEffect(() => {
    const tituloAnterior = document.title
    document.title = 'Estudos — Concursos Públicos'
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex, nofollow'
    document.head.appendChild(meta)
    return () => {
      document.title = tituloAnterior
      meta.remove()
    }
  }, [])

  const badges = useMemo(() => {
    const hoje = diaKey()
    return {
      revisoes: revisoes.filter((r) => !r.feita && r.dataPrevista <= hoje).length,
      flashcards: flashcards.filter((f) => (f.proximaRevisao || hoje) <= hoje).length,
    }
  }, [revisoes, flashcards])

  const semConcurso = concursos.length === 0
  if (semConcurso && !location.pathname.startsWith('/estudos/concursos') && !location.pathname.startsWith('/estudos/dados')) {
    return <Navigate to="/estudos/concursos?novo=1" replace />
  }

  const linkCls = ({ isActive }) =>
    cx(
      'flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition whitespace-nowrap',
      isActive ? 'bg-surface text-text border border-border' : 'text-muted hover:text-text border border-transparent'
    )

  const renderLink = (item) => (
    <NavLink key={item.to} to={item.to ? `/estudos/${item.to}` : '/estudos'} end={!item.to} className={linkCls}>
      <span className="w-4 text-center opacity-80">{item.icone}</span>
      <span className="flex-1">{item.label}</span>
      {item.badge && badges[item.badge] > 0 && (
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-accent text-white">{badges[item.badge]}</span>
      )}
    </NavLink>
  )

  return (
    <div className="w-full max-w-7xl self-stretch px-4 sm:px-5 py-6 md:py-10 flex flex-col md:flex-row gap-6">
      <aside className="md:w-60 flex-shrink-0 flex flex-col gap-4 md:sticky md:top-6 md:self-start">
        {!semConcurso && <SeletorConcurso />}
        {/* Mobile: navegação horizontal */}
        <nav className="md:hidden flex gap-1 overflow-x-auto pb-1 -mx-1 px-1">{TODAS.map(renderLink)}</nav>
        {/* Desktop: navegação agrupada */}
        <nav className="hidden md:flex flex-col gap-4">
          {SECOES.map((s) => (
            <div key={s.grupo}>
              <div className="text-[10px] font-semibold uppercase tracking-widest text-muted px-3 mb-1">{s.grupo}</div>
              <div className="flex flex-col gap-0.5">{s.itens.map(renderLink)}</div>
            </div>
          ))}
        </nav>
      </aside>

      <section className="flex-1 min-w-0">
        <Routes>
          {TODAS.map(({ to, Componente }) =>
            to ? <Route key={to} path={`${to}/*`} element={<Componente />} /> : <Route key="index" index element={<Componente />} />
          )}
          <Route path="*" element={<Navigate to="/estudos" replace />} />
        </Routes>
      </section>

      <TimerFlutuante />
      <ModalConfigIA />
    </div>
  )
}
