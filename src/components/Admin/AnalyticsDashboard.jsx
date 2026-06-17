const PLATFORM_LABELS = {
  shopee: 'Shopee',
  mercadolivre: 'Mercado Livre',
  amazon: 'Amazon',
  outros: 'Outros',
}

const PLATFORM_COLORS = {
  shopee: 'from-orange-500 to-orange-400',
  mercadolivre: 'from-yellow-500 to-yellow-400',
  amazon: 'from-blue-500 to-blue-400',
  outros: 'from-gray-500 to-gray-400',
}

function StatCard({ label, value, sub }) {
  return (
    <div className="bg-surface border border-border rounded-2xl p-6 flex flex-col gap-1">
      <span className="text-xs font-semibold uppercase tracking-widest text-muted">{label}</span>
      <span className="text-3xl font-black font-syne text-text">{value}</span>
      {sub && <span className="text-xs text-muted">{sub}</span>}
    </div>
  )
}

function BarRow({ label, count, max, colorClass }) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0
  return (
    <div className="flex items-center gap-3">
      <span className="w-28 text-sm text-text truncate shrink-0 capitalize">{label}</span>
      <div className="flex-1 bg-bg rounded-full h-2.5 overflow-hidden">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${colorClass}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-8 text-right text-xs font-semibold text-muted shrink-0">{count}</span>
    </div>
  )
}

function TimelineBar({ timeline }) {
  if (!timeline || timeline.length === 0) return null
  const max = Math.max(...timeline.map((d) => d.count), 1)

  return (
    <div className="flex items-end gap-1 h-16">
      {timeline.map(({ date, count }) => (
        <div
          key={date}
          title={`${date}: ${count}`}
          className="flex-1 bg-gradient-to-t from-accent to-accent2 rounded-sm opacity-80 hover:opacity-100 transition"
          style={{ height: `${Math.max(4, (count / max) * 64)}px` }}
        />
      ))}
    </div>
  )
}

export default function AnalyticsDashboard({ data, loading, error, onRefresh }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted text-sm">
        Carregando analytics...
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-center">
        <p className="text-error text-sm">{error}</p>
        <button
          onClick={onRefresh}
          className="text-xs font-semibold text-accent hover:underline"
        >
          Tentar novamente
        </button>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-center">
        <p className="text-muted text-sm">Clique em atualizar para carregar as métricas.</p>
        <button
          onClick={onRefresh}
          className="px-4 py-2 bg-gradient-to-r from-accent to-accent2 text-white text-sm font-semibold rounded-xl hover:opacity-90 transition"
        >
          Carregar
        </button>
      </div>
    )
  }

  const maxPlatform = data.platformStats?.[0]?.count || 1
  const maxCategory = data.topCategories?.[0]?.count || 1
  const maxTag = data.topTags?.[0]?.count || 1

  return (
    <div className="space-y-8">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatCard
          label="Total de eventos"
          value={data.total}
          sub="links + produtos"
        />
        <StatCard
          label="Links convertidos"
          value={data.linkConversions}
          sub="intenções de compra"
        />
        <StatCard
          label="Produtos adicionados"
          value={data.productAdditions}
          sub="pelo admin"
        />
      </div>

      {/* Timeline */}
      {data.timeline?.length > 0 && (
        <div className="bg-surface border border-border rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-syne text-sm font-bold">Atividade (últimos 30 dias)</h3>
            <span className="text-xs text-muted">{data.timeline.length} dias</span>
          </div>
          <TimelineBar timeline={data.timeline} />
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {/* Platform stats */}
        <div className="bg-surface border border-border rounded-2xl p-6">
          <h3 className="font-syne text-sm font-bold mb-5">Plataformas</h3>
          {data.platformStats?.length > 0 ? (
            <div className="space-y-3.5">
              {data.platformStats.map(({ platform, count }) => (
                <BarRow
                  key={platform}
                  label={PLATFORM_LABELS[platform] || platform}
                  count={count}
                  max={maxPlatform}
                  colorClass={PLATFORM_COLORS[platform] || 'from-accent to-accent2'}
                />
              ))}
            </div>
          ) : (
            <p className="text-muted text-xs">Nenhum dado ainda.</p>
          )}
        </div>

        {/* Top categories */}
        <div className="bg-surface border border-border rounded-2xl p-6">
          <h3 className="font-syne text-sm font-bold mb-5">Categorias mais populares</h3>
          {data.topCategories?.length > 0 ? (
            <div className="space-y-3.5">
              {data.topCategories.map(({ category, count }) => (
                <BarRow
                  key={category}
                  label={category}
                  count={count}
                  max={maxCategory}
                  colorClass="from-accent to-accent2"
                />
              ))}
            </div>
          ) : (
            <p className="text-muted text-xs">Nenhum dado ainda.</p>
          )}
        </div>
      </div>

      {/* Top tags */}
      <div className="bg-surface border border-border rounded-2xl p-6">
        <h3 className="font-syne text-sm font-bold mb-5">Tags mais frequentes</h3>
        {data.topTags?.length > 0 ? (
          <>
            <div className="flex flex-wrap gap-2 mb-5">
              {data.topTags.map(({ tag, count }) => (
                <span
                  key={tag}
                  className="px-3 py-1 rounded-full bg-bg border border-border text-xs font-medium text-text flex items-center gap-1.5"
                >
                  {tag}
                  <span className="bg-gradient-to-r from-accent to-accent2 bg-clip-text text-transparent font-bold">
                    {count}
                  </span>
                </span>
              ))}
            </div>
            <div className="space-y-2.5">
              {data.topTags.slice(0, 8).map(({ tag, count }) => (
                <BarRow
                  key={tag}
                  label={tag}
                  count={count}
                  max={maxTag}
                  colorClass="from-accent to-accent2"
                />
              ))}
            </div>
          </>
        ) : (
          <p className="text-muted text-xs">Nenhum dado ainda.</p>
        )}
      </div>

      <div className="flex justify-end">
        <button
          onClick={onRefresh}
          className="px-4 py-2 text-sm font-semibold text-accent border border-accent/30 rounded-lg hover:bg-accent/5 transition"
        >
          Atualizar métricas
        </button>
      </div>
    </div>
  )
}
