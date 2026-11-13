import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useConcurso, useEstudosStore, diaKey, formatMinutos, formatDataHora, uid, pct } from '../../../store/estudosStore'
import { Abas, Barra, Botao, Campo, Card, CardTitulo, Input, PageHeader, Ponto, SelectDisciplina, Vazio, confirmar, cx } from '../ui'

export const DIAS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
const ORDEM_DIAS = [1, 2, 3, 4, 5, 6, 0]

/** Progresso de cada item do ciclo na volta atual */
export function calcularCiclo(concurso, sessoes) {
  const ciclo = concurso?.ciclo || { itens: [] }
  const desde = ciclo.rodadaInicio || '1970-01-01'
  const feitoPorDisc = {}
  sessoes.filter((s) => s.data >= desde).forEach((s) => {
    feitoPorDisc[s.disciplinaId] = (feitoPorDisc[s.disciplinaId] || 0) + s.minutos
  })
  // Distribui os minutos entre itens repetidos da mesma disciplina, em ordem
  const restante = { ...feitoPorDisc }
  const itens = ciclo.itens.map((it) => {
    const disponivel = restante[it.disciplinaId] || 0
    const feito = Math.min(it.minutos, disponivel)
    restante[it.disciplinaId] = disponivel - feito
    return { ...it, feito, completo: feito >= it.minutos }
  })
  const total = itens.reduce((a, i) => a + i.minutos, 0)
  const feito = itens.reduce((a, i) => a + i.feito, 0)
  return { itens, atual: itens.find((i) => !i.completo) || null, total, feito, pct: pct(feito, total), completo: itens.length > 0 && itens.every((i) => i.completo) }
}

function Ciclo() {
  const { concurso, disciplinas, disciplinaPorId, sessoes } = useConcurso()
  const { updateConcurso, completarRodadaCiclo, timerConfig } = useEstudosStore()
  const navigate = useNavigate()
  const [horas, setHoras] = useState(concurso.metaHorasSemana || 20)
  const [nova, setNova] = useState({ disciplinaId: '', minutos: 60 })

  const ciclo = concurso.ciclo
  const calc = calcularCiclo(concurso, sessoes)
  const salvarItens = (itens) => updateConcurso(concurso.id, { ciclo: { ...ciclo, itens } })

  const gerar = () => {
    if (ciclo.itens.length && !confirmar('Substituir o ciclo atual por um gerado automaticamente?')) return
    const pesos = disciplinas.map((d) => (Number(d.peso) || 1) * (Number(d.dificuldade) || 2))
    const soma = pesos.reduce((a, b) => a + b, 0) || 1
    const totalMin = Number(horas) * 60
    const itens = disciplinas.map((d, i) => ({
      id: uid(),
      disciplinaId: d.id,
      minutos: Math.max(30, Math.round((totalMin * pesos[i]) / soma / 10) * 10),
    }))
    updateConcurso(concurso.id, { ciclo: { ...ciclo, itens, rodadaInicio: new Date().toISOString() } })
  }

  const mover = (i, dir) => {
    const itens = [...ciclo.itens]
    const j = i + dir
    if (j < 0 || j >= itens.length) return
    ;[itens[i], itens[j]] = [itens[j], itens[i]]
    salvarItens(itens)
  }

  const estudar = (disciplinaId) => {
    timerConfig({ disciplinaId, topicoId: '' })
    navigate('/estudos/cronometro')
  }

  return (
    <div className="grid lg:grid-cols-[1fr_300px] gap-5">
      <div className="flex flex-col gap-4">
        {ciclo.itens.length === 0 ? (
          <Vazio
            titulo="Crie seu ciclo de estudos"
            texto="No ciclo você estuda as disciplinas em sequência, sem depender de dia da semana. Se faltar um dia, basta continuar de onde parou."
          />
        ) : (
          <Card className="p-5">
            <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
              <div>
                <div className="font-syne text-2xl font-black">{calc.pct}%</div>
                <div className="text-xs text-muted">
                  Volta {(ciclo.rodadas || 0) + 1} · {formatMinutos(calc.feito)} de {formatMinutos(calc.total)} · desde {formatDataHora(ciclo.rodadaInicio)}
                </div>
              </div>
              <div className="flex gap-2">
                {calc.atual && <Botao onClick={() => estudar(calc.atual.disciplinaId)}>◷ Estudar {disciplinaPorId[calc.atual.disciplinaId]?.nome}</Botao>}
                <Botao
                  variante={calc.completo ? 'sucesso' : 'secundario'}
                  onClick={() => (calc.completo || confirmar('A volta ainda não terminou. Iniciar uma nova mesmo assim?')) && completarRodadaCiclo()}
                >
                  {calc.completo ? '✓ Iniciar nova volta' : 'Reiniciar volta'}
                </Botao>
              </div>
            </div>
            <Barra pct={calc.pct} altura="h-2" />
          </Card>
        )}

        {calc.itens.map((it, i) => {
          const d = disciplinaPorId[it.disciplinaId]
          const atual = calc.atual?.id === it.id
          return (
            <Card key={it.id} className={cx('p-4 flex items-center gap-3', atual && 'border-accent', it.completo && 'opacity-60')}>
              <span className="text-xs text-muted w-5 text-center">{i + 1}</span>
              <Ponto cor={d?.cor} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm truncate">{d?.nome || 'Disciplina removida'}</span>
                  {atual && <span className="text-[10px] font-bold text-accent uppercase">agora</span>}
                  {it.completo && <span className="text-success text-xs">✓</span>}
                </div>
                <div className="flex items-center gap-2 mt-1.5">
                  <Barra pct={pct(it.feito, it.minutos)} cor={d?.cor} />
                  <span className="text-[11px] text-muted whitespace-nowrap">
                    {formatMinutos(it.feito)}/{formatMinutos(it.minutos)}
                  </span>
                </div>
              </div>
              <Input
                type="number"
                min="10"
                step="10"
                value={it.minutos}
                onChange={(e) => salvarItens(ciclo.itens.map((x) => (x.id === it.id ? { ...x, minutos: Math.max(1, Number(e.target.value) || 0) } : x)))}
                className="!w-20 !py-1.5 text-center"
                title="Minutos"
              />
              <div className="flex flex-col">
                <button onClick={() => mover(i, -1)} className="text-muted hover:text-text text-[10px] leading-none p-0.5" aria-label="Subir">▲</button>
                <button onClick={() => mover(i, 1)} className="text-muted hover:text-text text-[10px] leading-none p-0.5" aria-label="Descer">▼</button>
              </div>
              <button onClick={() => salvarItens(ciclo.itens.filter((x) => x.id !== it.id))} className="text-muted hover:text-error text-xs" aria-label="Remover">
                ✕
              </button>
            </Card>
          )
        })}
      </div>

      <div className="flex flex-col gap-4">
        <Card className="p-5">
          <CardTitulo>Gerar automaticamente</CardTitulo>
          <p className="text-xs text-muted mb-3">Distribui o tempo pelo peso de cada disciplina na prova × sua dificuldade.</p>
          <Campo label="Horas por volta">
            <Input type="number" min="1" value={horas} onChange={(e) => setHoras(e.target.value)} />
          </Campo>
          <Botao className="w-full mt-3" onClick={gerar} disabled={!disciplinas.length || !(Number(horas) > 0)}>
            Gerar ciclo
          </Botao>
          {!disciplinas.length && <p className="text-xs text-error mt-2">Cadastre disciplinas no edital primeiro.</p>}
        </Card>
        <Card className="p-5">
          <CardTitulo>Adicionar ao ciclo</CardTitulo>
          <div className="flex flex-col gap-3">
            <SelectDisciplina disciplinas={disciplinas} value={nova.disciplinaId} onChange={(v) => setNova({ ...nova, disciplinaId: v })} placeholder="Escolha a disciplina" />
            <Campo label="Minutos">
              <Input type="number" min="10" step="10" value={nova.minutos} onChange={(e) => setNova({ ...nova, minutos: e.target.value })} />
            </Campo>
            <Botao
              variante="secundario"
              disabled={!nova.disciplinaId || !(Number(nova.minutos) > 0)}
              onClick={() => {
                salvarItens([...ciclo.itens, { id: uid(), disciplinaId: nova.disciplinaId, minutos: Number(nova.minutos) }])
                setNova({ ...nova, disciplinaId: '' })
              }}
            >
              Adicionar
            </Botao>
          </div>
        </Card>
      </div>
    </div>
  )
}

function Semana() {
  const { concurso, disciplinas, disciplinaPorId, sessoes } = useConcurso()
  const { updateConcurso } = useEstudosStore()
  const [adicionando, setAdicionando] = useState(null)
  const [nova, setNova] = useState({ disciplinaId: '', minutos: 60 })
  const hoje = new Date().getDay()
  const hojeKey = diaKey()

  const semana = concurso.semana || [[], [], [], [], [], [], []]
  const salvar = (dia, itens) => updateConcurso(concurso.id, { semana: semana.map((d, i) => (i === dia ? itens : d)) })
  const totalSemana = semana.flat().reduce((a, i) => a + i.minutos, 0)
  const feitoHojePorDisc = {}
  sessoes.filter((s) => diaKey(s.data) === hojeKey).forEach((s) => {
    feitoHojePorDisc[s.disciplinaId] = (feitoHojePorDisc[s.disciplinaId] || 0) + s.minutos
  })

  return (
    <div>
      <Card className="p-4 mb-4 flex flex-wrap gap-x-6 gap-y-1 items-center text-sm">
        <span>
          Planejado: <strong>{formatMinutos(totalSemana)}</strong>
        </span>
        <span className="text-muted">Meta do concurso: {concurso.metaHorasSemana || 0}h/semana</span>
        {concurso.metaHorasSemana > 0 && (
          <span className={totalSemana >= concurso.metaHorasSemana * 60 ? 'text-success' : 'text-error'}>
            {totalSemana >= concurso.metaHorasSemana * 60 ? '✓ cobre a meta' : `faltam ${formatMinutos(concurso.metaHorasSemana * 60 - totalSemana)}`}
          </span>
        )}
      </Card>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3">
        {ORDEM_DIAS.map((dia) => {
          const itens = semana[dia] || []
          const tot = itens.reduce((a, i) => a + i.minutos, 0)
          return (
            <Card key={dia} className={cx('p-3 flex flex-col gap-2', dia === hoje && 'border-accent')}>
              <div className="flex justify-between items-baseline">
                <span className={cx('font-semibold text-sm', dia === hoje && 'text-accent')}>{DIAS[dia]}</span>
                <span className="text-[11px] text-muted">{formatMinutos(tot)}</span>
              </div>
              {itens.map((it) => {
                const d = disciplinaPorId[it.disciplinaId]
                const feito = dia === hoje ? feitoHojePorDisc[it.disciplinaId] || 0 : null
                return (
                  <div key={it.id} className="group bg-bg rounded-lg px-2 py-1.5 text-xs" style={{ borderLeft: `3px solid ${d?.cor}` }}>
                    <div className="flex items-center gap-1">
                      <span className="flex-1 truncate">{d?.nome}</span>
                      <button onClick={() => salvar(dia, itens.filter((x) => x.id !== it.id))} className="text-muted hover:text-error opacity-0 group-hover:opacity-100">✕</button>
                    </div>
                    <div className="text-muted text-[10px]">
                      {formatMinutos(it.minutos)}
                      {feito !== null && <span className={feito >= it.minutos ? 'text-success' : ''}> · feito {formatMinutos(feito)}</span>}
                    </div>
                  </div>
                )
              })}
              {adicionando === dia ? (
                <div className="flex flex-col gap-1.5">
                  <SelectDisciplina disciplinas={disciplinas} value={nova.disciplinaId} onChange={(v) => setNova({ ...nova, disciplinaId: v })} placeholder="Disciplina" className="!py-1.5 !text-xs" />
                  <Input type="number" min="10" step="10" value={nova.minutos} onChange={(e) => setNova({ ...nova, minutos: e.target.value })} className="!py-1.5 !text-xs" />
                  <div className="flex gap-1">
                    <Botao
                      tamanho="sm"
                      className="flex-1"
                      disabled={!nova.disciplinaId}
                      onClick={() => {
                        salvar(dia, [...itens, { id: uid(), disciplinaId: nova.disciplinaId, minutos: Number(nova.minutos) || 60 }])
                        setAdicionando(null)
                      }}
                    >
                      OK
                    </Botao>
                    <Botao tamanho="sm" variante="fantasma" onClick={() => setAdicionando(null)}>✕</Botao>
                  </div>
                </div>
              ) : (
                <button onClick={() => { setAdicionando(dia); setNova({ disciplinaId: '', minutos: 60 }) }} className="text-xs text-muted hover:text-accent text-left">
                  + adicionar
                </button>
              )}
            </Card>
          )
        })}
      </div>
    </div>
  )
}

export default function Planejamento() {
  const [aba, setAba] = useState('ciclo')
  return (
    <div>
      <PageHeader titulo="Planejamento" descricao="Use o ciclo de estudos para estudar em sequência, sem depender do dia da semana, ou monte uma grade fixa para cada dia." />
      <Abas valor={aba} onChange={setAba} abas={[{ id: 'ciclo', label: 'Ciclo de estudos' }, { id: 'semana', label: 'Grade semanal' }]} />
      {aba === 'ciclo' ? <Ciclo /> : <Semana />}
    </div>
  )
}
