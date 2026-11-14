import { useMemo, useState } from 'react'
import { Link, Route, Routes, useNavigate } from 'react-router-dom'
import { useConcurso, STATUS_TOPICO, achatarArvore, formatDataHora, pct, corDesempenho } from '../../../store/estudosStore'
import { useIA } from '../ia'
import { Abas, Badge, Barra, Botao, Card, Input, PageHeader, Ponto, SelectDisciplina, Vazio, cx } from '../ui'
import SalaEstudo from '../sala/SalaEstudo'

function Biblioteca() {
  const { disciplinas, topicos, topicoPorId, disciplinaPorId, materiais, exercicios, flashcards, duvidas } = useConcurso()
  const { senha, abrirConfig } = useIA()
  const navigate = useNavigate()
  const [disc, setDisc] = useState('')
  const [busca, setBusca] = useState('')
  const [filtro, setFiltro] = useState('todos')
  const [abertas, setAbertas] = useState({})

  const porTopico = useMemo(() => {
    const m = {}
    const g = (id) => (m[id] ||= { aula: null, mats: 0, ex: 0, resp: 0, ok: 0, cards: 0, duv: 0 })
    materiais.forEach((x) => (x.tipo === 'aula' ? (g(x.topicoId).aula = x) : g(x.topicoId).mats++))
    exercicios.forEach((e) => {
      const o = g(e.topicoId)
      o.ex++
      if (e.resposta != null) {
        o.resp++
        if (e.acertou) o.ok++
      }
    })
    flashcards.forEach((f) => f.topicoId && g(f.topicoId).cards++)
    duvidas.forEach((d) => g(d.topicoId).duv++)
    return m
  }, [materiais, exercicios, flashcards, duvidas])

  const ultimo = useMemo(
    () => topicos.filter((t) => t.ultimoAcesso).sort((a, b) => b.ultimoAcesso.localeCompare(a.ultimoAcesso))[0],
    [topicos]
  )

  if (!disciplinas.length) {
    return (
      <div>
        <PageHeader titulo="Conteúdo" />
        <Vazio
          titulo="Monte o edital primeiro"
          texto="O conteúdo é organizado pelos tópicos do seu edital. Cadastre ou importe as disciplinas e tópicos e cada um ganha sua sala de estudo."
          acao={<Link to="/estudos/edital"><Botao>Ir para o edital</Botao></Link>}
        />
      </div>
    )
  }

  const comAula = topicos.filter((t) => porTopico[t.id]?.aula).length
  const lidas = topicos.filter((t) => porTopico[t.id]?.aula?.lido).length
  const totalResp = exercicios.filter((e) => e.resposta != null).length
  const totalOk = exercicios.filter((e) => e.acertou).length
  const termo = busca.trim().toLowerCase()

  const passa = (t) => {
    const info = porTopico[t.id]
    if (termo && !t.nome.toLowerCase().includes(termo)) return false
    if (filtro === 'sem-aula') return !info?.aula
    if (filtro === 'nao-lidas') return info?.aula && !info.aula.lido
    if (filtro === 'pendentes') return t.status !== 'concluido'
    return true
  }
  const filtrando = !!termo || filtro !== 'todos' || !!disc

  return (
    <div>
      <PageHeader
        titulo="Conteúdo"
        descricao="Cada tópico do edital tem uma sala de estudo: aula, seus materiais (PDF, vídeo, textos), questões com gabarito comentado, flashcards e um tutor para tirar dúvidas. Tudo ligado ao cronômetro, às revisões e às estatísticas."
      />

      <div className="grid md:grid-cols-3 gap-4 mb-5">
        {ultimo ? (
          <Card className="p-5 flex flex-col gap-2 cursor-pointer hover:border-accent transition" onClick={() => navigate(`/estudos/conteudo/${ultimo.id}`)}>
            <div className="text-[11px] font-semibold uppercase tracking-widest text-muted">Continuar de onde parou</div>
            <div className="flex items-center gap-2 font-semibold min-w-0">
              <Ponto cor={disciplinaPorId[ultimo.disciplinaId]?.cor} />
              <span className="truncate">{ultimo.nome}</span>
            </div>
            <div className="text-xs text-muted truncate">{disciplinaPorId[ultimo.disciplinaId]?.nome} · {formatDataHora(ultimo.ultimoAcesso)}</div>
            <span className="text-xs text-accent mt-auto">Abrir sala →</span>
          </Card>
        ) : (
          <Card className="p-5 flex flex-col gap-2">
            <div className="text-[11px] font-semibold uppercase tracking-widest text-muted">Comece por aqui</div>
            <p className="text-sm">Escolha um tópico abaixo para abrir a sala de estudo dele.</p>
          </Card>
        )}
        <Card className="p-5 flex flex-col gap-2">
          <div className="text-[11px] font-semibold uppercase tracking-widest text-muted">Aulas</div>
          <div className="font-syne text-2xl font-black">{lidas}<span className="text-muted text-base font-semibold"> / {topicos.length} lidas</span></div>
          <Barra pct={pct(lidas, topicos.length)} />
          <div className="text-xs text-muted">
            {comAula} com aula · {totalResp} questões resolvidas{totalResp ? <> · <strong style={{ color: corDesempenho(pct(totalOk, totalResp)) }}>{pct(totalOk, totalResp)}%</strong></> : null}
          </div>
        </Card>
        <Card className="p-5 flex flex-col gap-2">
          <div className="text-[11px] font-semibold uppercase tracking-widest text-muted">IA de estudos</div>
          {senha ? (
            <p className="text-sm"><span className="text-success font-semibold">● Configurada.</span> Gere aulas, questões e flashcards em qualquer tópico.</p>
          ) : (
            <p className="text-sm">Informe a senha para liberar a geração de aulas, questões, flashcards e o tutor.</p>
          )}
          <Botao tamanho="sm" variante={senha ? 'secundario' : 'primario'} className="self-start mt-auto" onClick={abrirConfig}>
            {senha ? 'Alterar senha' : 'Configurar IA'}
          </Botao>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:items-start mb-2">
        <Abas
          valor={filtro}
          onChange={setFiltro}
          abas={[
            { id: 'todos', label: 'Todos' },
            { id: 'pendentes', label: 'Não concluídos' },
            { id: 'sem-aula', label: 'Sem aula' },
            { id: 'nao-lidas', label: 'Aula não lida' },
          ]}
        />
        <div className="flex gap-2 sm:ml-auto">
          <SelectDisciplina disciplinas={disciplinas} value={disc} onChange={setDisc} todas="Todas as disciplinas" className="!w-auto !py-1.5 !text-xs" />
          <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar tópico…" className="sm:max-w-[200px] !py-1.5" />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {disciplinas
          .filter((d) => !disc || d.id === disc)
          .map((d) => {
            const lista = achatarArvore(topicos, d.id)
            const visiveis = lista.filter(({ topico }) => passa(topico))
            if (filtrando && !visiveis.length) return null
            const comAulaD = lista.filter(({ topico }) => porTopico[topico.id]?.aula).length
            const aberta = filtrando || (abertas[d.id] ?? disciplinas.length === 1)
            return (
              <Card key={d.id}>
                <button onClick={() => setAbertas({ ...abertas, [d.id]: !aberta })} className="w-full flex items-center gap-3 p-4 text-left">
                  <Ponto cor={d.cor} />
                  <strong className="flex-1 truncate">{d.nome}</strong>
                  <span className="text-xs text-muted whitespace-nowrap">{comAulaD}/{lista.length} com aula</span>
                  <span className="text-muted text-xs">{aberta ? '▲' : '▼'}</span>
                </button>
                {aberta && (
                  <div className="border-t border-border px-2 sm:px-3 py-2">
                    {lista.length === 0 && <p className="text-sm text-muted p-2">Sem tópicos. <Link to="/estudos/edital" className="text-accent">Cadastrar no edital</Link></p>}
                    {visiveis.map(({ topico, nivel, numero }) => {
                      const info = porTopico[topico.id] || {}
                      const st = STATUS_TOPICO[topico.status]
                      return (
                        <button
                          key={topico.id}
                          onClick={() => navigate(`/estudos/conteudo/${topico.id}`)}
                          className="w-full flex items-center gap-2 py-2 pr-2 rounded-lg hover:bg-bg text-left"
                          style={{ paddingLeft: (filtrando ? 0 : nivel * 18) + 8 }}
                        >
                          <span
                            className="w-2.5 h-2.5 rounded-full border-2 flex-shrink-0"
                            style={{ borderColor: st.cor, background: topico.status === 'concluido' ? st.cor : 'transparent' }}
                            title={st.label}
                          />
                          <span className="text-[11px] text-muted tabular-nums flex-shrink-0">{numero}</span>
                          <span className={cx('flex-1 text-sm min-w-0 truncate', nivel === 0 && 'font-semibold')}>
                            {filtrando && topico.parentId && <span className="text-muted">{topicoPorId[topico.parentId]?.nome} › </span>}
                            {topico.nome}
                          </span>
                          <span className="flex gap-1 flex-shrink-0">
                            {info.aula && <Badge cor={info.aula.lido ? 'var(--success)' : 'var(--accent)'}>{info.aula.lido ? '✓ aula' : '📖 aula'}</Badge>}
                            {info.mats > 0 && <Badge className="hidden sm:inline-flex">📎 {info.mats}</Badge>}
                            {info.ex > 0 && (
                              <Badge cor={info.resp ? corDesempenho(pct(info.ok, info.resp)) : undefined} className="hidden sm:inline-flex">
                                {info.resp}/{info.ex}q{info.resp ? ` · ${pct(info.ok, info.resp)}%` : ''}
                              </Badge>
                            )}
                            {info.cards > 0 && <Badge className="hidden md:inline-flex">▣ {info.cards}</Badge>}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                )}
              </Card>
            )
          })}
      </div>
    </div>
  )
}

export default function Conteudo() {
  return (
    <Routes>
      <Route index element={<Biblioteca />} />
      <Route path=":topicoId" element={<SalaEstudo />} />
    </Routes>
  )
}
