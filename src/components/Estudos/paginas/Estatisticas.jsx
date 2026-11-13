import { useMemo, useState } from 'react'
import { useConcurso, TIPOS_SESSAO, diaKey, somaDias, formatMinutos, formatDia, keyParaData, pct, corDesempenho } from '../../../store/estudosStore'
import { Abas, Barra, Card, CardTitulo, GraficoBarras, PageHeader, Ponto, Stat, Vazio, cx } from '../ui'

/** Dias seguidos com estudo até hoje (ou até ontem, se hoje ainda não estudou) */
export function calcularSequencia(sessoes) {
  const dias = new Set(sessoes.map((s) => diaKey(s.data)))
  let d = diaKey()
  if (!dias.has(d)) d = somaDias(d, -1)
  let n = 0
  while (dias.has(d)) {
    n++
    d = somaDias(d, -1)
  }
  return n
}

export default function Estatisticas() {
  const { sessoes, questoes, disciplinas } = useConcurso()
  const [periodo, setPeriodo] = useState(30)
  const hoje = diaKey()
  const inicio = periodo ? somaDias(hoje, -(periodo - 1)) : '0000-00-00'

  const doPeriodo = sessoes.filter((s) => diaKey(s.data) >= inicio)
  const qPeriodo = questoes.filter((q) => diaKey(q.data) >= inicio)

  const porDia = useMemo(() => {
    const m = {}
    sessoes.forEach((s) => {
      const k = diaKey(s.data)
      m[k] = (m[k] || 0) + s.minutos
    })
    return m
  }, [sessoes])

  const totalMin = doPeriodo.reduce((a, s) => a + s.minutos, 0)
  const diasAtivos = new Set(doPeriodo.map((s) => diaKey(s.data))).size
  const qT = qPeriodo.reduce((a, q) => a + q.total, 0)
  const qA = qPeriodo.reduce((a, q) => a + q.acertos, 0)
  const diasPeriodo = periodo || Math.max(1, Object.keys(porDia).length)

  const barrasDias = Array.from({ length: Math.min(periodo || 30, 30) }, (_, i) => {
    const k = somaDias(hoje, -(Math.min(periodo || 30, 30) - 1 - i))
    return { label: keyParaData(k).getDate(), titulo: formatDia(k), valor: porDia[k] || 0, destaque: k === hoje }
  })

  // Heatmap das últimas 18 semanas (colunas = semanas, linhas = dom..sáb)
  const semanas = 18
  const inicioHeat = somaDias(hoje, -keyParaData(hoje).getDay() - (semanas - 1) * 7)
  const celulas = Array.from({ length: semanas * 7 }, (_, i) => somaDias(inicioHeat, i))
  const maxDia = Math.max(1, ...Object.values(porDia))

  const porDisc = disciplinas
    .map((d) => {
      const min = doPeriodo.filter((s) => s.disciplinaId === d.id).reduce((a, s) => a + s.minutos, 0)
      const qs = qPeriodo.filter((q) => q.disciplinaId === d.id)
      const t = qs.reduce((a, q) => a + q.total, 0)
      const ac = qs.reduce((a, q) => a + q.acertos, 0)
      return { d, min, t, p: pct(ac, t) }
    })
    .sort((a, b) => b.min - a.min)
  const maxDisc = Math.max(1, ...porDisc.map((x) => x.min))

  const porTipo = TIPOS_SESSAO.map((t) => ({ ...t, min: doPeriodo.filter((s) => (s.tipo || 'teoria') === t.id).reduce((a, s) => a + s.minutos, 0) })).filter((t) => t.min > 0)

  const porDiaSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((label, i) => ({
    label,
    valor: doPeriodo.filter((s) => new Date(s.data).getDay() === i).reduce((a, s) => a + s.minutos, 0),
  }))

  if (!sessoes.length && !questoes.length) {
    return (
      <div>
        <PageHeader titulo="Estatísticas" />
        <Vazio titulo="Ainda sem dados" texto="Registre sessões no cronômetro e lance questões para ver suas estatísticas." />
      </div>
    )
  }

  return (
    <div>
      <PageHeader titulo="Estatísticas" descricao="Acompanhe constância, distribuição do tempo e desempenho." />
      <Abas valor={periodo} onChange={setPeriodo} abas={[{ id: 7, label: '7 dias' }, { id: 30, label: '30 dias' }, { id: 90, label: '90 dias' }, { id: 0, label: 'Tudo' }]} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
        <Stat titulo="Tempo total" valor={formatMinutos(totalMin)} sub={`${doPeriodo.length} sessões`} />
        <Stat titulo="Média diária" valor={formatMinutos(totalMin / diasPeriodo)} sub={`${diasAtivos} dias com estudo`} />
        <Stat titulo="Sequência atual" valor={`${calcularSequencia(sessoes)} dias`} sub="dias seguidos estudando" />
        <Stat titulo="Questões" valor={qT} sub={qT ? `${pct(qA, qT)}% de acerto` : 'nenhuma no período'} />
      </div>

      <div className="grid lg:grid-cols-2 gap-5 mb-5">
        <Card className="p-5">
          <CardTitulo>Horas por dia (últimos {barrasDias.length})</CardTitulo>
          <GraficoBarras dados={barrasDias} formatar={formatMinutos} />
        </Card>
        <Card className="p-5">
          <CardTitulo>Constância — últimas {semanas} semanas</CardTitulo>
          <div className="grid grid-flow-col grid-rows-7 gap-1 overflow-x-auto">
            {celulas.map((k) => {
              const v = porDia[k] || 0
              const futuro = k > hoje
              return (
                <div
                  key={k}
                  title={`${formatDia(k)}: ${formatMinutos(v)}`}
                  className={cx('w-3.5 h-3.5 rounded-sm', futuro && 'opacity-0')}
                  style={{ background: v ? 'var(--accent)' : 'var(--border)', opacity: futuro ? 0 : v ? 0.25 + 0.75 * (v / maxDia) : 1 }}
                />
              )
            })}
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-muted mt-3">
            menos
            {[0, 0.25, 0.5, 0.75, 1].map((o) => (
              <span key={o} className="w-3 h-3 rounded-sm" style={{ background: o ? 'var(--accent)' : 'var(--border)', opacity: o ? 0.25 + 0.75 * o : 1 }} />
            ))}
            mais
          </div>
        </Card>
      </div>

      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-5">
        <Card className="p-5">
          <CardTitulo>Por disciplina</CardTitulo>
          <div className="flex flex-col gap-3">
            {porDisc.map(({ d, min, t, p }) => (
              <div key={d.id} className="grid grid-cols-[minmax(0,1fr)_60px_56px] gap-3 items-center text-xs">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1 truncate"><Ponto cor={d.cor} />{d.nome}</div>
                  <Barra pct={(min / maxDisc) * 100} cor={d.cor} />
                </div>
                <span className="text-right font-semibold">{formatMinutos(min)}</span>
                <span className="text-right font-semibold" style={{ color: t ? corDesempenho(p) : 'var(--muted)' }}>{t ? `${p}%` : '—'}</span>
              </div>
            ))}
          </div>
        </Card>
        <div className="flex flex-col gap-5">
          <Card className="p-5">
            <CardTitulo>Por tipo de estudo</CardTitulo>
            {porTipo.length === 0 ? <p className="text-xs text-muted">Sem sessões no período.</p> : porTipo.map((t) => (
              <div key={t.id} className="mb-2.5">
                <div className="flex justify-between text-xs mb-1"><span>{t.label}</span><span className="text-muted">{formatMinutos(t.min)} · {pct(t.min, totalMin)}%</span></div>
                <Barra pct={pct(t.min, totalMin)} cor="var(--accent2)" />
              </div>
            ))}
          </Card>
          <Card className="p-5">
            <CardTitulo>Por dia da semana</CardTitulo>
            <GraficoBarras dados={porDiaSemana} formatar={formatMinutos} altura={100} cor="var(--accent2)" />
          </Card>
        </div>
      </div>
    </div>
  )
}
