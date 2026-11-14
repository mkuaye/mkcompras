import { useEffect, useMemo, useRef, useState } from 'react'
import { useEstudosStore, pct, corDesempenho } from '../../../store/estudosStore'
import { lerArquivo } from '../../../store/estudosArquivos'
import { banco, estiloPadrao, exercicioDoBanco, iaJson, useIA } from '../ia'
import Markdown from '../Markdown'
import { Abas, Badge, Botao, Card, Select, Vazio, confirmar, cx } from '../ui'
import { AvisoIA, Carregando, ModalNovoFlashcard, salvarNoCaderno } from './comum'

const LETRAS = 'ABCDE'
const DIFS = { facil: { label: 'Fácil', cor: 'var(--success)' }, media: { label: 'Média', cor: '#fbbf24' }, dificil: { label: 'Difícil', cor: 'var(--error)' } }

function Questao({ q, numero, topico, onAviso, onNovoCard }) {
  const { responderExercicio, update, add, remove } = useEstudosStore()
  const respondida = q.resposta != null
  const certoErrado = q.estilo === 'certo_errado'

  const paraCaderno = () => {
    salvarNoCaderno(add, topico, {
      tipo: 'erro',
      titulo: q.enunciado,
      conteudo: `${q.enunciado}\n\n${q.alternativas.map((a, i) => `${certoErrado ? '' : `${LETRAS[i]}) `}${a}`).join('\n')}\n\nMinha resposta: ${q.alternativas[q.resposta]}\nGabarito: ${q.alternativas[q.correta]}\n\n${q.explicacao}`,
    })
    update('exercicios', q.id, { noCaderno: true })
    onAviso('Questão salva no caderno de erros.')
  }

  return (
    <Card className={cx('p-5 sm:p-6', respondida && (q.acertou ? 'border-success' : 'border-error'))}>
      <div className="flex items-center gap-2 mb-3 text-xs text-muted">
        <span className="font-bold text-text">Questão {numero}</span>
        {q.dificuldade && DIFS[q.dificuldade] && <Badge cor={DIFS[q.dificuldade].cor}>{DIFS[q.dificuldade].label}</Badge>}
        {respondida && <Badge cor={q.acertou ? 'var(--success)' : 'var(--error)'}>{q.acertou ? '✓ acertou' : '✕ errou'}</Badge>}
        <button className="ml-auto hover:text-error" onClick={() => confirmar('Excluir esta questão?') && remove('exercicios', q.id)} aria-label="Excluir questão">✕</button>
      </div>
      <p className="text-[15px] leading-relaxed whitespace-pre-wrap mb-4">{q.enunciado}</p>

      <div className={cx('gap-2', certoErrado ? 'grid grid-cols-2' : 'flex flex-col')}>
        {q.alternativas.map((alt, i) => {
          const correta = i === q.correta
          const escolhida = i === q.resposta
          return (
            <button
              key={i}
              disabled={respondida}
              onClick={() => responderExercicio(q.id, i)}
              className={cx(
                'text-left text-sm border rounded-xl px-4 py-2.5 transition flex gap-3 items-start',
                !respondida && 'border-border hover:border-accent hover:bg-bg',
                respondida && correta && 'border-success bg-bg text-success font-semibold',
                respondida && escolhida && !correta && 'border-error text-error line-through',
                respondida && !correta && !escolhida && 'border-border opacity-60'
              )}
            >
              {!certoErrado && <span className="font-bold w-4 flex-shrink-0">{LETRAS[i]}</span>}
              <span className={cx(certoErrado && 'w-full text-center font-semibold')}>{alt}</span>
            </button>
          )
        })}
      </div>

      {respondida && (
        <div className="mt-4 pt-4 border-t border-border flex flex-col gap-3">
          <div className="text-xs font-semibold uppercase tracking-widest text-muted">Comentário</div>
          <Markdown className="text-sm">{q.explicacao}</Markdown>
          <div className="flex gap-2 flex-wrap">
            {!q.acertou && !q.noCaderno && <Botao tamanho="sm" variante="perigo" onClick={paraCaderno}>✎ Caderno de erros</Botao>}
            {q.noCaderno && <span className="text-xs text-muted self-center">✓ no caderno de erros</span>}
            <Botao tamanho="sm" variante="secundario" onClick={() => onNovoCard({ frente: q.enunciado, verso: `${q.alternativas[q.correta]}\n\n${q.explicacao}` })}>▣ Virar flashcard</Botao>
            <Botao tamanho="sm" variante="fantasma" onClick={() => update('exercicios', q.id, { resposta: null, acertou: null })}>↻ Refazer</Botao>
            {q.bancoId && (
              <Botao
                tamanho="sm"
                variante="fantasma"
                className="hover:!text-error ml-auto"
                title="Tira a questão do banco para ninguém mais recebê-la"
                onClick={async () => {
                  if (!confirmar('Esta questão tem erro (gabarito ou explicação)? Ela será removida do banco e daqui.')) return
                  try {
                    await banco('reportar', { id: q.bancoId })
                    remove('exercicios', q.id)
                    onAviso('Questão removida do banco. Obrigado!')
                  } catch (e) {
                    onAviso(`Não foi possível reportar: ${e.message}`)
                  }
                }}
              >
                ⚑ Reportar erro
              </Botao>
            )}
          </div>
        </div>
      )}
    </Card>
  )
}

export default function AbaQuestoes({ topico, ctx, concurso, materiais, exercicios }) {
  const { addMuitos } = useEstudosStore()
  const iniciarTopico = useEstudosStore((s) => s.iniciarTopico)
  const [qtd, setQtd] = useState(10)
  const [estilo, setEstilo] = useState(estiloPadrao(concurso?.banca))
  const [dificuldade, setDificuldade] = useState('')
  const [gerando, setGerando] = useState(false)
  const [erro, setErro] = useState(null)
  const [filtro, setFiltro] = useState('todas')
  const [aviso, setAviso] = useState(null)
  const [novoCard, setNovoCard] = useState(null)
  const abortar = useRef(null)
  const aula = materiais.find((m) => m.tipo === 'aula')
  const senha = useIA((s) => s.senha)
  const [disponiveis, setDisponiveis] = useState(null) // questões no banco que você ainda não tem
  const [puxando, setPuxando] = useState(false)
  const idsBanco = exercicios.map((e) => e.bancoId).filter(Boolean)
  const chaveIds = idsBanco.join(',')

  useEffect(() => () => abortar.current?.abort(), [])

  // Quantas questões do banco servem para este tópico (consulta grátis)
  useEffect(() => {
    if (!senha) return
    const ctl = new AbortController()
    banco('contar', { disciplina: ctx.disciplina, caminho: ctx.caminho, estilo, excluir: idsBanco }, ctl.signal)
      .then((r) => setDisponiveis(r.total ?? null))
      .catch(() => setDisponiveis(null))
    return () => ctl.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [senha, estilo, chaveIds, ctx.disciplina, ctx.caminho.join('›')])

  const puxarDoBanco = async () => {
    setErro(null)
    setPuxando(true)
    try {
      const { questoes } = await banco('buscar', { disciplina: ctx.disciplina, caminho: ctx.caminho, estilo, excluir: idsBanco, quantidade: qtd })
      if (!questoes.length) throw new Error('Não há mais questões deste tópico no banco. Gere novas com a IA.')
      addMuitos('exercicios', questoes.map((q) => exercicioDoBanco(q, topico)))
      iniciarTopico(topico.id)
      setFiltro('pendentes')
    } catch (e) {
      setErro(e.message)
    } finally {
      setPuxando(false)
    }
  }
  useEffect(() => {
    if (!aviso) return
    const t = setTimeout(() => setAviso(null), 2500)
    return () => clearTimeout(t)
  }, [aviso])

  const gerar = async () => {
    setErro(null)
    setGerando(true)
    abortar.current = new AbortController()
    try {
      const textoAula = aula ? await lerArquivo(aula.id) : ''
      const { questoes, aviso } = await iaJson(
        'questoes',
        { ...ctx, quantidade: qtd, estilo, dificuldade, aula: typeof textoAula === 'string' ? textoAula : '', evitar: exercicios.map((e) => e.enunciado) },
        abortar.current.signal
      )
      if (!questoes?.length) throw new Error('A IA não devolveu questões válidas. Tente de novo.')
      // O servidor já guardou as questões no banco (bancoId) para reaproveitar depois
      addMuitos(
        'exercicios',
        questoes.map((q) => ({ ...q, disciplinaId: topico.disciplinaId, topicoId: topico.id, resposta: null, acertou: null, origem: 'ia' }))
      )
      if (aviso) setAviso(aviso)
      iniciarTopico(topico.id)
      setFiltro('pendentes')
    } catch (e) {
      if (e.name !== 'AbortError') setErro(e.message)
    } finally {
      setGerando(false)
    }
  }

  const respondidas = exercicios.filter((e) => e.resposta != null)
  const acertos = respondidas.filter((e) => e.acertou).length
  const p = pct(acertos, respondidas.length)
  const numeradas = exercicios.map((q, i) => ({ q, n: i + 1 }))
  // A lista do filtro só é recalculada ao trocar de filtro ou gerar questões, para a questão
  // recém-respondida continuar na tela com o comentário
  const idsFiltro = useMemo(
    () =>
      new Set(
        exercicios
          .filter((q) =>
            filtro === 'pendentes' ? q.resposta == null : filtro === 'erradas' ? q.resposta != null && !q.acertou : filtro === 'certas' ? q.acertou : true
          )
          .map((q) => q.id)
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filtro, exercicios.length, topico.id]
  )
  const visiveis = numeradas.filter(({ q }) => idsFiltro.has(q.id))

  return (
    <div className="flex flex-col gap-4">
      <Card className="p-5 flex flex-col gap-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-muted">Quantidade</span>
            <Select value={qtd} onChange={(e) => setQtd(Number(e.target.value))} className="!w-auto">
              {[5, 10, 15, 20].map((n) => <option key={n} value={n}>{n} questões</option>)}
            </Select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-muted">Formato</span>
            <Select value={estilo} onChange={(e) => setEstilo(e.target.value)} className="!w-auto">
              <option value="multipla">Múltipla escolha (A–E)</option>
              <option value="certo_errado">Certo ou errado</option>
            </Select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-muted">Dificuldade</span>
            <Select value={dificuldade} onChange={(e) => setDificuldade(e.target.value)} className="!w-auto">
              <option value="">Misturada</option>
              <option value="facil">Fácil</option>
              <option value="media">Média</option>
              <option value="dificil">Difícil</option>
            </Select>
          </label>
          {disponiveis > 0 && (
            <Botao onClick={puxarDoBanco} disabled={puxando || gerando}>
              📚 {puxando ? 'Buscando…' : `Puxar ${Math.min(qtd, disponiveis)} do banco (grátis)`}
            </Botao>
          )}
          <Botao variante={disponiveis > 0 ? 'secundario' : 'primario'} onClick={gerar} disabled={gerando || puxando}>
            ✦ {exercicios.length ? 'Gerar novas com IA' : 'Gerar questões com IA'}
          </Botao>
          {gerando && <Botao variante="fantasma" onClick={() => abortar.current?.abort()}>Cancelar</Botao>}
        </div>
        {disponiveis !== null && (
          <p className="text-xs text-muted -mt-1">
            {disponiveis > 0
              ? `${disponiveis} questões deste tópico no banco que você ainda não fez. Puxar do banco não gasta créditos; gerar com IA gasta, e as novas também ficam salvas no banco.`
              : 'O banco ainda não tem questões novas deste tópico neste formato. As que a IA gerar ficam salvas para reaproveitar depois.'}
          </p>
        )}
        {gerando && <Carregando texto={`Criando ${qtd} questões no estilo ${concurso?.banca ? `da ${concurso.banca}` : 'da sua banca'}${aula ? ' a partir da aula' : ''}… (pode levar um minuto)`} />}
        {erro && <p className="text-sm text-error">{erro}</p>}
        {respondidas.length > 0 && (
          <div className="flex items-center gap-4 text-sm pt-3 border-t border-border">
            <span className="font-syne text-2xl font-black" style={{ color: corDesempenho(p) }}>{p}%</span>
            <span className="text-muted">
              {acertos} de {respondidas.length} respondidas · {exercicios.length - respondidas.length} pendentes. Cada resposta entra nas suas estatísticas de questões.
            </span>
          </div>
        )}
      </Card>

      {exercicios.length === 0 ? (
        !gerando && (
          <Vazio
            titulo="Nenhuma questão ainda"
            texto={aula ? 'Gere questões inéditas baseadas na aula deste tópico, com gabarito comentado.' : 'Dica: gere a aula primeiro para que as questões cubram exatamente o que você estudou.'}
          />
        )
      ) : (
        <>
          <Abas
            valor={filtro}
            onChange={setFiltro}
            abas={[
              { id: 'todas', label: 'Todas', contador: exercicios.length },
              { id: 'pendentes', label: 'Pendentes', contador: exercicios.length - respondidas.length },
              { id: 'erradas', label: 'Erradas', contador: respondidas.length - acertos },
              { id: 'certas', label: 'Certas', contador: acertos },
            ]}
          />
          {visiveis.length === 0 ? (
            <p className="text-sm text-muted">Nenhuma questão neste filtro.</p>
          ) : (
            visiveis.map(({ q, n }) => <Questao key={q.id} q={q} numero={n} topico={topico} onAviso={setAviso} onNovoCard={setNovoCard} />)
          )}
          <AvisoIA />
        </>
      )}

      {novoCard && <ModalNovoFlashcard inicial={novoCard} topico={topico} onFechar={() => setNovoCard(null)} />}
      {aviso && <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-surface border border-success text-success text-sm rounded-xl px-4 py-2 shadow-2xl">{aviso}</div>}
    </div>
  )
}
