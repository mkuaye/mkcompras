import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useConcurso, useEstudosStore, diaKey, formatDia, INTERVALOS_LEITNER } from '../../../store/estudosStore'
import { Abas, Badge, Botao, Campo, Card, CardTitulo, Input, Modal, PageHeader, Ponto, SelectDisciplina, SelectTopico, Textarea, Vazio, confirmar } from '../ui'

const embaralhar = (arr) => [...arr].sort(() => Math.random() - 0.5)

function Estudar() {
  const { flashcards, disciplinas, disciplinaPorId, topicoPorId } = useConcurso()
  const { responderFlashcard } = useEstudosStore()
  const [disc, setDisc] = useState('')
  const [fila, setFila] = useState(null)
  const [pos, setPos] = useState(0)
  const [virado, setVirado] = useState(false)
  const [placar, setPlacar] = useState({ certo: 0, errado: 0 })
  const hoje = diaKey()

  const doFiltro = flashcards.filter((f) => !disc || f.disciplinaId === disc)
  const vencidos = doFiltro.filter((f) => (f.proximaRevisao || hoje) <= hoje)

  const comecar = (todos) => {
    const base = todos ? doFiltro : vencidos
    setFila(embaralhar(base).sort((a, b) => (a.caixa || 1) - (b.caixa || 1)).map((f) => f.id))
    setPos(0)
    setVirado(false)
    setPlacar({ certo: 0, errado: 0 })
  }

  const responder = (r) => {
    responderFlashcard(fila[pos], r)
    setPlacar((p) => (r === 'errei' ? { ...p, errado: p.errado + 1 } : { ...p, certo: p.certo + 1 }))
    setVirado(false)
    setPos(pos + 1)
  }

  if (!fila) {
    return (
      <Card className="p-8 text-center flex flex-col items-center gap-4">
        <SelectDisciplina disciplinas={disciplinas} value={disc} onChange={setDisc} todas="Todas as disciplinas" className="max-w-xs" />
        <div>
          <div className="font-syne text-4xl font-black">{vencidos.length}</div>
          <div className="text-muted text-sm">cartões para revisar hoje · {doFiltro.length} no total</div>
        </div>
        <div className="flex gap-2 flex-wrap justify-center">
          <Botao onClick={() => comecar(false)} disabled={!vencidos.length}>Revisar vencidos</Botao>
          <Botao variante="secundario" onClick={() => comecar(true)} disabled={!doFiltro.length}>Treinar todos</Botao>
        </div>
      </Card>
    )
  }

  const card = flashcards.find((f) => f.id === fila[pos])
  if (!card || pos >= fila.length) {
    return (
      <Card className="p-8 text-center flex flex-col items-center gap-3">
        <div className="font-syne text-2xl font-black">Sessão concluída 🎉</div>
        <div className="text-sm text-muted">
          <span className="text-success font-semibold">{placar.certo} acertos</span> · <span className="text-error font-semibold">{placar.errado} erros</span>
        </div>
        <Botao onClick={() => setFila(null)}>Voltar</Botao>
      </Card>
    )
  }

  const d = disciplinaPorId[card.disciplinaId]
  return (
    <div className="flex flex-col gap-4 max-w-2xl mx-auto">
      <div className="flex justify-between text-xs text-muted">
        <span>{pos + 1} de {fila.length}</span>
        <button onClick={() => setFila(null)} className="hover:text-text">Encerrar</button>
      </div>
      <Card className="p-8 min-h-[260px] flex flex-col cursor-pointer" onClick={() => !virado && setVirado(true)}>
        <div className="flex items-center gap-2 text-xs text-muted mb-4">
          <Ponto cor={d?.cor} />
          {d?.nome}
          {topicoPorId[card.topicoId] && <span>· {topicoPorId[card.topicoId].nome}</span>}
          <Badge className="ml-auto">caixa {card.caixa || 1}</Badge>
        </div>
        <div className="flex-1 flex flex-col justify-center text-center gap-5">
          <p className="text-lg font-semibold whitespace-pre-wrap">{card.frente}</p>
          {virado ? (
            <>
              <p className="text-base text-accent whitespace-pre-wrap border-t border-border pt-5">{card.verso}</p>
              {topicoPorId[card.topicoId] && (
                <Link to={`/estudos/conteudo/${card.topicoId}`} onClick={(e) => e.stopPropagation()} className="text-xs text-muted hover:text-accent">
                  📖 rever a aula do tópico
                </Link>
              )}
            </>
          ) : (
            <p className="text-xs text-muted">Clique para ver a resposta</p>
          )}
        </div>
      </Card>
      {virado && (
        <div className="grid grid-cols-3 gap-2">
          <Botao variante="perigo" className="!py-3" onClick={() => responder('errei')}>Errei<span className="text-[10px] opacity-70 ml-1">hoje</span></Botao>
          <Botao variante="secundario" className="!py-3" onClick={() => responder('acertei')}>Acertei</Botao>
          <Botao variante="sucesso" className="!py-3" onClick={() => responder('facil')}>Fácil</Botao>
        </div>
      )}
    </div>
  )
}

function Gerenciar() {
  const { flashcards, disciplinas, topicos, disciplinaPorId } = useConcurso()
  const { add, addMuitos, update, remove } = useEstudosStore()
  const [f, setF] = useState({ disciplinaId: '', topicoId: '', frente: '', verso: '' })
  const [editando, setEditando] = useState(null)
  const [busca, setBusca] = useState('')
  const [disc, setDisc] = useState('')
  const [importando, setImportando] = useState(false)
  const [texto, setTexto] = useState('')
  const hoje = diaKey()

  const salvar = () => {
    add('flashcards', { ...f, topicoId: f.topicoId || null, frente: f.frente.trim(), verso: f.verso.trim(), caixa: 1, proximaRevisao: hoje })
    setF({ ...f, frente: '', verso: '' })
  }

  const linhasImport = texto.split(/\r?\n/).map((l) => l.split(/\s*\|\s*/)).filter((p) => p.length >= 2 && p[0].trim() && p[1].trim())

  const lista = flashcards
    .filter((c) => (!disc || c.disciplinaId === disc) && (!busca || `${c.frente} ${c.verso}`.toLowerCase().includes(busca.toLowerCase())))
    .slice()
    .reverse()

  return (
    <div className="grid lg:grid-cols-[340px_1fr] gap-5">
      <Card className="p-5 self-start">
        <CardTitulo acao={<button className="text-xs text-accent" onClick={() => setImportando(true)}>Importar em lote</button>}>Novo cartão</CardTitulo>
        <div className="flex flex-col gap-3">
          <SelectDisciplina disciplinas={disciplinas} value={f.disciplinaId} onChange={(v) => setF({ ...f, disciplinaId: v, topicoId: '' })} placeholder="Disciplina" />
          <SelectTopico topicos={topicos} disciplinaId={f.disciplinaId} value={f.topicoId} onChange={(v) => setF({ ...f, topicoId: v })} vazio="Sem tópico" />
          <Textarea rows={3} placeholder="Frente (pergunta)" value={f.frente} onChange={(e) => setF({ ...f, frente: e.target.value })} />
          <Textarea rows={3} placeholder="Verso (resposta)" value={f.verso} onChange={(e) => setF({ ...f, verso: e.target.value })} />
          <Botao disabled={!f.disciplinaId || !f.frente.trim() || !f.verso.trim()} onClick={salvar}>Adicionar cartão</Botao>
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex gap-2 mb-4 flex-wrap">
          <Input placeholder="Buscar…" value={busca} onChange={(e) => setBusca(e.target.value)} className="!py-1.5 flex-1" />
          <SelectDisciplina disciplinas={disciplinas} value={disc} onChange={setDisc} todas="Todas" className="!w-auto !py-1.5 !text-xs" />
        </div>
        {lista.length === 0 ? (
          <p className="text-sm text-muted">Nenhum cartão.</p>
        ) : (
          lista.map((c) => (
            <div key={c.id} className="group flex gap-3 py-3 border-t border-border first:border-t-0">
              <Ponto cor={disciplinaPorId[c.disciplinaId]?.cor} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold">{c.frente}</div>
                <div className="text-xs text-muted mt-0.5 line-clamp-2">{c.verso}</div>
              </div>
              <div className="text-right text-[11px] text-muted flex-shrink-0">
                <div>caixa {c.caixa || 1}/{INTERVALOS_LEITNER.length - 1}</div>
                <div className={(c.proximaRevisao || hoje) <= hoje ? 'text-accent' : ''}>{(c.proximaRevisao || hoje) <= hoje ? 'para hoje' : formatDia(c.proximaRevisao)}</div>
              </div>
              <div className="flex flex-col gap-1 sm:opacity-0 group-hover:opacity-100">
                <button className="text-xs text-muted hover:text-text" onClick={() => setEditando(c)}>Editar</button>
                <button className="text-xs text-muted hover:text-error" onClick={() => confirmar('Excluir cartão?') && remove('flashcards', c.id)}>Excluir</button>
              </div>
            </div>
          ))
        )}
      </Card>

      <Modal aberto={!!editando} onFechar={() => setEditando(null)} titulo="Editar cartão">
        {editando && (
          <div className="flex flex-col gap-3">
            <Textarea rows={3} value={editando.frente} onChange={(e) => setEditando({ ...editando, frente: e.target.value })} />
            <Textarea rows={3} value={editando.verso} onChange={(e) => setEditando({ ...editando, verso: e.target.value })} />
            <div className="flex gap-2 justify-end">
              <Botao variante="secundario" onClick={() => { update('flashcards', editando.id, { caixa: 1, proximaRevisao: hoje }); setEditando(null) }}>Reiniciar progresso</Botao>
              <Botao onClick={() => { update('flashcards', editando.id, { frente: editando.frente, verso: editando.verso }); setEditando(null) }}>Salvar</Botao>
            </div>
          </div>
        )}
      </Modal>

      <Modal aberto={importando} onFechar={() => setImportando(false)} titulo="Importar cartões em lote" largura="max-w-2xl">
        <div className="flex flex-col gap-3">
          <p className="text-xs text-muted">Um cartão por linha, no formato <code className="text-accent">pergunta | resposta</code>. Os cartões vão para a disciplina e o tópico selecionados no formulário.</p>
          <SelectDisciplina disciplinas={disciplinas} value={f.disciplinaId} onChange={(v) => setF({ ...f, disciplinaId: v, topicoId: '' })} placeholder="Disciplina" />
          <Textarea rows={10} className="font-mono text-xs" value={texto} onChange={(e) => setTexto(e.target.value)} placeholder={'Prazo do mandado de segurança? | 120 dias da ciência do ato\nLIMPE significa? | Legalidade, Impessoalidade, Moralidade, Publicidade, Eficiência'} />
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted">{linhasImport.length} cartões reconhecidos</span>
            <Botao
              disabled={!f.disciplinaId || !linhasImport.length}
              onClick={() => {
                addMuitos('flashcards', linhasImport.map(([frente, ...resto]) => ({ disciplinaId: f.disciplinaId, topicoId: f.topicoId || null, frente: frente.trim(), verso: resto.join(' | ').trim(), caixa: 1, proximaRevisao: hoje })))
                setTexto('')
                setImportando(false)
              }}
            >
              Importar
            </Botao>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default function Flashcards() {
  const { flashcards, disciplinas } = useConcurso()
  const [aba, setAba] = useState('estudar')
  const hoje = diaKey()
  const vencidos = flashcards.filter((f) => (f.proximaRevisao || hoje) <= hoje).length

  if (!disciplinas.length) return <Vazio titulo="Nenhuma disciplina" texto="Cadastre as disciplinas no edital para criar flashcards." />

  return (
    <div>
      <PageHeader titulo="Flashcards" descricao="Repetição espaçada (sistema Leitner): quanto mais você acerta um cartão, mais tempo ele demora para voltar (1, 3, 7, 15 e 30 dias)." />
      <Abas valor={aba} onChange={setAba} abas={[{ id: 'estudar', label: 'Estudar', contador: vencidos }, { id: 'gerenciar', label: 'Gerenciar cartões', contador: flashcards.length }]} />
      {aba === 'estudar' ? flashcards.length ? <Estudar /> : <Vazio titulo="Nenhum cartão" acao={<Botao onClick={() => setAba('gerenciar')}>Criar cartões</Botao>} /> : <Gerenciar />}
    </div>
  )
}
