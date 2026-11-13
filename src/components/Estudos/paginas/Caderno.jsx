import { useState } from 'react'
import { useConcurso, useEstudosStore, TIPOS_NOTA, formatDataHora } from '../../../store/estudosStore'
import { Abas, Badge, Botao, Campo, Card, Input, Modal, PageHeader, Ponto, Select, SelectDisciplina, SelectTopico, Textarea, Vazio, confirmar } from '../ui'

const tipoPorId = Object.fromEntries(TIPOS_NOTA.map((t) => [t.id, t]))

function FormNota({ inicial, onSalvar, onCancelar }) {
  const { disciplinas, topicos } = useConcurso()
  const [f, setF] = useState({ tipo: 'resumo', titulo: '', conteudo: '', disciplinaId: '', topicoId: '', tags: '', fixada: false, ...inicial })
  return (
    <div className="flex flex-col gap-3">
      <div className="grid sm:grid-cols-3 gap-3">
        <Campo label="Tipo">
          <Select value={f.tipo} onChange={(e) => setF({ ...f, tipo: e.target.value })}>
            {TIPOS_NOTA.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </Select>
        </Campo>
        <Campo label="Disciplina">
          <SelectDisciplina disciplinas={disciplinas} value={f.disciplinaId} onChange={(v) => setF({ ...f, disciplinaId: v, topicoId: '' })} placeholder="Geral" />
        </Campo>
        <Campo label="Tópico">
          <SelectTopico topicos={topicos} disciplinaId={f.disciplinaId} value={f.topicoId || ''} onChange={(v) => setF({ ...f, topicoId: v })} vazio="Sem tópico" />
        </Campo>
      </div>
      <Campo label="Título *">
        <Input autoFocus value={f.titulo} onChange={(e) => setF({ ...f, titulo: e.target.value })} placeholder={f.tipo === 'erro' ? 'Ex.: Confundi anulação com revogação' : 'Ex.: Poderes administrativos'} />
      </Campo>
      <Campo label={f.tipo === 'erro' ? 'Por que errei e qual o certo' : 'Conteúdo'}>
        <Textarea rows={10} value={f.conteudo} onChange={(e) => setF({ ...f, conteudo: e.target.value })} />
      </Campo>
      <Campo label="Tags (separadas por vírgula)">
        <Input value={f.tags} onChange={(e) => setF({ ...f, tags: e.target.value })} placeholder="prazo, súmula, STF" />
      </Campo>
      <div className="flex justify-between items-center gap-2">
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" checked={f.fixada} onChange={(e) => setF({ ...f, fixada: e.target.checked })} className="w-4 h-4 accent-[var(--accent)]" />
          Fixar no topo
        </label>
        <div className="flex gap-2">
          <Botao variante="secundario" onClick={onCancelar}>Cancelar</Botao>
          <Botao disabled={!f.titulo.trim()} onClick={() => onSalvar({ ...f, titulo: f.titulo.trim(), topicoId: f.topicoId || null, disciplinaId: f.disciplinaId || null, atualizadoEm: new Date().toISOString() })}>
            Salvar
          </Botao>
        </div>
      </div>
    </div>
  )
}

export default function Caderno() {
  const { notas, disciplinas, disciplinaPorId, topicoPorId } = useConcurso()
  const { add, update, remove } = useEstudosStore()
  const [tipo, setTipo] = useState('todos')
  const [disc, setDisc] = useState('')
  const [busca, setBusca] = useState('')
  const [editando, setEditando] = useState(null)
  const [aberta, setAberta] = useState(null)

  const termo = busca.toLowerCase()
  const lista = notas
    .filter((n) => (tipo === 'todos' || n.tipo === tipo) && (!disc || n.disciplinaId === disc))
    .filter((n) => !termo || `${n.titulo} ${n.conteudo} ${n.tags}`.toLowerCase().includes(termo))
    .sort((a, b) => Number(b.fixada) - Number(a.fixada) || (b.atualizadoEm || b.criadoEm).localeCompare(a.atualizadoEm || a.criadoEm))

  return (
    <div>
      <PageHeader
        titulo="Caderno"
        descricao="Resumos, caderno de erros, artigos de lei seca, mnemônicos e pegadinhas da banca, tudo organizado por disciplina e tópico."
        acoes={<Botao onClick={() => setEditando('nova')}>+ Nova anotação</Botao>}
      />
      <Abas
        valor={tipo}
        onChange={setTipo}
        abas={[{ id: 'todos', label: 'Todas', contador: notas.length }, ...TIPOS_NOTA.map((t) => ({ id: t.id, label: t.label, contador: notas.filter((n) => n.tipo === t.id).length }))]}
      />
      <div className="flex gap-2 mb-5 flex-wrap">
        <Input placeholder="Buscar no caderno…" value={busca} onChange={(e) => setBusca(e.target.value)} className="flex-1 !py-2" />
        <SelectDisciplina disciplinas={disciplinas} value={disc} onChange={setDisc} todas="Todas as disciplinas" className="!w-auto" />
      </div>

      {lista.length === 0 ? (
        <Vazio titulo={notas.length ? 'Nada encontrado' : 'Caderno vazio'} texto={notas.length ? 'Ajuste os filtros.' : 'Registre resumos e, principalmente, os erros que cometer em questões. Revisar o caderno de erros antes da prova vale ouro.'} />
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {lista.map((n) => {
            const t = tipoPorId[n.tipo]
            const d = disciplinaPorId[n.disciplinaId]
            return (
              <Card key={n.id} className="p-4 flex flex-col gap-2 cursor-pointer hover:border-accent transition" onClick={() => setAberta(n)} style={{ borderTop: `3px solid ${t?.cor}` }}>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge cor={t?.cor}>{t?.label}</Badge>
                  {n.fixada && <span className="text-xs">📌</span>}
                </div>
                <div className="font-semibold text-sm">{n.titulo}</div>
                <p className="text-xs text-muted line-clamp-4 whitespace-pre-wrap flex-1">{n.conteudo}</p>
                <div className="flex items-center gap-1.5 text-[11px] text-muted mt-1">
                  {d && <><Ponto cor={d.cor} /><span className="truncate">{d.nome}</span></>}
                  {topicoPorId[n.topicoId] && <span className="truncate">· {topicoPorId[n.topicoId].nome}</span>}
                </div>
                {n.tags && (
                  <div className="flex gap-1 flex-wrap">
                    {n.tags.split(',').map((tag) => tag.trim()).filter(Boolean).map((tag) => (
                      <span key={tag} className="text-[10px] bg-bg border border-border rounded px-1.5 py-0.5 text-muted">#{tag}</span>
                    ))}
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}

      <Modal aberto={!!aberta} onFechar={() => setAberta(null)} titulo={aberta?.titulo} largura="max-w-2xl">
        {aberta && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 flex-wrap text-xs text-muted">
              <Badge cor={tipoPorId[aberta.tipo]?.cor}>{tipoPorId[aberta.tipo]?.label}</Badge>
              {disciplinaPorId[aberta.disciplinaId]?.nome}
              {topicoPorId[aberta.topicoId] && ` · ${topicoPorId[aberta.topicoId].nome}`}
              <span className="ml-auto">{formatDataHora(aberta.atualizadoEm || aberta.criadoEm)}</span>
            </div>
            <div className="text-sm whitespace-pre-wrap leading-relaxed">{aberta.conteudo || <span className="text-muted">Sem conteúdo.</span>}</div>
            <div className="flex gap-2 justify-between pt-3 border-t border-border">
              <Botao variante="fantasma" className="hover:!text-error" onClick={() => confirmar('Excluir anotação?') && (remove('notas', aberta.id), setAberta(null))}>Excluir</Botao>
              <Botao onClick={() => { setEditando(aberta); setAberta(null) }}>Editar</Botao>
            </div>
          </div>
        )}
      </Modal>

      <Modal aberto={!!editando} onFechar={() => setEditando(null)} titulo={editando === 'nova' ? 'Nova anotação' : 'Editar anotação'} largura="max-w-2xl">
        {editando && (
          <FormNota
            inicial={editando === 'nova' ? (tipo !== 'todos' ? { tipo, disciplinaId: disc } : { disciplinaId: disc }) : editando}
            onCancelar={() => setEditando(null)}
            onSalvar={(dados) => {
              if (editando === 'nova') add('notas', dados)
              else update('notas', editando.id, dados)
              setEditando(null)
            }}
          />
        )}
      </Modal>
    </div>
  )
}
