const PLATFORM_LABELS = {
  shopee: 'Shopee',
  mercadolivre: 'Mercado Livre',
  amazon: 'Amazon',
  outros: 'Outros',
}

export default function ProductTable({ products, onEdit, onDelete }) {
  const handleDelete = async (id) => {
    if (!confirm('Excluir este produto?')) return
    try {
      await onDelete(id)
    } catch (err) {
      alert('Erro ao excluir: ' + err.message)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {products.map((p) => (
        <div
          key={p.id}
          className="flex items-center gap-3 bg-bg border border-border rounded-lg p-3 hover:border-accent transition"
        >
          {p.image && (
            <img
              src={p.image}
              alt={p.name}
              className="w-13 h-13 rounded-lg object-cover border border-border flex-shrink-0"
              onError={(e) => {
                e.target.style.display = 'none'
              }}
            />
          )}
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-text truncate">{p.name}</div>
            <div className="text-xs text-muted mt-0.5">
              {PLATFORM_LABELS[p.platform] || p.platform} • {p.category || '—'} • {p.price || 'sem preço'}
              {p.featured && ' • ⭐'}
            </div>
          </div>
          <div className="flex gap-1.5 flex-shrink-0">
            <button
              onClick={() => onEdit(p.id)}
              className="px-2.5 py-1.5 text-xs font-semibold text-accent border border-accent rounded-lg hover:bg-accent/5 transition"
            >
              Editar
            </button>
            <button
              onClick={() => handleDelete(p.id)}
              className="px-2.5 py-1.5 text-xs font-semibold text-error border border-error rounded-lg hover:bg-error/5 transition"
            >
              Excluir
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
