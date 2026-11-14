import { useEffect, useRef, useState } from 'react'
import { useEstudosStore, formatDataHora, uid } from '../../../store/estudosStore'
import { lerArquivo, salvarArquivo, useConteudo } from '../../../store/estudosArquivos'
import { iaStream } from '../ia'
import Markdown from '../Markdown'
import { Badge, Botao, Card, Select, Textarea, cx } from '../ui'
import { AvisoIA, BarraSelecao, Carregando, ModalNovoFlashcard, salvarNoCaderno, useSelecao } from './comum'

const PROFUNDIDADES = [
  { id: 'essencial', label: 'Essencial', desc: '~10 min de leitura, o que mais cai' },
  { id: 'completa', label: 'Completa', desc: '~30 min, todos os detalhes e exceções' },
]

function Gerador({ ctx, textos, onGerada, existente }) {
  const [profundidade, setProfundidade] = useState('essencial')
  const [base, setBase] = useState('')
  const [parcial, setParcial] = useState('')
  const [gerando, setGerando] = useState(false)
  const [erro, setErro] = useState(null)
  const abortar = useRef(null)

  useEffect(() => () => abortar.current?.abort(), [])

  const gerar = async () => {
    setErro(null)
    setParcial('')
    setGerando(true)
    abortar.current = new AbortController()
    try {
      const material = base ? await lerArquivo(base) : ''
      const texto = await iaStream('aula', { ...ctx, profundidade, material: typeof material === 'string' ? material : '' }, setParcial, abortar.current.signal)
      await onGerada(texto, profundidade)
    } catch (e) {
      if (e.name !== 'AbortError') setErro(e.message)
    } finally {
      setGerando(false)
    }
  }

  if (gerando || parcial) {
    return (
      <Card className="p-6 sm:p-8">
        <div className="flex items-center justify-between gap-3 mb-4">
          {gerando ? <Carregando texto="Escrevendo a aula…" /> : <span className="text-sm text-error">Geração interrompida.</span>}
          {gerando ? (
            <Botao tamanho="sm" variante="secundario" onClick={() => abortar.current?.abort()}>Parar</Botao>
          ) : (
            <div className="flex gap-2">
              <Botao tamanho="sm" variante="secundario" onClick={() => onGerada(parcial, profundidade)}>Salvar mesmo assim</Botao>
              <Botao tamanho="sm" onClick={gerar}>Tentar de novo</Botao>
            </div>
          )}
        </div>
        {erro && <p className="text-sm text-error mb-3">{erro}</p>}
        <Markdown className="text-[15px]">{parcial}</Markdown>
      </Card>
    )
  }

  return (
    <Card className="p-6 sm:p-8 flex flex-col gap-5">
      <div>
        <h3 className="font-syne text-lg font-bold">{existente ? 'Gerar nova versão da aula' : 'Gerar a aula deste tópico'}</h3>
        <p className="text-sm text-muted mt-1">
          A IA escreve uma aula completa sobre o tópico, adaptada ao seu concurso e à banca: teoria, base legal, como a banca cobra, pegadinhas, resumo e mnemônicos.
        </p>
      </div>
      <div className="grid sm:grid-cols-2 gap-2">
        {PROFUNDIDADES.map((p) => (
          <button
            key={p.id}
            onClick={() => setProfundidade(p.id)}
            className={cx('text-left border rounded-xl px-4 py-3 transition', profundidade === p.id ? 'border-accent bg-bg' : 'border-border hover:bg-bg')}
          >
            <div className={cx('font-semibold text-sm', profundidade === p.id && 'text-accent')}>{p.label}</div>
            <div className="text-xs text-muted">{p.desc}</div>
          </button>
        ))}
      </div>
      {textos.length > 0 && (
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-muted">Basear no seu material (opcional)</span>
          <Select value={base} onChange={(e) => setBase(e.target.value)}>
            <option value="">Não, gerar do zero</option>
            {textos.map((m) => (
              <option key={m.id} value={m.id}>{m.titulo}</option>
            ))}
          </Select>
        </label>
      )}
      {erro && <p className="text-sm text-error">{erro}</p>}
      <div className="flex gap-2 flex-wrap">
        <Botao onClick={gerar}>✦ Gerar aula com IA</Botao>
      </div>
      <AvisoIA />
    </Card>
  )
}

export default function AbaAula({ topico, ctx, materiais, onPerguntar, onIrPara }) {
  const { add, update } = useEstudosStore()
  const iniciarTopico = useEstudosStore((s) => s.iniciarTopico)
  const aula = materiais.find((m) => m.tipo === 'aula')
  const textos = materiais.filter((m) => m.tipo === 'texto')
  const { conteudo, carregando, salvar } = useConteudo(aula?.id || null)
  const [modo, setModo] = useState('ler') // ler | editar | regerar
  const [rascunho, setRascunho] = useState('')
  const [novoCard, setNovoCard] = useState(null)
  const [aviso, setAviso] = useState(null)
  const artigo = useRef(null)
  const [sel, limparSel] = useSelecao(artigo)

  useEffect(() => {
    setModo('ler')
  }, [topico.id])

  useEffect(() => {
    if (!aviso) return
    const t = setTimeout(() => setAviso(null), 2500)
    return () => clearTimeout(t)
  }, [aviso])

  // O texto vai para o IndexedDB antes do registro existir, para a aula abrir já preenchida
  const criarAula = async (texto, dados) => {
    const id = uid()
    await salvarArquivo(id, texto)
    add('materiais', {
      id, tipo: 'aula', titulo: `Aula: ${topico.nome}`, disciplinaId: topico.disciplinaId, topicoId: topico.id,
      lido: false, atualizadoEm: new Date().toISOString(), tamanho: texto.length, ...dados,
    })
  }

  const salvarAula = async (texto, profundidade) => {
    if (aula) {
      await salvar(texto)
      update('materiais', aula.id, { atualizadoEm: new Date().toISOString(), profundidade, origem: 'ia', editada: false, lido: false, tamanho: texto.length })
    } else await criarAula(texto, { origem: 'ia', profundidade })
    iniciarTopico(topico.id)
    setModo('ler')
  }

  const salvarEdicao = async () => {
    if (aula) {
      await salvar(rascunho)
      update('materiais', aula.id, { atualizadoEm: new Date().toISOString(), editada: true, tamanho: rascunho.length })
    } else await criarAula(rascunho, { origem: 'usuario' })
    setModo('ler')
  }

  if (aula && carregando) return <Card className="p-8"><Carregando texto="Abrindo aula…" /></Card>

  if (!aula || modo === 'regerar') {
    return (
      <div className="flex flex-col gap-3">
        {modo === 'regerar' && <button className="text-xs text-muted hover:text-text self-start" onClick={() => setModo('ler')}>← Voltar para a aula atual</button>}
        <Gerador ctx={ctx} textos={textos} existente={!!aula} onGerada={salvarAula} />
        {!aula && modo !== 'editar' && (
          <button className="text-xs text-muted hover:text-text self-start" onClick={() => { setRascunho(''); setModo('editar') }}>
            Prefere escrever ou colar sua própria aula? Clique aqui.
          </button>
        )}
        {modo === 'editar' && (
          <Card className="p-5 flex flex-col gap-3">
            <Textarea rows={18} value={rascunho} onChange={(e) => setRascunho(e.target.value)} placeholder="Escreva ou cole o conteúdo. Aceita Markdown: ## títulos, **negrito**, listas com -, tabelas…" className="font-mono text-xs" />
            <div className="flex justify-end gap-2">
              <Botao variante="secundario" onClick={() => setModo('ler')}>Cancelar</Botao>
              <Botao disabled={!rascunho.trim()} onClick={salvarEdicao}>Salvar aula</Botao>
            </div>
          </Card>
        )}
      </div>
    )
  }

  if (modo === 'editar') {
    return (
      <Card className="p-5 flex flex-col gap-3">
        <Textarea rows={24} value={rascunho} onChange={(e) => setRascunho(e.target.value)} className="font-mono text-xs" />
        <div className="flex justify-end gap-2">
          <Botao variante="secundario" onClick={() => setModo('ler')}>Cancelar</Botao>
          <Botao disabled={!rascunho.trim()} onClick={salvarEdicao}>Salvar</Botao>
        </div>
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 flex-wrap text-xs text-muted">
        {aula.origem === 'ia' && <Badge cor="var(--accent2)">✦ IA · {aula.profundidade === 'completa' ? 'completa' : 'essencial'}</Badge>}
        {aula.editada && <Badge>editada</Badge>}
        <span>atualizada {formatDataHora(aula.atualizadoEm || aula.criadoEm)}</span>
        <span className="hidden sm:inline">· selecione um trecho para salvar no caderno, virar flashcard ou perguntar à IA</span>
        <div className="ml-auto flex gap-1">
          <Botao tamanho="sm" variante="fantasma" onClick={() => { setRascunho(conteudo); setModo('editar') }}>Editar</Botao>
          <Botao tamanho="sm" variante="fantasma" onClick={() => setModo('regerar')}>✦ Regerar</Botao>
        </div>
      </div>

      <Card className="p-6 sm:p-10">
        <article ref={artigo} className="max-w-3xl mx-auto">
          <Markdown className="text-[15px]">{conteudo}</Markdown>
        </article>
      </Card>

      {aula.origem === 'ia' && <AvisoIA className="text-center" />}

      <Card className="p-5 flex flex-col sm:flex-row items-center gap-3 justify-between">
        <div className="text-sm">
          {aula.lido ? <span className="text-success font-semibold">✓ Aula lida.</span> : 'Terminou de ler?'} Fixe o conteúdo resolvendo questões.
        </div>
        <div className="flex gap-2">
          {!aula.lido && (
            <Botao variante="sucesso" onClick={() => { update('materiais', aula.id, { lido: true, lidoEm: new Date().toISOString() }); iniciarTopico(topico.id) }}>
              ✓ Marcar como lida
            </Botao>
          )}
          <Botao onClick={() => onIrPara('questoes')}>Praticar questões →</Botao>
        </div>
      </Card>

      <BarraSelecao
        sel={sel}
        onFechar={limparSel}
        acoes={[
          { label: '✎ Caderno', onClick: (t) => { salvarNoCaderno(add, topico, { conteudo: t }); setAviso('Trecho salvo no caderno.') } },
          { label: '▣ Flashcard', onClick: (t) => setNovoCard({ frente: '', verso: t }) },
          { label: '? Perguntar à IA', onClick: (t) => onPerguntar(`Explique melhor este trecho da aula:\n\n"${t}"`) },
        ]}
      />
      {novoCard && <ModalNovoFlashcard inicial={novoCard} topico={topico} onFechar={() => setNovoCard(null)} />}
      {aviso && <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-surface border border-success text-success text-sm rounded-xl px-4 py-2 shadow-2xl">{aviso}</div>}
    </div>
  )
}
