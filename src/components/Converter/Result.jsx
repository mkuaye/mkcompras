import { useState, useEffect } from 'react'

export default function Result({ result, lastLink }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(lastLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      alert(`Copie manualmente: ${lastLink}`)
    }
  }

  if (result.type === 'success') {
    return (
      <div className="mt-5 p-4 rounded-xl bg-success/10 border border-success/25 animate-fadeIn">
        <div className="text-xs font-semibold uppercase tracking-widest text-success mb-2">
          Link de afiliado gerado
        </div>
        <div className="flex gap-2.5">
          <div className="flex-1 bg-bg border border-border rounded-lg p-3 text-sm text-accent break-all font-inter">
            {lastLink}
          </div>
          <button
            onClick={handleCopy}
            className={`px-4 py-3 rounded-lg border text-sm font-semibold whitespace-nowrap transition ${
              copied
                ? 'border-success text-success bg-success/5'
                : 'border-border text-text hover:border-accent hover:text-accent'
            }`}
          >
            {copied ? 'Copiado!' : 'Copiar'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="mt-5 p-4 rounded-xl bg-error/10 border border-error/25 animate-fadeIn">
      <div className="text-xs font-semibold uppercase tracking-widest text-error mb-2">
        Não foi possível converter
      </div>
      <div className="text-sm text-error">{result.data}</div>
    </div>
  )
}
