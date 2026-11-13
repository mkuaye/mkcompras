import { useMemo, useState } from 'react'
import { useConcurso, useEstudosStore, diaKey, formatDataHora, pct, corDesempenho } from '../../../store/estudosStore'
import { Barra, Botao, Campo, Card, CardTitulo, Input, PageHeader, Ponto, SelectDisciplina, SelectTopico, Vazio } from '../ui'

export default function Questoes() {
  const { concurso, disciplinas, topicos, questoes, disciplinaPorId, topicoPorId } = useConcurso()
  const { add, remove } = useEstudosStore()
  const [f, setF] = useState({ disciplinaId: '', topicoId: '', total: '', acertos: '', fonte: concurso?.banca || '', dia: diaKey() })
  const [filtro, setFiltro] = useState('')

  const t = Number(f.total)
  const a = Number(f.acertos)
  const valido = f.disciplinaId && t > 0 && f.acertos !== '' && a >= 0 && a <= t

  const salvar = (e) => {
    e.preventDefault()
    if (!valido) return
    const data = f.dia === diaKey() ? new Date() : new Date(`${f.dia}T12:00`)
    add('questoes', { disciplinaId: f.disciplinaId, topicoId: f.topicoId || null, total: t, acertos: a, fonte: f.fonte.trim(), data: data.toISOString() })
    setF({ ...f, total: '', acertos: '' })
  }

  const porDisciplina = useMemo(
    () =>
      disciplinas
        .map((d) => {
          const qs = questoes.filter((q) => q.disciplinaId === d.id)
          const total = qs.reduce((s, q) => s + q.total, 0)
          const acertos = qs.reduce((s, q) => s + q.acertos, 0)
          return { d, total, acertos, p: pct(acertos, total) }
        })
        .sort((x, y) => y.total - x.total),
    [disciplinas, questoes]
  )

  const criticos = useMemo(() => {
    const m = {}
    questoes.forEach((q) => {
      if (!q.topicoId || !topicoPorId[q.topicoId]) return
      m[q.topicoId] = m[q.topicoId] || { total: 0, acertos: 0 }
      m[q.topicoId].total += q.total
      m[q.topicoId].acertos += q.acertos
    })
    return Object.entries(m)
      .map(([id, v]) => ({ topico: topicoPorId[id], ...v, p: pct(v.acertos, v.total) }))
      .filter((x) => x.total >= 5 && x.p < 65)
      .sort((x, y) => x.p - y.p)
      .slice(0, 10)
  }, [questoes, topicoPorId])

  const total = questoes.reduce((s, q) => s + q.total, 0)
  const acertos = questoes.reduce((s, q) => s + q.acertos, 0)
  const historico = [...questoes].filter((q) => !filtro || q.disciplinaId === filtro).sort((x, y) => y.data.localeCompare(x.data)).slice(0, 50)

  if (!disciplinas.length) return <Vazio titulo="Nenhuma disciplina" texto="Cadastre as disciplinas no edital para lançar questões." />

  return (
    <div>
      <PageHeader titulo="Questões" descricao="Lance as baterias de questões por disciplina e tópico para descobrir seus pontos fracos." />

      <form onSubmit={salvar}>
        <Card className="p-5 mb-5 grid grid-cols-2 md:grid-cols-6 gap-3 items-end">
          <Campo label="Disciplina" className="col-span-2">
            <SelectDisciplina disciplinas={disciplinas} value={f.disciplinaId} onChange={(v) => setF({ ...f, disciplinaId: v, topicoId: '' })} placeholder="Escolha" />
          </Campo>
          <Campo label="Tópico" className="col-span-2">
            <SelectTopico topicos={topicos} disciplinaId={f.disciplinaId} value={f.topicoId} onChange={(v) => setF({ ...f, topicoId: v })} />
          </Campo>
          <Campo label="Feitas">
            <Input type="number" min="1" value={f.total} onChange={(e) => setF({ ...f, total: e.target.value })} />
          </Campo>
          <Campo label="Acertos">
            <Input type="number" min="0" value={f.acertos} onChange={(e) => setF({ ...f, acertos: e.target.value })} />
          </Campo>
          <Campo label="Banca / fonte" className="col-span-2 md:col-span-3">
            <Input value={f.fonte} onChange={(e) => setF({ ...f, fonte: e.target.value })} placeholder="Ex.: FGV, QConcursos, livro X" />
          </Campo>
          <Campo label="Data" className="md:col-span-2">
            <Input type="date" value={f.dia} max={diaKey()} onChange={(e) => setF({ ...f, dia: e.target.value })} />
          </Campo>
          <Botao type="submit" disabled={!valido} className="col-span-1">Lançar</Botao>
          {f.acertos !== '' && a > t && <p className="col-span-full text-error text-xs">Acertos não podem passar do total.</p>}
        </Card>
      </form>

      <div className="grid lg:grid-cols-2 gap-5 mb-5">
        <Card className="p-5">
          <CardTitulo>
            Desempenho por disciplina · {total} questões · <span style={{ color: total ? corDesempenho(pct(acertos, total)) : undefined }}>{pct(acertos, total)}%</span>
          </CardTitulo>
          <div className="flex flex-col gap-3">
            {porDisciplina.map(({ d, total: tt, acertos: aa, p }) => (
              <div key={d.id}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="flex items-center gap-2 truncate"><Ponto cor={d.cor} />{d.nome}</span>
                  <span className="text-muted whitespace-nowrap">
                    {aa}/{tt} · <strong style={{ color: tt ? corDesempenho(p) : undefined }}>{tt ? `${p}%` : '—'}</strong>
                  </span>
                </div>
                <Barra pct={p} cor={corDesempenho(p)} />
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-5">
          <CardTitulo>Pontos fracos (tópicos abaixo de 65%)</CardTitulo>
          {criticos.length === 0 ? (
            <p className="text-sm text-muted">Nenhum tópico crítico. Vincule as questões a tópicos (mínimo 5 questões) para ver esta análise.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {criticos.map((c) => (
                <li key={c.topico.id} className="flex items-center gap-3 text-sm">
                  <Ponto cor={disciplinaPorId[c.topico.disciplinaId]?.cor} />
                  <span className="flex-1 truncate">{c.topico.nome}</span>
                  <span className="text-xs text-muted">{c.total}q</span>
                  <strong style={{ color: corDesempenho(c.p) }}>{c.p}%</strong>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card className="p-5">
        <CardTitulo acao={<SelectDisciplina disciplinas={disciplinas} value={filtro} onChange={setFiltro} todas="Todas" className="!w-auto !py-1.5 !text-xs" />}>Histórico</CardTitulo>
        {historico.length === 0 ? (
          <p className="text-sm text-muted">Nenhum lançamento.</p>
        ) : (
          historico.map((q) => {
            const p = pct(q.acertos, q.total)
            return (
              <div key={q.id} className="group flex items-center gap-3 py-2.5 border-t border-border first:border-t-0 text-sm">
                <Ponto cor={disciplinaPorId[q.disciplinaId]?.cor} />
                <div className="flex-1 min-w-0">
                  <div className="truncate">
                    {disciplinaPorId[q.disciplinaId]?.nome}
                    {topicoPorId[q.topicoId] && <span className="text-muted"> · {topicoPorId[q.topicoId].nome}</span>}
                  </div>
                  {q.fonte && <div className="text-xs text-muted truncate">{q.fonte}</div>}
                </div>
                <span className="text-muted">{q.acertos}/{q.total}</span>
                <strong className="w-11 text-right" style={{ color: corDesempenho(p) }}>{p}%</strong>
                <span className="text-xs text-muted w-24 text-right hidden sm:inline">{formatDataHora(q.data)}</span>
                <button onClick={() => remove('questoes', q.id)} className="text-muted hover:text-error text-xs sm:opacity-0 group-hover:opacity-100" aria-label="Remover">✕</button>
              </div>
            )
          })
        )}
      </Card>
    </div>
  )
}
