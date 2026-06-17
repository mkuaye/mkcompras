export default function FilterBar({ categories, onFilterChange }) {
  const platforms = [
    { value: '', label: 'Todas' },
    { value: 'shopee', label: 'Shopee', dot: 'dot-shopee' },
    { value: 'mercadolivre', label: 'Mercado Livre', dot: 'dot-ml' },
    { value: 'amazon', label: 'Amazon', dot: 'dot-amazon' },
  ]

  return (
    <div className="mb-8 flex flex-col gap-4">
      <div className="flex gap-3 max-w-md">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" viewBox="0 0 20 20" fill="none">
          <circle cx="8.5" cy="8.5" r="5.5" stroke="currentColor" strokeWidth="1.5" />
          <path d="M13 13l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <input
          type="text"
          placeholder="Buscar produto..."
          className="flex-1 relative pl-9 bg-surface border border-border rounded-xl px-3 py-2.5 text-sm text-text outline-none focus:border-accent transition placeholder:text-muted"
          onChange={(e) => window.setTimeout(() => {
            const event = new CustomEvent('search', { detail: e.target.value })
            document.dispatchEvent(event)
          }, 0)}
          onInput={(e) => {
            // Dispatch custom event for parent to handle
            const parent = e.target.parentElement?.parentElement
            if (parent) {
              parent.dispatchEvent(new CustomEvent('search', { detail: e.target.value }))
            }
          }}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {platforms.map((p) => (
          <button
            key={p.value}
            onClick={() => onFilterChange((prev) => ({ ...prev, platform: p.value }))}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-full border border-border hover:border-accent hover:text-text transition"
          >
            {p.dot && <span className={`dot ${p.dot}`}></span>}
            {p.label}
          </button>
        ))}
      </div>

      <select
        onChange={(e) => onFilterChange((prev) => ({ ...prev, category: e.target.value }))}
        className="w-40 bg-surface border border-border rounded-lg px-3 py-2 text-sm text-muted outline-none focus:border-accent transition cursor-pointer"
      >
        <option value="">Todas as categorias</option>
        {categories.map((cat) => (
          <option key={cat} value={cat}>
            {cat.charAt(0).toUpperCase() + cat.slice(1)}
          </option>
        ))}
      </select>
    </div>
  )
}
