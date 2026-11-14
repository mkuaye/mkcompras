import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  useConcurso, useEstudosStore, STATUS_TOPICO, INTERVALOS_REVISAO,
  achatarArvore, diaKey, formatDia, formatMinutos, pct, corDesempenho,
} from '../../../store/estudosStore'
import { useTimer, formatRelogio } from '../useTimer'
import { contextoTopico } from '../ia'
import { ModalFinalizar } from '../paginas/Cronometro'
import { Abas, Botao, Card, Ponto, Vazio, cx } from '../ui'
import AbaAula from './AbaAula'
import AbaMateriais from './AbaMateriais'
import AbaQuestoes from './AbaQuestoes'
import AbaFlashcards from './AbaFlashcards'
import AbaDuvidas from './AbaDuvidas'
import AbaAnotacoes from './AbaAnotacoes'

const TIPO_POR_ABA = { aula: 'teoria', materiais: 'teoria', questoes: 'questoes', flashcards: 'revisao', duvidas: 'teoria', anotacoes: 'resumo' }

function Cronometro({ topico, aba }) {
  const { timer, rodando, segundos, atingiuMeta, restante } = useTimer()
  const { timerConfig, timerIniciar, timerPausar } = useEstudosStore()
  const { disciplinaPorId, topicoPorId } = useConcurso()
  const [finalizando, setFinalizando] = useState(false)
  const outro = segundos > 0 && timer.topicoId !== topico.id

  if (outro) {
    const t = topicoPorId[timer.topicoId]
    return (
      <div className="text-xs text-muted">
        O cronômetro está contando <strong className="text-text">{t?.nome || disciplinaPorId[timer.disciplinaId]?.nome}</strong> ({formatRelogio(segundos)}).{' '}
        <Link to="/estudos/cronometro" className="text-accent">Finalizar lá</Link> para estudar este tópico com tempo registrado.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="text-center">
        <div className={cx('font-syne text-4xl font-black tabular-nums', atingiuMeta && 'text-success')}>{formatRelogio(segundos)}</div>
        <div className="text-[11px] text-muted mt-1">
          {atingiuMeta ? 'Meta atingida! Registre e faça uma pausa.' : restante !== null ? `meta ${timer.metaMin} min · faltam ${formatRelogio(restante)}` : 'modo livre'}
        </div>
      </div>
      <div className="flex gap-2">
        {rodando ? (
          <Botao variante="secundario" className="flex-1" onClick={timerPausar}>❚❚ Pausar</Botao>
        ) : (
          <Botao
            className="flex-1"
            onClick={() => {
              if (!segundos) timerConfig({ disciplinaId: topico.disciplinaId, topicoId: topico.id, tipo: TIPO_POR_ABA[aba] || 'teoria' })
              timerIniciar()
            }}
          >
            ▶ {segundos ? 'Continuar' : 'Iniciar estudo'}
          </Botao>
        )}
        <Botao
          variante="sucesso"
          disabled={segundos < 60}
          onClick={() => {
            timerPausar()
            setFinalizando(true)
          }}
          title="Registrar sessão"
        >
          ✓
        </Botao>
      </div>
      {finalizando && <ModalFinalizar minutos={Math.round(segundos / 60)} onFechar={() => setFinalizando(false)} />}
    </div>
  )
}

function PainelLateral({ topico, aba, anterior, proximo }) {
  const { sessoes, questoes, revisoes, flashcards } = useConcurso()
  const { setStatusTopico } = useEstudosStore()
  const navigate = useNavigate()
  const hoje = diaKey()

  const minutos = sessoes.filter((s) => s.topicoId === topico.id).reduce((a, s) => a + s.minutos, 0)
  const qs = questoes.filter((q) => q.topicoId === topico.id)
  const qT = qs.reduce((a, q) => a + q.total, 0)
  const qA = qs.reduce((a, q) => a + q.acertos, 0)
  const cards = flashcards.filter((f) => f.topicoId === topico.id)
  const proxRev = revisoes.filter((r) => r.topicoId === topico.id && !r.feita).sort((a, b) => a.dataPrevista.localeCompare(b.dataPrevista))[0]

  return (
    <div className="flex flex-col gap-4">
      <Card className="p-4">
        <Cronometro topico={topico} aba={aba} />
      </Card>

      <Card className="p-4 flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-2 text-center">
          <div className="bg-bg rounded-xl py-2.5"><div className="font-bold text-sm">{formatMinutos(minutos)}</div><div className="text-[10px] text-muted">estudado</div></div>
          <div className="bg-bg rounded-xl py-2.5">
            <div className="font-bold text-sm" style={{ color: qT ? corDesempenho(pct(qA, qT)) : undefined }}>{qT ? `${pct(qA, qT)}%` : '—'}</div>
            <div className="text-[10px] text-muted">{qT} questões</div>
          </div>
          <div className="bg-bg rounded-xl py-2.5"><div className="font-bold text-sm">{cards.length}</div><div className="text-[10px] text-muted">flashcards</div></div>
          <div className="bg-bg rounded-xl py-2.5">
            <div className={cx('font-bold text-sm', proxRev && proxRev.dataPrevista <= hoje && 'text-accent')}>{proxRev ? (proxRev.dataPrevista <= hoje ? 'hoje' : formatDia(proxRev.dataPrevista).slice(0, 5)) : '—'}</div>
            <div className="text-[10px] text-muted">próx. revisão</div>
          </div>
        </div>
        {topico.status === 'concluido' ? (
          <p className="text-xs text-success text-center">✓ Tópico concluído · revisões agendadas</p>
        ) : (
          <Botao variante="sucesso" onClick={() => setStatusTopico(topico.id, 'concluido')} title={`Agenda revisões em ${INTERVALOS_REVISAO.join(', ')} dias`}>
            ✓ Concluir tópico
          </Botao>
        )}
      </Card>

      <div className="grid grid-cols-2 gap-2">
        <Botao variante="secundario" tamanho="sm" disabled={!anterior} onClick={() => navigate(`/estudos/conteudo/${anterior.id}`)} title={anterior?.nome}>
          ← Anterior
        </Botao>
        <Botao variante="secundario" tamanho="sm" disabled={!proximo} onClick={() => navigate(`/estudos/conteudo/${proximo.id}`)} title={proximo?.nome}>
          Próximo →
        </Botao>
      </div>
      {proximo && <p className="text-[11px] text-muted -mt-2 truncate text-right">a seguir: {proximo.nome}</p>}
    </div>
  )
}

export default function SalaEstudo() {
  const { topicoId } = useParams()
  const dados = useConcurso()
  const { concurso, disciplinas, topicos, topicoPorId, disciplinaPorId, materiais, exercicios, flashcards, duvidas, notas } = dados
  const { update, setStatusTopico } = useEstudosStore()
  const [aba, setAba] = useState('aula')
  const [pergunta, setPergunta] = useState(null)
  const topico = topicoPorId[topicoId]

  useEffect(() => {
    setAba('aula')
    if (topicoPorId[topicoId]) update('topicos', topicoId, { ultimoAcesso: new Date().toISOString() })
    window.scrollTo({ top: 0 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topicoId])

  const ordem = useMemo(() => disciplinas.flatMap((d) => achatarArvore(topicos, d.id)), [disciplinas, topicos])
  const ctx = useMemo(() => (topico ? contextoTopico(topico, { concurso, disciplinaPorId, topicoPorId, topicos }) : null), [topico, concurso, disciplinaPorId, topicoPorId, topicos])
  const perguntar = useCallback((texto) => {
    setPergunta(texto)
    setAba('duvidas')
  }, [])
  const limparPergunta = useCallback(() => setPergunta(null), [])

  if (!topico) {
    return <Vazio titulo="Tópico não encontrado" texto="Ele pode ter sido excluído ou pertence a outro concurso." acao={<Link to="/estudos/conteudo"><Botao>Voltar ao conteúdo</Botao></Link>} />
  }

  const idx = ordem.findIndex((o) => o.topico.id === topico.id)
  const numero = ordem[idx]?.numero
  const anterior = ordem[idx - 1]?.topico
  const proximo = ordem[idx + 1]?.topico
  const disciplina = disciplinaPorId[topico.disciplinaId]
  const ancestrais = ctx.caminho.slice(0, -1)

  const doTopico = (lista) => lista.filter((x) => x.topicoId === topico.id)
  const mats = doTopico(materiais)
  const exs = doTopico(exercicios)
  const cards = doTopico(flashcards)
  const duvs = doTopico(duvidas)
  const nts = doTopico(notas)
  const aula = mats.find((m) => m.tipo === 'aula')
  const exResp = exs.filter((e) => e.resposta != null).length

  const abas = [
    { id: 'aula', label: aula ? (aula.lido ? 'Aula ✓' : 'Aula') : 'Aula' },
    { id: 'materiais', label: 'Materiais', contador: mats.length - (aula ? 1 : 0) || undefined },
    { id: 'questoes', label: 'Questões', contador: exs.length ? `${exResp}/${exs.length}` : undefined },
    { id: 'flashcards', label: 'Flashcards', contador: cards.length || undefined },
    { id: 'duvidas', label: 'Tirar dúvidas', contador: duvs.length || undefined },
    { id: 'anotacoes', label: 'Anotações', contador: nts.length || undefined },
  ]

  const props = { topico, ctx, concurso, materiais: mats }

  return (
    <div>
      <div className="mb-5">
        <div className="flex items-center gap-1.5 text-xs text-muted flex-wrap mb-2">
          <Link to="/estudos/conteudo" className="hover:text-text">Conteúdo</Link>
          <span>›</span>
          <Ponto cor={disciplina?.cor} />
          <span>{disciplina?.nome}</span>
          {ancestrais.map((a, i) => (
            <span key={i} className="truncate max-w-[200px]">› {a}</span>
          ))}
        </div>
        <h1 className="font-syne text-2xl sm:text-3xl font-black leading-tight">
          {numero && <span className="text-muted mr-2">{numero}</span>}
          {topico.nome}
        </h1>
        <div className="flex gap-1.5 mt-3 flex-wrap">
          {Object.entries(STATUS_TOPICO).map(([id, s]) => (
            <button
              key={id}
              onClick={() => setStatusTopico(topico.id, id)}
              className={cx('text-[11px] font-semibold px-2.5 py-1 rounded-full border transition', topico.status === id ? '' : 'border-border text-muted hover:text-text')}
              style={topico.status === id ? { color: s.cor, borderColor: s.cor } : undefined}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_260px] gap-5 items-start">
        <div className="min-w-0">
          <Abas abas={abas} valor={aba} onChange={setAba} />
          <div key={topico.id}>
            {aba === 'aula' && <AbaAula {...props} onPerguntar={perguntar} onIrPara={setAba} />}
            {aba === 'materiais' && <AbaMateriais {...props} />}
            {aba === 'questoes' && <AbaQuestoes {...props} exercicios={exs} />}
            {aba === 'flashcards' && <AbaFlashcards {...props} flashcards={cards} />}
            {aba === 'duvidas' && <AbaDuvidas {...props} duvidas={duvs} perguntaInicial={pergunta} onPerguntaUsada={limparPergunta} />}
            {aba === 'anotacoes' && <AbaAnotacoes topico={topico} notas={nts} />}
          </div>
        </div>
        <aside className="lg:sticky lg:top-6">
          <PainelLateral topico={topico} aba={aba} anterior={anterior} proximo={proximo} />
        </aside>
      </div>
    </div>
  )
}
