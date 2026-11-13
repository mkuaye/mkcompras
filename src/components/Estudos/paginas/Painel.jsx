import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useConcurso, useEstudosStore, diaKey, diasEntre, somaDias, formatDia, formatMinutos, formatDataHora, keyParaData, pct, progressoTopicos, corDesempenho } from '../../../store/estudosStore'
import { Barra, Botao, Card, CardTitulo, GraficoBarras, PageHeader, Ponto, Vazio } from '../ui'
import { calcularCiclo, DIAS } from './Planejamento'
import { calcularSequencia } from './Estatisticas'
import { notaSimulado } from './Simulados'

const inicioDaSemana = () => {
  const hoje = diaKey()
  const dow = keyParaData(hoje).getDay() // semana começa na segunda
  return somaDias(hoje, -((dow + 6) % 7))
}

export default function Painel() {
  const { concurso, disciplinas, disciplinaPorId, topicos, topicoPorId, sessoes, questoes, revisoes, flashcards, simulados } = useConcurso()
  const { timerConfig } = useEstudosStore()
  const navigate = useNavigate()
  const hoje = diaKey()

  const dados = useMemo(() => {
    const semana = inicioDaSemana()
    const sessHoje = sessoes.filter((s) => diaKey(s.data) === hoje)
    const sessSemana = sessoes.filter((s) => diaKey(s.data) >= semana)
    const qSemana = questoes.filter((q) => diaKey(q.data) >= semana)
    const porDia = Array.from({ length: 7 }, (_, i) => {
      const k = somaDias(semana, i)
      return {
        label: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'][i],
        titulo: formatDia(k),
        valor: sessoes.filter((s) => diaKey(s.data) === k).reduce((a, s) => a + s.minutos, 0),
        destaque: k === hoje,
      }
    })
    return {
      minHoje: sessHoje.reduce((a, s) => a + s.minutos, 0),
      minSemana: sessSemana.reduce((a, s) => a + s.minutos, 0),
      qSemana: qSemana.reduce((a, q) => a + q.total, 0),
      qSemanaAcertos: qSemana.reduce((a, q) => a + q.acertos, 0),
      porDia,
    }
  }, [sessoes, questoes, hoje])

  if (!concurso) return null
  if (!disciplinas.length) {
    return (
      <div>
        <PageHeader titulo={concurso.nome} />
        <Vazio
          titulo="Vamos montar seu edital"
          texto="Cadastre as disciplinas e os tópicos do conteúdo programático. A partir daí, a plataforma organiza ciclo, revisões e estatísticas para você."
          acao={<Link to="/estudos/edital"><Botao>Montar edital</Botao></Link>}
        />
      </div>
    )
  }

  const prog = progressoTopicos(topicos)
  const diasProva = concurso.dataProva ? diasEntre(hoje, concurso.dataProva) : null
  const revHoje = revisoes.filter((r) => !r.feita && r.dataPrevista <= hoje)
  const cardsHoje = flashcards.filter((f) => (f.proximaRevisao || hoje) <= hoje).length
  const ciclo = calcularCiclo(concurso, sessoes)
  const planoHoje = (concurso.semana || [])[new Date().getDay()] || []
  const metaSemanaMin = (concurso.metaHorasSemana || 0) * 60
  const sequencia = calcularSequencia(sessoes)
  const ultimoSimulado = [...simulados].sort((a, b) => b.data.localeCompare(a.data))[0]
  const qTotal = questoes.reduce((a, q) => a + q.total, 0)
  const qAcertos = questoes.reduce((a, q) => a + q.acertos, 0)
  const recentes = [...sessoes].sort((a, b) => b.data.localeCompare(a.data)).slice(0, 5)

  const estudar = (disciplinaId, topicoId = '', tipo) => {
    timerConfig({ disciplinaId, topicoId, ...(tipo ? { tipo } : {}) })
    navigate('/estudos/cronometro')
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        titulo={concurso.nome}
        descricao={[concurso.orgao, concurso.banca, concurso.cargo].filter(Boolean).join(' · ') || undefined}
        acoes={<Botao onClick={() => estudar(ciclo.atual?.disciplinaId || disciplinas[0].id)}>◷ Começar a estudar</Botao>}
      />

      {/* Indicadores principais */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5">
          <div className="text-[11px] uppercase tracking-widest text-muted font-semibold">Prova</div>
          {diasProva === null ? (
            <Link to="/estudos/concursos" className="text-sm text-accent mt-2 block">Definir data →</Link>
          ) : (
            <>
              <div className={`font-syne text-2xl font-black mt-1.5 ${diasProva <= 30 && diasProva >= 0 ? 'text-error' : ''}`}>
                {diasProva > 0 ? `${diasProva} dias` : diasProva === 0 ? 'Hoje!' : 'Realizada'}
              </div>
              <div className="text-xs text-muted mt-1">{formatDia(concurso.dataProva)}</div>
            </>
          )}
        </Card>
        <Card className="p-5">
          <div className="text-[11px] uppercase tracking-widest text-muted font-semibold">Hoje</div>
          <div className="font-syne text-2xl font-black mt-1.5">{formatMinutos(dados.minHoje)}</div>
          <div className="text-xs text-muted mt-1">{sequencia > 0 ? `🔥 ${sequencia} dia${sequencia > 1 ? 's' : ''} seguidos` : 'Comece sua sequência hoje'}</div>
        </Card>
        <Card className="p-5">
          <div className="text-[11px] uppercase tracking-widest text-muted font-semibold">Semana</div>
          <div className="font-syne text-2xl font-black mt-1.5">{formatMinutos(dados.minSemana)}</div>
          {metaSemanaMin > 0 && (
            <div className="mt-2">
              <Barra pct={pct(dados.minSemana, metaSemanaMin)} cor={dados.minSemana >= metaSemanaMin ? 'var(--success)' : 'var(--accent)'} />
              <div className="text-[11px] text-muted mt-1">meta {concurso.metaHorasSemana}h · {pct(dados.minSemana, metaSemanaMin)}%</div>
            </div>
          )}
        </Card>
        <Card className="p-5">
          <div className="text-[11px] uppercase tracking-widest text-muted font-semibold">Questões na semana</div>
          <div className="font-syne text-2xl font-black mt-1.5">{dados.qSemana}</div>
          {concurso.metaQuestoesSemana > 0 && (
            <div className="mt-2">
              <Barra pct={pct(dados.qSemana, concurso.metaQuestoesSemana)} cor={dados.qSemana >= concurso.metaQuestoesSemana ? 'var(--success)' : 'var(--accent2)'} />
              <div className="text-[11px] text-muted mt-1">
                meta {concurso.metaQuestoesSemana}
                {dados.qSemana > 0 && ` · ${pct(dados.qSemanaAcertos, dados.qSemana)}% acerto`}
              </div>
            </div>
          )}
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* Agenda de hoje */}
        <Card className="p-5 lg:col-span-2">
          <CardTitulo>Para hoje</CardTitulo>
          <div className="grid sm:grid-cols-3 gap-3 mb-4">
            <Link to="/estudos/revisoes" className="bg-bg border border-border rounded-xl p-3 hover:border-accent transition">
              <div className="font-syne text-xl font-black" style={{ color: revHoje.length ? 'var(--accent)' : undefined }}>{revHoje.length}</div>
              <div className="text-xs text-muted">revisões pendentes</div>
            </Link>
            <Link to="/estudos/flashcards" className="bg-bg border border-border rounded-xl p-3 hover:border-accent transition">
              <div className="font-syne text-xl font-black" style={{ color: cardsHoje ? 'var(--accent)' : undefined }}>{cardsHoje}</div>
              <div className="text-xs text-muted">flashcards para revisar</div>
            </Link>
            <Link to="/estudos/planejamento" className="bg-bg border border-border rounded-xl p-3 hover:border-accent transition">
              <div className="font-syne text-xl font-black">{ciclo.itens.length ? `${ciclo.pct}%` : '—'}</div>
              <div className="text-xs text-muted">{ciclo.itens.length ? `do ciclo (volta ${(concurso.ciclo.rodadas || 0) + 1})` : 'ciclo não criado'}</div>
            </Link>
          </div>

          {ciclo.atual && (
            <div className="flex items-center gap-3 bg-bg border border-accent rounded-xl p-3 mb-3">
              <Ponto cor={disciplinaPorId[ciclo.atual.disciplinaId]?.cor} />
              <div className="flex-1 min-w-0">
                <div className="text-[10px] uppercase tracking-widest text-accent font-bold">Próximo no ciclo</div>
                <div className="text-sm font-semibold truncate">{disciplinaPorId[ciclo.atual.disciplinaId]?.nome}</div>
                <div className="text-xs text-muted">faltam {formatMinutos(ciclo.atual.minutos - ciclo.atual.feito)}</div>
              </div>
              <Botao tamanho="sm" onClick={() => estudar(ciclo.atual.disciplinaId)}>Estudar</Botao>
            </div>
          )}

          {planoHoje.length > 0 && (
            <div className="mb-3">
              <div className="text-xs text-muted mb-2">Grade de {DIAS[new Date().getDay()].toLowerCase()}:</div>
              <div className="flex flex-wrap gap-2">
                {planoHoje.map((it) => {
                  const d = disciplinaPorId[it.disciplinaId]
                  const feito = sessoes.filter((s) => diaKey(s.data) === hoje && s.disciplinaId === it.disciplinaId).reduce((a, s) => a + s.minutos, 0)
                  return (
                    <button key={it.id} onClick={() => estudar(it.disciplinaId)} className="text-xs bg-bg border border-border rounded-lg px-3 py-1.5 hover:border-accent flex items-center gap-2">
                      <Ponto cor={d?.cor} />
                      {d?.nome}
                      <span className={feito >= it.minutos ? 'text-success' : 'text-muted'}>{formatMinutos(feito)}/{formatMinutos(it.minutos)}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {revHoje.length > 0 && (
            <div>
              <div className="text-xs text-muted mb-2">Revisões de hoje:</div>
              <div className="flex flex-col">
                {revHoje.slice(0, 5).map((r) => (
                  <button key={r.id} onClick={() => estudar(r.disciplinaId, r.topicoId || '', 'revisao')} className="flex items-center gap-2 text-sm py-1.5 text-left hover:text-accent">
                    <Ponto cor={disciplinaPorId[r.disciplinaId]?.cor} />
                    <span className="truncate flex-1">{topicoPorId[r.topicoId]?.nome || disciplinaPorId[r.disciplinaId]?.nome}</span>
                    {r.dataPrevista < hoje && <span className="text-[10px] text-error">atrasada</span>}
                  </button>
                ))}
                {revHoje.length > 5 && <Link to="/estudos/revisoes" className="text-xs text-accent mt-1">ver todas →</Link>}
              </div>
            </div>
          )}
        </Card>

        {/* Semana */}
        <Card className="p-5">
          <CardTitulo>Esta semana</CardTitulo>
          <GraficoBarras dados={dados.porDia} formatar={formatMinutos} altura={130} />
          <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-border text-center">
            <div>
              <div className="font-bold" style={{ color: qTotal ? corDesempenho(pct(qAcertos, qTotal)) : undefined }}>{qTotal ? `${pct(qAcertos, qTotal)}%` : '—'}</div>
              <div className="text-[10px] text-muted">acerto geral ({qTotal}q)</div>
            </div>
            <div>
              <div className="font-bold">{ultimoSimulado ? `${notaSimulado(ultimoSimulado).pct}%` : '—'}</div>
              <div className="text-[10px] text-muted">último simulado</div>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* Progresso do edital */}
        <Card className="p-5 lg:col-span-2">
          <CardTitulo acao={<Link to="/estudos/edital" className="text-xs text-accent">abrir edital →</Link>}>Edital · {prog.pct}% ({prog.feitas}/{prog.total})</CardTitulo>
          <div className="flex flex-col gap-3">
            {disciplinas.map((d) => {
              const p = progressoTopicos(topicos.filter((t) => t.disciplinaId === d.id))
              return (
                <div key={d.id} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_44px] gap-3 items-center text-xs">
                  <span className="flex items-center gap-2 truncate"><Ponto cor={d.cor} />{d.nome}</span>
                  <Barra pct={p.pct} cor={d.cor} />
                  <span className="text-right text-muted">{p.total ? `${p.pct}%` : '—'}</span>
                </div>
              )
            })}
          </div>
        </Card>

        {/* Últimas sessões */}
        <Card className="p-5">
          <CardTitulo acao={<Link to="/estudos/cronometro" className="text-xs text-accent">histórico →</Link>}>Últimas sessões</CardTitulo>
          {recentes.length === 0 ? (
            <p className="text-sm text-muted">Nenhuma sessão ainda.</p>
          ) : (
            recentes.map((s) => (
              <div key={s.id} className="flex items-center gap-2 py-2 border-t border-border first:border-t-0 text-sm">
                <Ponto cor={disciplinaPorId[s.disciplinaId]?.cor} />
                <span className="flex-1 truncate">{disciplinaPorId[s.disciplinaId]?.nome}</span>
                <span className="font-semibold">{formatMinutos(s.minutos)}</span>
                <span className="text-[10px] text-muted w-20 text-right">{formatDataHora(s.data)}</span>
              </div>
            ))
          )}
        </Card>
      </div>
    </div>
  )
}
