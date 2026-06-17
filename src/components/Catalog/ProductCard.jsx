const PLATFORM_LABELS = {
  shopee: 'Shopee',
  mercadolivre: 'Mercado Livre',
  amazon: 'Amazon',
  outros: 'Outros',
}

const PLATFORM_BADGE_CLASSES = {
  shopee: 'bg-shopee/15 text-shopee',
  mercadolivre: 'bg-ml/15 text-ml',
  amazon: 'bg-amazon/15 text-amazon',
  outros: 'bg-surface text-muted border border-border',
}

export default function ProductCard({ product }) {
  const platform = product.platform || 'outros'
  const label = PLATFORM_LABELS[platform] || platform
  const badgeClass = PLATFORM_BADGE_CLASSES[platform] || ''

  return (
    <a
      href={product.affiliateUrl}
      target="_blank"
      rel="noopener noreferrer sponsored"
      className="bg-surface border border-border rounded-2xl overflow-hidden flex flex-col hover:border-accent hover:-translate-y-0.5 transition"
    >
      <div className="w-full aspect-square bg-bg flex items-center justify-center overflow-hidden">
        {product.image ? (
          <img
            src={product.image}
            alt={product.name}
            loading="lazy"
            className="w-full h-full object-cover"
            onError={(e) => {
              e.target.style.display = 'none'
            }}
          />
        ) : (
          <svg className="w-12 h-12 opacity-20" viewBox="0 0 48 48" fill="none">
            <rect width="48" height="48" rx="8" fill="currentColor" opacity=".1" />
            <path
              d="M16 32l8-10 6 7 4-5 6 8H8l8-10z"
              fill="currentColor"
              opacity=".3"
            />
          </svg>
        )}
      </div>

      <div className="p-4 flex flex-col flex-1 gap-2">
        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold w-fit px-2 py-1 rounded-full ${badgeClass}`}>
          <span className={`dot dot-${platform === 'mercadolivre' ? 'ml' : platform}`}></span>
          {label}
        </span>

        <div className="text-sm font-semibold text-text line-clamp-2">
          {product.name}
        </div>

        {product.description && (
          <p className="text-xs text-muted line-clamp-2 flex-1">
            {product.description}
          </p>
        )}

        <div className="flex items-center justify-between mt-1">
          {product.price ? (
            <span className="text-base font-bold text-success">{product.price}</span>
          ) : (
            <span></span>
          )}
          <button className="text-xs font-semibold px-3 py-1.5 border border-border bg-bg rounded-lg hover:border-accent hover:bg-accent/5 hover:text-accent transition">
            Ver produto →
          </button>
        </div>
      </div>
    </a>
  )
}
