import { useState } from 'react'
import ConverterForm from '../components/Converter/ConverterForm'
import Result from '../components/Converter/Result'

export default function HomePage() {
  const [lastLink, setLastLink] = useState('')
  const [result, setResult] = useState(null)

  const handleConvert = (affiliateUrl) => {
    setLastLink(affiliateUrl)
    setResult({
      type: 'success',
      data: affiliateUrl,
    })
  }

  const handleError = (error) => {
    setResult({
      type: 'error',
      data: error,
    })
  }

  const handleReset = () => {
    setResult(null)
    setLastLink('')
  }

  return (
    <div className="w-full max-w-2xl px-5 py-20">
      <div className="text-center mb-12">
        <h1 className="font-syne text-4xl font-black mb-4 leading-tight">
          Cole o link.<br />
          <span className="bg-gradient-to-r from-accent to-accent2 bg-clip-text text-transparent">
            Me ajude de graça.
          </span>
        </h1>
        <p className="text-muted text-lg">
          Converta o link do produto antes de comprar. Você paga o mesmo preço — e me ajuda a ganhar uma comissão de afiliado.
        </p>
      </div>

      <div className="bg-surface border border-border rounded-2xl p-8">
        <div className="flex gap-3 mb-6 flex-wrap">
          <div className="flex items-center gap-2 text-xs font-semibold px-3 py-1 rounded-full border border-border">
            <span className="dot dot-shopee"></span> Shopee
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold px-3 py-1 rounded-full border border-border">
            <span className="dot dot-ml"></span> Mercado Livre
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold px-3 py-1 rounded-full border border-border">
            <span className="dot dot-amazon"></span> Amazon
          </div>
        </div>

        <ConverterForm onSuccess={handleConvert} onError={handleError} onReset={handleReset} />
        {result && <Result result={result} lastLink={lastLink} />}
      </div>

      <div className="mt-14">
        <h2 className="font-syne text-sm font-bold uppercase tracking-widest text-muted mb-5">
          Como me ajudar
        </h2>
        <div className="flex flex-col gap-0">
          {[
            { num: 1, title: 'Achou um produto?', desc: 'Encontrou algo que quer comprar na Shopee, Mercado Livre ou Amazon? Ótimo!' },
            { num: 2, title: 'Cole o link aqui', desc: 'Copia a URL do produto e cola no campo acima. Em um segundo o link é gerado.' },
            { num: 3, title: 'Compre pelo link gerado', desc: 'Use o novo link para finalizar sua compra. O produto é exatamente o mesmo, sem nenhum custo extra pra você — e eu recebo uma comissão de afiliado.' },
          ].map((step, idx) => (
            <div key={step.num} className="flex gap-5 pb-7 last:pb-0 relative">
              <div className="flex flex-col items-center">
                <div className="w-9 h-9 rounded-full bg-surface border border-border flex items-center justify-center text-xs font-bold text-accent flex-shrink-0">
                  {step.num}
                </div>
                {idx < 2 && <div className="w-px h-8 bg-border mt-2"></div>}
              </div>
              <div className="pt-1">
                <strong className="text-base">{step.title}</strong>
                <p className="text-muted text-sm mt-1 leading-relaxed">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
