import { memo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { cx } from './ui'

// react-markdown passa a prop `node` (AST); ela não pode ir para o DOM
const tag = (Tag, classe) => {
  const C = ({ node, className, ...p }) => <Tag className={cx(classe, className)} {...p} />
  C.displayName = `md-${Tag}`
  return C
}

const componentes = {
  h1: tag('h2', 'font-syne text-2xl font-black mt-8 mb-3 first:mt-0'),
  h2: tag('h2', 'font-syne text-xl font-black mt-8 mb-3 pb-2 border-b border-border first:mt-0'),
  h3: tag('h3', 'font-bold text-base mt-6 mb-2 text-accent'),
  h4: tag('h4', 'font-semibold mt-4 mb-1.5'),
  p: tag('p', 'my-3'),
  ul: tag('ul', 'list-disc pl-5 my-3 space-y-1.5 marker:text-accent'),
  ol: tag('ol', 'list-decimal pl-5 my-3 space-y-1.5 marker:text-muted'),
  li: tag('li', 'pl-1'),
  strong: tag('strong', 'font-semibold text-text'),
  em: tag('em', 'italic'),
  blockquote: tag('blockquote', 'border-l-4 border-accent bg-bg rounded-r-xl px-4 py-2 my-4 text-sm'),
  hr: tag('hr', 'my-6 border-border'),
  code: tag('code', 'bg-bg border border-border rounded px-1.5 py-0.5 text-[0.85em]'),
  pre: tag('pre', 'bg-bg border border-border rounded-xl p-3 my-4 overflow-x-auto text-xs'),
  thead: tag('thead', 'bg-bg'),
  th: tag('th', 'text-left font-semibold px-3 py-2 border-b border-border'),
  td: tag('td', 'px-3 py-2 border-t border-border align-top'),
  a: ({ node, ...p }) => <a target="_blank" rel="noreferrer noopener" className="text-accent underline underline-offset-2" {...p} />,
  table: ({ node, ...p }) => (
    <div className="my-4 overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-sm border-collapse" {...p} />
    </div>
  ),
}

/** Renderiza Markdown (sem HTML bruto) com o visual da área de estudos */
function Markdown({ children, className }) {
  return (
    <div className={cx('leading-relaxed break-words', className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={componentes}>
        {children || ''}
      </ReactMarkdown>
    </div>
  )
}

export default memo(Markdown)
