import { useCallback, useEffect, useMemo, useState } from 'react'
import { useConcurso, useEstudosStore, achatarArvore, formatDataHora } from '../../../store/estudosStore'
import { banco, contextoTopico, estiloPadrao, useIA } from '../ia'
import { Badge, Botao, Card, CardTitulo, Input, PageHeader, Ponto, Select, Textarea, Vazio, confirmar } from '../ui'
import { Carregando } from '../sala/comum'

// Estimativa grosseira (Batch API, metade do preço): ~US$ 0,007 por questão gerada
const CUSTO_QUESTAO_LOTE = 0.007

const EXEMPLO_IMPORTACAO = `[
  {
    "disciplina": "Direito Administrativo",
    "assunto": "Atos administrativos › Requisitos",
    "banca": "FGV",
    "enunciado": "São requisitos do ato administrativo, EXCETO:",
    "alternativas": ["Competência", "Finalidade", "Forma", "Motivo", "Autoexecutoriedade"],
    "correta": 4,
    "explicacao": "Autoexecutoriedade é atributo, não requisito. Os requisitos são competência, finalidade, forma, motivo e objeto."
  },
  {
    "disciplina": "Direito Administrativo",
    "assunto": "Poderes administrativos",
    "enunciado": "O poder de polícia é sempre discricionário.",
    "alternativas": ["Certo", "Errado"],
    "correta": 1,
    "explicacao": "Em regra é discricionário, mas há atos vinculados, como a licença."
  }
]`

function Estatisticas({ dados, carregando, erro }) {
  if (carregando) return <Card className="p-5"><Carregando texto="Lendo o banco…" /></Card>
  if (erro) return <Card className="p-5 text-sm text-error">{erro}</Card>
  if (!dados) return null
  return (
    <Card className="p-5">
      <CardTitulo>No banco · {dados.total} questões{dados.reportadas ? ` (${dados.reportadas} reportadas e removidas)` : ''}</CardTitulo>
      {dados.porDisciplina.length === 0 ? (
        <p className="text-sm text-muted">O banco está vazio. Gere questões em lote abaixo, importe as suas ou gere nas salas de estudo. Tudo fica salvo aqui.</p>
      ) : (
        <div className="flex flex-col">
          {dados.porDisciplina.map((d) => (
            <div key={`${d.disciplina}|${d.estilo}`} className="flex items-center gap-3 py-1.5 border-t border-border first:border-t-0 text-sm">
              <span className="flex-1 truncate">{d.disciplina}</span>
              <Badge>{d.estilo === 'certo_errado' ? 'C/E' : 'A–E'}</Badge>
              <strong className="w-12 text-right">{d.total}</strong>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

function GerarEmLote({ onCriado }) {
  const dados = useConcurso()
  const { concurso, disciplinas, topicos } = dados
  const [marcadas, setMarcadas] = useState({})
  const [qtd, setQtd] = useState(10)
  const [estilo, setEstilo] = useState(estiloPadrao(concurso?.banca))
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState(null)

  // Só os tópicos-folha (sem subtópicos), para não gerar o mesmo assunto duas vezes
  const folhasPorDisc = useMemo(() => {
    const comFilhos = new Set(topicos.map((t) => t.parentId).filter(Boolean))
    return Object.fromEntries(disciplinas.map((d) => [d.id, achatarArvore(topicos, d.id).map((x) => x.topico).filter((t) => !comFilhos.has(t.id))]))
  }, [disciplinas, topicos])

  const escolhidas = disciplinas.filter((d) => marcadas[d.id])
  const nTopicos = escolhidas.reduce((a, d) => a + folhasPorDisc[d.id].length, 0)
  const nQuestoes = nTopicos * qtd

  const criar = async () => {
    if (!confirmar(`Gerar cerca de ${nQuestoes} questões para ${nTopicos} tópicos? Custo estimado: US$ ${(nQuestoes * CUSTO_QUESTAO_LOTE).toFixed(2)} (aproximado). Fica pronto em até algumas horas, normalmente menos de 1h.`)) return
    setErro(null)
    setEnviando(true)
    try {
      const itens = escolhidas.flatMap((d) =>
        folhasPorDisc[d.id].map((t) => {
          const c = contextoTopico(t, dados)
          return { disciplina: c.disciplina, caminho: c.caminho }
        })
      )
      const c = contextoTopico(folhasPorDisc[escolhidas[0].id][0], dados).concurso
      await banco('lote-criar', { concurso: c, itens, quantidade: qtd, estilo })
      setMarcadas({})
      onCriado()
    } catch (e) {
      setErro(e.message)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Card className="p-5 flex flex-col gap-4">
      <CardTitulo>Encher o banco com o seu edital</CardTitulo>
      <p className="text-sm text-muted -mt-2">
        A IA gera questões comentadas para todos os tópicos das disciplinas escolhidas, de uma vez, pela Batch API da Anthropic (metade do preço de gerar uma a uma).
        Depois disso, salas de estudo e simulados usam essas questões sem gastar mais nada.
      </p>
      {disciplinas.length === 0 ? (
        <p className="text-sm text-muted">Cadastre o edital primeiro.</p>
      ) : (
        <>
          <div className="border border-border rounded-xl overflow-hidden">
            {disciplinas.map((d) => (
              <label key={d.id} className="flex items-center gap-3 px-3 py-2 border-t border-border first:border-t-0 cursor-pointer text-sm">
                <input type="checkbox" checked={!!marcadas[d.id]} disabled={!folhasPorDisc[d.id].length} onChange={(e) => setMarcadas({ ...marcadas, [d.id]: e.target.checked })} className="w-4 h-4 accent-[var(--accent)]" />
                <Ponto cor={d.cor} />
                <span className="flex-1 truncate">{d.nome}</span>
                <span className="text-xs text-muted">{folhasPorDisc[d.id].length} tópicos</span>
              </label>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Select value={qtd} onChange={(e) => setQtd(Number(e.target.value))} className="!w-auto">
              {[5, 10, 15, 20].map((n) => <option key={n} value={n}>{n} por tópico</option>)}
            </Select>
            <Select value={estilo} onChange={(e) => setEstilo(e.target.value)} className="!w-auto">
              <option value="multipla">Múltipla escolha</option>
              <option value="certo_errado">Certo ou errado</option>
            </Select>
            <span className="text-xs text-muted">
              {nTopicos ? `${nQuestoes} questões · ~US$ ${(nQuestoes * CUSTO_QUESTAO_LOTE).toFixed(2)} (estimativa)` : 'Escolha as disciplinas'}
            </span>
            <Botao className="ml-auto" disabled={!nTopicos || enviando || nTopicos > 400} onClick={criar}>
              {enviando ? 'Enviando…' : '✦ Gerar em lote'}
            </Botao>
          </div>
          {nTopicos > 400 && <p className="text-xs text-error">Máximo de 400 tópicos por lote. Divida em mais de um.</p>}
          {erro && <p className="text-sm text-error">{erro}</p>}
        </>
      )}
    </Card>
  )
}

function Lotes({ lotes, onAtualizar, atualizando }) {
  if (!lotes?.length) return null
  return (
    <Card className="p-5">
      <CardTitulo acao={<Botao tamanho="sm" variante="fantasma" disabled={atualizando} onClick={onAtualizar}>{atualizando ? 'Atualizando…' : '↻ Atualizar'}</Botao>}>Lotes de geração</CardTitulo>
      {lotes.map((l) => (
        <div key={l.id} className="flex items-center gap-3 py-2 border-t border-border first:border-t-0 text-sm flex-wrap">
          <span className="text-muted text-xs w-28">{formatDataHora(l.criado_em)}</span>
          <span className="flex-1">{l.topicos} tópicos × {l.quantidade} · {l.estilo === 'certo_errado' ? 'C/E' : 'A–E'}</span>
          {l.importado ? (
            <Badge cor="var(--success)">✓ {l.resumo?.importadas ?? 0} questões novas{l.resumo?.falhas ? ` · ${l.resumo.falhas} falhas` : ''}</Badge>
          ) : l.status === 'ended' ? (
            <Badge cor="var(--accent)">importando…</Badge>
          ) : (
            <Badge cor="#fbbf24">gerando{l.resumo?.succeeded ? ` · ${l.resumo.succeeded}/${l.topicos}` : '…'}</Badge>
          )}
        </div>
      ))}
      <p className="text-[11px] text-muted mt-2">Os lotes são conferidos automaticamente enquanto esta página estiver aberta.</p>
    </Card>
  )
}

function Importar({ onImportado }) {
  const [texto, setTexto] = useState('')
  const [padrao, setPadrao] = useState({ disciplina: '', assunto: '', banca: '' })
  const [msg, setMsg] = useState(null)
  const [enviando, setEnviando] = useState(false)

  const importar = async () => {
    setMsg(null)
    let lista
    try {
      lista = JSON.parse(texto)
      if (!Array.isArray(lista)) lista = lista.questoes
      if (!Array.isArray(lista)) throw new Error('O JSON precisa ser uma lista de questões.')
    } catch (e) {
      return setMsg({ ok: false, texto: `JSON inválido: ${e.message}` })
    }
    setEnviando(true)
    try {
      let novas = 0
      let invalidas = 0
      for (let i = 0; i < lista.length; i += 500) {
        const r = await banco('importar', { ...padrao, questoes: lista.slice(i, i + 500) })
        novas += r.novas
        invalidas += r.invalidas
      }
      const repetidas = lista.length - novas - invalidas
      setMsg({ ok: true, texto: `${novas} questões novas no banco${repetidas ? `, ${repetidas} já existiam` : ''}${invalidas ? `, ${invalidas} inválidas (sem disciplina/assunto, alternativas ou gabarito)` : ''}.` })
      if (novas) setTexto('')
      onImportado()
    } catch (e) {
      setMsg({ ok: false, texto: e.message })
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Card className="p-5 flex flex-col gap-3">
      <CardTitulo>Importar suas questões</CardTitulo>
      <p className="text-sm text-muted -mt-2">
        Cole uma lista em JSON (ou escolha um arquivo .json). <code>correta</code> é a posição da alternativa certa, começando em 0. Para certo/errado use
        <code> ["Certo", "Errado"]</code>. Disciplina e assunto podem vir em cada questão ou nos campos abaixo.
      </p>
      <div className="grid sm:grid-cols-3 gap-2">
        <Input placeholder="Disciplina padrão" value={padrao.disciplina} onChange={(e) => setPadrao({ ...padrao, disciplina: e.target.value })} />
        <Input placeholder="Assunto padrão" value={padrao.assunto} onChange={(e) => setPadrao({ ...padrao, assunto: e.target.value })} />
        <Input placeholder="Banca (opcional)" value={padrao.banca} onChange={(e) => setPadrao({ ...padrao, banca: e.target.value })} />
      </div>
      <Textarea rows={10} className="font-mono text-xs" value={texto} onChange={(e) => setTexto(e.target.value)} placeholder={EXEMPLO_IMPORTACAO} />
      {msg && <p className={`text-sm ${msg.ok ? 'text-success' : 'text-error'}`}>{msg.texto}</p>}
      <div className="flex gap-2 justify-between flex-wrap">
        <label className="text-xs text-accent cursor-pointer self-center">
          Escolher arquivo .json
          <input type="file" accept="application/json,.json" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) setTexto(await f.text()) }} />
        </label>
        <Botao disabled={!texto.trim() || enviando} onClick={importar}>{enviando ? 'Importando…' : 'Importar para o banco'}</Botao>
      </div>
    </Card>
  )
}

/** Questões geradas antes do banco existir (ficaram só neste navegador) */
function EnviarLocais({ onEnviado }) {
  const dados = useConcurso()
  const { exercicios, topicoPorId } = dados
  const { update } = useEstudosStore()
  const [enviando, setEnviando] = useState(false)
  const [msg, setMsg] = useState(null)
  const pendentes = exercicios.filter((e) => !e.bancoId && topicoPorId[e.topicoId])
  if (!pendentes.length) return null

  const enviar = async () => {
    setEnviando(true)
    setMsg(null)
    try {
      const porTopico = {}
      pendentes.forEach((e) => (porTopico[e.topicoId] ||= []).push(e))
      let novas = 0
      for (const [topicoId, lista] of Object.entries(porTopico)) {
        const c = contextoTopico(topicoPorId[topicoId], dados)
        const r = await banco('importar', { disciplina: c.disciplina, assunto: c.caminho.join(' › '), banca: c.concurso.banca, origem: 'ia', questoes: lista })
        novas += r.novas
        lista.forEach((e, i) => r.ids[i] && update('exercicios', e.id, { bancoId: r.ids[i] }))
      }
      setMsg(`${novas} questões enviadas ao banco.`)
      onEnviado()
    } catch (e) {
      setMsg(`Falhou: ${e.message}`)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Card className="p-5 flex flex-col sm:flex-row sm:items-center gap-3">
      <p className="text-sm flex-1">
        Você tem <strong>{pendentes.length}</strong> questões geradas pela IA que estão só neste navegador. Envie para o banco para reaproveitá-las em simulados.
      </p>
      {msg && <span className="text-xs text-muted">{msg}</span>}
      <Botao variante="secundario" disabled={enviando} onClick={enviar}>{enviando ? 'Enviando…' : 'Enviar ao banco'}</Botao>
    </Card>
  )
}

export default function BancoQuestoes() {
  const { senha, abrirConfig } = useIA()
  const [stats, setStats] = useState({ dados: null, carregando: true, erro: null })
  const [lotes, setLotes] = useState(null)
  const [atualizando, setAtualizando] = useState(false)

  const carregarStats = useCallback(() => {
    banco('estatisticas')
      .then((dados) => setStats({ dados, carregando: false, erro: null }))
      .catch((e) => setStats({ dados: null, carregando: false, erro: e.message }))
  }, [])

  // Lista os lotes e confere os que ainda não foram importados (importa os que terminaram)
  const atualizarLotes = useCallback(async () => {
    setAtualizando(true)
    try {
      const { lotes: lista } = await banco('lotes')
      setLotes(lista)
      const abertos = lista.filter((l) => !l.importado)
      if (abertos.length) {
        for (const l of abertos) await banco('lote-status', { id: l.id }).catch(() => {})
        const { lotes: depois } = await banco('lotes')
        setLotes(depois)
        if (depois.some((l) => l.importado && abertos.find((a) => a.id === l.id))) carregarStats()
      }
    } catch {
      /* banco indisponível: a mensagem aparece nas estatísticas */
    } finally {
      setAtualizando(false)
    }
  }, [carregarStats])

  useEffect(() => {
    if (!senha) return
    carregarStats()
    atualizarLotes()
  }, [senha, carregarStats, atualizarLotes])

  useEffect(() => {
    if (!senha || !lotes?.some((l) => !l.importado)) return
    const t = setInterval(atualizarLotes, 60000)
    return () => clearInterval(t)
  }, [senha, lotes, atualizarLotes])

  if (!senha) {
    return (
      <div>
        <PageHeader titulo="Banco de questões" />
        <Vazio titulo="Configure a IA de estudos" texto="O banco de questões usa a mesma senha da IA." acao={<Botao onClick={abrirConfig}>Configurar</Botao>} />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        titulo="Banco de questões"
        descricao="Questões comentadas salvas num banco de dados. Toda questão gerada pela IA entra aqui, e as salas de estudo e os simulados puxam daqui primeiro, sem gastar créditos."
      />
      <div className="grid lg:grid-cols-[1fr_340px] gap-5 items-start">
        <div className="flex flex-col gap-5">
          <EnviarLocais onEnviado={carregarStats} />
          <GerarEmLote onCriado={atualizarLotes} />
          <Lotes lotes={lotes} onAtualizar={atualizarLotes} atualizando={atualizando} />
          <Importar onImportado={carregarStats} />
        </div>
        <Estatisticas {...stats} />
      </div>
    </div>
  )
}
