import { useState } from 'react'
import { useConcurso, useEstudosStore, diaKey, formatDia, pct, corDesempenho } from '../../../store/estudosStore'
import { Badge, Barra, Botao, Campo, Card, CardTitulo, GraficoLinha, Input, Modal, PageHeader, Ponto, Select, Textarea, Vazio, confirmar } from '../ui'

/** Nota do simulado. Cebraspe: cada erro anula um acerto (certo/errado). */
export function notaSimulado(sim) {
  const total = sim.resultados.reduce((a, r) => a + (Number(r.total) || 0), 0)
  const acertos = sim.resultados.reduce((a, r) => a + (Number(r.acertos) || 0), 0)
  const brancos = sim.resultados.reduce((a, r) => a + (Number(r.brancos) || 0), 0)
  const erros = total - acertos - brancos
  const liquido = sim.modo === 'cebraspe' ? acertos - erros : acertos
  return { total, acertos, erros, brancos, liquido, pct: pct(Math.max(0, liquido), total) }
}

function FormSimulado({ inicial, disciplinas, onSalvar, onCancelar }) {
  const [f, setF] = useState(() => ({
    nome: '',
    data: diaKey(),
    banca: '',
    modo: 'normal',
    duracaoMin: '',
    obs: '',
    ...inicial,
    resultados: disciplinas.map((d) => inicial?.resultados?.find((r) => r.disciplinaId === d.id) || { disciplinaId: d.id, total: '', acertos: '', brancos: '' }),
  }))
  const setRes = (i, k, v) => setF({ ...f, resultados: f.resultados.map((r, j) => (j === i ? { ...r, [k]: v } : r)) })
  const n = notaSimulado(f)
  const invalido = f.resultados.some((r) => Number(r.acertos || 0) + Number(r.brancos || 0) > Number(r.total || 0))

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Campo label="Nome *" className="col-span-2">
          <Input autoFocus value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} placeholder="Simulado 03 — Estratégia" />
        </Campo>
        <Campo label="Data">
          <Input type="date" value={f.data} onChange={(e) => setF({ ...f, data: e.target.value })} />
        </Campo>
        <Campo label="Duração (min)">
          <Input type="number" min="0" value={f.duracaoMin} onChange={(e) => setF({ ...f, duracaoMin: e.target.value })} />
        </Campo>
        <Campo label="Banca / organizador" className="col-span-2">
          <Input value={f.banca} onChange={(e) => setF({ ...f, banca: e.target.value })} />
        </Campo>
        <Campo label="Correção" className="col-span-2">
          <Select value={f.modo} onChange={(e) => setF({ ...f, modo: e.target.value })}>
            <option value="normal">Múltipla escolha (acertos)</option>
            <option value="cebraspe">Certo/Errado — 1 erro anula 1 acerto</option>
          </Select>
        </Campo>
      </div>

      <div className="border border-border rounded-xl overflow-hidden">
        <div className="grid grid-cols-[1fr_70px_70px_70px] gap-2 px-3 py-2 text-[11px] text-muted font-semibold bg-bg">
          <span>Disciplina</span><span className="text-center">Questões</span><span className="text-center">Acertos</span><span className="text-center">Branco</span>
        </div>
        {f.resultados.map((r, i) => {
          const d = disciplinas.find((x) => x.id === r.disciplinaId)
          return (
            <div key={r.disciplinaId} className="grid grid-cols-[1fr_70px_70px_70px] gap-2 px-3 py-1.5 items-center border-t border-border">
              <span className="text-sm truncate flex items-center gap-2"><Ponto cor={d?.cor} />{d?.nome}</span>
              <Input type="number" min="0" value={r.total} onChange={(e) => setRes(i, 'total', e.target.value)} className="!py-1 text-center" />
              <Input type="number" min="0" value={r.acertos} onChange={(e) => setRes(i, 'acertos', e.target.value)} className="!py-1 text-center" />
              <Input type="number" min="0" value={r.brancos} onChange={(e) => setRes(i, 'brancos', e.target.value)} className="!py-1 text-center" />
            </div>
          )
        })}
      </div>
      <Campo label="Observações (o que errou, gestão de tempo, ajustes)">
        <Textarea rows={2} value={f.obs} onChange={(e) => setF({ ...f, obs: e.target.value })} />
      </Campo>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <span className="text-sm">
          Resultado: <strong style={{ color: n.total ? corDesempenho(n.pct) : undefined }}>{n.liquido} pts · {n.pct}%</strong>
          {invalido && <span className="text-error text-xs ml-2">Acertos + brancos maior que o total em alguma disciplina.</span>}
        </span>
        <div className="flex gap-2">
          <Botao variante="secundario" onClick={onCancelar}>Cancelar</Botao>
          <Botao
            disabled={!f.nome.trim() || !n.total || invalido}
            onClick={() =>
              onSalvar({
                ...f,
                nome: f.nome.trim(),
                resultados: f.resultados
                  .filter((r) => Number(r.total) > 0)
                  .map((r) => ({ disciplinaId: r.disciplinaId, total: Number(r.total), acertos: Number(r.acertos) || 0, brancos: Number(r.brancos) || 0 })),
              })
            }
          >
            Salvar simulado
          </Botao>
        </div>
      </div>
    </div>
  )
}

export default function Simulados() {
  const { disciplinas, simulados, disciplinaPorId } = useConcurso()
  const { add, update, remove } = useEstudosStore()
  const [editando, setEditando] = useState(null)
  const [aberto, setAberto] = useState(null)

  const ordenados = [...simulados].sort((a, b) => a.data.localeCompare(b.data))
  const notas = ordenados.map((s) => ({ s, n: notaSimulado(s) }))
  const melhor = notas.reduce((m, x) => (!m || x.n.pct > m.n.pct ? x : m), null)
  const media = notas.length ? Math.round(notas.reduce((a, x) => a + x.n.pct, 0) / notas.length) : 0

  // Média por disciplina em todos os simulados
  const porDisc = disciplinas
    .map((d) => {
      let t = 0
      let a = 0
      simulados.forEach((s) => s.resultados.filter((r) => r.disciplinaId === d.id).forEach((r) => { t += r.total; a += r.acertos }))
      return { d, t, p: pct(a, t) }
    })
    .filter((x) => x.t > 0)
    .sort((x, y) => x.p - y.p)

  if (!disciplinas.length) return <Vazio titulo="Nenhuma disciplina" texto="Cadastre as disciplinas no edital para registrar simulados." />

  return (
    <div>
      <PageHeader
        titulo="Simulados"
        descricao="Registre o resultado de cada simulado por disciplina e acompanhe sua evolução até a prova."
        acoes={<Botao onClick={() => setEditando('novo')}>+ Registrar simulado</Botao>}
      />

      {simulados.length === 0 ? (
        <Vazio titulo="Nenhum simulado ainda" texto="Fazer simulados com tempo de prova é a melhor forma de treinar gestão de tempo e medir sua evolução." acao={<Botao onClick={() => setEditando('novo')}>Registrar o primeiro</Botao>} />
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
            <Card className="p-5"><div className="text-[11px] uppercase tracking-widest text-muted font-semibold">Simulados</div><div className="font-syne text-2xl font-black mt-1">{simulados.length}</div></Card>
            <Card className="p-5"><div className="text-[11px] uppercase tracking-widest text-muted font-semibold">Média</div><div className="font-syne text-2xl font-black mt-1" style={{ color: corDesempenho(media) }}>{media}%</div></Card>
            <Card className="p-5"><div className="text-[11px] uppercase tracking-widest text-muted font-semibold">Melhor</div><div className="font-syne text-2xl font-black mt-1">{melhor?.n.pct}%</div><div className="text-xs text-muted truncate">{melhor?.s.nome}</div></Card>
            <Card className="p-5"><div className="text-[11px] uppercase tracking-widest text-muted font-semibold">Último</div><div className="font-syne text-2xl font-black mt-1">{notas.at(-1)?.n.pct}%</div><div className="text-xs text-muted">{formatDia(notas.at(-1).s.data)}</div></Card>
          </div>

          <div className="grid lg:grid-cols-[1fr_320px] gap-5 mb-5">
            <Card className="p-5">
              <CardTitulo>Evolução (% de aproveitamento)</CardTitulo>
              <GraficoLinha pontos={notas.slice(-12).map(({ s, n }) => ({ valor: n.pct, label: formatDia(s.data).slice(0, 5) }))} altura={150} />
            </Card>
            <Card className="p-5">
              <CardTitulo>Média por disciplina</CardTitulo>
              <div className="flex flex-col gap-2.5">
                {porDisc.map(({ d, p }) => (
                  <div key={d.id}>
                    <div className="flex justify-between text-xs mb-1"><span className="truncate">{d.nome}</span><strong style={{ color: corDesempenho(p) }}>{p}%</strong></div>
                    <Barra pct={p} cor={corDesempenho(p)} />
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <Card className="p-5">
            <CardTitulo>Todos os simulados</CardTitulo>
            {[...notas].reverse().map(({ s, n }) => (
              <div key={s.id} className="border-t border-border first:border-t-0">
                <button onClick={() => setAberto(aberto === s.id ? null : s.id)} className="w-full flex items-center gap-3 py-3 text-left">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm truncate">{s.nome}</div>
                    <div className="text-xs text-muted">{formatDia(s.data)}{s.banca && ` · ${s.banca}`}{s.duracaoMin && ` · ${s.duracaoMin} min`}</div>
                  </div>
                  {s.modo === 'cebraspe' && <Badge>C/E</Badge>}
                  <span className="text-xs text-muted hidden sm:inline">{n.acertos}✓ {n.erros}✕ {n.brancos}○</span>
                  <strong style={{ color: corDesempenho(n.pct) }}>{n.pct}%</strong>
                </button>
                {aberto === s.id && (
                  <div className="pb-4 flex flex-col gap-2">
                    {s.resultados.map((r) => {
                      const p = pct(r.acertos, r.total)
                      return (
                        <div key={r.disciplinaId} className="flex items-center gap-3 text-xs">
                          <span className="w-44 truncate flex items-center gap-2"><Ponto cor={disciplinaPorId[r.disciplinaId]?.cor} />{disciplinaPorId[r.disciplinaId]?.nome || 'Removida'}</span>
                          <Barra pct={p} cor={corDesempenho(p)} />
                          <span className="w-20 text-right text-muted">{r.acertos}/{r.total} · {p}%</span>
                        </div>
                      )
                    })}
                    {s.obs && <p className="text-xs text-muted mt-2 whitespace-pre-wrap">{s.obs}</p>}
                    <div className="flex gap-2 mt-2">
                      <Botao tamanho="sm" variante="secundario" onClick={() => setEditando(s)}>Editar</Botao>
                      <Botao tamanho="sm" variante="fantasma" className="hover:!text-error" onClick={() => confirmar('Excluir este simulado?') && remove('simulados', s.id)}>Excluir</Botao>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </Card>
        </>
      )}

      <Modal aberto={!!editando} onFechar={() => setEditando(null)} titulo={editando === 'novo' ? 'Registrar simulado' : 'Editar simulado'} largura="max-w-2xl">
        {editando && (
          <FormSimulado
            inicial={editando === 'novo' ? {} : editando}
            disciplinas={disciplinas}
            onCancelar={() => setEditando(null)}
            onSalvar={(dados) => {
              if (editando === 'novo') add('simulados', dados)
              else update('simulados', editando.id, dados)
              setEditando(null)
            }}
          />
        )}
      </Modal>
    </div>
  )
}
