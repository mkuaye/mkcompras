import { forwardRef, useEffect } from 'react'
import { achatarArvore } from '../../store/estudosStore'

export const cx = (...c) => c.filter(Boolean).join(' ')

export function Card({ className, children, ...rest }) {
  return (
    <div className={cx('bg-surface border border-border rounded-2xl', className)} {...rest}>
      {children}
    </div>
  )
}

export function CardTitulo({ children, acao }) {
  return (
    <div className="flex items-center justify-between gap-3 mb-4">
      <h2 className="font-syne text-xs font-bold uppercase tracking-widest text-muted">{children}</h2>
      {acao}
    </div>
  )
}

export function PageHeader({ titulo, descricao, acoes }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
      <div>
        <h1 className="font-syne text-2xl font-black leading-tight">{titulo}</h1>
        {descricao && <p className="text-muted text-sm mt-1 max-w-2xl">{descricao}</p>}
      </div>
      {acoes && <div className="flex gap-2 flex-wrap">{acoes}</div>}
    </div>
  )
}

const VARIANTES = {
  primario: 'text-white bg-gradient-to-r from-accent to-accent2 hover:opacity-90',
  secundario: 'border border-border hover:bg-bg text-text',
  perigo: 'border border-error text-error hover:bg-bg',
  sucesso: 'border border-success text-success hover:bg-bg',
  fantasma: 'text-muted hover:text-text',
}

export function Botao({ variante = 'primario', tamanho = 'md', className, ...rest }) {
  return (
    <button
      type="button"
      className={cx(
        'rounded-xl font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center justify-center gap-1.5 whitespace-nowrap',
        tamanho === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2.5 text-sm',
        VARIANTES[variante],
        className
      )}
      {...rest}
    />
  )
}

const campoCls =
  'w-full bg-bg border border-border rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-accent disabled:opacity-60 min-w-0'

export function Campo({ label, children, className }) {
  return (
    <label className={cx('flex flex-col gap-1.5 min-w-0', className)}>
      {label && <span className="text-xs font-semibold text-muted">{label}</span>}
      {children}
    </label>
  )
}

export const Input = forwardRef(({ className, ...p }, ref) => <input ref={ref} className={cx(campoCls, className)} {...p} />)
Input.displayName = 'Input'
export const Textarea = forwardRef(({ className, ...p }, ref) => <textarea ref={ref} className={cx(campoCls, 'resize-y', className)} {...p} />)
Textarea.displayName = 'Textarea'
export const Select = ({ className, children, ...p }) => (
  <select className={cx(campoCls, className)} {...p}>
    {children}
  </select>
)

export function SelectDisciplina({ disciplinas, value, onChange, todas, placeholder, ...rest }) {
  return (
    <Select value={value} onChange={(e) => onChange(e.target.value)} {...rest}>
      {todas && <option value="">{todas}</option>}
      {placeholder && <option value="">{placeholder}</option>}
      {disciplinas.map((d) => (
        <option key={d.id} value={d.id}>
          {d.nome}
        </option>
      ))}
    </Select>
  )
}

export function SelectTopico({ topicos, disciplinaId, value, onChange, vazio = 'Disciplina inteira', ...rest }) {
  const lista = disciplinaId ? achatarArvore(topicos, disciplinaId) : []
  return (
    <Select value={value} onChange={(e) => onChange(e.target.value)} disabled={!disciplinaId} {...rest}>
      <option value="">{vazio}</option>
      {lista.map(({ topico, nivel, numero }) => (
        <option key={topico.id} value={topico.id}>
          {'  '.repeat(nivel)}
          {numero} {topico.nome}
        </option>
      ))}
    </Select>
  )
}

export function Modal({ aberto, onFechar, titulo, children, largura = 'max-w-lg' }) {
  useEffect(() => {
    if (!aberto) return
    const esc = (e) => e.key === 'Escape' && onFechar()
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [aberto, onFechar])

  if (!aberto) return null
  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 bg-black/60 overflow-y-auto" onMouseDown={onFechar}>
      <div className={cx('w-full bg-surface border border-border rounded-2xl p-6 my-8', largura)} onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-syne text-lg font-bold">{titulo}</h3>
          <button onClick={onFechar} className="text-muted hover:text-text text-lg leading-none" aria-label="Fechar">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function Vazio({ titulo, texto, acao }) {
  return (
    <Card className="p-10 text-center">
      <p className="font-syne text-lg font-bold">{titulo}</p>
      {texto && <p className="text-muted text-sm mt-2 max-w-md mx-auto">{texto}</p>}
      {acao && <div className="mt-5 flex justify-center">{acao}</div>}
    </Card>
  )
}

export function Barra({ pct, cor = 'var(--accent)', altura = 'h-1.5' }) {
  return (
    <div className={cx('w-full rounded-full bg-border overflow-hidden', altura)}>
      <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, Math.max(0, pct))}%`, background: cor }} />
    </div>
  )
}

export function Badge({ cor = 'var(--muted)', children, className }) {
  return (
    <span
      className={cx('inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap', className)}
      style={{ color: cor, borderColor: cor }}
    >
      {children}
    </span>
  )
}

export function Stat({ titulo, valor, sub, children }) {
  return (
    <Card className="p-5">
      <div className="text-[11px] font-semibold uppercase tracking-widest text-muted">{titulo}</div>
      <div className="font-syne text-2xl font-black mt-1.5">{valor}</div>
      {sub && <div className="text-muted text-xs mt-1">{sub}</div>}
      {children && <div className="mt-3">{children}</div>}
    </Card>
  )
}

export function Ponto({ cor }) {
  return <span className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: cor }} />
}

export function Abas({ abas, valor, onChange }) {
  return (
    <div className="flex gap-1 flex-wrap mb-5">
      {abas.map((a) => (
        <button
          key={a.id}
          onClick={() => onChange(a.id)}
          className={cx(
            'text-xs font-semibold px-3 py-1.5 rounded-full border transition',
            valor === a.id ? 'border-accent text-accent' : 'border-border text-muted hover:text-text'
          )}
        >
          {a.label}
          {a.contador !== undefined && <span className="ml-1.5 opacity-70">{a.contador}</span>}
        </button>
      ))}
    </div>
  )
}

/** Gráfico de barras verticais simples */
export function GraficoBarras({ dados, altura = 140, formatar = (v) => v, cor = 'var(--accent)' }) {
  const max = Math.max(1, ...dados.map((d) => d.valor))
  return (
    <div className="flex items-end gap-1 w-full" style={{ height: altura }}>
      {dados.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center justify-end h-full group relative min-w-0">
          <div
            className="w-full rounded-t-md transition-all"
            style={{ height: `${(d.valor / max) * 100}%`, minHeight: d.valor ? 3 : 0, background: d.cor || cor, opacity: d.destaque ? 1 : 0.75 }}
          />
          <div className="text-[9px] text-muted mt-1 truncate w-full text-center">{d.label}</div>
          <div className="absolute bottom-full mb-1 hidden group-hover:block bg-bg border border-border rounded-md px-2 py-1 text-[11px] whitespace-nowrap z-10">
            {d.titulo || d.label}: {formatar(d.valor)}
          </div>
        </div>
      ))}
    </div>
  )
}

/** Linha simples em SVG para evolução (0–100) */
export function GraficoLinha({ pontos, altura = 120 }) {
  if (pontos.length < 2) return <p className="text-muted text-xs">Registre pelo menos 2 simulados para ver a evolução.</p>
  const w = 100
  const coords = pontos.map((p, i) => [(i / (pontos.length - 1)) * w, 100 - p.valor])
  return (
    <div>
      <svg viewBox={`-3 -5 ${w + 6} 110`} preserveAspectRatio="none" className="w-full" style={{ height: altura }}>
        {[0, 50, 100].map((y) => (
          <line key={y} x1="0" x2={w} y1={y} y2={y} stroke="var(--border)" strokeWidth="0.5" vectorEffect="non-scaling-stroke" />
        ))}
        <polyline points={coords.map((c) => c.join(',')).join(' ')} fill="none" stroke="var(--accent)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
        {coords.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="1.6" fill="var(--accent2)" />
        ))}
      </svg>
      <div className="flex justify-between text-[10px] text-muted mt-1">
        {pontos.map((p, i) => (
          <span key={i} className="truncate">{p.label}</span>
        ))}
      </div>
    </div>
  )
}

export const confirmar = (msg) => window.confirm(msg)
