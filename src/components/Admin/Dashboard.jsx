import { useState, useEffect } from 'react'
import { useAdminStore } from '../../store/adminStore'
import { useAnalytics } from '../../hooks/useAnalytics'
import ProductForm from './ProductForm'
import ProductTable from './ProductTable'
import AnalyticsDashboard from './AnalyticsDashboard'

export default function Dashboard({ products, onAdd, onUpdate, onDelete, onLogout }) {
  const { editingId, setEditingId, clearEditingId } = useAdminStore()
  const editingProduct = editingId ? products.find((p) => p.id === editingId) : null
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState('produtos')

  const token = useAdminStore((s) => s.token)
  const { data: analyticsData, loading: analyticsLoading, error: analyticsError, fetchAnalytics } = useAnalytics(token)

  useEffect(() => {
    if (activeTab === 'analytics' && !analyticsData) {
      fetchAnalytics()
    }
  }, [activeTab, analyticsData, fetchAnalytics])

  const filteredProducts = searchTerm
    ? products.filter(
        (p) =>
          p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (p.category || '').toLowerCase().includes(searchTerm.toLowerCase())
      )
    : products

  return (
    <div className="w-full max-w-4xl px-5 py-12">
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-syne text-3xl font-black">
          Admin <span className="bg-gradient-to-r from-accent to-accent2 bg-clip-text text-transparent">Painel</span>
        </h1>
        <button
          onClick={onLogout}
          className="px-4 py-2 text-sm font-semibold text-error border border-error rounded-lg hover:bg-error/5 transition"
        >
          Sair
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-8 border-b border-border">
        {[
          { id: 'produtos', label: 'Produtos' },
          { id: 'analytics', label: 'Analytics' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-5 py-2.5 text-sm font-semibold rounded-t-lg transition ${
              activeTab === tab.id
                ? 'bg-gradient-to-r from-accent to-accent2 bg-clip-text text-transparent border-b-2 border-accent'
                : 'text-muted hover:text-text'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'produtos' && (
        <>
          {/* Product Form */}
          <ProductForm
            editing={editingProduct}
            onAdd={onAdd}
            onUpdate={onUpdate}
            onCancel={() => clearEditingId()}
          />

          {/* Product List */}
          <div className="mt-12 bg-surface border border-border rounded-2xl p-8">
            <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
              <h2 className="font-syne text-lg font-bold">
                Produtos cadastrados ({products.length})
              </h2>
              <input
                type="text"
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-48 bg-bg border border-border rounded-lg px-3 py-2 text-sm text-text outline-none focus:border-accent transition placeholder:text-muted"
              />
            </div>

            {filteredProducts.length > 0 ? (
              <ProductTable
                products={filteredProducts}
                onEdit={setEditingId}
                onDelete={onDelete}
              />
            ) : (
              <div className="text-center py-10 text-muted text-sm">
                {products.length === 0 ? 'Nenhum produto cadastrado ainda.' : 'Nenhum produto encontrado.'}
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'analytics' && (
        <AnalyticsDashboard
          data={analyticsData}
          loading={analyticsLoading}
          error={analyticsError}
          onRefresh={fetchAnalytics}
        />
      )}
    </div>
  )
}
