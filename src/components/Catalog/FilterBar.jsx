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
        className="appearance-none w-fit bg-surface border border-border rounded-full px-3 py-1.5 pr-7 text-xs font-semibold text-text outline-none focus:border-accent hover:border-accent transition cursor-pointer"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 20 20' fill='%236b7280'%3E%3Cpath fill-rule='evenodd' d='M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z' clip-rule='evenodd'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.5rem center' }}
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
