/**
 * Distribui os gabaritos das questões de múltipla escolha entre A–E em cada arquivo de
 * data/questoes, trocando a alternativa correta de lugar com outra (o conteúdo não muda).
 * Questões com alternativas numéricas em ordem crescente ficam como estão.
 *
 * Uso: node scripts/balancear-gabaritos.mjs   (arquivos gerado-* já saem balanceados)
 */
import { readdir, readFile, writeFile } from 'fs/promises'
import { join } from 'path'
import { serializarArquivo } from './formato-questoes.mjs'

const dir = join(process.cwd(), 'data', 'questoes')
const LETRAS = 'ABCDEF'

let semente = 7
const rnd = () => {
  semente = (semente * 16807) % 2147483647
  return semente / 2147483647
}

const numero = (s) => {
  const m = String(s).match(/^\D{0,4}(\d[\d.]*(?:,\d+)?)/)
  return m ? Number(m[1].replace(/\./g, '').replace(',', '.')) : NaN
}
const crescente = (alts) => {
  const ns = alts.map(numero)
  return ns.every((n) => !Number.isNaN(n)) && ns.every((n, i) => i === 0 || n >= ns[i - 1])
}

for (const nome of (await readdir(dir)).filter((n) => n.endsWith('.json') && !n.startsWith('gerado-')).sort()) {
  const caminho = join(dir, nome)
  const arquivo = JSON.parse(await readFile(caminho, 'utf8'))
  const contagem = [0, 0, 0, 0, 0, 0]
  let trocas = 0
  for (const itens of Object.values(arquivo.assuntos)) {
    for (const q of itens) {
      const alts = q[1]
      if (!Array.isArray(alts) || crescente(alts)) continue
      const n = alts.length
      const atual = LETRAS.indexOf(q[2])
      const menor = Math.min(...contagem.slice(0, n))
      const opcoes = [...Array(n).keys()].filter((i) => contagem[i] === menor)
      const alvo = opcoes[Math.floor(rnd() * opcoes.length)]
      if (alvo !== atual) {
        ;[alts[alvo], alts[atual]] = [alts[atual], alts[alvo]]
        q[2] = LETRAS[alvo]
        trocas++
      }
      contagem[alvo]++
    }
  }
  await writeFile(caminho, serializarArquivo(arquivo), 'utf8')
  console.log(`${nome}: ${trocas} trocas · ${'ABCDE'.split('').map((l, i) => `${l}${contagem[i]}`).join(' ')}`)
}
