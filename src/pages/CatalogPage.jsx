import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import Pagination from '@mui/material/Pagination'
import { useProducts } from '../hooks/useProducts'
import FilterBar from '../components/Catalog/FilterBar'
import ProductGrid from '../components/Catalog/ProductGrid'

const PAGE_SIZE = 24

export default function CatalogPage() {
  const { products, categories, loading, error, fetch } = useProducts()
  const [filters, setFilters] = useState({ platform: '', category: '', search: '' })
  const [searchParams, setSearchParams] = useSearchParams()
  const topRef = useRef(null)

  const requestedPage = Math.max(1, parseInt(searchParams.get('page'), 10) || 1)

  useEffect(() => {
    fetch()
  }, [fetch])

  const filteredProducts = useMemo(() => {
    let filtered = products
    if (filters.platform) {
      filtered = filtered.filter((p) => p.platform === filters.platform)
    }
    if (filters.category) {
      filtered = filtered.filter((p) =>
        (p.category || '').split(',').map((c) => c.trim().toLowerCase()).includes(filters.category.toLowerCase())
      )
    }
    if (filters.search) {
      const q = filters.search.toLowerCase()
      filtered = filtered.filter(
        (p) => p.name.toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q)
      )
    }
    return filtered
  }, [products, filters])

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PAGE_SIZE))
  const page = Math.min(requestedPage, totalPages)
  const pageProducts = filteredProducts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const setPage = useCallback(
    (value, { replace = false } = {}) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          if (value <= 1) next.delete('page')
          else next.set('page', String(value))
          return next
        },
        { replace }
      )
    },
    [setSearchParams]
  )

  // Ao mudar filtros, volta para a primeira página
  const handleFilterChange = useCallback(
    (updater) => {
      setFilters(updater)
      setPage(1, { replace: true })
    },
    [setPage]
  )

  const handlePageChange = (_, value) => {
    setPage(value)
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const rangeStart = filteredProducts.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const rangeEnd = Math.min(page * PAGE_SIZE, filteredProducts.length)

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

        <div ref={topRef} className="scroll-mt-24">
          <FilterBar
            categories={categories}
            onFilterChange={handleFilterChange}
          />
        </div>

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
            <>
              <p className="text-muted text-sm mb-4">
                Mostrando {rangeStart}–{rangeEnd} de {filteredProducts.length} produtos
              </p>

              <ProductGrid products={pageProducts} />

              {totalPages > 1 && (
                <div className="flex justify-center mt-10">
                  <Pagination
                    count={totalPages}
                    page={page}
                    onChange={handlePageChange}
                    color="primary"
                    shape="rounded"
                    siblingCount={1}
                    boundaryCount={1}
                  />
                </div>
              )}
            </>
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
