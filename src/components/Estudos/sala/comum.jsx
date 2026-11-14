import { useEffect, useState } from 'react'
import { useEstudosStore, diaKey } from '../../../store/estudosStore'
import { useIA } from '../ia'
import { Botao, Campo, Input, Modal, Textarea } from '../ui'

/** Modal global para informar a senha da IA (fica neste navegador) */
export function ModalConfigIA() {
  const { senha, configurando, setSenha, fecharConfig } = useIA()
  const [valor, setValor] = useState(senha)
  useEffect(() => setValor(senha), [senha, configurando])

  return (
    <Modal aberto={configurando} onFechar={fecharConfig} titulo="Configurar IA de estudos">
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault()
          setSenha(valor.trim())
        }}
      >
        <p className="text-sm text-muted">
          A IA gera aulas, questões e flashcards e tira suas dúvidas. Ela roda no servidor do site com a sua chave da Anthropic,
          então é protegida por senha para ninguém mais gastar seus créditos.
        </p>
        <Campo label="Senha da IA">
          <Input type="password" autoFocus value={valor} onChange={(e) => setValor(e.target.value)} placeholder="Valor de ESTUDOS_PASSWORD" />
        </Campo>
        <details className="text-xs text-muted">
          <summary className="cursor-pointer hover:text-text">Como configurar o servidor</summary>
          <div className="mt-2 flex flex-col gap-1.5 leading-relaxed">
            <p>Nas variáveis de ambiente da Vercel (e no <code>.env.local</code> para rodar local), defina:</p>
            <p><code className="text-accent">ANTHROPIC_API_KEY</code>: sua chave da API (console.anthropic.com)</p>
            <p><code className="text-accent">ESTUDOS_PASSWORD</code>: a senha que você vai digitar aqui (se não existir, vale a ADMIN_PASSWORD)</p>
          </div>
        </details>
        <div className="flex justify-between gap-2">
          {senha ? <Botao variante="fantasma" onClick={() => setSenha('')}>Remover senha</Botao> : <span />}
          <div className="flex gap-2">
            <Botao variante="secundario" onClick={fecharConfig}>Cancelar</Botao>
            <Botao type="submit" disabled={!valor.trim()}>Salvar</Botao>
          </div>
        </div>
      </form>
    </Modal>
  )
}

/** Cria um flashcard do tópico (usado a partir de trechos da aula, dúvidas e questões) */
export function ModalNovoFlashcard({ inicial, topico, onFechar }) {
  const { add } = useEstudosStore()
  const [f, setF] = useState({ frente: '', verso: '', ...inicial })
  if (!inicial) return null
  return (
    <Modal aberto onFechar={onFechar} titulo="Novo flashcard">
      <div className="flex flex-col gap-3">
        <Campo label="Frente (pergunta)">
          <Textarea autoFocus rows={3} value={f.frente} onChange={(e) => setF({ ...f, frente: e.target.value })} placeholder="Ex.: Qual o prazo do mandado de segurança?" />
        </Campo>
        <Campo label="Verso (resposta)">
          <Textarea rows={4} value={f.verso} onChange={(e) => setF({ ...f, verso: e.target.value })} />
        </Campo>
        <div className="flex justify-end gap-2">
          <Botao variante="secundario" onClick={onFechar}>Cancelar</Botao>
          <Botao
            disabled={!f.frente.trim() || !f.verso.trim()}
            onClick={() => {
              add('flashcards', { disciplinaId: topico.disciplinaId, topicoId: topico.id, frente: f.frente.trim(), verso: f.verso.trim(), caixa: 1, proximaRevisao: diaKey(), origem: 'sala' })
              onFechar()
            }}
          >
            Criar cartão
          </Botao>
        </div>
      </div>
    </Modal>
  )
}

/** Salva um trecho no caderno, vinculado ao tópico */
export function salvarNoCaderno(add, topico, { tipo = 'resumo', titulo, conteudo }) {
  const limpo = (titulo || conteudo || '').replace(/\s+/g, ' ').trim()
  return add('notas', {
    tipo,
    titulo: limpo.length > 70 ? `${limpo.slice(0, 67)}…` : limpo || 'Trecho',
    conteudo: conteudo || '',
    disciplinaId: topico.disciplinaId,
    topicoId: topico.id,
    tags: '',
    fixada: false,
    atualizadoEm: new Date().toISOString(),
  })
}

/** Barra flutuante que aparece ao selecionar texto dentro de um elemento */
export function useSelecao(ref) {
  const [sel, setSel] = useState(null)

  useEffect(() => {
    const atualizar = () =>
      setTimeout(() => {
        const s = window.getSelection()
        const texto = s?.toString().trim()
        if (!texto || !s.rangeCount || !ref.current?.contains(s.anchorNode)) return setSel(null)
        const r = s.getRangeAt(0).getBoundingClientRect()
        setSel({ texto, x: Math.min(window.innerWidth - 150, Math.max(150, r.left + r.width / 2)), y: Math.max(56, r.top) })
      }, 0)
    const limpar = () => setSel(null)
    document.addEventListener('mouseup', atualizar)
    document.addEventListener('touchend', atualizar)
    window.addEventListener('scroll', limpar, true)
    return () => {
      document.removeEventListener('mouseup', atualizar)
      document.removeEventListener('touchend', atualizar)
      window.removeEventListener('scroll', limpar, true)
    }
  }, [ref])

  return [sel, () => setSel(null)]
}

export function BarraSelecao({ sel, acoes, onFechar }) {
  if (!sel) return null
  return (
    <div
      className="fixed z-50 -translate-x-1/2 -translate-y-full flex gap-1 bg-surface border border-border rounded-xl shadow-2xl p-1"
      style={{ left: sel.x, top: sel.y - 8 }}
      onMouseDown={(e) => e.preventDefault()}
      onMouseUp={(e) => e.stopPropagation()}
    >
      {acoes.map((a) => (
        <button
          key={a.label}
          onClick={() => {
            a.onClick(sel.texto)
            window.getSelection()?.removeAllRanges()
            onFechar()
          }}
          className="text-xs font-semibold px-2.5 py-1.5 rounded-lg hover:bg-bg whitespace-nowrap"
        >
          {a.label}
        </button>
      ))}
    </div>
  )
}

/** Aviso fixo sobre conteúdo gerado por IA */
export function AvisoIA({ className = '' }) {
  return (
    <p className={`text-[11px] text-muted ${className}`}>
      Conteúdo gerado por IA: pode conter imprecisões. Confira artigos de lei, prazos e súmulas na fonte oficial antes da prova.
    </p>
  )
}

export function Carregando({ texto = 'Gerando…' }) {
  return (
    <div className="flex items-center gap-2 text-sm text-muted">
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <span key={i} className="w-1.5 h-1.5 bg-accent rounded-full" style={{ animation: `bounce 1.2s infinite ${i * 0.2}s` }} />
        ))}
      </div>
      {texto}
    </div>
  )
}
