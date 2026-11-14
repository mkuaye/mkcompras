import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useEstudosStore, TIPOS_NOTA, formatDataHora } from '../../../store/estudosStore'
import Markdown from '../Markdown'
import { Badge, Botao, Card, CardTitulo, Input, Select, Textarea, confirmar } from '../ui'

const tipoPorId = Object.fromEntries(TIPOS_NOTA.map((t) => [t.id, t]))

export default function AbaAnotacoes({ topico, notas }) {
  const { update, add, remove } = useEstudosStore()
  const [nova, setNova] = useState({ tipo: 'resumo', titulo: '', conteudo: '' })
  const [aberta, setAberta] = useState(null)
  const lista = [...notas].sort((a, b) => (b.atualizadoEm || b.criadoEm).localeCompare(a.atualizadoEm || a.criadoEm))

  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <div className="flex flex-col gap-4">
        <Card className="p-5">
          <CardTitulo>Notas rápidas do tópico</CardTitulo>
          <Textarea
            rows={6}
            value={topico.notas || ''}
            onChange={(e) => update('topicos', topico.id, { notas: e.target.value })}
            placeholder="Onde parou, fontes, artigos de lei, dúvidas para levar ao professor… (salva sozinho)"
          />
        </Card>
        <Card className="p-5 flex flex-col gap-3">
          <CardTitulo>Nova anotação no caderno</CardTitulo>
          <div className="grid grid-cols-[auto_1fr] gap-2">
            <Select value={nova.tipo} onChange={(e) => setNova({ ...nova, tipo: e.target.value })} className="!w-auto">
              {TIPOS_NOTA.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </Select>
            <Input value={nova.titulo} onChange={(e) => setNova({ ...nova, titulo: e.target.value })} placeholder="Título" />
          </div>
          <Textarea rows={6} value={nova.conteudo} onChange={(e) => setNova({ ...nova, conteudo: e.target.value })} placeholder="Conteúdo (aceita Markdown)" />
          <Botao
            disabled={!nova.titulo.trim()}
            onClick={() => {
              add('notas', { ...nova, titulo: nova.titulo.trim(), disciplinaId: topico.disciplinaId, topicoId: topico.id, tags: '', fixada: false, atualizadoEm: new Date().toISOString() })
              setNova({ ...nova, titulo: '', conteudo: '' })
            }}
          >
            Salvar no caderno
          </Botao>
        </Card>
      </div>

      <Card className="p-5 self-start">
        <CardTitulo acao={<Link to="/estudos/caderno" className="text-xs text-accent">abrir caderno →</Link>}>No caderno · {notas.length}</CardTitulo>
        {lista.length === 0 ? (
          <p className="text-sm text-muted">Nada ainda. Selecione trechos da aula, salve respostas do tutor ou mande questões erradas para o caderno de erros.</p>
        ) : (
          lista.map((n) => {
            const t = tipoPorId[n.tipo]
            const ab = aberta === n.id
            return (
              <div key={n.id} className="py-3 border-t border-border first:border-t-0">
                <button className="w-full text-left flex items-start gap-2" onClick={() => setAberta(ab ? null : n.id)}>
                  <Badge cor={t?.cor}>{t?.label}</Badge>
                  <span className="flex-1 text-sm font-semibold min-w-0">{n.titulo}</span>
                  <span className="text-[10px] text-muted whitespace-nowrap">{formatDataHora(n.atualizadoEm || n.criadoEm)}</span>
                </button>
                {ab ? (
                  <div className="mt-2">
                    <Markdown className="text-sm">{n.conteudo}</Markdown>
                    <button className="text-xs text-muted hover:text-error mt-2" onClick={() => confirmar('Excluir anotação?') && remove('notas', n.id)}>Excluir</button>
                  </div>
                ) : (
                  <p className="text-xs text-muted line-clamp-2 mt-1 whitespace-pre-wrap">{n.conteudo}</p>
                )}
              </div>
            )
          })
        )}
      </Card>
    </div>
  )
}
