import { useEffect, useMemo, useRef, useState } from 'react'
import { useConcurso, useEstudosStore, TIPOS_SESSAO, diaKey, formatMinutos, formatDataHora } from '../../../store/estudosStore'
import { useTimer, formatRelogio } from '../useTimer'
import { Botao, Campo, Card, CardTitulo, Input, Modal, PageHeader, Ponto, Select, SelectDisciplina, SelectTopico, Textarea, Vazio, cx, confirmar } from '../ui'
import { Link } from 'react-router-dom'

const METAS = [0, 25, 50, 90]

function bip() {
  try {
    const ctx = new AudioContext()
    ;[0, 0.25, 0.5].forEach((t) => {
      const osc = ctx.createOscillator()
      osc.connect(ctx.destination)
      osc.frequency.value = 880
      osc.start(ctx.currentTime + t)
      osc.stop(ctx.currentTime + t + 0.15)
    })
  } catch {
    /* sem áudio */
  }
}

function ModalFinalizar({ minutos, onFechar }) {
  const { timer, timerZerar, add, setStatusTopico } = useEstudosStore()
  const { topicoPorId } = useConcurso()
  const [f, setF] = useState({ minutos, obs: '', total: '', acertos: '', concluir: false })
  const topico = topicoPorId[timer.topicoId]

  const salvar = () => {
    const min = Number(f.minutos) || 0
    if (min > 0) {
      add('sessoes', { disciplinaId: timer.disciplinaId, topicoId: timer.topicoId || null, tipo: timer.tipo, minutos: min, data: new Date().toISOString(), obs: f.obs.trim() })
    }
    const t = Number(f.total)
    const a = Number(f.acertos)
    if (t > 0 && a >= 0 && a <= t) {
      add('questoes', { disciplinaId: timer.disciplinaId, topicoId: timer.topicoId || null, total: t, acertos: a, data: new Date().toISOString(), fonte: 'Sessão de estudo' })
    }
    if (f.concluir && topico) setStatusTopico(topico.id, 'concluido')
    timerZerar()
    onFechar()
  }

  return (
    <Modal aberto onFechar={onFechar} titulo="Registrar sessão">
      <div className="flex flex-col gap-4">
        <Campo label="Minutos estudados">
          <Input type="number" min="1" value={f.minutos} onChange={(e) => setF({ ...f, minutos: e.target.value })} />
        </Campo>
        <div className="grid grid-cols-2 gap-3">
          <Campo label="Questões feitas (opcional)">
            <Input type="number" min="0" value={f.total} onChange={(e) => setF({ ...f, total: e.target.value })} />
          </Campo>
          <Campo label="Acertos">
            <Input type="number" min="0" value={f.acertos} onChange={(e) => setF({ ...f, acertos: e.target.value })} />
          </Campo>
        </div>
        <Campo label="Observação">
          <Textarea rows={2} value={f.obs} onChange={(e) => setF({ ...f, obs: e.target.value })} placeholder="O que estudou, onde parou, dúvidas…" />
        </Campo>
        {topico && topico.status !== 'concluido' && (
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={f.concluir} onChange={(e) => setF({ ...f, concluir: e.target.checked })} className="w-4 h-4 accent-[var(--accent)]" />
            Marcar “{topico.nome}” como concluído (agenda revisões)
          </label>
        )}
        <div className="flex gap-2 justify-end">
          <Botao variante="secundario" onClick={onFechar}>Voltar</Botao>
          <Botao onClick={salvar}>Salvar sessão</Botao>
        </div>
      </div>
    </Modal>
  )
}

function LancamentoManual() {
  const { disciplinas, topicos } = useConcurso()
  const { add } = useEstudosStore()
  const [f, setF] = useState({ disciplinaId: '', topicoId: '', tipo: 'teoria', minutos: '', dia: diaKey(), obs: '' })
  const valido = f.disciplinaId && Number(f.minutos) > 0

  return (
    <Card className="p-5">
      <CardTitulo>Lançamento manual</CardTitulo>
      <div className="flex flex-col gap-3">
        <SelectDisciplina disciplinas={disciplinas} value={f.disciplinaId} onChange={(v) => setF({ ...f, disciplinaId: v, topicoId: '' })} placeholder="Disciplina" />
        <SelectTopico topicos={topicos} disciplinaId={f.disciplinaId} value={f.topicoId} onChange={(v) => setF({ ...f, topicoId: v })} />
        <div className="grid grid-cols-3 gap-2">
          <Select value={f.tipo} onChange={(e) => setF({ ...f, tipo: e.target.value })}>
            {TIPOS_SESSAO.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </Select>
          <Input type="number" min="1" placeholder="Min" value={f.minutos} onChange={(e) => setF({ ...f, minutos: e.target.value })} />
          <Input type="date" value={f.dia} max={diaKey()} onChange={(e) => setF({ ...f, dia: e.target.value })} />
        </div>
        <Botao
          variante="secundario"
          disabled={!valido}
          onClick={() => {
            const data = f.dia === diaKey() ? new Date() : new Date(`${f.dia}T12:00`)
            add('sessoes', { disciplinaId: f.disciplinaId, topicoId: f.topicoId || null, tipo: f.tipo, minutos: Number(f.minutos), data: data.toISOString(), obs: f.obs })
            setF({ ...f, minutos: '', obs: '' })
          }}
        >
          Lançar
        </Botao>
      </div>
    </Card>
  )
}

export default function Cronometro() {
  const { disciplinas, topicos, sessoes, disciplinaPorId, topicoPorId } = useConcurso()
  const { timerConfig, timerIniciar, timerPausar, timerZerar, remove } = useEstudosStore()
  const { timer, rodando, segundos, atingiuMeta, restante } = useTimer()
  const [finalizando, setFinalizando] = useState(false)
  const [filtroDisc, setFiltroDisc] = useState('')
  const [metaCustom, setMetaCustom] = useState('')
  const avisou = useRef(false)

  // Garante uma disciplina válida selecionada
  useEffect(() => {
    if (!disciplinaPorId[timer.disciplinaId] && disciplinas.length) timerConfig({ disciplinaId: disciplinas[0].id, topicoId: '' })
  }, [disciplinas, disciplinaPorId, timer.disciplinaId, timerConfig])

  useEffect(() => {
    if (!atingiuMeta) avisou.current = false
    else if (rodando && !avisou.current) {
      avisou.current = true
      bip()
    }
  }, [atingiuMeta, rodando])

  // Mostra o tempo na aba do navegador
  useEffect(() => {
    if (!rodando) return
    const anterior = document.title
    document.title = `${formatRelogio(segundos)} · Estudos`
    return () => { document.title = anterior }
  }, [rodando, segundos])

  const hojeKey = diaKey()
  const hojeMin = sessoes.filter((s) => diaKey(s.data) === hojeKey).reduce((a, s) => a + s.minutos, 0)
  const historico = useMemo(
    () => [...sessoes].filter((s) => !filtroDisc || s.disciplinaId === filtroDisc).sort((a, b) => b.data.localeCompare(a.data)).slice(0, 40),
    [sessoes, filtroDisc]
  )

  if (!disciplinas.length) {
    return <Vazio titulo="Nenhuma disciplina" texto="Cadastre as disciplinas no edital para usar o cronômetro." acao={<Link to="/estudos/edital"><Botao>Ir para o edital</Botao></Link>} />
  }

  const travado = rodando || segundos > 0
  const d = disciplinaPorId[timer.disciplinaId]

  return (
    <div>
      <PageHeader titulo="Cronômetro" descricao={`Hoje: ${formatMinutos(hojeMin)} estudados. O cronômetro continua rodando se você navegar para outras seções ou recarregar a página.`} />
      <div className="grid lg:grid-cols-[1fr_340px] gap-5">
        <div className="flex flex-col gap-5">
          <Card className="p-6 flex flex-col gap-5">
            <div className="grid sm:grid-cols-2 gap-3">
              <Campo label="Disciplina">
                <SelectDisciplina disciplinas={disciplinas} value={timer.disciplinaId} onChange={(v) => timerConfig({ disciplinaId: v, topicoId: '' })} disabled={travado} />
              </Campo>
              <Campo label="Tópico">
                <SelectTopico topicos={topicos} disciplinaId={timer.disciplinaId} value={timer.topicoId} onChange={(v) => timerConfig({ topicoId: v })} />
              </Campo>
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-xs text-muted mr-1">Tipo:</span>
              {TIPOS_SESSAO.map((t) => (
                <button
                  key={t.id}
                  onClick={() => timerConfig({ tipo: t.id })}
                  className={cx('text-xs font-semibold px-3 py-1 rounded-full border', timer.tipo === t.id ? 'border-accent text-accent' : 'border-border text-muted hover:text-text')}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-xs text-muted mr-1">Meta:</span>
              {METAS.map((m) => (
                <button
                  key={m}
                  onClick={() => timerConfig({ metaMin: m })}
                  className={cx('text-xs font-semibold px-3 py-1 rounded-full border', timer.metaMin === m ? 'border-accent text-accent' : 'border-border text-muted hover:text-text')}
                >
                  {m ? `${m} min` : 'Livre'}
                </button>
              ))}
              <Input
                type="number"
                min="1"
                placeholder="Outra"
                value={metaCustom}
                onChange={(e) => {
                  setMetaCustom(e.target.value)
                  if (Number(e.target.value) > 0) timerConfig({ metaMin: Number(e.target.value) })
                }}
                className="!w-20 !py-1 !text-xs"
              />
            </div>

            <div className="text-center py-6">
              <div className="text-xs text-muted mb-2 flex items-center justify-center gap-2">
                <Ponto cor={d?.cor} />
                {d?.nome}
                {topicoPorId[timer.topicoId] && <span>· {topicoPorId[timer.topicoId].nome}</span>}
              </div>
              <div className={cx('font-syne text-6xl sm:text-7xl font-black tabular-nums', atingiuMeta && 'text-success')}>{formatRelogio(segundos)}</div>
              <div className="text-muted text-xs mt-3">
                {atingiuMeta ? 'Meta atingida! Registre a sessão e faça uma pausa.' : restante !== null ? `Faltam ${formatRelogio(restante)}` : 'Modo livre'}
              </div>
            </div>

            <div className="flex gap-2 flex-wrap">
              {rodando ? (
                <Botao variante="secundario" className="flex-1 !py-3" onClick={timerPausar}>❚❚ Pausar</Botao>
              ) : (
                <Botao className="flex-1 !py-3" onClick={timerIniciar}>▶ {segundos ? 'Continuar' : 'Iniciar'}</Botao>
              )}
              <Botao
                variante="sucesso"
                className="flex-1 !py-3"
                disabled={segundos < 60}
                onClick={() => {
                  timerPausar()
                  setFinalizando(true)
                }}
              >
                ✓ Finalizar
              </Botao>
              <Botao variante="fantasma" disabled={!segundos} onClick={() => confirmar('Descartar o tempo atual?') && timerZerar()}>
                Descartar
              </Botao>
            </div>
          </Card>
        </div>

        <div className="flex flex-col gap-5">
          <LancamentoManual />
        </div>
      </div>

      <Card className="p-5 mt-5">
        <CardTitulo acao={<SelectDisciplina disciplinas={disciplinas} value={filtroDisc} onChange={setFiltroDisc} todas="Todas as disciplinas" className="!w-auto !py-1.5 !text-xs" />}>
          Histórico de sessões
        </CardTitulo>
        {historico.length === 0 ? (
          <p className="text-muted text-sm">Nenhuma sessão registrada.</p>
        ) : (
          <ul className="flex flex-col">
            {historico.map((s) => {
              const disc = disciplinaPorId[s.disciplinaId]
              return (
                <li key={s.id} className="group flex items-center gap-3 py-2.5 border-t border-border first:border-t-0 text-sm">
                  <Ponto cor={disc?.cor} />
                  <div className="flex-1 min-w-0">
                    <div className="truncate">
                      {disc?.nome}
                      {topicoPorId[s.topicoId] && <span className="text-muted"> · {topicoPorId[s.topicoId].nome}</span>}
                    </div>
                    {s.obs && <div className="text-xs text-muted truncate">{s.obs}</div>}
                  </div>
                  <span className="text-[11px] text-muted hidden sm:inline">{TIPOS_SESSAO.find((t) => t.id === s.tipo)?.label}</span>
                  <span className="font-semibold">{formatMinutos(s.minutos)}</span>
                  <span className="text-muted text-xs w-24 text-right">{formatDataHora(s.data)}</span>
                  <button onClick={() => remove('sessoes', s.id)} className="text-muted hover:text-error text-xs sm:opacity-0 group-hover:opacity-100" aria-label="Remover">
                    ✕
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </Card>

      {finalizando && <ModalFinalizar minutos={Math.round(segundos / 60)} onFechar={() => setFinalizando(false)} />}
    </div>
  )
}
