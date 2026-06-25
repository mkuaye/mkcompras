import { useState, useEffect } from 'react'
import { useConvert } from '../../hooks/useConvert'
import { previewProduct } from '../../api/client'

function detectPlatform(url) {
  try {
    const hostname = new URL(url).hostname.toLowerCase()
    if (hostname.includes('shopee')) return 'shopee'
    if (hostname.includes('mercadolivre') || hostname.includes('mercadolibre')) return 'mercadolivre'
    if (hostname.includes('amazon') || hostname.includes('amzn')) return 'amazon'
  } catch {}
  return 'outros'
}

const EMPTY_FORM = {
  originalUrl: '',
  affiliateUrl: '',
  name: '',
  price: '',
  platform: '',
  description: '',
  image: '',
  category: '',
  featured: false,
}

export default function ProductForm({ editing, onAdd, onUpdate, onCancel }) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [statusMsg, setStatusMsg] = useState('')
  const [previewing, setPreviewing] = useState(false)
  const { convert, loading: converting } = useConvert()

  useEffect(() => {
    if (editing) {
      setForm(editing)
      setStatusMsg('')
      setError('')
    } else {
      setForm(EMPTY_FORM)
      setError('')
      setStatusMsg('')
    }
  }, [editing])

  const handleUrlBlur = async () => {
    const url = form.originalUrl.trim()
    if (!url) return
    // Only auto-run when adding a new product (not editing an existing one)
    if (!editing) {
      await fetchProductInfo(url)
    }
  }

  const fetchProductInfo = async (url) => {
    setPreviewing(true)
    setStatusMsg('Buscando informações do produto...')

    // Run affiliate link generation and product preview in parallel
    const affiliatePromise = !form.affiliateUrl ? convert(url).catch(() => null) : Promise.resolve(null)
    const previewPromise = previewProduct(url).catch(() => null)

    const [affiliateUrl, preview] = await Promise.all([affiliatePromise, previewPromise])

    const platform = detectPlatform(url)
    const updates = { platform }

    if (affiliateUrl) updates.affiliateUrl = affiliateUrl
    if (preview) {
      if (preview.name && !form.name) updates.name = preview.name
      if (preview.price && !form.price) updates.price = preview.price
      if (preview.image && !form.image) updates.image = preview.image
      if (preview.platform) updates.platform = preview.platform
    }

    setForm((prev) => ({ ...prev, ...updates }))

    if (affiliateUrl && preview?.name) {
      setStatusMsg('✓ Informações e link de afiliado carregados!')
    } else if (affiliateUrl) {
      setStatusMsg('✓ Link de afiliado gerado! Informações não encontradas — preencha manualmente.')
    } else if (preview?.name) {
      setStatusMsg('✓ Informações carregadas! Gere o link de afiliado manualmente.')
    } else {
      setStatusMsg('Não foi possível buscar automaticamente — preencha os campos manualmente.')
    }

    setPreviewing(false)
  }

  const generateAffiliate = async (url) => {
    setStatusMsg('Gerando link de afiliado...')
    try {
      const affiliateUrl = await convert(url)
      const platform = detectPlatform(url)
      setForm((prev) => ({ ...prev, affiliateUrl, platform }))
      setStatusMsg('✓ Link de afiliado gerado!')
    } catch {
      setStatusMsg('Não foi possível gerar o link — cole manualmente abaixo.')
    }
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setError('')

    if (!form.originalUrl.trim()) {
      setError('Informe a URL do produto.')
      return
    }
    if (!form.name.trim()) {
      setError('Informe o nome do produto.')
      return
    }

    setSaving(true)
    try {
      if (editing) {
        await onUpdate(form.id, form)
        setForm(EMPTY_FORM)
        onCancel()
      } else {
        await onAdd(form)
        setForm(EMPTY_FORM)
        setStatusMsg('')
      }
    } catch (err) {
      setError(err.message || 'Erro ao salvar produto.')
    } finally {
      setSaving(false)
    }
  }

  const isLoading = previewing || converting

  return (
    <form onSubmit={handleSave} className="bg-surface border border-border rounded-2xl p-8">
      <h2 className="font-syne text-lg font-bold mb-6">
        {editing ? 'Editar produto' : 'Adicionar produto'}
      </h2>

      <div className="flex flex-col gap-4 mb-6">
        {/* URL do produto */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-widest text-muted mb-2">
            Link do produto *
          </label>
          <div className="flex gap-2">
            <input
              type="url"
              value={form.originalUrl}
              onChange={(e) => setForm({ ...form, originalUrl: e.target.value })}
              onBlur={handleUrlBlur}
              placeholder="https://shopee.com.br/produto..."
              className="flex-1 bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-text outline-none focus:border-accent transition placeholder:text-muted"
              autoFocus
            />
            <button
              type="button"
              onClick={() => fetchProductInfo(form.originalUrl.trim())}
              disabled={isLoading || !form.originalUrl.trim()}
              className="px-4 py-2.5 bg-bg border border-border rounded-lg text-sm font-semibold text-text hover:border-accent hover:text-accent transition disabled:opacity-40 whitespace-nowrap"
            >
              {isLoading ? 'Buscando...' : 'Buscar info'}
            </button>
          </div>
          {statusMsg && (
            <p className={`mt-1.5 text-xs ${statusMsg.startsWith('✓') ? 'text-success' : 'text-muted'}`}>
              {statusMsg}
            </p>
          )}
        </div>

        {/* Link de afiliado */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-widest text-muted mb-2">
            Link de afiliado
          </label>
          <div className="flex gap-2">
            <input
              type="url"
              value={form.affiliateUrl}
              onChange={(e) => setForm({ ...form, affiliateUrl: e.target.value })}
              placeholder="Gerado automaticamente ou cole aqui"
              className="flex-1 bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-text outline-none focus:border-accent transition placeholder:text-muted"
            />
            <button
              type="button"
              onClick={() => generateAffiliate(form.originalUrl.trim())}
              disabled={converting || !form.originalUrl.trim()}
              className="px-4 py-2.5 bg-bg border border-border rounded-lg text-sm font-semibold text-text hover:border-accent hover:text-accent transition disabled:opacity-40 whitespace-nowrap"
            >
              {converting ? 'Gerando...' : 'Gerar link'}
            </button>
          </div>
        </div>

        {/* Imagem + Nome + Preço */}
        <div className="flex gap-4 items-start">
          {/* Preview da imagem */}
          <div className="shrink-0">
            <label className="block text-xs font-semibold uppercase tracking-widest text-muted mb-2">
              Foto
            </label>
            <div className="w-20 h-20 rounded-lg border border-border bg-bg overflow-hidden flex items-center justify-center">
              {form.image ? (
                <img
                  src={form.image}
                  alt="preview"
                  className="w-full h-full object-cover"
                  onError={(e) => { e.target.style.display = 'none' }}
                />
              ) : (
                <svg className="w-8 h-8 opacity-20" viewBox="0 0 48 48" fill="none">
                  <path d="M16 32l8-10 6 7 4-5 6 8H8l8-10z" fill="currentColor" opacity=".5" />
                </svg>
              )}
            </div>
          </div>

          {/* Nome e Preço */}
          <div className="flex-1 grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-widest text-muted mb-2">
                Nome do produto *
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Preenchido automaticamente"
                className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-text outline-none focus:border-accent transition placeholder:text-muted"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-muted mb-2">
                Preço
              </label>
              <input
                type="text"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                placeholder="Preenchido automaticamente"
                className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-text outline-none focus:border-accent transition placeholder:text-muted"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-muted mb-2">
                Plataforma
              </label>
              <select
                value={form.platform}
                onChange={(e) => setForm({ ...form, platform: e.target.value })}
                className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-text outline-none focus:border-accent transition"
              >
                <option value="">Detectada auto</option>
                <option value="shopee">Shopee</option>
                <option value="mercadolivre">Mercado Livre</option>
                <option value="amazon">Amazon</option>
                <option value="outros">Outros</option>
              </select>
            </div>
          </div>
        </div>

        {/* URL da imagem (editável) */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-widest text-muted mb-2">
            URL da imagem principal
          </label>
          <input
            type="url"
            value={form.image}
            onChange={(e) => setForm({ ...form, image: e.target.value })}
            placeholder="Preenchida automaticamente"
            className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-text outline-none focus:border-accent transition placeholder:text-muted"
          />
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
