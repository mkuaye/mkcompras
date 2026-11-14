/**
 * Confere os arquivos de data/questoes (questões prontas do banco).
 * Uso: npm run questoes:validar
 *
 * Aponta JSON quebrado, gabarito inválido, explicação vazia e questões repetidas,
 * e mostra o total por disciplina e por estilo.
 */
import { readdir, readFile } from 'fs/promises'
import { join } from 'path'
import { expandirArquivoSemente, normalizar, validarQuestao } from '../src/server/services/bancoQuestoes.js'

const dir = process.argv[2] || join(process.cwd(), 'data', 'questoes')
const nomes = (await readdir(dir)).filter((n) => n.endsWith('.json')).sort()

let erros = 0
const vistos = new Map()
const porDisciplina = {}
let total = 0

for (const nome of nomes) {
  let arquivo
  try {
    arquivo = JSON.parse(await readFile(join(dir, nome), 'utf8'))
  } catch (e) {
    console.error(`✕ ${nome}: JSON inválido — ${e.message}`)
    erros++
    continue
  }
  if (!arquivo.disciplina) {
    console.error(`✕ ${nome}: falta "disciplina"`)
    erros++
  }
  for (const q of expandirArquivoSemente(arquivo)) {
    const onde = `${nome} › ${q.assunto} › "${q.enunciado.slice(0, 60)}…"`
    if (!validarQuestao(q)) {
      console.error(`✕ ${onde}: questão inválida (alternativas/gabarito)`)
      erros++
      continue
    }
    if (q.explicacao.trim().length < 6) {
      console.error(`✕ ${onde}: sem explicação`)
      erros++
    }
    if (q.estilo === 'multipla' && new Set(q.alternativas.map((a) => a.toLowerCase().trim())).size !== q.alternativas.length) {
      console.error(`✕ ${onde}: alternativas repetidas`)
      erros++
    }
    const chave = `${normalizar(q.enunciado)}|${q.alternativas.map(normalizar).join('|')}`
    if (vistos.has(chave)) {
      console.error(`✕ ${onde}: repetida (já em ${vistos.get(chave)})`)
      erros++
    }
    vistos.set(chave, nome)
    const d = (porDisciplina[q.disciplina] ||= { multipla: 0, certo_errado: 0, gabaritos: {} })
    d[q.estilo]++
    if (q.estilo === 'multipla') d.gabaritos['ABCDEF'[q.correta]] = (d.gabaritos['ABCDEF'[q.correta]] || 0) + 1
    total++
  }
}

console.log('\nDisciplina'.padEnd(42), 'A–E'.padStart(5), 'C/E'.padStart(5), 'Total'.padStart(6), '  Gabaritos A–E')
for (const [disc, d] of Object.entries(porDisciplina).sort((a, b) => a[0].localeCompare(b[0]))) {
  const g = 'ABCDE'.split('').map((l) => `${l}${d.gabaritos[l] || 0}`).join(' ')
  console.log(disc.padEnd(41), String(d.multipla).padStart(5), String(d.certo_errado).padStart(5), String(d.multipla + d.certo_errado).padStart(6), ' ', g)
}
console.log(`\n${total} questões em ${nomes.length} arquivos${erros ? ` · ${erros} problema(s)` : ' · tudo certo'}`)
process.exit(erros ? 1 : 0)
