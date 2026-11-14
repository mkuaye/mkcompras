import { useEffect, useRef, useState } from 'react'
import { useEstudosStore, formatDataHora } from '../../../store/estudosStore'
import { lerArquivo } from '../../../store/estudosArquivos'
import { iaStream } from '../ia'
import Markdown from '../Markdown'
import { Botao, Card, Textarea, confirmar } from '../ui'
import { AvisoIA, Carregando, ModalNovoFlashcard, salvarNoCaderno } from './comum'

const SUGESTOES = [
  'Explique de outro jeito, com um exemplo do dia a dia.',
  'Qual a diferença entre os conceitos que mais confundem neste tópico?',
  'Monte um esquema para eu memorizar.',
  'Quais são as pegadinhas mais comuns da banca aqui?',
]

export default function AbaDuvidas({ topico, ctx, materiais, duvidas, perguntaInicial, onPerguntaUsada }) {
  const { add, remove } = useEstudosStore()
  const [pergunta, setPergunta] = useState('')
  const [emAndamento, setEmAndamento] = useState(null) // { pergunta, resposta }
  const [erro, setErro] = useState(null)
  const [novoCard, setNovoCard] = useState(null)
  const [salvas, setSalvas] = useState({})
  const abortar = useRef(null)
  const fim = useRef(null)
  const campo = useRef(null)
  const aula = materiais.find((m) => m.tipo === 'aula')
  const conversa = [...duvidas].sort((a, b) => a.criadoEm.localeCompare(b.criadoEm))

  useEffect(() => () => abortar.current?.abort(), [])

  useEffect(() => {
    if (!perguntaInicial) return
    setPergunta(perguntaInicial)
    onPerguntaUsada()
    campo.current?.focus()
  }, [perguntaInicial, onPerguntaUsada])

  useEffect(() => {
    fim.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [duvidas.length, emAndamento?.resposta])

  const enviar = async (texto = pergunta) => {
    const q = texto.trim()
    if (!q || emAndamento) return
    setErro(null)
    setPergunta('')
    setEmAndamento({ pergunta: q, resposta: '' })
    abortar.current = new AbortController()
    try {
      const textoAula = aula ? await lerArquivo(aula.id) : ''
      const resposta = await iaStream(
        'duvida',
        {
          ...ctx,
          aula: typeof textoAula === 'string' ? textoAula : '',
          historico: conversa.slice(-8).map((d) => ({ pergunta: d.pergunta, resposta: d.resposta })),
          pergunta: q,
        },
        (r) => setEmAndamento({ pergunta: q, resposta: r }),
        abortar.current.signal
      )
      add('duvidas', { disciplinaId: topico.disciplinaId, topicoId: topico.id, pergunta: q, resposta })
      setEmAndamento(null)
    } catch (e) {
      if (e.name !== 'AbortError') setErro(e.message)
      if (e.parcial) add('duvidas', { disciplinaId: topico.disciplinaId, topicoId: topico.id, pergunta: q, resposta: `${e.parcial}\n\n*(resposta interrompida)*` })
      else setPergunta(q)
      setEmAndamento(null)
    }
  }

  const bolhas = [...conversa, ...(emAndamento ? [{ id: 'atual', ...emAndamento, andamento: true }] : [])]

  return (
    <div className="flex flex-col gap-4">
      {bolhas.length === 0 ? (
        <Card className="p-6 flex flex-col gap-4">
          <div>
            <h3 className="font-syne text-lg font-bold">Tutor do tópico</h3>
            <p className="text-sm text-muted mt-1">
              Pergunte o que não ficou claro. A IA responde considerando {aula ? 'a aula deste tópico, ' : ''}seu concurso e a banca. Você também pode selecionar um trecho da aula e clicar em “Perguntar à IA”.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {SUGESTOES.map((s) => (
              <button key={s} onClick={() => enviar(s)} className="text-xs border border-border rounded-full px-3 py-1.5 hover:border-accent hover:text-accent text-muted text-left">
                {s}
              </button>
            ))}
          </div>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex justify-end">
            <button
              className="text-xs text-muted hover:text-error"
              onClick={() => confirmar('Apagar toda a conversa deste tópico?') && duvidas.forEach((d) => remove('duvidas', d.id))}
              disabled={!!emAndamento}
            >
              Limpar conversa
            </button>
          </div>
          {bolhas.map((d) => (
            <div key={d.id} className="flex flex-col gap-2">
              <div className="self-end max-w-[85%] bg-gradient-to-r from-accent to-accent2 text-white text-sm rounded-2xl rounded-br-md px-4 py-2.5 whitespace-pre-wrap">{d.pergunta}</div>
              <Card className="p-5 max-w-full">
                {d.andamento && !d.resposta ? <Carregando texto="Pensando…" /> : <Markdown className="text-sm">{d.resposta}</Markdown>}
                {!d.andamento && (
                  <div className="flex gap-3 mt-3 pt-3 border-t border-border text-xs text-muted flex-wrap items-center">
                    <span>{formatDataHora(d.criadoEm)}</span>
                    <button
                      className="hover:text-accent ml-auto"
                      disabled={salvas[d.id]}
                      onClick={() => {
                        salvarNoCaderno(add, topico, { titulo: d.pergunta, conteudo: `**Pergunta:** ${d.pergunta}\n\n${d.resposta}` })
                        setSalvas({ ...salvas, [d.id]: true })
                      }}
                    >
                      {salvas[d.id] ? '✓ no caderno' : '✎ Salvar no caderno'}
                    </button>
                    <button className="hover:text-accent" onClick={() => setNovoCard({ frente: d.pergunta, verso: d.resposta.slice(0, 600) })}>▣ Flashcard</button>
                    <button className="hover:text-error" onClick={() => remove('duvidas', d.id)}>Excluir</button>
                  </div>
                )}
              </Card>
            </div>
          ))}
          <div ref={fim} />
        </div>
      )}

      {erro && <p className="text-sm text-error">{erro}</p>}

      <Card className="p-3 sticky bottom-3 flex gap-2 items-end shadow-2xl">
        <Textarea
          ref={campo}
          rows={2}
          value={pergunta}
          onChange={(e) => setPergunta(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              enviar()
            }
          }}
          placeholder="Digite sua dúvida… (Enter envia, Shift+Enter quebra linha)"
          className="!py-2"
        />
        {emAndamento ? (
          <Botao variante="secundario" onClick={() => abortar.current?.abort()}>Parar</Botao>
        ) : (
          <Botao disabled={!pergunta.trim()} onClick={() => enviar()}>Enviar</Botao>
        )}
      </Card>
      <AvisoIA className="text-center" />

      {novoCard && <ModalNovoFlashcard inicial={novoCard} topico={topico} onFechar={() => setNovoCard(null)} />}
    </div>
  )
}
