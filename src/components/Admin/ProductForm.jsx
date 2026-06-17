import { useState, useEffect } from 'react'
import { useConvert } from '../../hooks/useConvert'

const PLATFORM_LABELS = {
  shopee: 'Shopee',
  mercadolivre: 'Mercado Livre',
  amazon: 'Amazon',
  outros: 'Outros',
}

export default function ProductForm({ editing, onAdd, onUpdate, onCancel }) {
  const [form, setForm] = useState({
    originalUrl: '',
    affiliateUrl: '',
    name: '',
    description: '',
    image: '',
    price: '',
    category: '',
    platform: '',
    featured: false,
  })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const { convert, loading: converting } = useConvert()
  const [convertMsg, setConvertMsg] = useState('')

  useEffect(() => {
    if (editing) {
      setForm(editing)
    } else {
      resetForm()
    }
  }, [editing])

  const resetForm = () => {
    setForm({
      originalUrl: '',
      affiliateUrl: '',
      name: '',
      description: '',
      image: '',
      price: '',
      category: '',
      platform: '',
      featured: false,
    })
    setError('')
    setConvertMsg('')
  }

  const handleAutoConvert = async () => {
    const url = form.originalUrl.trim()
    if (!url) {
      setConvertMsg('Cole a URL do produto primeiro.')
      return
    }

    try {
      const affiliateUrl = await convert(url)
      setForm((prev) => ({ ...prev, affiliateUrl }))
      setConvertMsg('✓ Link de afiliado gerado com sucesso!')

      // Auto-detect platform
      try {
        const hostname = new URL(url).hostname.toLowerCase()
        if (hostname.includes('shopee')) {
          setForm((prev) => ({ ...prev, platform: 'shopee' }))
        } else if (hostname.includes('mercadolivre') || hostname.includes('mercadolibre')) {
          setForm((prev) => ({ ...prev, platform: 'mercadolivre' }))
        } else if (hostname.includes('amazon') || hostname.includes('amzn')) {
          setForm((prev) => ({ ...prev, platform: 'amazon' }))
        }
      } catch {}
    } catch {
      setConvertMsg('Conversão automática falhou — cole o link de afiliado manualmente.')
    }
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setError('')

    if (!form.originalUrl.trim() || !form.name.trim()) {
      setError('URL original e nome são obrigatórios.')
      return
    }

    setSaving(true)
    try {
      if (editing) {
        await onUpdate(form.id, form)
        resetForm()
        onCancel()
      } else {
        await onAdd(form)
        resetForm()
      }
    } catch (err) {
      setError(err.message || 'Erro ao salvar produto.')
    } finally {
      setSaving(false)
    }
  }

  const previewUrl = form.image ? form.image : ''

  return (
    <form onSubmit={handleSave} className="bg-surface border border-border rounded-2xl p-8">
      <h2 className="font-syne text-lg font-bold mb-6">
        {editing ? 'Editar produto' : 'Adicionar produto'}
      </h2>

      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* Original URL */}
        <div className="col-span-2">
          <label className="block text-xs font-semibold uppercase tracking-widest text-muted mb-2">
            URL original do produto *
          </label>
          <div className="flex gap-2">
            <input
              type="url"
              value={form.originalUrl}
              onChange={(e) => setForm({ ...form, originalUrl: e.target.value })}
              placeholder="https://shopee.com.br/produto..."
              className="flex-1 bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-text outline-none focus:border-accent transition placeholder:text-muted"
            />
            <button
              type="button"
              onClick={handleAutoConvert}
              disabled={converting}
              className="px-4 py-2.5 bg-bg border border-border rounded-lg text-sm font-semibold text-text hover:border-accent hover:text-accent transition disabled:opacity-50 whitespace-nowrap"
            >
              {converting ? 'Gerando...' : 'Gerar link'}
            </button>
          </div>
          {convertMsg && (
            <div className={`mt-2 text-xs ${convertMsg.startsWith('✓') ? 'text-success' : 'text-error'}`}>
              {convertMsg}
            </div>
          )}
        </div>

        {/* Affiliate URL */}
        <div className="col-span-2">
          <label className="block text-xs font-semibold uppercase tracking-widest text-muted mb-2">
            Link de afiliado gerado *
          </label>
          <input
            type="url"
            value={form.affiliateUrl}
            onChange={(e) => setForm({ ...form, affiliateUrl: e.target.value })}
            placeholder="Gerado automaticamente ou cole manualmente"
            className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-text outline-none focus:border-accent transition placeholder:text-muted"
          />
        </div>

        {/* Name */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-widest text-muted mb-2">
            Nome do produto *
          </label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Ex: Fone Bluetooth XYZ"
            className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-text outline-none focus:border-accent transition placeholder:text-muted"
          />
        </div>

        {/* Price */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-widest text-muted mb-2">
            Preço
          </label>
          <input
            type="text"
            value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
            placeholder="Ex: R$ 99,90"
            className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-text outline-none focus:border-accent transition placeholder:text-muted"
          />
        </div>

        {/* Description */}
        <div className="col-span-2">
          <label className="block text-xs font-semibold uppercase tracking-widest text-muted mb-2">
            Descrição
          </label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Breve descrição do produto..."
            rows="3"
            className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-text outline-none focus:border-accent transition placeholder:text-muted resize-none"
          />
        </div>

        {/* Image URL */}
        <div className="col-span-2">
          <label className="block text-xs font-semibold uppercase tracking-widest text-muted mb-2">
            URL da imagem
          </label>
          <input
            type="url"
            value={form.image}
            onChange={(e) => setForm({ ...form, image: e.target.value })}
            onBlur={() => {
              // Preview image will be shown below
            }}
            placeholder="https://..."
            className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-text outline-none focus:border-accent transition placeholder:text-muted"
          />
          {previewUrl && (
            <div className="mt-2">
              <img
                src={previewUrl}
                alt="Preview"
                className="max-h-20 max-w-full rounded-lg border border-border"
                onError={(e) => {
                  e.target.style.display = 'none'
                }}
              />
            </div>
          )}
        </div>

        {/* Category */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-widest text-muted mb-2">
            Categoria
          </label>
          <input
            type="text"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            placeholder="Ex: eletronicos"
            className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-text outline-none focus:border-accent transition placeholder:text-muted"
          />
        </div>

        {/* Platform */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-widest text-muted mb-2">
            Plataforma
          </label>
          <select
            value={form.platform}
            onChange={(e) => setForm({ ...form, platform: e.target.value })}
            className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-text outline-none focus:border-accent transition cursor-pointer"
          >
            <option value="">— detectar automaticamente —</option>
            {Object.entries(PLATFORM_LABELS).map(([val, label]) => (
              <option key={val} value={val}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {/* Featured */}
        <div className="flex items-end pb-1">
          <label className="flex items-center gap-2 text-sm text-text cursor-pointer">
            <input
              type="checkbox"
              checked={form.featured}
              onChange={(e) => setForm({ ...form, featured: e.target.checked })}
              className="w-4 h-4 accent-accent"
            />
            Produto em destaque
          </label>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-error/10 border border-error/25 rounded-lg text-sm text-error">
          {error}
        </div>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="px-6 py-2.5 bg-gradient-to-r from-accent to-accent2 text-white text-sm font-semibold rounded-lg hover:opacity-90 disabled:opacity-50 transition"
        >
          {saving ? 'Salvando...' : 'Salvar produto'}
        </button>
        {editing && (
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2.5 bg-bg border border-border text-text text-sm font-semibold rounded-lg hover:border-text transition"
          >
            Cancelar
          </button>
        )}
      </div>
    </form>
  )
}
