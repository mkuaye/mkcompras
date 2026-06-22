import { useState, useEffect } from 'react'
import { useConvert } from '../../hooks/useConvert'

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
  const [convertMsg, setConvertMsg] = useState('')
  const { convert, loading: converting } = useConvert()

  useEffect(() => {
    if (editing) {
      setForm(editing)
      setConvertMsg('')
      setError('')
    } else {
      setForm(EMPTY_FORM)
      setError('')
      setConvertMsg('')
    }
  }, [editing])

  const handleUrlBlur = async () => {
    const url = form.originalUrl.trim()
    if (!url || form.affiliateUrl) return
    await generateAffiliate(url)
  }

  const generateAffiliate = async (url) => {
    setConvertMsg('Gerando link de afiliado...')
    try {
      const affiliateUrl = await convert(url)
      const platform = detectPlatform(url)
      setForm((prev) => ({ ...prev, affiliateUrl, platform }))
      setConvertMsg('✓ Link de afiliado gerado!')
    } catch {
      setConvertMsg('Não foi possível gerar o link — cole manualmente abaixo.')
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
        setConvertMsg('')
      }
    } catch (err) {
      setError(err.message || 'Erro ao salvar produto.')
    } finally {
      setSaving(false)
    }
  }

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
              onClick={() => generateAffiliate(form.originalUrl.trim())}
              disabled={converting || !form.originalUrl.trim()}
              className="px-4 py-2.5 bg-bg border border-border rounded-lg text-sm font-semibold text-text hover:border-accent hover:text-accent transition disabled:opacity-40 whitespace-nowrap"
            >
              {converting ? 'Gerando...' : 'Gerar link'}
            </button>
          </div>
          {convertMsg && (
            <p className={`mt-1.5 text-xs ${convertMsg.startsWith('✓') ? 'text-success' : 'text-muted'}`}>
              {convertMsg}
            </p>
          )}
        </div>

        {/* Link de afiliado */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-widest text-muted mb-2">
            Link de afiliado
          </label>
          <input
            type="url"
            value={form.affiliateUrl}
            onChange={(e) => setForm({ ...form, affiliateUrl: e.target.value })}
            placeholder="Gerado automaticamente ou cole aqui"
            className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-text outline-none focus:border-accent transition placeholder:text-muted"
          />
        </div>

        {/* Nome e Preço lado a lado */}
        <div className="grid grid-cols-2 gap-4">
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
          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest text-muted mb-2">
              Preço
            </label>
            <input
              type="text"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              placeholder="R$ 99,90"
              className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-text outline-none focus:border-accent transition placeholder:text-muted"
            />
          </div>
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
