import { useState } from 'react'
import { useConvert } from '../../hooks/useConvert'

export default function ConverterForm({ onSuccess, onError, onReset }) {
  const [url, setUrl] = useState('')
  const { convert, loading } = useConvert()

  const handleConvert = async () => {
    const trimmed = url.trim()
    if (!trimmed) {
      onError('Cole um link antes de converter.')
      return
    }

    try {
      const affiliateUrl = await convert(trimmed)
      onSuccess(affiliateUrl)
      setUrl('')
    } catch {
      onError('Não foi possível converter este link.')
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleConvert()
  }

  return (
    <>
      <label className="block text-xs font-semibold uppercase tracking-widest text-muted mb-2.5">
        Link do produto
      </label>
      <div className="flex gap-2.5">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="https://shopee.com.br/produto..."
          className="flex-1 bg-bg border border-border rounded-xl px-4 py-3.5 text-sm text-text outline-none focus:border-accent transition placeholder:text-muted"
        />
        <button
          onClick={handleConvert}
          disabled={loading}
          className="px-6 py-3.5 bg-gradient-to-r from-accent to-accent2 text-white text-sm font-semibold rounded-xl hover:opacity-90 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition whitespace-nowrap"
        >
          {loading ? (
            <>
              <span className="spinner"></span> Convertendo...
            </>
          ) : (
            'Converter'
          )}
        </button>
      </div>
    </>
  )
}
