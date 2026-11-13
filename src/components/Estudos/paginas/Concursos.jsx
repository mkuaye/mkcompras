import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useEstudosStore, CORES, diaKey, diasEntre, formatDia, formatMinutos, progressoTopicos } from '../../../store/estudosStore'
import { Badge, Barra, Botao, Campo, Card, Input, Modal, PageHeader, Vazio, confirmar, cx } from '../ui'

const MODELOS = [
  { nome: 'Personalizado', disciplinas: [] },
  {
    nome: 'Base comum — nível médio',
    disciplinas: ['Língua Portuguesa', 'Raciocínio Lógico-Matemático', 'Noções de Informática', 'Ética no Serviço Público', 'Noções de Direito Constitucional', 'Noções de Direito Administrativo'],
  },
  {
    nome: 'Tribunais — Técnico / Analista',
    disciplinas: ['Língua Portuguesa', 'Raciocínio Lógico', 'Direito Constitucional', 'Direito Administrativo', 'Direito Civil', 'Direito Processual Civil', 'Direito Penal', 'Direito Processual Penal', 'Legislação Específica do Tribunal'],
  },
  {
    nome: 'Área policial',
    disciplinas: ['Língua Portuguesa', 'Raciocínio Lógico', 'Informática', 'Direito Constitucional', 'Direito Administrativo', 'Direito Penal', 'Direito Processual Penal', 'Legislação Penal Especial', 'Direitos Humanos'],
  },
  {
    nome: 'Área fiscal',
    disciplinas: ['Língua Portuguesa', 'Raciocínio Lógico', 'Direito Tributário', 'Direito Constitucional', 'Direito Administrativo', 'Contabilidade Geral', 'Auditoria', 'Legislação Tributária', 'Economia', 'Administração Pública'],
  },
  {
    nome: 'INSS / Seguridade',
    disciplinas: ['Língua Portuguesa', 'Raciocínio Lógico', 'Informática', 'Ética no Serviço Público', 'Direito Constitucional', 'Direito Administrativo', 'Direito Previdenciário'],
  },
]

const vazio = { nome: '', orgao: '', banca: '', cargo: '', dataProva: '', metaHorasSemana: 20, metaQuestoesSemana: 200, cor: CORES[0] }

function FormConcurso({ inicial, onSalvar, onCancelar, comModelo }) {
  const [f, setF] = useState({ ...vazio, ...inicial })
  const [modelo, setModelo] = useState(0)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  const salvar = (e) => {
    e.preventDefault()
    if (!f.nome.trim()) return
    onSalvar(
      { ...f, nome: f.nome.trim(), metaHorasSemana: Number(f.metaHorasSemana) || 0, metaQuestoesSemana: Number(f.metaQuestoesSemana) || 0 },
      MODELOS[modelo].disciplinas
    )
  }

  return (
    <form onSubmit={salvar} className="flex flex-col gap-4">
      <Campo label="Nome do concurso *">
        <Input autoFocus value={f.nome} onChange={set('nome')} placeholder="Ex.: TRF 1ª Região 2027" />
      </Campo>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Campo label="Órgão">
          <Input value={f.orgao} onChange={set('orgao')} placeholder="TRF1" />
        </Campo>
        <Campo label="Banca">
          <Input value={f.banca} onChange={set('banca')} placeholder="FGV, Cebraspe…" />
        </Campo>
        <Campo label="Cargo">
          <Input value={f.cargo} onChange={set('cargo')} placeholder="Técnico Judiciário" />
        </Campo>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Campo label="Data da prova">
          <Input type="date" value={f.dataProva} onChange={set('dataProva')} />
        </Campo>
        <Campo label="Meta horas/semana">
          <Input type="number" min="0" value={f.metaHorasSemana} onChange={set('metaHorasSemana')} />
        </Campo>
        <Campo label="Meta questões/semana">
          <Input type="number" min="0" value={f.metaQuestoesSemana} onChange={set('metaQuestoesSemana')} />
        </Campo>
      </div>
      <Campo label="Cor">
        <div className="flex gap-2 flex-wrap">
          {CORES.map((c) => (
            <button
              type="button"
              key={c}
              onClick={() => setF({ ...f, cor: c })}
              className={cx('w-7 h-7 rounded-full border-2', f.cor === c ? 'border-text' : 'border-transparent')}
              style={{ background: c }}
              aria-label={c}
            />
          ))}
        </div>
      </Campo>
      {comModelo && (
        <Campo label="Começar com disciplinas de um modelo">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {MODELOS.map((m, i) => (
              <button
                type="button"
                key={m.nome}
                onClick={() => setModelo(i)}
                className={cx('text-left text-sm px-3 py-2 rounded-xl border', modelo === i ? 'border-accent text-text' : 'border-border text-muted hover:text-text')}
              >
                <div className="font-semibold">{m.nome}</div>
                <div className="text-[11px] opacity-70">{m.disciplinas.length ? `${m.disciplinas.length} disciplinas` : 'Começar do zero'}</div>
              </button>
            ))}
          </div>
        </Campo>
      )}
      <div className="flex gap-2 justify-end pt-2">
        {onCancelar && (
          <Botao variante="secundario" onClick={onCancelar}>
            Cancelar
          </Botao>
        )}
        <Botao type="submit" disabled={!f.nome.trim()}>
          Salvar
        </Botao>
      </div>
    </form>
  )
}

export default function Concursos() {
  const store = useEstudosStore()
  const { concursos, concursoAtivoId, addConcurso, updateConcurso, removeConcurso, setConcursoAtivo, addDisciplina } = store
  const [params, setParams] = useSearchParams()
  const [editando, setEditando] = useState(null) // 'novo' | concurso
  const [mostrarArquivados, setMostrarArquivados] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    if (params.get('novo')) {
      setEditando('novo')
      setParams({}, { replace: true })
    }
  }, [params, setParams])

  const fechar = () => setEditando(null)
  const salvar = (dados, disciplinasModelo) => {
    if (editando === 'novo') {
      addConcurso(dados)
      disciplinasModelo.forEach((nome) => addDisciplina({ nome }))
      fechar()
      navigate('/estudos/edital')
    } else {
      updateConcurso(editando.id, dados)
      fechar()
    }
  }

  const lista = concursos.filter((c) => mostrarArquivados || !c.arquivado)
  const hoje = diaKey()

  const resumo = (c) => {
    const tops = store.topicos.filter((t) => t.concursoId === c.id)
    const min = store.sessoes.filter((s) => s.concursoId === c.id).reduce((a, s) => a + s.minutos, 0)
    const discs = store.disciplinas.filter((d) => d.concursoId === c.id).length
    return { prog: progressoTopicos(tops), min, discs }
  }

  return (
    <div>
      <PageHeader
        titulo="Concursos"
        descricao="Cada concurso tem seu próprio edital, ciclo, histórico, questões, simulados e anotações. Troque o concurso ativo no seletor do menu."
        acoes={<Botao onClick={() => setEditando('novo')}>+ Novo concurso</Botao>}
      />

      {concursos.length === 0 ? (
        <Vazio
          titulo="Bem-vindo à sua central de estudos"
          texto="Comece cadastrando o concurso que você vai prestar. Você pode partir de um modelo com as disciplinas mais comuns e depois ajustar pelo edital."
          acao={<Botao onClick={() => setEditando('novo')}>Cadastrar meu primeiro concurso</Botao>}
        />
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {lista.map((c) => {
              const r = resumo(c)
              const dias = c.dataProva ? diasEntre(hoje, c.dataProva) : null
              const ativo = c.id === concursoAtivoId
              return (
                <Card key={c.id} className={cx('p-5 flex flex-col gap-4', ativo && 'border-accent')}>
                  <div className="flex items-start gap-3">
                    <span className="w-1.5 self-stretch rounded-full" style={{ background: c.cor }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-syne font-bold text-lg truncate">{c.nome}</h3>
                        {ativo && <Badge cor="var(--accent)">Ativo</Badge>}
                        {c.arquivado && <Badge>Arquivado</Badge>}
                      </div>
                      <p className="text-muted text-xs mt-0.5">{[c.orgao, c.banca, c.cargo].filter(Boolean).join(' · ') || 'Sem detalhes'}</p>
                    </div>
                    {dias !== null && (
                      <div className="text-right">
                        <div className={cx('font-syne text-xl font-black', dias <= 30 && dias >= 0 ? 'text-error' : '')}>{dias >= 0 ? dias : '—'}</div>
                        <div className="text-[10px] text-muted">{dias >= 0 ? `dias · ${formatDia(c.dataProva)}` : 'prova realizada'}</div>
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div>
                      <div className="font-bold">{r.discs}</div>
                      <div className="text-[10px] text-muted">disciplinas</div>
                    </div>
                    <div>
                      <div className="font-bold">{formatMinutos(r.min)}</div>
                      <div className="text-[10px] text-muted">estudadas</div>
                    </div>
                    <div>
                      <div className="font-bold">{r.prog.pct}%</div>
                      <div className="text-[10px] text-muted">do edital</div>
                    </div>
                  </div>
                  <Barra pct={r.prog.pct} cor={c.cor} />
                  <div className="flex gap-2 flex-wrap">
                    {!ativo && (
                      <Botao tamanho="sm" onClick={() => { setConcursoAtivo(c.id); navigate('/estudos') }}>
                        Ativar
                      </Botao>
                    )}
                    <Botao tamanho="sm" variante="secundario" onClick={() => setEditando(c)}>
                      Editar
                    </Botao>
                    <Botao tamanho="sm" variante="secundario" onClick={() => updateConcurso(c.id, { arquivado: !c.arquivado })}>
                      {c.arquivado ? 'Desarquivar' : 'Arquivar'}
                    </Botao>
                    <Botao
                      tamanho="sm"
                      variante="fantasma"
                      className="ml-auto hover:!text-error"
                      onClick={() => confirmar(`Excluir "${c.nome}" e TODOS os dados dele? Isso não pode ser desfeito.`) && removeConcurso(c.id)}
                    >
                      Excluir
                    </Botao>
                  </div>
                </Card>
              )
            })}
          </div>
          {concursos.some((c) => c.arquivado) && (
            <button className="text-xs text-muted hover:text-text mt-4" onClick={() => setMostrarArquivados(!mostrarArquivados)}>
              {mostrarArquivados ? 'Ocultar arquivados' : 'Mostrar arquivados'}
            </button>
          )}
        </>
      )}

      <Modal aberto={!!editando} onFechar={fechar} titulo={editando === 'novo' ? 'Novo concurso' : 'Editar concurso'} largura="max-w-2xl">
        {editando && (
          <FormConcurso inicial={editando === 'novo' ? {} : editando} comModelo={editando === 'novo'} onSalvar={salvar} onCancelar={fechar} />
        )}
      </Modal>
    </div>
  )
}
