import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useConcurso, useEstudosStore, diaKey, pct, corDesempenho } from '../../../store/estudosStore'
import { banco, estiloPadrao } from '../ia'
import Markdown from '../Markdown'
import { Abas, Badge, Barra, Botao, Card, CardTitulo, Input, PageHeader, Ponto, Select, Vazio, confirmar, cx } from '../ui'
import { Carregando, salvarNoCaderno } from '../sala/comum'
import { notaSimulado } from '../paginas/Simulados'
import { formatRelogio } from '../useTimer'

const CHAVE_ANDAMENTO = 'mk_simulado_andamento'
const LETRAS = 'ABCDEF'

const lerAndamento = () => {
  try {
    return JSON.parse(localStorage.getItem(CHAVE_ANDAMENTO) || 'null')
  } catch {
    return null
  }
}
const gravarAndamento = (v) => {
  try {
    if (v) localStorage.setItem(CHAVE_ANDAMENTO, JSON.stringify(v))
    else localStorage.removeItem(CHAVE_ANDAMENTO)
  } catch {
    /* sem storage: o simulado só não sobrevive a um recarregamento */
  }
}

/* ───────────── Montagem ───────────── */

function Configurar({ onComecar, onCancelar }) {
  const { concurso, disciplinas, simulados, exercicios } = useConcurso()
  const [nome, setNome] = useState(`Simulado ${simulados.length + 1}`)
  const [estilo, setEstilo] = useState(estiloPadrao(concurso?.banca))
  const [qtd, setQtd] = useState(() => Object.fromEntries(disciplinas.map((d) => [d.id, d.qtdQuestoes > 0 ? Math.min(d.qtdQuestoes, 60) : 10])))
  const [marcadas, setMarcadas] = useState(() => Object.fromEntries(disciplinas.map((d) => [d.id, true])))
  const [minPorQuestao, setMinPorQuestao] = useState(3)
  const [montado, setMontado] = useState(null)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState(null)

  const escolhidas = disciplinas.filter((d) => marcadas[d.id] && Number(qtd[d.id]) > 0)
  const totalPedido = escolhidas.reduce((a, d) => a + Number(qtd[d.id]), 0)

  // Questões que você já fez (na sala ou em simulados) vão para o fim da fila
  const jaVistas = useMemo(
    () => [...new Set([...exercicios.map((e) => e.bancoId), ...simulados.flatMap((s) => (s.itensBanco || []).map((i) => i.id))].filter(Boolean))],
    [exercicios, simulados]
  )

  const montar = async () => {
    setErro(null)
    setCarregando(true)
    try {
      const r = await banco('simulado', {
        estilo,
        evitar: jaVistas,
        itens: escolhidas.map((d) => ({ disciplinaId: d.id, disciplina: d.nome, quantidade: Number(qtd[d.id]) })),
      })
      setMontado(r.itens)
    } catch (e) {
      setErro(e.message)
    } finally {
      setCarregando(false)
    }
  }

  if (montado) {
    const total = montado.reduce((a, i) => a + i.questoes.length, 0)
    const faltando = montado.filter((i) => i.questoes.length < i.pedidas)
    return (
      <Card className="p-6 flex flex-col gap-4 max-w-2xl">
        <CardTitulo>Simulado montado</CardTitulo>
        {montado.map((i) => (
          <div key={i.disciplinaId} className="flex items-center gap-3 text-sm">
            <span className="flex-1 truncate">{i.disciplina}</span>
            <span className={i.questoes.length < i.pedidas ? 'text-error' : 'text-muted'}>{i.questoes.length} de {i.pedidas}</span>
          </div>
        ))}
        {faltando.length > 0 && (
          <p className="text-xs text-muted border-t border-border pt-3">
            O banco ainda não tem questões suficientes em {faltando.map((f) => f.disciplina).join(', ')}.{' '}
            <Link to="/estudos/banco" className="text-accent">Gere mais no Banco de questões</Link> (em lote, pela metade do preço) ou pelas salas de estudo.
          </p>
        )}
        <div className="flex gap-2 justify-end">
          <Botao variante="secundario" onClick={() => setMontado(null)}>Voltar</Botao>
          <Botao
            disabled={!total}
            onClick={() =>
              onComecar({
                nome: nome.trim() || 'Simulado',
                estilo,
                duracaoMin: Math.round(total * Number(minPorQuestao || 0)),
                questoes: montado.flatMap((i) => i.questoes.map((q) => ({ ...q, disciplinaId: i.disciplinaId }))),
              })
            }
          >
            Começar ({total} questões{minPorQuestao > 0 ? ` · ${Math.round(total * minPorQuestao)} min` : ''})
          </Botao>
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-6 flex flex-col gap-5 max-w-2xl">
      <div className="grid sm:grid-cols-2 gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-muted">Nome</span>
          <Input value={nome} onChange={(e) => setNome(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-muted">Formato</span>
          <Select value={estilo} onChange={(e) => setEstilo(e.target.value)}>
            <option value="multipla">Múltipla escolha (A–E)</option>
            <option value="certo_errado">Certo ou errado (1 erro anula 1 acerto)</option>
          </Select>
        </label>
      </div>
      <div className="border border-border rounded-xl overflow-hidden">
        <div className="grid grid-cols-[auto_1fr_90px] gap-3 px-3 py-2 text-[11px] text-muted font-semibold bg-bg">
          <span />
          <span>Disciplina</span>
          <span className="text-center">Questões</span>
        </div>
        {disciplinas.map((d) => (
          <label key={d.id} className="grid grid-cols-[auto_1fr_90px] gap-3 px-3 py-1.5 items-center border-t border-border cursor-pointer">
            <input type="checkbox" checked={!!marcadas[d.id]} onChange={(e) => setMarcadas({ ...marcadas, [d.id]: e.target.checked })} className="w-4 h-4 accent-[var(--accent)]" />
            <span className="text-sm truncate flex items-center gap-2"><Ponto cor={d.cor} />{d.nome}</span>
            <Input type="number" min="1" max="120" value={qtd[d.id]} disabled={!marcadas[d.id]} onChange={(e) => setQtd({ ...qtd, [d.id]: e.target.value })} className="!py-1 text-center" />
          </label>
        ))}
      </div>
      <label className="flex items-center gap-3 text-sm">
        <span className="text-muted">Tempo por questão</span>
        <Select value={minPorQuestao} onChange={(e) => setMinPorQuestao(Number(e.target.value))} className="!w-auto">
          <option value={0}>Sem limite</option>
          <option value={2}>2 min</option>
          <option value={3}>3 min</option>
          <option value={4}>4 min</option>
        </Select>
        <span className="text-muted text-xs">{totalPedido} questões{minPorQuestao ? ` · ${Math.round(totalPedido * minPorQuestao)} min de prova` : ''}</span>
      </label>
      <p className="text-xs text-muted">As questões vêm do banco de questões salvo (sem gastar créditos de IA), priorizando as que você ainda não fez.</p>
      {erro && <p className="text-sm text-error">{erro}</p>}
      <div className="flex gap-2 justify-end">
        <Botao variante="secundario" onClick={onCancelar}>Cancelar</Botao>
        <Botao disabled={!totalPedido || carregando} onClick={montar}>{carregando ? 'Montando…' : 'Montar simulado'}</Botao>
      </div>
    </Card>
  )
}

/* ───────────── Prova ───────────── */

function Prova({ prova, setProva, onFinalizar }) {
  const { disciplinaPorId } = useConcurso()
  const [agora, setAgora] = useState(Date.now())
  const { questoes, respostas, atual } = prova
  const q = questoes[atual]
  const decorrido = Math.floor((agora - prova.inicio) / 1000)
  const limite = prova.duracaoMin * 60
  const restante = limite ? Math.max(0, limite - decorrido) : null
  const respondidas = Object.values(respostas).filter((r) => r != null).length

  useEffect(() => {
    const t = setInterval(() => setAgora(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (restante === 0) onFinalizar()
  }, [restante, onFinalizar])

  const ir = (i) => setProva({ ...prova, atual: Math.max(0, Math.min(questoes.length - 1, i)) })
  const marcar = (alt) => setProva({ ...prova, respostas: { ...respostas, [atual]: respostas[atual] === alt ? null : alt } })

  return (
    <div className="flex flex-col gap-4">
      <Card className="p-4 flex items-center gap-4 flex-wrap sticky top-2 z-30 shadow-xl">
        <div className="flex-1 min-w-0">
          <div className="font-semibold truncate">{prova.nome}</div>
          <div className="text-xs text-muted">{respondidas} de {questoes.length} respondidas</div>
        </div>
        <div className={cx('font-syne text-2xl font-black tabular-nums', restante !== null && restante < 300 && 'text-error')}>
          {formatRelogio(restante ?? decorrido)}
        </div>
        <Botao
          variante="sucesso"
          onClick={() => confirmar(respondidas < questoes.length ? `Você deixou ${questoes.length - respondidas} em branco. Finalizar mesmo assim?` : 'Finalizar e ver a correção?') && onFinalizar()}
        >
          Finalizar
        </Botao>
      </Card>

      <Card className="p-6 sm:p-8">
        <div className="flex items-center gap-2 text-xs text-muted mb-4">
          <span className="font-bold text-text">Questão {atual + 1}</span>
          <span>de {questoes.length}</span>
          <span className="flex items-center gap-1.5 ml-2"><Ponto cor={disciplinaPorId[q.disciplinaId]?.cor} />{disciplinaPorId[q.disciplinaId]?.nome || q.disciplina}</span>
        </div>
        <p className="text-[15px] leading-relaxed whitespace-pre-wrap mb-5">{q.enunciado}</p>
        <div className={cx('gap-2', q.estilo === 'certo_errado' ? 'grid grid-cols-2' : 'flex flex-col')}>
          {q.alternativas.map((alt, i) => (
            <button
              key={i}
              onClick={() => marcar(i)}
              className={cx(
                'text-left text-sm border rounded-xl px-4 py-2.5 transition flex gap-3 items-start',
                respostas[atual] === i ? 'border-accent bg-bg text-accent font-semibold' : 'border-border hover:border-accent'
              )}
            >
              {q.estilo !== 'certo_errado' && <span className="font-bold w-4 flex-shrink-0">{LETRAS[i]}</span>}
              <span className={cx(q.estilo === 'certo_errado' && 'w-full text-center font-semibold')}>{alt}</span>
            </button>
          ))}
        </div>
        <div className="flex justify-between mt-6">
          <Botao variante="secundario" disabled={atual === 0} onClick={() => ir(atual - 1)}>← Anterior</Botao>
          <Botao variante="secundario" disabled={atual === questoes.length - 1} onClick={() => ir(atual + 1)}>Próxima →</Botao>
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex flex-wrap gap-1.5">
          {questoes.map((_, i) => (
            <button
              key={i}
              onClick={() => ir(i)}
              className={cx(
                'w-9 h-9 rounded-lg text-xs font-semibold border tabular-nums',
                i === atual ? 'border-accent text-accent' : respostas[i] != null ? 'border-border bg-bg text-text' : 'border-border text-muted'
              )}
            >
              {i + 1}
            </button>
          ))}
        </div>
      </Card>
    </div>
  )
}

/* ───────────── Correção ───────────── */

function QuestaoCorrigida({ q, numero, onCaderno, noCaderno, onReportar }) {
  const { disciplinaPorId } = useConcurso()
  const branco = q.resposta == null
  const acertou = q.resposta === q.correta
  const ce = q.estilo === 'certo_errado'
  return (
    <Card className={cx('p-5', branco ? '' : acertou ? 'border-success' : 'border-error')}>
      <div className="flex items-center gap-2 text-xs text-muted mb-3 flex-wrap">
        <span className="font-bold text-text">Questão {numero}</span>
        <span className="flex items-center gap-1.5"><Ponto cor={disciplinaPorId[q.disciplinaId]?.cor} />{disciplinaPorId[q.disciplinaId]?.nome || q.disciplina}</span>
        {q.assunto && <span className="truncate">· {q.assunto}</span>}
        <Badge className="ml-auto" cor={branco ? 'var(--muted)' : acertou ? 'var(--success)' : 'var(--error)'}>{branco ? 'em branco' : acertou ? '✓ acertou' : '✕ errou'}</Badge>
      </div>
      <p className="text-[15px] leading-relaxed whitespace-pre-wrap mb-4">{q.enunciado}</p>
      <div className={cx('gap-2', ce ? 'grid grid-cols-2' : 'flex flex-col')}>
        {q.alternativas.map((alt, i) => (
          <div
            key={i}
            className={cx(
              'text-sm border rounded-xl px-4 py-2.5 flex gap-3',
              i === q.correta && 'border-success text-success font-semibold bg-bg',
              i === q.resposta && i !== q.correta && 'border-error text-error line-through',
              i !== q.correta && i !== q.resposta && 'border-border opacity-60'
            )}
          >
            {!ce && <span className="font-bold w-4 flex-shrink-0">{LETRAS[i]}</span>}
            <span className={cx(ce && 'w-full text-center')}>{alt}</span>
          </div>
        ))}
      </div>
      {q.explicacao && (
        <div className="mt-4 pt-4 border-t border-border">
          <div className="text-xs font-semibold uppercase tracking-widest text-muted mb-2">Por que {ce ? `está ${q.alternativas[q.correta].toLowerCase()}` : `a resposta é ${LETRAS[q.correta]}`}</div>
          <Markdown className="text-sm">{q.explicacao}</Markdown>
        </div>
      )}
      <div className="flex gap-2 mt-3 flex-wrap">
        {!acertou && (noCaderno ? <span className="text-xs text-muted">✓ no caderno de erros</span> : <Botao tamanho="sm" variante="perigo" onClick={onCaderno}>✎ Caderno de erros</Botao>)}
        <Botao tamanho="sm" variante="fantasma" className="ml-auto hover:!text-error" onClick={onReportar}>⚑ Reportar erro</Botao>
      </div>
    </Card>
  )
}

export function CorrecaoSimulado({ simulado, questoesIniciais }) {
  const { disciplinaPorId } = useConcurso()
  const { add, update } = useEstudosStore()
  const [questoes, setQuestoes] = useState(questoesIniciais || null)
  const [erro, setErro] = useState(null)
  const [filtro, setFiltro] = useState('erradas')
  const [aviso, setAviso] = useState(null)
  const itens = simulado.itensBanco || []
  const noCaderno = new Set(simulado.cadernoIds || [])

  useEffect(() => {
    if (questoesIniciais) return
    banco('porIds', { ids: itens.map((i) => i.id) })
      .then(({ questoes: qs }) => {
        const porId = Object.fromEntries(qs.map((q) => [q.id, q]))
        setQuestoes(itens.map((i) => porId[i.id] && { ...porId[i.id], disciplinaId: i.disciplinaId, resposta: i.resposta }).filter(Boolean))
      })
      .catch((e) => setErro(e.message))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [simulado.id])

  useEffect(() => {
    if (!aviso) return
    const t = setTimeout(() => setAviso(null), 2500)
    return () => clearTimeout(t)
  }, [aviso])

  if (erro) return <p className="text-sm text-error">Não foi possível carregar a correção: {erro}</p>
  if (!questoes) return <Carregando texto="Carregando correção…" />

  const nota = notaSimulado(simulado)
  const numeradas = questoes.map((q, i) => ({ q, n: i + 1 }))
  const erradas = numeradas.filter(({ q }) => q.resposta != null && q.resposta !== q.correta)
  const lista = numeradas.filter(({ q }) =>
    filtro === 'erradas' ? q.resposta != null && q.resposta !== q.correta : filtro === 'branco' ? q.resposta == null : filtro === 'certas' ? q.resposta === q.correta : true
  )

  const mandarParaCaderno = (qs) => {
    const novos = qs.filter((q) => !noCaderno.has(q.id))
    novos.forEach((q) =>
      salvarNoCaderno(add, { disciplinaId: q.disciplinaId, id: null }, {
        tipo: 'erro',
        titulo: q.enunciado,
        conteudo: `${q.enunciado}\n\n${q.alternativas.map((a, i) => `${q.estilo === 'certo_errado' ? '' : `${LETRAS[i]}) `}${a}`).join('\n')}\n\nMinha resposta: ${q.resposta == null ? 'em branco' : q.alternativas[q.resposta]}\nGabarito: ${q.alternativas[q.correta]}\n\n${q.explicacao}\n\n(${simulado.nome}${q.assunto ? ` · ${q.assunto}` : ''})`,
      })
    )
    update('simulados', simulado.id, { cadernoIds: [...noCaderno, ...novos.map((q) => q.id)] })
    setAviso(`${novos.length} questão(ões) no caderno de erros.`)
  }

  const reportar = async (q) => {
    if (!confirmar('Esta questão tem erro (gabarito ou explicação)? Ela sai do banco e não volta em simulados.')) return
    try {
      await banco('reportar', { id: q.id })
      setAviso('Questão removida do banco. Obrigado!')
    } catch (e) {
      setAviso(`Não foi possível reportar: ${e.message}`)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4"><div className="text-[11px] uppercase tracking-widest text-muted font-semibold">Aproveitamento</div><div className="font-syne text-2xl font-black mt-1" style={{ color: corDesempenho(nota.pct) }}>{nota.pct}%</div>{simulado.modo === 'cebraspe' && <div className="text-[11px] text-muted">líquido {nota.liquido}</div>}</Card>
        <Card className="p-4"><div className="text-[11px] uppercase tracking-widest text-muted font-semibold">Acertos</div><div className="font-syne text-2xl font-black mt-1 text-success">{nota.acertos}</div></Card>
        <Card className="p-4"><div className="text-[11px] uppercase tracking-widest text-muted font-semibold">Erros</div><div className="font-syne text-2xl font-black mt-1 text-error">{nota.erros}</div></Card>
        <Card className="p-4"><div className="text-[11px] uppercase tracking-widest text-muted font-semibold">Em branco</div><div className="font-syne text-2xl font-black mt-1">{nota.brancos}</div></Card>
      </div>

      <Card className="p-5 flex flex-col gap-2">
        {simulado.resultados.map((r) => {
          const p = pct(r.acertos, r.total)
          return (
            <div key={r.disciplinaId} className="flex items-center gap-3 text-xs">
              <span className="w-44 truncate flex items-center gap-2"><Ponto cor={disciplinaPorId[r.disciplinaId]?.cor} />{disciplinaPorId[r.disciplinaId]?.nome || 'Removida'}</span>
              <Barra pct={p} cor={corDesempenho(p)} />
              <span className="w-20 text-right text-muted">{r.acertos}/{r.total} · {p}%</span>
            </div>
          )
        })}
      </Card>

      <div className="flex flex-wrap items-center gap-2">
        <Abas
          valor={filtro}
          onChange={setFiltro}
          abas={[
            { id: 'erradas', label: 'Erradas', contador: erradas.length },
            { id: 'branco', label: 'Em branco', contador: numeradas.filter(({ q }) => q.resposta == null).length },
            { id: 'certas', label: 'Certas', contador: numeradas.filter(({ q }) => q.resposta === q.correta).length },
            { id: 'todas', label: 'Todas', contador: numeradas.length },
          ]}
        />
        {erradas.some(({ q }) => !noCaderno.has(q.id)) && (
          <Botao tamanho="sm" variante="perigo" className="ml-auto mb-5" onClick={() => mandarParaCaderno(erradas.map(({ q }) => q))}>
            ✎ Todas as erradas para o caderno de erros
          </Botao>
        )}
      </div>

      {lista.length === 0 ? (
        <p className="text-sm text-muted">Nenhuma questão neste filtro.</p>
      ) : (
        lista.map(({ q, n }) => (
          <QuestaoCorrigida key={q.id} q={q} numero={n} noCaderno={noCaderno.has(q.id)} onCaderno={() => mandarParaCaderno([q])} onReportar={() => reportar(q)} />
        ))
      )}
      {aviso && <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-surface border border-success text-success text-sm rounded-xl px-4 py-2 shadow-2xl">{aviso}</div>}
    </div>
  )
}

/* ───────────── Fluxo completo ───────────── */

export default function FazerSimulado({ onSair }) {
  const { concurso, disciplinas } = useConcurso()
  const { add } = useEstudosStore()
  const [prova, setProvaEstado] = useState(() => {
    const salva = lerAndamento()
    return salva && salva.concursoId === concurso?.id ? salva : null
  })
  const provaRef = useRef(prova)
  const [resultado, setResultado] = useState(null) // { simulado, questoes }

  const setProva = (p) => {
    provaRef.current = p
    setProvaEstado(p)
    gravarAndamento(p)
  }

  const finalizar = useCallback(() => {
    const atual = provaRef.current
    if (!atual) return
    provaRef.current = null
    {
      const questoes = atual.questoes.map((q, i) => ({ ...q, resposta: atual.respostas[i] ?? null }))
      const resultados = disciplinas
        .map((d) => {
          const qs = questoes.filter((q) => q.disciplinaId === d.id)
          return {
            disciplinaId: d.id,
            total: qs.length,
            acertos: qs.filter((q) => q.resposta === q.correta).length,
            brancos: qs.filter((q) => q.resposta == null).length,
          }
        })
        .filter((r) => r.total > 0)
      const agora = new Date().toISOString()
      const simulado = add('simulados', {
        nome: atual.nome,
        data: diaKey(),
        banca: concurso?.banca || '',
        modo: atual.estilo === 'certo_errado' ? 'cebraspe' : 'normal',
        duracaoMin: Math.max(1, Math.round((Date.now() - atual.inicio) / 60000)),
        obs: '',
        resultados,
        origem: 'banco',
        itensBanco: questoes.map((q) => ({ id: q.id, disciplinaId: q.disciplinaId, resposta: q.resposta })),
      })
      // As questões respondidas entram também nas estatísticas de questões por disciplina
      resultados.forEach((r) => {
        const feitas = r.total - r.brancos
        if (feitas > 0) add('questoes', { disciplinaId: r.disciplinaId, topicoId: null, total: feitas, acertos: r.acertos, fonte: `Simulado: ${atual.nome}`, origem: 'simulado', data: agora })
      })
      gravarAndamento(null)
      setProvaEstado(null)
      setResultado({ simulado, questoes })
    }
  }, [add, concurso, disciplinas])

  if (!disciplinas.length) return <Vazio titulo="Nenhuma disciplina" texto="Cadastre as disciplinas no edital para fazer simulados." />

  if (resultado) {
    return (
      <div>
        <PageHeader titulo={`Correção · ${resultado.simulado.nome}`} descricao="O resultado já foi salvo no histórico de simulados e nas suas estatísticas." acoes={<Botao onClick={onSair}>Voltar aos simulados</Botao>} />
        <CorrecaoSimulado simulado={resultado.simulado} questoesIniciais={resultado.questoes} />
      </div>
    )
  }

  if (prova) return <Prova prova={prova} setProva={setProva} onFinalizar={finalizar} />

  return (
    <div>
      <PageHeader titulo="Fazer simulado" descricao="Monte uma prova com questões do banco, resolva com tempo e veja a correção comentada no final." />
      <Configurar
        onCancelar={onSair}
        onComecar={(cfg) => setProva({ ...cfg, concursoId: concurso?.id, respostas: {}, atual: 0, inicio: Date.now() })}
      />
    </div>
  )
}
