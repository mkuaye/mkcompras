import { useEffect, useState } from 'react'
import { useProducts } from '../hooks/useProducts'
import FilterBar from '../components/Catalog/FilterBar'
import ProductGrid from '../components/Catalog/ProductGrid'

export default function CatalogPage() {
  const { products, categories, loading, error, fetch } = useProducts()
  const [filteredProducts, setFilteredProducts] = useState([])
  const [filters, setFilters] = useState({ platform: '', category: '', search: '' })

  useEffect(() => {
    fetch()
  }, [fetch])

  useEffect(() => {
    let filtered = products
    if (filters.platform) {
      filtered = filtered.filter((p) => p.platform === filters.platform)
    }
    if (filters.category) {
      filtered = filtered.filter((p) => p.category === filters.category)
    }
    if (filters.search) {
      const q = filters.search.toLowerCase()
      filtered = filtered.filter(
        (p) => p.name.toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q)
      )
    }
    setFilteredProducts(filtered)
  }, [products, filters])

  return (
    <div className="w-full">
      <div className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center mb-10 max-w-2xl mx-auto">
          <h1 className="font-syne text-4xl font-black mb-4 leading-tight">
            Produtos <span className="bg-gradient-to-r from-accent to-accent2 bg-clip-text text-transparent">selecionados</span>
          </h1>
          <p className="text-muted text-lg">
            Clique e compre pelo link de afiliado — mesmo produto, mesmo preço, sem custo extra pra você.
          </p>
        </div>

        <FilterBar
          categories={categories}
          onFilterChange={setFilters}
        />

        {loading && (
          <div className="flex justify-center py-20">
            <div className="flex gap-1.5">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-2 h-2 bg-accent rounded-full"
                  style={{ animation: `bounce 1.2s infinite ${i * 0.2}s` }}
                ></div>
              ))}
            </div>
          </div>
        )}

        {error && (
          <div className="text-center py-20 text-error">
            Erro ao carregar produtos: {error}
          </div>
        )}

        {!loading && !error && (
          filteredProducts.length > 0 ? (
            <ProductGrid products={filteredProducts} />
          ) : (
            <div className="text-center py-20 text-muted">
              <svg className="w-16 h-16 mx-auto mb-4 opacity-30" viewBox="0 0 48 48" fill="none">
                <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="1.5" opacity=".3" />
                <path d="M16 24h16M24 16v16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity=".3" />
              </svg>
              <p className="text-sm">Nenhum produto encontrado.</p>
            </div>
          )
        )}
      </div>
    </div>
  )
}
