import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  useConcurso, useEstudosStore, CORES, DIFICULDADES, STATUS_TOPICO,
  achatarArvore, descendentesDe, formatDia, formatMinutos, parseEdital, pct, progressoTopicos, corDesempenho,
} from '../../../store/estudosStore'
import { Abas, Badge, Barra, Botao, Campo, Card, Input, Modal, PageHeader, Ponto, Select, Textarea, Vazio, confirmar, cx } from '../ui'

const PROXIMO_STATUS = { pendente: 'estudando', estudando: 'concluido', concluido: 'pendente' }

function FormDisciplina({ inicial, onSalvar, onCancelar }) {
  const [f, setF] = useState({ nome: '', peso: 1, dificuldade: 2, qtdQuestoes: 0, cor: CORES[0], ...inicial })
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (f.nome.trim()) onSalvar({ ...f, nome: f.nome.trim(), peso: Number(f.peso) || 1, dificuldade: Number(f.dificuldade), qtdQuestoes: Number(f.qtdQuestoes) || 0 })
      }}
      className="flex flex-col gap-4"
    >
      <Campo label="Nome *">
        <Input autoFocus value={f.nome} onChange={set('nome')} placeholder="Direito Administrativo" />
      </Campo>
      <div className="grid grid-cols-3 gap-3">
        <Campo label="Peso na prova">
          <Input type="number" min="1" max="10" value={f.peso} onChange={set('peso')} />
        </Campo>
        <Campo label="Nº de questões">
          <Input type="number" min="0" value={f.qtdQuestoes} onChange={set('qtdQuestoes')} />
        </Campo>
        <Campo label="Sua dificuldade">
          <Select value={f.dificuldade} onChange={set('dificuldade')}>
            {DIFICULDADES.map((d) => (
              <option key={d.id} value={d.id}>{d.label}</option>
            ))}
          </Select>
        </Campo>
      </div>
      <Campo label="Cor">
        <div className="flex gap-2 flex-wrap">
          {CORES.map((c) => (
            <button type="button" key={c} onClick={() => setF({ ...f, cor: c })} className={cx('w-7 h-7 rounded-full border-2', f.cor === c ? 'border-text' : 'border-transparent')} style={{ background: c }} aria-label={c} />
          ))}
        </div>
      </Campo>
      <div className="flex gap-2 justify-end">
        <Botao variante="secundario" onClick={onCancelar}>Cancelar</Botao>
        <Botao type="submit" disabled={!f.nome.trim()}>Salvar</Botao>
      </div>
    </form>
  )
}

function ModalImportar({ aberto, onFechar, disciplina, parent }) {
  const { importarTopicos, addDisciplina } = useEstudosStore()
  const [texto, setTexto] = useState('')
  const geral = !disciplina
  const previa = useMemo(() => parseEdital(texto, geral), [texto, geral])
  const totalItens = previa.reduce((a, d) => a + d.itens.length, 0)

  const importar = () => {
    previa.forEach((bloco) => {
      let alvo = disciplina?.id
      if (geral) {
        if (!bloco.nome) return
        alvo = addDisciplina({ nome: bloco.nome }).id
      }
      importarTopicos(alvo, bloco.itens, parent?.id || null)
    })
    setTexto('')
    onFechar()
  }

  const exemplo = geral
    ? '# Direito Administrativo\n1. Princípios da Administração Pública\n2. Atos administrativos\n2.1 Conceito e requisitos\n2.2 Atributos\n3. Licitações (Lei 14.133/2021)\n\n# Língua Portuguesa\n1. Compreensão de textos\n2. Ortografia oficial'
    : '1. Princípios\n2. Atos administrativos\n2.1 Requisitos\n2.2 Atributos\n  - Presunção de legitimidade\n  - Autoexecutoriedade'

  return (
    <Modal aberto={aberto} onFechar={onFechar} titulo={geral ? 'Importar edital completo' : `Importar tópicos em ${parent ? parent.nome : disciplina.nome}`} largura="max-w-3xl">
      <p className="text-muted text-xs mb-3">
        Cole o conteúdo programático. Numeração (1, 1.1, 1.1.1) ou recuo de 2 espaços definem os subníveis.
        {geral && ' Linhas começando com # criam uma disciplina.'}
      </p>
      <div className="grid md:grid-cols-2 gap-4">
        <Textarea rows={14} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder={exemplo} className="font-mono text-xs" />
        <div className="bg-bg border border-border rounded-xl p-3 overflow-auto max-h-[330px] text-xs">
          {totalItens === 0 && !previa.some((p) => p.nome) ? (
            <p className="text-muted">A prévia aparece aqui.</p>
          ) : (
            previa.map((b, i) => (
              <div key={i} className="mb-3">
                {b.nome && <div className="font-bold text-accent mb-1">{b.nome}</div>}
                {b.itens.map((it, j) => (
                  <div key={j} style={{ paddingLeft: it.nivel * 14 }} className="py-0.5">
                    <span className="text-muted">{it.nivel ? '└ ' : '• '}</span>
                    {it.nome}
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      </div>
      <div className="flex justify-between items-center mt-4">
        <span className="text-xs text-muted">
          {geral && `${previa.filter((p) => p.nome).length} disciplinas · `}
          {totalItens} tópicos
        </span>
        <div className="flex gap-2">
          <Botao variante="secundario" onClick={onFechar}>Cancelar</Botao>
          <Botao onClick={importar} disabled={!totalItens && !previa.some((p) => p.nome)}>Importar</Botao>
        </div>
      </div>
    </Modal>
  )
}

function ModalTopico({ topico, onFechar }) {
  const { update, setStatusTopico, agendarRevisoes, removeTopico } = useEstudosStore()
  const { sessoes, questoes, revisoes, notas, disciplinaPorId } = useConcurso()
  const navigate = useNavigate()
  const { timerConfig } = useEstudosStore()
  if (!topico) return null

  const minutos = sessoes.filter((s) => s.topicoId === topico.id).reduce((a, s) => a + s.minutos, 0)
  const qs = questoes.filter((q) => q.topicoId === topico.id)
  const qT = qs.reduce((a, q) => a + q.total, 0)
  const qA = qs.reduce((a, q) => a + q.acertos, 0)
  const revs = revisoes.filter((r) => r.topicoId === topico.id).sort((a, b) => a.dataPrevista.localeCompare(b.dataPrevista))
  const notasTopico = notas.filter((n) => n.topicoId === topico.id)

  return (
    <Modal aberto onFechar={onFechar} titulo="Detalhes do tópico" largura="max-w-2xl">
      <div className="flex flex-col gap-4">
        <div className="text-xs text-muted flex items-center gap-2">
          <Ponto cor={disciplinaPorId[topico.disciplinaId]?.cor} />
          {disciplinaPorId[topico.disciplinaId]?.nome}
        </div>
        <Campo label="Nome">
          <Input value={topico.nome} onChange={(e) => update('topicos', topico.id, { nome: e.target.value })} />
        </Campo>
        <Campo label="Status">
          <div className="flex gap-2 flex-wrap">
            {Object.entries(STATUS_TOPICO).map(([id, s]) => (
              <button
                key={id}
                onClick={() => setStatusTopico(topico.id, id)}
                className={cx('text-xs font-semibold px-3 py-1.5 rounded-full border', topico.status === id ? '' : 'border-border text-muted')}
                style={topico.status === id ? { color: s.cor, borderColor: s.cor } : undefined}
              >
                {s.label}
              </button>
            ))}
          </div>
        </Campo>
        <div className="grid grid-cols-3 gap-3 text-center">
          <Card className="p-3"><div className="font-bold">{formatMinutos(minutos)}</div><div className="text-[10px] text-muted">estudado</div></Card>
          <Card className="p-3"><div className="font-bold">{qT}</div><div className="text-[10px] text-muted">questões</div></Card>
          <Card className="p-3"><div className="font-bold" style={{ color: qT ? corDesempenho(pct(qA, qT)) : undefined }}>{qT ? `${pct(qA, qT)}%` : '—'}</div><div className="text-[10px] text-muted">acerto</div></Card>
        </div>
        <Campo label="Anotações rápidas / fontes (livro, aula, artigo de lei)">
          <Textarea rows={4} value={topico.notas || ''} onChange={(e) => update('topicos', topico.id, { notas: e.target.value })} placeholder="Ex.: Aula 05 do curso X · Art. 37 CF · Livro Y cap. 3" />
        </Campo>
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-muted">Revisões</span>
            {!revs.some((r) => !r.feita) && (
              <Botao tamanho="sm" variante="secundario" onClick={() => agendarRevisoes(topico.id)}>Agendar revisões (1/7/30/90 dias)</Botao>
            )}
          </div>
          {revs.length === 0 ? (
            <p className="text-xs text-muted">Nenhuma revisão. Elas são criadas automaticamente ao concluir o tópico.</p>
          ) : (
            <div className="flex gap-2 flex-wrap">
              {revs.map((r) => (
                <Badge key={r.id} cor={r.feita ? 'var(--success)' : 'var(--muted)'}>
                  {r.feita ? '✓ ' : ''}R{r.etapa} · {formatDia(r.dataPrevista)}
                </Badge>
              ))}
            </div>
          )}
        </div>
        {notasTopico.length > 0 && (
          <div className="text-xs text-muted">{notasTopico.length} anotação(ões) no caderno vinculadas a este tópico.</div>
        )}
        <div className="flex gap-2 justify-between flex-wrap pt-2 border-t border-border">
          <Botao variante="fantasma" className="hover:!text-error" onClick={() => confirmar('Excluir este tópico e seus subtópicos?') && (removeTopico(topico.id), onFechar())}>
            Excluir
          </Botao>
          <div className="flex gap-2">
            <Botao
              variante="secundario"
              onClick={() => {
                timerConfig({ disciplinaId: topico.disciplinaId, topicoId: topico.id })
                navigate('/estudos/cronometro')
              }}
            >
              ◷ Estudar agora
            </Botao>
            <Botao onClick={onFechar}>Fechar</Botao>
          </div>
        </div>
      </div>
    </Modal>
  )
}

function ArvoreTopicos({ disciplina, filtro, busca, onAbrir, onImportar }) {
  const { topicos, questoes } = useConcurso()
  const { addTopico, setStatusTopico, removeTopico } = useEstudosStore()
  const [recolhidos, setRecolhidos] = useState({})
  const [adicionandoEm, setAdicionandoEm] = useState(null) // id do pai ou 'raiz'
  const [novo, setNovo] = useState('')

  const lista = achatarArvore(topicos, disciplina.id)
  const acertoPorTopico = useMemo(() => {
    const m = {}
    questoes.forEach((q) => {
      if (!q.topicoId) return
      m[q.topicoId] = m[q.topicoId] || { t: 0, a: 0 }
      m[q.topicoId].t += q.total
      m[q.topicoId].a += q.acertos
    })
    return m
  }, [questoes])

  // Filtros: mantém ancestrais de itens que batem para preservar a hierarquia
  const termo = busca.trim().toLowerCase()
  const filtrando = filtro !== 'todos' || termo
  const visiveisPorFiltro = useMemo(() => {
    if (!filtrando) return null
    const ok = new Set()
    const porId = Object.fromEntries(lista.map((l) => [l.topico.id, l.topico]))
    lista.forEach(({ topico }) => {
      const bateStatus = filtro === 'todos' || topico.status === filtro
      const bateBusca = !termo || topico.nome.toLowerCase().includes(termo)
      if (bateStatus && bateBusca) {
        let atual = topico
        while (atual) {
          ok.add(atual.id)
          atual = atual.parentId ? porId[atual.parentId] : null
        }
      }
    })
    return ok
  }, [lista, filtro, termo, filtrando])

  const temFilhos = new Set(topicos.filter((t) => t.disciplinaId === disciplina.id).map((t) => t.parentId).filter(Boolean))
  const escondido = (topico) => {
    if (visiveisPorFiltro && !visiveisPorFiltro.has(topico.id)) return true
    if (filtrando) return false
    let pid = topico.parentId
    const porId = Object.fromEntries(lista.map((l) => [l.topico.id, l.topico]))
    while (pid) {
      if (recolhidos[pid]) return true
      pid = porId[pid]?.parentId
    }
    return false
  }

  const salvarNovo = (e) => {
    e.preventDefault()
    novo.split(/[\n;]/).map((s) => s.trim()).filter(Boolean).forEach((nome) => addTopico(disciplina.id, nome, adicionandoEm === 'raiz' ? null : adicionandoEm))
    setNovo('')
  }

  const formNovo = (nivel) => (
    <form onSubmit={salvarNovo} className="flex gap-2 py-1.5" style={{ paddingLeft: nivel * 20 + 28 }}>
      <Input autoFocus value={novo} onChange={(e) => setNovo(e.target.value)} placeholder="Nome do tópico (use ; para vários)" className="!py-1.5" onKeyDown={(e) => e.key === 'Escape' && setAdicionandoEm(null)} />
      <Botao type="submit" tamanho="sm" disabled={!novo.trim()}>Adicionar</Botao>
      <Botao tamanho="sm" variante="fantasma" onClick={() => setAdicionandoEm(null)}>✕</Botao>
    </form>
  )

  return (
    <div className="flex flex-col">
      {lista.length === 0 && adicionandoEm !== 'raiz' && (
        <p className="text-muted text-sm py-3">Nenhum tópico. Adicione manualmente ou importe o conteúdo programático do edital.</p>
      )}
      {lista.map(({ topico, nivel, numero }) => {
        if (escondido(topico)) return null
        const st = STATUS_TOPICO[topico.status]
        const ac = acertoPorTopico[topico.id]
        const pai = temFilhos.has(topico.id)
        const prog = pai ? progressoTopicos(topicos.filter((t) => descendentesDe(topicos, topico.id).includes(t.id))) : null
        return (
          <div key={topico.id}>
            <div className="group flex items-center gap-2 py-1.5 rounded-lg hover:bg-bg pr-2" style={{ paddingLeft: nivel * 20 }}>
              <button
                onClick={() => pai && setRecolhidos({ ...recolhidos, [topico.id]: !recolhidos[topico.id] })}
                className={cx('w-5 text-[10px] text-muted flex-shrink-0', !pai && 'invisible')}
                aria-label="Expandir"
              >
                {recolhidos[topico.id] ? '▶' : '▼'}
              </button>
              <button
                onClick={() => setStatusTopico(topico.id, PROXIMO_STATUS[topico.status])}
                title={`${st.label} — clique para mudar`}
                className="w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center text-[9px]"
                style={{ borderColor: st.cor, background: topico.status === 'concluido' ? st.cor : 'transparent', color: 'var(--bg)' }}
              >
                {topico.status === 'concluido' ? '✓' : topico.status === 'estudando' ? <span className="w-1.5 h-1.5 rounded-full" style={{ background: st.cor }} /> : null}
              </button>
              <span className="text-[11px] text-muted tabular-nums flex-shrink-0">{numero}</span>
              <button onClick={() => onAbrir(topico)} className={cx('flex-1 text-left text-sm min-w-0 truncate', pai && 'font-semibold', topico.status === 'concluido' && !pai && 'text-muted line-through')}>
                {topico.nome}
                {topico.notas && <span className="ml-1.5 text-[10px] text-accent">✎</span>}
              </button>
              {prog && <span className="text-[10px] text-muted hidden sm:inline">{prog.feitas}/{prog.total}</span>}
              {ac && (
                <span className="text-[10px] font-semibold hidden sm:inline" style={{ color: corDesempenho(pct(ac.a, ac.t)) }}>
                  {pct(ac.a, ac.t)}% ({ac.t}q)
                </span>
              )}
              <div className="flex gap-1 sm:opacity-0 group-hover:opacity-100 transition">
                <button onClick={() => { setAdicionandoEm(topico.id); setRecolhidos({ ...recolhidos, [topico.id]: false }) }} className="text-[11px] text-muted hover:text-accent px-1" title="Adicionar subtópico">
                  +sub
                </button>
                <button onClick={() => onImportar(topico)} className="text-[11px] text-muted hover:text-accent px-1" title="Importar subtópicos">
                  ⇣
                </button>
                <button onClick={() => confirmar(`Excluir "${topico.nome}"${pai ? ' e todos os subtópicos' : ''}?`) && removeTopico(topico.id)} className="text-[11px] text-muted hover:text-error px-1" title="Excluir">
                  ✕
                </button>
              </div>
            </div>
            {adicionandoEm === topico.id && formNovo(nivel + 1)}
          </div>
        )
      })}
      {filtrando && visiveisPorFiltro?.size === 0 && lista.length > 0 && <p className="text-muted text-xs py-2">Nenhum tópico corresponde ao filtro.</p>}
      {adicionandoEm === 'raiz' ? (
        formNovo(0)
      ) : (
        <div className="flex gap-2 pt-2">
          <Botao tamanho="sm" variante="secundario" onClick={() => setAdicionandoEm('raiz')}>+ Tópico</Botao>
          <Botao tamanho="sm" variante="fantasma" onClick={() => onImportar(null)}>⇣ Importar lista</Botao>
        </div>
      )}
    </div>
  )
}

export default function Edital() {
  const { disciplinas, topicos, sessoes, questoes, topicoPorId } = useConcurso()
  const { addDisciplina, update, removeDisciplina } = useEstudosStore()
  const [modalDisc, setModalDisc] = useState(null) // 'nova' | disciplina
  const [importar, setImportar] = useState(null) // { disciplina, parent } | 'geral'
  const [abertas, setAbertas] = useState({})
  const [topicoAberto, setTopicoAberto] = useState(null)
  const [filtro, setFiltro] = useState('todos')
  const [busca, setBusca] = useState('')

  const geral = progressoTopicos(topicos)
  const contagem = (st) => topicos.filter((t) => t.status === st).length
  const filtrando = filtro !== 'todos' || busca.trim()

  return (
    <div>
      <PageHeader
        titulo="Edital verticalizado"
        descricao="Disciplinas → tópicos → subtópicos, em quantos níveis precisar. Clique no círculo para mudar o status; ao concluir, as revisões espaçadas são agendadas."
        acoes={
          <>
            <Botao variante="secundario" onClick={() => setImportar('geral')}>⇣ Importar edital</Botao>
            <Botao onClick={() => setModalDisc('nova')}>+ Disciplina</Botao>
          </>
        }
      />

      {disciplinas.length === 0 ? (
        <Vazio
          titulo="Monte seu edital"
          texto="Cadastre as disciplinas uma a uma ou cole o conteúdo programático completo do edital e deixe a plataforma montar a estrutura."
          acao={
            <div className="flex gap-2">
              <Botao variante="secundario" onClick={() => setImportar('geral')}>Importar edital</Botao>
              <Botao onClick={() => setModalDisc('nova')}>Adicionar disciplina</Botao>
            </div>
          }
        />
      ) : (
        <>
          <Card className="p-5 mb-5">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mb-3">
              <div className="font-syne text-3xl font-black">{geral.pct}%</div>
              <div className="text-sm text-muted">
                {geral.feitas} de {geral.total} tópicos concluídos · {disciplinas.length} disciplinas
              </div>
            </div>
            <Barra pct={geral.pct} altura="h-2" />
          </Card>

          <div className="flex flex-col sm:flex-row gap-3 sm:items-start mb-2">
            <Abas
              valor={filtro}
              onChange={setFiltro}
              abas={[
                { id: 'todos', label: 'Todos', contador: topicos.length },
                { id: 'pendente', label: 'Não iniciados', contador: contagem('pendente') },
                { id: 'estudando', label: 'Estudando', contador: contagem('estudando') },
                { id: 'concluido', label: 'Concluídos', contador: contagem('concluido') },
              ]}
            />
            <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar tópico…" className="sm:max-w-xs sm:ml-auto !py-1.5" />
          </div>

          <div className="flex flex-col gap-3">
            {disciplinas.map((d) => {
              const tops = topicos.filter((t) => t.disciplinaId === d.id)
              const prog = progressoTopicos(tops)
              const min = sessoes.filter((s) => s.disciplinaId === d.id).reduce((a, s) => a + s.minutos, 0)
              const qs = questoes.filter((q) => q.disciplinaId === d.id)
              const qT = qs.reduce((a, q) => a + q.total, 0)
              const qA = qs.reduce((a, q) => a + q.acertos, 0)
              const aberta = filtrando ? true : abertas[d.id] ?? false
              return (
                <Card key={d.id}>
                  <div className="flex items-center gap-3 p-4">
                    <button onClick={() => setAbertas({ ...abertas, [d.id]: !aberta })} className="flex-1 flex items-center gap-3 text-left min-w-0">
                      <Ponto cor={d.cor} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <strong className="truncate">{d.nome}</strong>
                          {d.peso > 1 && <Badge cor="var(--accent2)">peso {d.peso}</Badge>}
                          {d.qtdQuestoes > 0 && <Badge>{d.qtdQuestoes} questões</Badge>}
                          <Badge cor={d.dificuldade === 3 ? 'var(--error)' : d.dificuldade === 1 ? 'var(--success)' : '#fbbf24'}>
                            {DIFICULDADES.find((x) => x.id === Number(d.dificuldade))?.label}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 mt-2">
                          <div className="w-full max-w-xs"><Barra pct={prog.pct} cor={d.cor} /></div>
                          <span className="text-[11px] text-muted whitespace-nowrap">{prog.feitas}/{prog.total}</span>
                        </div>
                      </div>
                      <div className="hidden sm:flex gap-5 text-right text-xs">
                        <div><div className="font-semibold">{formatMinutos(min)}</div><div className="text-muted text-[10px]">tempo</div></div>
                        <div><div className="font-semibold" style={{ color: qT ? corDesempenho(pct(qA, qT)) : undefined }}>{qT ? `${pct(qA, qT)}%` : '—'}</div><div className="text-muted text-[10px]">acerto</div></div>
                      </div>
                      <span className="text-muted text-xs">{aberta ? '▲' : '▼'}</span>
                    </button>
                  </div>
                  {aberta && (
                    <div className="border-t border-border px-3 sm:px-4 py-3">
                      <ArvoreTopicos
                        disciplina={d}
                        filtro={filtro}
                        busca={busca}
                        onAbrir={(t) => setTopicoAberto(t.id)}
                        onImportar={(parent) => setImportar({ disciplina: d, parent })}
                      />
                      <div className="flex gap-3 justify-end mt-3 pt-3 border-t border-border">
                        <button className="text-xs text-muted hover:text-text" onClick={() => setModalDisc(d)}>Editar disciplina</button>
                        <button
                          className="text-xs text-muted hover:text-error"
                          onClick={() => confirmar(`Excluir "${d.nome}" com tópicos, sessões, questões, revisões, flashcards e anotações?`) && removeDisciplina(d.id)}
                        >
                          Excluir disciplina
                        </button>
                      </div>
                    </div>
                  )}
                </Card>
              )
            })}
          </div>
        </>
      )}

      <Modal aberto={!!modalDisc} onFechar={() => setModalDisc(null)} titulo={modalDisc === 'nova' ? 'Nova disciplina' : 'Editar disciplina'}>
        {modalDisc && (
          <FormDisciplina
            inicial={modalDisc === 'nova' ? { cor: CORES[disciplinas.length % CORES.length] } : modalDisc}
            onCancelar={() => setModalDisc(null)}
            onSalvar={(dados) => {
              if (modalDisc === 'nova') {
                const nova = addDisciplina(dados)
                setAbertas({ ...abertas, [nova.id]: true })
              } else update('disciplinas', modalDisc.id, dados)
              setModalDisc(null)
            }}
          />
        )}
      </Modal>

      {importar && (
        <ModalImportar
          aberto
          onFechar={() => setImportar(null)}
          disciplina={importar === 'geral' ? null : importar.disciplina}
          parent={importar === 'geral' ? null : importar.parent}
        />
      )}

      <ModalTopico topico={topicoPorId[topicoAberto]} onFechar={() => setTopicoAberto(null)} />
    </div>
  )
}

