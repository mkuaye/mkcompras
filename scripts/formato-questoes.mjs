/**
 * Grava um arquivo de data/questoes no formato compacto (uma questão por linha),
 * fácil de revisar e de comparar no git.
 */
const item = (q) => '[' + q.map((x) => (Array.isArray(x) ? '[' + x.map((s) => JSON.stringify(s)).join(', ') + ']' : JSON.stringify(x))).join(', ') + ']'

export function serializarArquivo(arquivo) {
  const { assuntos, ...cabecalho } = arquivo
  const linhas = ['{']
  for (const [k, v] of Object.entries(cabecalho)) linhas.push(`  ${JSON.stringify(k)}: ${JSON.stringify(v)},`)
  linhas.push('  "assuntos": {')
  const nomes = Object.keys(assuntos)
  nomes.forEach((nome, i) => {
    linhas.push(`    ${JSON.stringify(nome)}: [`)
    linhas.push(assuntos[nome].map((q) => `      ${item(q)}`).join(',\n'))
    linhas.push(`    ]${i < nomes.length - 1 ? ',' : ''}`)
  })
  linhas.push('  }', '}', '')
  return linhas.join('\n')
}
