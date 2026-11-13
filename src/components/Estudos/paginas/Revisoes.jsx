import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useConcurso, useEstudosStore, diaKey, diasEntre, formatDia, formatDiaCurto, somaDias } from '../../../store/estudosStore'
import { Abas, Badge, Botao, Card, CardTitulo, Input, PageHeader, Ponto, SelectDisciplina, SelectTopico, Vazio } from '../ui'

export default function Revisoes() {
  const { revisoes, disciplinas, topicos, disciplinaPorId, topicoPorId } = useConcurso()
  const { update, remove, add, timerConfig } = useEstudosStore()
  const navigate = useNavigate()
  const [aba, setAba] = useState('pendentes')
  const [nova, setNova] = useState({ disciplinaId: '', topicoId: '', data: somaDias(diaKey(), 1) })
  const hoje = diaKey()

  const pendentes = revisoes.filter((r) => !r.feita).sort((a, b) => a.dataPrevista.localeCompare(b.dataPrevista))
  const grupos = [
    { titulo: 'Atrasadas', cor: 'var(--error)', itens: pendentes.filter((r) => r.dataPrevista < hoje) },
    { titulo: 'Hoje', cor: 'var(--accent)', itens: pendentes.filter((r) => r.dataPrevista === hoje) },
    { titulo: 'Próximos 7 dias', cor: 'var(--accent2)', itens: pendentes.filter((r) => r.dataPrevista > hoje && r.dataPrevista <= somaDias(hoje, 7)) },
    { titulo: 'Mais adiante', cor: 'var(--muted)', itens: pendentes.filter((r) => r.dataPrevista > somaDias(hoje, 7)) },
  ]
  const feitas = revisoes.filter((r) => r.feita).sort((a, b) => (b.feitaEm || '').localeCompare(a.feitaEm || ''))

  const estudar = (r) => {
    timerConfig({ disciplinaId: r.disciplinaId, topicoId: r.topicoId || '', tipo: 'revisao' })
    navigate('/estudos/cronometro')
  }

  const linha = (r) => {
    const d = disciplinaPorId[r.disciplinaId]
    const t = topicoPorId[r.topicoId]
    const atraso = diasEntre(r.dataPrevista, hoje)
    return (
      <div key={r.id} className="flex items-center gap-3 py-3 border-t border-border first:border-t-0 flex-wrap sm:flex-nowrap">
        <Ponto cor={d?.cor} />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold truncate">{t?.nome || 'Disciplina inteira'}</div>
          <div className="text-xs text-muted truncate">{d?.nome}</div>
        </div>
        {r.etapa && <Badge cor="var(--accent2)">R{r.etapa}</Badge>}
        <span className="text-xs text-muted w-28 text-right">
          {r.feita ? `feita ${new Date(r.feitaEm).toLocaleDateString('pt-BR')}` : formatDiaCurto(r.dataPrevista)}
          {!r.feita && atraso > 0 && <span className="text-error block">{atraso}d de atraso</span>}
        </span>
        {r.feita ? (
          <Botao tamanho="sm" variante="fantasma" onClick={() => update('revisoes', r.id, { feita: false, feitaEm: null })}>Desfazer</Botao>
        ) : (
          <div className="flex gap-1">
            <Botao tamanho="sm" variante="secundario" onClick={() => estudar(r)} title="Abrir no cronômetro">◷</Botao>
            <Botao tamanho="sm" variante="secundario" onClick={() => update('revisoes', r.id, { dataPrevista: somaDias(r.dataPrevista < hoje ? hoje : r.dataPrevista, 1) })} title="Adiar 1 dia">+1d</Botao>
            <Botao tamanho="sm" variante="sucesso" onClick={() => update('revisoes', r.id, { feita: true, feitaEm: new Date().toISOString() })}>✓ Feita</Botao>
          </div>
        )}
        <button onClick={() => remove('revisoes', r.id)} className="text-muted hover:text-error text-xs" aria-label="Excluir">✕</button>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        titulo="Revisões"
        descricao="Revisões espaçadas (1, 7, 30 e 90 dias) são criadas automaticamente quando você conclui um tópico do edital. Você também pode agendar revisões avulsas."
      />
      <div className="grid lg:grid-cols-[1fr_300px] gap-5">
        <div>
          <Abas valor={aba} onChange={setAba} abas={[{ id: 'pendentes', label: 'Pendentes', contador: pendentes.length }, { id: 'feitas', label: 'Concluídas', contador: feitas.length }]} />
          {aba === 'pendentes' ? (
            pendentes.length === 0 ? (
              <Vazio titulo="Nenhuma revisão pendente" texto="Conclua tópicos no edital ou agende uma revisão avulsa." />
            ) : (
              <div className="flex flex-col gap-4">
                {grupos.filter((g) => g.itens.length).map((g) => (
                  <Card key={g.titulo} className="p-5">
                    <CardTitulo>
                      <span style={{ color: g.cor }}>{g.titulo}</span> · {g.itens.length}
                    </CardTitulo>
                    {g.itens.map(linha)}
                  </Card>
                ))}
              </div>
            )
          ) : feitas.length === 0 ? (
            <Vazio titulo="Nenhuma revisão concluída ainda" />
          ) : (
            <Card className="p-5">{feitas.slice(0, 60).map(linha)}</Card>
          )}
        </div>
        <Card className="p-5 self-start">
          <CardTitulo>Revisão avulsa</CardTitulo>
          <div className="flex flex-col gap-3">
            <SelectDisciplina disciplinas={disciplinas} value={nova.disciplinaId} onChange={(v) => setNova({ ...nova, disciplinaId: v, topicoId: '' })} placeholder="Disciplina" />
            <SelectTopico topicos={topicos} disciplinaId={nova.disciplinaId} value={nova.topicoId} onChange={(v) => setNova({ ...nova, topicoId: v })} />
            <Input type="date" value={nova.data} min={hoje} onChange={(e) => setNova({ ...nova, data: e.target.value })} />
            <Botao
              variante="secundario"
              disabled={!nova.disciplinaId || !nova.data}
              onClick={() => {
                add('revisoes', { disciplinaId: nova.disciplinaId, topicoId: nova.topicoId || null, dataPrevista: nova.data, etapa: null, feita: false })
                setNova({ ...nova, topicoId: '' })
              }}
            >
              Agendar para {nova.data ? formatDia(nova.data) : '…'}
            </Botao>
          </div>
        </Card>
      </div>
    </div>
  )
}
