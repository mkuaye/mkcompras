import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useEstudosStore, diaKey, formatDia, INTERVALOS_LEITNER } from '../../../store/estudosStore'
import { lerArquivo } from '../../../store/estudosArquivos'
import { iaJson } from '../ia'
import { Botao, Card, CardTitulo, Select, Vazio, confirmar } from '../ui'
import { AvisoIA, Carregando, ModalNovoFlashcard } from './comum'

export default function AbaFlashcards({ topico, ctx, materiais, flashcards }) {
  const { addMuitos, remove } = useEstudosStore()
  const [qtd, setQtd] = useState(12)
  const [gerando, setGerando] = useState(false)
  const [erro, setErro] = useState(null)
  const [sugestoes, setSugestoes] = useState(null) // [{frente, verso, ok}]
  const [novoCard, setNovoCard] = useState(null)
  const abortar = useRef(null)
  const aula = materiais.find((m) => m.tipo === 'aula')
  const hoje = diaKey()
  const vencidos = flashcards.filter((f) => (f.proximaRevisao || hoje) <= hoje).length

  useEffect(() => () => abortar.current?.abort(), [])

  const gerar = async () => {
    setErro(null)
    setGerando(true)
    abortar.current = new AbortController()
    try {
      const textoAula = aula ? await lerArquivo(aula.id) : ''
      const { cards } = await iaJson(
        'flashcards',
        { ...ctx, quantidade: qtd, aula: typeof textoAula === 'string' ? textoAula : '', evitar: flashcards.map((f) => f.frente) },
        abortar.current.signal
      )
      if (!cards?.length) throw new Error('A IA não devolveu cartões. Tente de novo.')
      setSugestoes(cards.map((c) => ({ ...c, ok: true })))
    } catch (e) {
      if (e.name !== 'AbortError') setErro(e.message)
    } finally {
      setGerando(false)
    }
  }

  const adicionar = () => {
    const escolhidos = sugestoes.filter((s) => s.ok)
    addMuitos(
      'flashcards',
      escolhidos.map((s) => ({ disciplinaId: topico.disciplinaId, topicoId: topico.id, frente: s.frente.trim(), verso: s.verso.trim(), caixa: 1, proximaRevisao: hoje, origem: 'ia' }))
    )
    setSugestoes(null)
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="p-5 flex flex-col gap-3">
        <div className="flex flex-wrap items-end gap-3">
          <Select value={qtd} onChange={(e) => setQtd(Number(e.target.value))} className="!w-auto">
            {[8, 12, 20, 30].map((n) => <option key={n} value={n}>{n} cartões</option>)}
          </Select>
          <Botao onClick={gerar} disabled={gerando || !!sugestoes}>✦ Gerar flashcards com IA</Botao>
          <Botao variante="secundario" onClick={() => setNovoCard({ frente: '', verso: '' })}>+ Cartão manual</Botao>
          {flashcards.length > 0 && (
            <Link to="/estudos/flashcards" className="ml-auto text-xs text-accent self-center">
              {vencidos ? `${vencidos} para revisar hoje →` : 'Revisar na página de flashcards →'}
            </Link>
          )}
        </div>
        <p className="text-xs text-muted">
          Os cartões entram na revisão espaçada (Leitner) junto com os demais: aparecem hoje e voltam em {INTERVALOS_LEITNER.slice(1).join(', ')} dias conforme você acerta.
        </p>
        {gerando && <Carregando texto={`Criando cartões${aula ? ' a partir da aula' : ''}…`} />}
        {erro && <p className="text-sm text-error">{erro}</p>}
      </Card>

      {sugestoes && (
        <Card className="p-5">
          <CardTitulo
            acao={
              <div className="flex gap-2">
                <Botao tamanho="sm" variante="fantasma" onClick={() => setSugestoes(null)}>Descartar</Botao>
                <Botao tamanho="sm" disabled={!sugestoes.some((s) => s.ok)} onClick={adicionar}>Adicionar {sugestoes.filter((s) => s.ok).length} cartões</Botao>
              </div>
            }
          >
            Revise antes de adicionar
          </CardTitulo>
          {sugestoes.map((s, i) => (
            <label key={i} className="flex gap-3 py-3 border-t border-border first:border-t-0 cursor-pointer">
              <input
                type="checkbox"
                checked={s.ok}
                onChange={(e) => setSugestoes(sugestoes.map((x, j) => (j === i ? { ...x, ok: e.target.checked } : x)))}
                className="w-4 h-4 mt-0.5 accent-[var(--accent)] flex-shrink-0"
              />
              <div className="min-w-0">
                <div className="text-sm font-semibold">{s.frente}</div>
                <div className="text-xs text-muted mt-0.5 whitespace-pre-wrap">{s.verso}</div>
              </div>
            </label>
          ))}
          <AvisoIA className="mt-3" />
        </Card>
      )}

      {flashcards.length === 0 && !sugestoes ? (
        !gerando && <Vazio titulo="Nenhum flashcard neste tópico" texto="Gere cartões com a IA, crie manualmente ou selecione um trecho da aula e clique em “Flashcard”." />
      ) : (
        flashcards.length > 0 && (
          <Card className="p-5">
            <CardTitulo>{flashcards.length} cartões deste tópico</CardTitulo>
            {[...flashcards].reverse().map((c) => (
              <div key={c.id} className="group flex gap-3 py-3 border-t border-border first:border-t-0">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold">{c.frente}</div>
                  <div className="text-xs text-muted mt-0.5 line-clamp-3 whitespace-pre-wrap">{c.verso}</div>
                </div>
                <div className="text-right text-[11px] text-muted flex-shrink-0">
                  <div>caixa {c.caixa || 1}</div>
                  <div className={(c.proximaRevisao || hoje) <= hoje ? 'text-accent' : ''}>{(c.proximaRevisao || hoje) <= hoje ? 'para hoje' : formatDia(c.proximaRevisao)}</div>
                </div>
                <button className="text-xs text-muted hover:text-error sm:opacity-0 group-hover:opacity-100" onClick={() => confirmar('Excluir cartão?') && remove('flashcards', c.id)} aria-label="Excluir">✕</button>
              </div>
            ))}
          </Card>
        )
      )}

      {novoCard && <ModalNovoFlashcard inicial={novoCard} topico={topico} onFechar={() => setNovoCard(null)} />}
    </div>
  )
}
