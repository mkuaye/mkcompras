import { useEffect, useRef, useState } from 'react'
import { useEstudosStore, TIPOS_MATERIAL, formatDataHora, uid } from '../../../store/estudosStore'
import { lerArquivo, salvarArquivo, useConteudo } from '../../../store/estudosArquivos'
import Markdown from '../Markdown'
import { Badge, Botao, Campo, Card, Input, Modal, Textarea, Vazio, confirmar, cx } from '../ui'
import { Carregando } from './comum'

const LIMITE_PDF = 80 * 1024 * 1024

export const idYoutube = (url = '') => {
  const m = url.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/)
  return m ? m[1] : null
}

const tamanhoLegivel = (b) => (b > 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`)

function VisualizadorPdf({ material }) {
  const [url, setUrl] = useState(null)
  const [erro, setErro] = useState(false)
  useEffect(() => {
    let u = null
    lerArquivo(material.id)
      .then((blob) => {
        if (!(blob instanceof Blob)) return setErro(true)
        u = URL.createObjectURL(blob)
        setUrl(u)
      })
      .catch(() => setErro(true))
    return () => u && URL.revokeObjectURL(u)
  }, [material.id])

  if (erro) return <p className="text-sm text-error">Arquivo não encontrado neste navegador (PDFs não vão no backup; anexe de novo).</p>
  if (!url) return <Carregando texto="Abrindo PDF…" />
  return (
    <div className="flex flex-col gap-2">
      <iframe src={url} title={material.titulo} className="w-full h-[78vh] rounded-xl border border-border bg-white" />
      <a href={url} download={material.titulo} className="text-xs text-accent self-end">⇩ Baixar PDF</a>
    </div>
  )
}

function VisualizadorTexto({ material }) {
  const { update } = useEstudosStore()
  const { conteudo, carregando, salvar } = useConteudo(material.id)
  const [editando, setEditando] = useState(null)
  if (carregando) return <Carregando texto="Abrindo…" />
  if (editando !== null) {
    return (
      <div className="flex flex-col gap-2">
        <Textarea rows={18} value={editando} onChange={(e) => setEditando(e.target.value)} className="font-mono text-xs" />
        <div className="flex justify-end gap-2">
          <Botao variante="secundario" onClick={() => setEditando(null)}>Cancelar</Botao>
          <Botao
            onClick={async () => {
              await salvar(editando)
              update('materiais', material.id, { atualizadoEm: new Date().toISOString(), tamanho: editando.length })
              setEditando(null)
            }}
          >
            Salvar
          </Botao>
        </div>
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-2">
      <Botao tamanho="sm" variante="fantasma" className="self-end" onClick={() => setEditando(conteudo)}>Editar</Botao>
      <Markdown className="text-[15px] max-w-3xl">{conteudo}</Markdown>
    </div>
  )
}

function Visualizador({ material }) {
  if (material.tipo === 'pdf') return <VisualizadorPdf material={material} />
  if (material.tipo === 'texto') return <VisualizadorTexto material={material} />
  if (material.tipo === 'video') {
    const id = idYoutube(material.url)
    return id ? (
      <div className="aspect-video w-full rounded-xl overflow-hidden border border-border bg-black">
        <iframe
          className="w-full h-full"
          src={`https://www.youtube-nocookie.com/embed/${id}`}
          title={material.titulo}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    ) : (
      <a href={material.url} target="_blank" rel="noreferrer noopener" className="text-accent underline">Abrir vídeo em nova aba ↗</a>
    )
  }
  return null
}

function ModalNovo({ tipo, topico, onFechar }) {
  const { add } = useEstudosStore()
  const [f, setF] = useState({ titulo: '', url: '', texto: '' })
  const [arquivo, setArquivo] = useState(null)
  const [erro, setErro] = useState(null)
  const [salvando, setSalvando] = useState(false)
  const input = useRef(null)
  const base = { disciplinaId: topico.disciplinaId, topicoId: topico.id, origem: 'usuario', lido: false }

  const salvar = async () => {
    setErro(null)
    setSalvando(true)
    try {
      const id = uid()
      if (tipo === 'pdf') {
        await salvarArquivo(id, arquivo)
        add('materiais', { ...base, id, tipo, titulo: f.titulo.trim() || arquivo.name, tamanho: arquivo.size })
      } else if (tipo === 'texto') {
        await salvarArquivo(id, f.texto)
        add('materiais', { ...base, id, tipo, titulo: f.titulo.trim(), tamanho: f.texto.length })
      } else {
        const url = /^https?:\/\//i.test(f.url.trim()) ? f.url.trim() : `https://${f.url.trim()}`
        const ehVideo = tipo === 'video' || idYoutube(url)
        add('materiais', { ...base, id, tipo: ehVideo ? 'video' : 'link', titulo: f.titulo.trim() || url.replace(/^https?:\/\//, '').slice(0, 60), url })
      }
      onFechar()
    } catch (e) {
      setErro(`Não foi possível salvar: ${e.message}`)
      setSalvando(false)
    }
  }

  const valido =
    tipo === 'pdf' ? !!arquivo : tipo === 'texto' ? f.titulo.trim() && f.texto.trim() : f.url.trim().length > 3

  return (
    <Modal aberto onFechar={onFechar} titulo={`Adicionar ${TIPOS_MATERIAL[tipo].label.toLowerCase()}`} largura={tipo === 'texto' ? 'max-w-3xl' : 'max-w-lg'}>
      <div className="flex flex-col gap-3">
        {tipo === 'pdf' && (
          <>
            <input
              ref={input}
              type="file"
              accept="application/pdf,.pdf"
              className="hidden"
              onChange={(e) => {
                const a = e.target.files?.[0]
                if (!a) return
                if (a.size > LIMITE_PDF) return setErro('PDF muito grande (máx. 80 MB).')
                setErro(null)
                setArquivo(a)
                if (!f.titulo) setF({ ...f, titulo: a.name.replace(/\.pdf$/i, '') })
              }}
            />
            <button
              onClick={() => input.current?.click()}
              className="border-2 border-dashed border-border rounded-xl py-8 text-sm text-muted hover:border-accent hover:text-text transition"
            >
              {arquivo ? `📄 ${arquivo.name} (${tamanhoLegivel(arquivo.size)})` : 'Clique para escolher o PDF'}
            </button>
            <p className="text-[11px] text-muted">O PDF fica salvo só neste navegador e abre aqui mesmo, sem sair da plataforma.</p>
          </>
        )}
        {(tipo === 'video' || tipo === 'link') && (
          <Campo label={tipo === 'video' ? 'Link do vídeo (YouTube)' : 'Endereço (URL)'}>
            <Input autoFocus value={f.url} onChange={(e) => setF({ ...f, url: e.target.value })} placeholder={tipo === 'video' ? 'https://www.youtube.com/watch?v=…' : 'https://…'} />
          </Campo>
        )}
        <Campo label={tipo === 'texto' ? 'Título *' : 'Título (opcional)'}>
          <Input autoFocus={tipo === 'texto'} value={f.titulo} onChange={(e) => setF({ ...f, titulo: e.target.value })} placeholder={tipo === 'texto' ? 'Ex.: Resumo do livro X, cap. 3' : ''} />
        </Campo>
        {tipo === 'texto' && (
          <Campo label="Conteúdo (aceita Markdown)">
            <Textarea rows={16} value={f.texto} onChange={(e) => setF({ ...f, texto: e.target.value })} className="font-mono text-xs" placeholder="Cole aqui o texto do seu material (PDF, apostila, lei seca…). Ele pode servir de base para a IA gerar a aula." />
          </Campo>
        )}
        {erro && <p className="text-sm text-error">{erro}</p>}
        <div className="flex justify-end gap-2">
          <Botao variante="secundario" onClick={onFechar}>Cancelar</Botao>
          <Botao disabled={!valido || salvando} onClick={salvar}>{salvando ? 'Salvando…' : 'Adicionar'}</Botao>
        </div>
      </div>
    </Modal>
  )
}

export default function AbaMateriais({ topico, materiais }) {
  const { update, removeMaterial } = useEstudosStore()
  const [novo, setNovo] = useState(null)
  const [aberto, setAberto] = useState(null)
  const lista = materiais.filter((m) => m.tipo !== 'aula')

  useEffect(() => setAberto(null), [topico.id])

  const abrir = (m) => {
    if (m.tipo === 'link') {
      window.open(m.url, '_blank', 'noopener,noreferrer')
      if (!m.lido) update('materiais', m.id, { lido: true, lidoEm: new Date().toISOString() })
      return
    }
    setAberto(aberto === m.id ? null : m.id)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2 flex-wrap">
        {['pdf', 'video', 'texto', 'link'].map((t) => (
          <Botao key={t} variante="secundario" tamanho="sm" onClick={() => setNovo(t)}>
            + {TIPOS_MATERIAL[t].icone} {TIPOS_MATERIAL[t].label}
          </Botao>
        ))}
      </div>

      {lista.length === 0 ? (
        <Vazio
          titulo="Nenhum material anexado"
          texto="Junte aqui tudo deste tópico: PDFs de apostilas e leis, videoaulas do YouTube, resumos seus e links. Tudo abre dentro da plataforma, ao lado do cronômetro."
        />
      ) : (
        lista.map((m) => {
          const tp = TIPOS_MATERIAL[m.tipo]
          return (
            <Card key={m.id} className={cx('overflow-hidden', aberto === m.id && 'border-accent')}>
              <div className="flex items-center gap-3 p-4">
                <span className="text-lg w-6 text-center">{tp.icone}</span>
                <button onClick={() => abrir(m)} className="flex-1 min-w-0 text-left">
                  <div className="text-sm font-semibold truncate">{m.titulo}</div>
                  <div className="text-[11px] text-muted truncate">
                    {tp.label}
                    {m.tamanho && m.tipo === 'pdf' ? ` · ${tamanhoLegivel(m.tamanho)}` : ''}
                    {m.url ? ` · ${m.url}` : ''} · {formatDataHora(m.criadoEm)}
                  </div>
                </button>
                {m.lido ? (
                  <Badge cor="var(--success)">✓ visto</Badge>
                ) : (
                  <button className="text-[11px] text-muted hover:text-success" onClick={() => update('materiais', m.id, { lido: true, lidoEm: new Date().toISOString() })}>
                    marcar visto
                  </button>
                )}
                <Botao tamanho="sm" variante="secundario" onClick={() => abrir(m)}>
                  {m.tipo === 'link' ? 'Abrir ↗' : aberto === m.id ? 'Fechar' : 'Abrir'}
                </Botao>
                <button className="text-muted hover:text-error text-xs" onClick={() => confirmar(`Excluir "${m.titulo}"?`) && removeMaterial(m.id)} aria-label="Excluir">
                  ✕
                </button>
              </div>
              {aberto === m.id && (
                <div className="border-t border-border p-4">
                  <Visualizador material={m} />
                </div>
              )}
            </Card>
          )
        })
      )}

      {novo && <ModalNovo tipo={novo} topico={topico} onFechar={() => setNovo(null)} />}
    </div>
  )
}
