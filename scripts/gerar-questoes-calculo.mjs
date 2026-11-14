/**
 * Gera questões de cálculo (Matemática, Matemática Financeira, Estatística e parte de
 * Raciocínio Lógico) com o gabarito calculado pelo próprio script — não há risco de gabarito errado.
 *
 * Uso: npm run questoes:gerar-calculo
 * Saída: data/questoes/gerado-*.json (sobrescreve). A semente é fixa: rodar de novo produz os mesmos arquivos.
 */
import { writeFile } from 'fs/promises'
import { join } from 'path'
import { serializarArquivo } from './formato-questoes.mjs'

/* ───────────── utilidades ───────────── */

let semente = 20261113
function rnd() {
  semente = (semente + 0x6d2b79f5) | 0
  let t = Math.imul(semente ^ (semente >>> 15), 1 | semente)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}
const int = (a, b) => a + Math.floor(rnd() * (b - a + 1))
const pick = (arr) => arr[Math.floor(rnd() * arr.length)]
const embaralhar = (arr) => {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
const r2 = (v) => Math.round(v * 100) / 100
const mdc = (a, b) => (b ? mdc(b, a % b) : Math.abs(a))
const mmc = (a, b) => (a / mdc(a, b)) * b
const fat = (n) => (n <= 1 ? 1 : n * fat(n - 1))
const comb = (n, k) => Math.round(fat(n) / (fat(k) * fat(n - k)))

const num = (v, casas = 0) => Number(v).toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })
const fInt = (v) => num(Math.round(v))
const f1 = (v) => num(v, 1)
const f2 = (v) => num(v, 2)
const fReais = (v) => `R$ ${num(v, 2)}`
const fPct = (v) => `${num(r2(v), Number.isInteger(r2(v)) ? 0 : 2)}%`
const fFrac = ([n, d]) => {
  const g = mdc(n, d)
  return d / g === 1 ? `${n / g}` : `${n / g}/${d / g}`
}
/** Número racional como fração irredutível (ex.: 0,375 → "3/8") */
const fFracDe = (x) => {
  for (let d = 1; d <= 20000; d++) {
    const n = Math.round(x * d)
    if (Math.abs(n / d - x) < 1e-9) return fFrac([n, d])
  }
  return f2(x)
}
/** Taxa decimal sem zeros sobrando (0,015; 0,02) */
const fN = (v) => Number(v).toLocaleString('pt-BR', { maximumFractionDigits: 4 })

/* ───────────── montagem das questões ───────────── */

class Arquivo {
  constructor(nome, disciplina) {
    this.nome = nome
    this.disciplina = disciplina
    this.assuntos = {}
    this.vistos = new Set()
  }

  add(assunto, q) {
    if (this.vistos.has(q[0])) return false
    this.vistos.add(q[0])
    ;(this.assuntos[assunto] ||= []).push(q)
    return true
  }

  /**
   * Questão numérica: em parte das vezes múltipla escolha (alternativas em ordem crescente,
   * com a correta numa posição sorteada), nas demais certo/errado.
   * erros: valores que um aluno obteria com os erros mais comuns (viram distratores).
   */
  numerica({ assunto, pergunta, afirmacao, correta, erros = [], fmt = fInt, explicacao, dif = 'm', ce = 0.3, inteiro, variar = true, max = Infinity }) {
    const ehInteiro = inteiro ?? Number.isInteger(correta)
    const valido = (v) => v > 0 && v <= max && Number.isFinite(v)
    if (afirmacao && rnd() < ce) {
      const certo = rnd() < 0.5
      const extras = variar ? [correta * 1.1, correta * 0.9, correta + (ehInteiro ? 2 : correta * 0.2)] : []
      const falsos = [...erros, ...extras].filter((v) => valido(v) && fmt(v) !== fmt(correta))
      if (certo || falsos.length) return this.add(assunto, [afirmacao(fmt(certo ? correta : pick(falsos))), null, certo ? 'C' : 'E', explicacao, dif])
    }
    const alvo = fmt(correta)
    const usados = new Set([alvo])
    const candidatos = []
    const tenta = (v) => {
      if (!valido(v)) return
      const s = fmt(v)
      if (usados.has(s)) return
      usados.add(s)
      candidatos.push(v)
    }
    embaralhar(erros).forEach(tenta)
    // Variações automáticas: ±7%, ±14%... (arredondadas se a resposta é inteira);
    // ±1, ±2... só para respostas pequenas, para não gerar alternativas coladas (1.094 × 1.095)
    const arred = (v) => (ehInteiro ? Math.round(v) : v)
    for (let k = 1; k <= 8 && variar; k++) {
      tenta(arred(correta * (1 + 0.07 * k)))
      tenta(arred(correta * (1 - 0.07 * k)))
      if (ehInteiro && Math.abs(correta) < 20) {
        tenta(correta + k)
        tenta(correta - k)
      }
    }
    // posição sorteada da correta: escolhe quantos distratores ficam abaixo dela
    const abaixo = candidatos.filter((v) => v < correta)
    const acima = candidatos.filter((v) => v > correta)
    let nAbaixo = Math.min(int(0, 4), abaixo.length)
    if (4 - nAbaixo > acima.length) nAbaixo = 4 - acima.length
    if (nAbaixo < 0 || nAbaixo > abaixo.length) return false
    const escolhidos = [...abaixo.slice(0, nAbaixo), ...acima.slice(0, 4 - nAbaixo), correta].sort((a, b) => a - b)
    const alternativas = escolhidos.map(fmt)
    return this.add(assunto, [pergunta, alternativas, 'ABCDE'[alternativas.indexOf(alvo)], explicacao, dif])
  }

  /** Múltipla escolha com alternativas de texto (a correta vai para posição sorteada) */
  texto({ assunto, pergunta, correta, distratores, explicacao, dif = 'm' }) {
    const alts = embaralhar([...new Set(distratores.filter((d) => d !== correta))]).slice(0, 4)
    if (alts.length < 4) return false
    const pos = int(0, 4)
    alts.splice(pos, 0, correta)
    return this.add(assunto, [pergunta, alts, 'ABCDE'[pos], explicacao, dif])
  }

  certoErrado({ assunto, afirmacao, certo, explicacao, dif = 'm' }) {
    return this.add(assunto, [afirmacao, null, certo ? 'C' : 'E', explicacao, dif])
  }

  /** Repete um modelo até gerar n questões distintas */
  gerar(n, modelo) {
    let feitas = 0
    for (let tentativas = 0; feitas < n && tentativas < n * 30; tentativas++) if (modelo()) feitas++
  }

  get total() {
    return Object.values(this.assuntos).reduce((a, l) => a + l.length, 0)
  }
}

/* ───────────── Matemática ───────────── */

const mat = new Arquivo('gerado-matematica.json', 'Matemática')

mat.gerar(45, () => {
  const p = pick([5, 8, 10, 12, 15, 18, 20, 25, 30, 35, 40, 45, 60, 75, 80, 120, 150])
  const N = 20 * int(2, 250)
  const r = (p * N) / 100
  if (!Number.isInteger(r)) return false
  return mat.numerica({
    assunto: 'Porcentagem',
    pergunta: `Quanto é ${p}% de ${fInt(N)}?`,
    afirmacao: (v) => `${p}% de ${fInt(N)} é igual a ${v}.`,
    correta: r,
    erros: [(N * p) / 10, (N * (100 - p)) / 100, N + r],
    explicacao: `${p}% de ${fInt(N)} = ${p}/100 × ${fInt(N)} = ${fInt(r)}.`,
    dif: 'f',
  })
})

mat.gerar(45, () => {
  const P = 10 * int(4, 300)
  const d = pick([5, 10, 12, 15, 20, 25, 30, 35, 40])
  const aumento = rnd() < 0.4
  const final = P * (aumento ? 1 + d / 100 : 1 - d / 100)
  const verbo = aumento ? `teve aumento de ${d}%` : `foi vendido com desconto de ${d}%`
  return mat.numerica({
    assunto: 'Porcentagem: aumentos e descontos',
    pergunta: `Um produto que custava ${fReais(P)} ${verbo}. Qual o novo preço?`,
    afirmacao: (v) => `Um produto que custava ${fReais(P)} ${verbo}; o novo preço é ${v}.`,
    correta: final,
    erros: [(P * d) / 100, P * (aumento ? 1 - d / 100 : 1 + d / 100), P - d, P + d],
    fmt: fReais,
    explicacao: `${aumento ? 'Aumento' : 'Desconto'} de ${d}%: multiplica-se por ${f2(aumento ? 1 + d / 100 : 1 - d / 100)}. ${fReais(P)} × ${f2(aumento ? 1 + d / 100 : 1 - d / 100)} = ${fReais(final)}.`,
    dif: 'f',
  })
})

mat.gerar(35, () => {
  const P = 50 * int(2, 40)
  const a = pick([10, 20, 25, 30, 40, 50])
  const b = pick([10, 20, 25, 30, 40, 50])
  const final = P * (1 + a / 100) * (1 - b / 100)
  return mat.numerica({
    assunto: 'Porcentagem: aumentos e descontos sucessivos',
    pergunta: `Um artigo de ${fReais(P)} sofreu um aumento de ${a}% e, em seguida, um desconto de ${b}%. Qual o preço final?`,
    afirmacao: (v) => `Um artigo de ${fReais(P)} que sofre aumento de ${a}% e, depois, desconto de ${b}% passa a custar ${v}.`,
    correta: final,
    erros: [P * (1 + (a - b) / 100), P * (1 + a / 100), P * (1 - b / 100), P],
    fmt: fReais,
    explicacao: `Variações sucessivas se multiplicam: ${fReais(P)} × ${f2(1 + a / 100)} × ${f2(1 - b / 100)} = ${fReais(final)}. Não se pode somar ${a}% e −${b}% diretamente.`,
    dif: 'm',
  })
})

mat.gerar(35, () => {
  const c = pick([-50, -40, -25, -20, -10, 10, 15, 20, 25, 30, 40, 50, 60, 75, 100])
  const A = pick([20, 40, 60, 80, 120, 160, 200, 240, 400, 500, 800, 1200])
  const B = (A * (100 + c)) / 100
  if (!Number.isInteger(B)) return false
  const tipo = c > 0 ? 'aumento' : 'redução'
  return mat.numerica({
    assunto: 'Porcentagem: variação percentual',
    pergunta: `O preço de um produto passou de R$ ${fInt(A)} para R$ ${fInt(B)}. O percentual de ${tipo} foi de:`,
    afirmacao: (v) => `Se um preço passa de R$ ${fInt(A)} para R$ ${fInt(B)}, houve ${tipo} de ${v}.`,
    correta: Math.abs(c),
    erros: [(Math.abs(B - A) / B) * 100, Math.abs(B - A), Math.abs(c) / 2],
    fmt: fPct,
    explicacao: `Variação = (novo − antigo) / antigo = (${fInt(B)} − ${fInt(A)}) / ${fInt(A)} = ${fPct(c)}. A base é sempre o valor inicial.`,
    dif: 'm',
  })
})

const ITENS = [
  ['quilos de carne', 'kg', [28, 32, 35, 38, 40, 42, 45, 48, 52, 55]],
  ['metros de tecido', 'm', [8, 9, 12, 15, 18, 22, 25]],
  ['litros de combustível', 'L', [5, 6, 7]],
  ['cadernos', 'unidades', [9, 12, 14, 15, 18, 21]],
  ['quilos de café', 'kg', [24, 30, 36, 40, 44]],
]
mat.gerar(45, () => {
  const [item, , precos] = pick(ITENS)
  const u = pick(precos)
  const X = int(2, 12)
  const Z = int(3, 30)
  if (Z === X) return false
  return mat.numerica({
    assunto: 'Regra de três simples',
    pergunta: `Se ${X} ${item} custam R$ ${fInt(u * X)}, quanto custarão ${Z} ${item}?`,
    afirmacao: (v) => `Se ${X} ${item} custam R$ ${fInt(u * X)}, então ${Z} ${item} custarão R$ ${v}.`,
    correta: u * Z,
    erros: [(u * X * X) / Z, u * Z + u, u * X + Z, u * (Z - 1)],
    explicacao: `Grandezas diretamente proporcionais: ${X} está para R$ ${fInt(u * X)} assim como ${Z} está para x. x = ${fInt(u * X)} × ${Z} / ${X} = ${fInt(u * Z)}.`,
    dif: 'f',
  })
})

mat.gerar(40, () => {
  const w1 = int(2, 15)
  const d1 = int(4, 30)
  const W = w1 * d1
  const w2 = int(2, 24)
  if (w2 === w1 || W % w2) return false
  const d2 = W / w2
  return mat.numerica({
    assunto: 'Regra de três inversa',
    pergunta: `${w1} operários, trabalhando no mesmo ritmo, concluem uma obra em ${d1} dias. Em quantos dias ${w2} operários, com o mesmo ritmo, concluiriam a mesma obra?`,
    afirmacao: (v) => `Se ${w1} operários concluem uma obra em ${d1} dias, ${w2} operários com o mesmo ritmo a concluiriam em ${v} dias.`,
    correta: d2,
    erros: [(d1 * w2) / w1, d1 + (w1 - w2), d1 - (w1 - w2)],
    explicacao: `Mais operários, menos dias: grandezas inversamente proporcionais. ${w1} × ${d1} = ${w2} × x → x = ${W} / ${w2} = ${d2}.`,
    dif: 'f',
  })
})

mat.gerar(30, () => {
  const v1 = pick([40, 50, 60, 72, 80, 90, 100, 120])
  const t1 = int(2, 9)
  const D = v1 * t1
  const v2 = pick([40, 45, 50, 60, 75, 80, 90, 100, 120, 150])
  if (v2 === v1 || D % v2) return false
  return mat.numerica({
    assunto: 'Regra de três inversa',
    pergunta: `Um carro, a ${v1} km/h, faz um percurso em ${t1} horas. A ${v2} km/h, o mesmo percurso seria feito em:`,
    afirmacao: (v) => `Um percurso feito em ${t1} horas a ${v1} km/h seria feito em ${v} a ${v2} km/h.`,
    correta: D / v2,
    erros: [(t1 * v2) / v1, t1 + 1, t1 - 1],
    fmt: (v) => `${num(r2(v), Number.isInteger(r2(v)) ? 0 : 2)} horas`,
    inteiro: false,
    explicacao: `Velocidade e tempo são inversamente proporcionais: ${v1} × ${t1} = ${v2} × t → t = ${D} / ${v2} = ${fN(r2(D / v2))} h.`,
    dif: 'f',
  })
})

mat.gerar(35, () => {
  const w1 = int(4, 16)
  const h1 = pick([6, 8, 10])
  const d1 = int(5, 30)
  const w2 = int(3, 20)
  const h2 = pick([4, 5, 6, 8, 10, 12])
  const total = w1 * h1 * d1
  if (total % (w2 * h2) || (w2 === w1 && h2 === h1)) return false
  const d2 = total / (w2 * h2)
  return mat.numerica({
    assunto: 'Regra de três composta',
    pergunta: `${w1} pedreiros, trabalhando ${h1} horas por dia, constroem um muro em ${d1} dias. Quantos dias ${w2} pedreiros, trabalhando ${h2} horas por dia, levariam para construir um muro igual?`,
    afirmacao: (v) => `Se ${w1} pedreiros, a ${h1} h/dia, constroem um muro em ${d1} dias, então ${w2} pedreiros, a ${h2} h/dia, levariam ${v} dias para construir um muro igual.`,
    correta: d2,
    erros: [(d1 * w2 * h2) / (w1 * h1), (d1 * w2 * h1) / (w1 * h2), (d1 * w1 * h2) / (w2 * h1)],
    explicacao: `Total de horas de trabalho: ${w1} × ${h1} × ${d1} = ${total}. Dias = ${total} / (${w2} × ${h2}) = ${d2}. Pedreiros e horas/dia são inversamente proporcionais aos dias.`,
    dif: 'm',
  })
})

mat.gerar(40, () => {
  const partes = [int(1, 6), int(1, 7), int(2, 9)]
  const soma = partes[0] + partes[1] + partes[2]
  const T = soma * 10 * int(3, 120)
  const maior = rnd() < 0.5
  const ref = maior ? Math.max(...partes) : Math.min(...partes)
  const nomes = ['Ana', 'Bruno', 'Carla']
  return mat.numerica({
    assunto: 'Razão e proporção: divisão proporcional',
    pergunta: `${fReais(T).replace(',00', '')} serão divididos entre ${nomes.join(', ').replace(/, (?=[^,]*$)/, ' e ')} em partes diretamente proporcionais a ${partes.join(', ').replace(/, (?=[^,]*$)/, ' e ')}, respectivamente. A ${maior ? 'maior' : 'menor'} parte é de:`,
    afirmacao: (v) => `Dividindo-se ${fReais(T)} em partes diretamente proporcionais a ${partes.join(', ')}, a ${maior ? 'maior' : 'menor'} parte é ${v}.`,
    correta: (T / soma) * ref,
    erros: [T / 3, (T / soma) * (maior ? Math.min(...partes) : Math.max(...partes)), T / ref, (T / soma) * partes[1]],
    fmt: fReais,
    explicacao: `Total de partes: ${partes.join(' + ')} = ${soma}. Cada parte vale ${fReais(T / soma)}. A ${maior ? 'maior' : 'menor'} recebe ${ref} × ${fReais(T / soma)} = ${fReais((T / soma) * ref)}.`,
    dif: 'f',
  })
})

const MULT = { 2: 'O dobro', 3: 'O triplo', 4: 'O quádruplo', 5: 'O quíntuplo' }
mat.gerar(40, () => {
  const a = int(2, 5)
  const x = int(2, 60)
  const k = int(1, 40)
  const soma = rnd() < 0.5
  const m = soma ? a * x + k : a * x - k
  if (m <= 0) return false
  return mat.numerica({
    assunto: 'Equações do 1º grau',
    pergunta: `${MULT[a]} de um número, ${soma ? `somado a ${k}` : `diminuído de ${k}`}, é igual a ${m}. Esse número é:`,
    afirmacao: (v) => `Se ${MULT[a].toLowerCase()} de um número, ${soma ? `somado a ${k}` : `diminuído de ${k}`}, é igual a ${m}, então o número é ${v}.`,
    correta: x,
    erros: [(soma ? m + k : m - k) / a, m / a, x + 2, soma ? m - k : m + k],
    inteiro: true,
    explicacao: `${a}x ${soma ? '+' : '−'} ${k} = ${m} → ${a}x = ${soma ? m - k : m + k} → x = ${x}.`,
    dif: 'f',
  })
})

mat.gerar(30, () => {
  const x = int(5, 300)
  const S = 3 * x + 3
  return mat.numerica({
    assunto: 'Equações do 1º grau',
    pergunta: `A soma de três números inteiros consecutivos é ${S}. O maior deles é:`,
    afirmacao: (v) => `Se a soma de três inteiros consecutivos é ${S}, o maior deles é ${v}.`,
    correta: x + 2,
    erros: [x, x + 1, S / 3 + 2, x + 3],
    explicacao: `x + (x + 1) + (x + 2) = ${S} → 3x + 3 = ${S} → x = ${x}. Os números são ${x}, ${x + 1} e ${x + 2}.`,
    dif: 'f',
  })
})

mat.gerar(40, () => {
  const motos = int(3, 60)
  const carros = int(3, 80)
  const V = motos + carros
  const R = 4 * carros + 2 * motos
  const pedeMotos = rnd() < 0.5
  return mat.numerica({
    assunto: 'Sistemas de equações do 1º grau',
    pergunta: `Em um estacionamento há ${V} veículos, entre carros e motos, totalizando ${R} rodas. ${pedeMotos ? 'Quantas motos' : 'Quantos carros'} há no estacionamento?`,
    afirmacao: (v) => `Se em um estacionamento há ${V} veículos (carros e motos) e ${R} rodas, então há ${v} ${pedeMotos ? 'motos' : 'carros'}.`,
    correta: pedeMotos ? motos : carros,
    erros: [pedeMotos ? carros : motos, Math.round(V / 2), Math.round(R / 4), Math.round(R / 2) - V],
    explicacao: `c + m = ${V} e 4c + 2m = ${R}. Multiplicando a primeira por 2: 2c + 2m = ${2 * V}. Subtraindo: 2c = ${R - 2 * V} → c = ${carros} carros e m = ${motos} motos.`,
    dif: 'm',
  })
})

mat.gerar(40, () => {
  const ps = embaralhar([6, 8, 9, 10, 12, 15, 18, 20, 24, 25, 30, 36, 40, 45]).slice(0, rnd() < 0.5 ? 2 : 3).sort((a, b) => a - b)
  const L = ps.reduce(mmc)
  if (L === ps.reduce((a, b) => a * b) || L > 720) return false
  const [nome, fem, verbo, unidade] = pick([
    ['ônibus', false, 'partem do terminal', 'minutos'],
    ['luzes', true, 'piscam', 'segundos'],
    ['remédios', false, 'devem ser tomados', 'horas'],
    ['vigilantes', false, 'dão plantão', 'dias'],
    ['máquinas', true, 'passam por manutenção', 'dias'],
  ])
  const quantos = ps.length === 3 ? 'Três' : fem ? 'Duas' : 'Dois'
  return mat.numerica({
    assunto: 'MMC e MDC',
    pergunta: `${quantos} ${nome} ${verbo} a cada ${ps.join(', ').replace(/, (?=[^,]*$)/, ' e ')} ${unidade}, respectivamente. Se isso aconteceu ao mesmo tempo agora, voltará a coincidir pela primeira vez daqui a:`,
    afirmacao: (v) => `Eventos que se repetem a cada ${ps.join(", ").replace(/, (?=[^,]*$)/, " e ")} ${unidade} e coincidem agora voltam a coincidir, pela primeira vez, daqui a ${v}.`,
    correta: L,
    erros: [ps.reduce((a, b) => a * b), ps.reduce((a, b) => a + b), ps.reduce(mdc), L / 2, L * 2],
    fmt: (v) => `${fInt(v)} ${unidade}`,
    inteiro: true,
    explicacao: `A primeira coincidência ocorre no MMC(${ps.join(', ')}) = ${L} ${unidade}.`,
    dif: 'f',
  })
})

mat.gerar(35, () => {
  const g = pick([2, 3, 4, 5, 6, 8, 10, 12, 15, 20])
  const a = g * int(2, 12)
  const b = g * int(2, 12)
  if (a === b || mdc(a, b) !== g) return false
  const pedeTotal = rnd() < 0.5
  return mat.numerica({
    assunto: 'MMC e MDC',
    pergunta: `Duas peças de tecido, com ${a} m e ${b} m, serão cortadas em pedaços iguais, do maior tamanho possível, sem sobras. ${pedeTotal ? 'Quantos pedaços serão obtidos ao todo?' : 'Qual o comprimento de cada pedaço?'}`,
    afirmacao: (v) =>
      pedeTotal
        ? `Cortando peças de ${a} m e ${b} m em pedaços iguais, do maior tamanho possível e sem sobras, obtêm-se ${v} pedaços.`
        : `Peças de ${a} m e ${b} m, cortadas em pedaços iguais do maior tamanho possível sem sobras, geram pedaços de ${v} m.`,
    correta: pedeTotal ? (a + b) / g : g,
    erros: pedeTotal ? [g, a / g, b / g, (a + b) / (g * 2)] : [mmc(a, b), g / 2, g * 2, Math.min(a, b) / 2],
    inteiro: true,
    explicacao: `O maior tamanho comum é o MDC(${a}, ${b}) = ${g} m. Pedaços: ${a}/${g} + ${b}/${g} = ${a / g} + ${b / g} = ${(a + b) / g}.`,
    dif: 'm',
  })
})

const FRACOES = [
  [[1, 3], [1, 4]],
  [[1, 4], [1, 5]],
  [[2, 5], [1, 4]],
  [[1, 2], [1, 3]],
  [[1, 3], [1, 5]],
  [[3, 8], [1, 4]],
  [[1, 5], [3, 10]],
  [[1, 6], [1, 3]],
]
mat.gerar(40, () => {
  const [[a1, b1], [a2, b2]] = pick(FRACOES)
  const den = mmc(b1, b2)
  const resto = [den - (a1 * den) / b1 - (a2 * den) / b2, den]
  const S = den * 10 * int(10, 120)
  const sobra = (S * resto[0]) / resto[1]
  return mat.numerica({
    assunto: 'Frações',
    pergunta: `Uma pessoa gastou ${a1}/${b1} do salário com aluguel e ${a2}/${b2} com alimentação, restando-lhe ${fReais(sobra)}. Qual é o seu salário?`,
    afirmacao: (v) => `Se alguém gasta ${a1}/${b1} do salário com aluguel e ${a2}/${b2} com alimentação e sobram ${fReais(sobra)}, o salário é ${v}.`,
    correta: S,
    erros: [sobra / (a1 / b1 + a2 / b2), sobra * 2, sobra * (b1 + b2) / 2, S - sobra],
    fmt: fReais,
    explicacao: `Gastos: ${a1}/${b1} + ${a2}/${b2} = ${fFrac([den - resto[0], den])}. Sobra ${fFrac(resto)} do salário. Salário = ${fReais(sobra)} ÷ ${fFrac(resto)} = ${fReais(S)}.`,
    dif: 'm',
  })
})

mat.gerar(30, () => {
  const n = [int(4, 10), int(4, 10), int(4, 10)]
  const p = [int(1, 4), int(1, 4), int(1, 4)]
  const P = p[0] + p[1] + p[2]
  const soma = n[0] * p[0] + n[1] * p[1] + n[2] * p[2]
  if ((soma * 10) % P) return false
  return mat.numerica({
    assunto: 'Média aritmética ponderada',
    pergunta: `Um aluno tirou notas ${n.join(', ').replace(/, (?=[^,]*$)/, ' e ')} em três provas com pesos ${p.join(', ').replace(/, (?=[^,]*$)/, ' e ')}, respectivamente. Sua média ponderada é:`,
    afirmacao: (v) => `Notas ${n.join(', ')} com pesos ${p.join(', ')} resultam em média ponderada ${v}.`,
    correta: soma / P,
    erros: [(n[0] + n[1] + n[2]) / 3, soma / 3, soma / (P + 1)],
    fmt: f1,
    explicacao: `Média = (${n.map((x, i) => `${x}×${p[i]}`).join(' + ')}) / (${p.join(' + ')}) = ${soma} / ${P} = ${f1(soma / P)}.`,
    dif: 'f',
  })
})

mat.gerar(30, () => {
  const a = int(4, 60)
  const P = 2 * (a + int(3, 60))
  const b = P / 2 - a
  if (b === a) return false
  return mat.numerica({
    assunto: 'Geometria plana: áreas e perímetros',
    pergunta: `Um terreno retangular tem perímetro de ${P} m, e um de seus lados mede ${a} m. Qual a área do terreno?`,
    afirmacao: (v) => `Um retângulo de perímetro ${P} m com um lado de ${a} m tem área de ${v} m².`,
    correta: a * b,
    erros: [a * (P - a), (P / 4) ** 2, P * a, a * b * 2],
    fmt: (v) => `${fInt(v)} m²`,
    inteiro: true,
    explicacao: `2(a + b) = ${P} → a + b = ${P / 2} → b = ${b} m. Área = ${a} × ${b} = ${a * b} m².`,
    dif: 'f',
  })
})

mat.gerar(25, () => {
  const b = int(3, 40)
  const h = int(3, 40)
  if ((b * h) % 2) return false
  return mat.numerica({
    assunto: 'Geometria plana: áreas e perímetros',
    pergunta: `A área de um triângulo de base ${b} cm e altura ${h} cm é:`,
    afirmacao: (v) => `Um triângulo de base ${b} cm e altura ${h} cm tem área de ${v} cm².`,
    correta: (b * h) / 2,
    erros: [b * h, (b + h) / 2, (b * h) / 3, b + h],
    fmt: (v) => `${fInt(v)} cm²`,
    inteiro: true,
    explicacao: `Área = base × altura / 2 = ${b} × ${h} / 2 = ${(b * h) / 2} cm².`,
    dif: 'f',
  })
})

mat.gerar(25, () => {
  const r = int(2, 25)
  return mat.numerica({
    assunto: 'Geometria plana: círculo',
    pergunta: `Considerando π = 3,14, a área de um círculo de raio ${r} m é:`,
    afirmacao: (v) => `Com π = 3,14, um círculo de raio ${r} m tem área de ${v} m².`,
    correta: 3.14 * r * r,
    erros: [2 * 3.14 * r, 3.14 * r, 3.14 * (2 * r) ** 2, 3.14 * r * r * 2],
    fmt: (v) => `${f2(v)} m²`,
    inteiro: false,
    explicacao: `A = π r² = 3,14 × ${r}² = 3,14 × ${r * r} = ${f2(3.14 * r * r)} m². (O comprimento da circunferência seria 2πr = ${f2(2 * 3.14 * r)} m.)`,
    dif: 'f',
  })
})

const TRIPLAS = [[3, 4, 5], [5, 12, 13], [8, 15, 17], [7, 24, 25], [20, 21, 29], [9, 40, 41]]
mat.gerar(35, () => {
  const [a0, b0, c0] = pick(TRIPLAS)
  const k = pick([1, 1, 2, 3, 4, 5])
  const [a, b, c] = [a0 * k, b0 * k, c0 * k]
  const pedeHip = rnd() < 0.5
  return mat.numerica({
    assunto: 'Teorema de Pitágoras',
    pergunta: pedeHip
      ? `Os catetos de um triângulo retângulo medem ${a} cm e ${b} cm. A hipotenusa mede:`
      : `Uma escada de ${c} m está apoiada em um muro vertical, com o pé a ${a} m da base do muro. A que altura do chão está o topo da escada?`,
    afirmacao: (v) =>
      pedeHip
        ? `Um triângulo retângulo de catetos ${a} cm e ${b} cm tem hipotenusa de ${v}.`
        : `Uma escada de ${c} m apoiada em um muro, com o pé a ${a} m da base, alcança ${v} de altura.`,
    correta: pedeHip ? c : b,
    erros: pedeHip ? [a + b, c + k, c - k, b + a / 2] : [c - a, c + a, Math.sqrt(c * c + a * a)],
    fmt: (v) => `${num(r2(v), Number.isInteger(r2(v)) ? 0 : 1)} ${pedeHip ? 'cm' : 'm'}`,
    inteiro: true,
    explicacao: pedeHip ? `h² = ${a}² + ${b}² = ${a * a} + ${b * b} = ${c * c} → h = ${c} cm.` : `${c}² = ${a}² + h² → h² = ${c * c} − ${a * a} = ${b * b} → h = ${b} m.`,
    dif: 'm',
  })
})

mat.gerar(30, () => {
  const [x, y, z] = [int(1, 6), int(1, 5), pick([0.5, 1, 1.5, 2, 2.5, 3])]
  const m3 = x * y * z
  return mat.numerica({
    assunto: 'Geometria espacial: volumes',
    pergunta: `Uma caixa-d'água em forma de paralelepípedo tem ${num(x)} m de comprimento, ${num(y)} m de largura e ${num(z, z % 1 ? 1 : 0)} m de altura. Sua capacidade, em litros, é:`,
    afirmacao: (v) => `Um reservatório de ${num(x)} m × ${num(y)} m × ${num(z, z % 1 ? 1 : 0)} m comporta ${v}.`,
    correta: m3 * 1000,
    erros: [m3 * 100, m3 * 10000, m3, (x + y + z) * 1000],
    fmt: (v) => `${fInt(v)} L`,
    inteiro: true,
    explicacao: `V = ${num(x)} × ${num(y)} × ${num(z, z % 1 ? 1 : 0)} = ${num(m3, m3 % 1 ? 1 : 0)} m³. Como 1 m³ = 1.000 L, a capacidade é ${fInt(m3 * 1000)} L.`,
    dif: 'm',
  })
})

mat.gerar(20, () => {
  const v = pick([18, 36, 54, 72, 90, 108, 126, 144])
  return mat.numerica({
    assunto: 'Sistema métrico e unidades de medida',
    pergunta: `Uma velocidade de ${v} km/h corresponde a:`,
    afirmacao: (x) => `${v} km/h equivalem a ${x}.`,
    correta: v / 3.6,
    erros: [v * 3.6, v / 60, v / 36, v / 1.8],
    fmt: (x) => `${num(r2(x), Number.isInteger(r2(x)) ? 0 : 1)} m/s`,
    inteiro: false,
    explicacao: `Para converter km/h em m/s, divide-se por 3,6: ${v} / 3,6 = ${num(v / 3.6)} m/s.`,
    dif: 'f',
  })
})

mat.gerar(25, () => {
  const h = int(6, 20)
  const m = pick([0, 10, 15, 20, 30, 40, 45, 50])
  const d = int(35, 290)
  const fim = h * 60 + m + d
  if (fim >= 23 * 60) return false
  const hora = (t) => `${Math.floor(t / 60)}h${String(Math.round(t) % 60).padStart(2, '0')}`
  return mat.numerica({
    assunto: 'Sistema métrico e unidades de medida',
    pergunta: `Uma reunião começou às ${hora(h * 60 + m)} e durou ${d} minutos. Ela terminou às:`,
    afirmacao: (v) => `Uma reunião que começou às ${hora(h * 60 + m)} e durou ${d} minutos terminou às ${v}.`,
    correta: fim,
    erros: [h * 60 + m + d - 40, h * 60 + m + d + 40, h * 60 + m + Math.floor(d / 60) * 60 + (d % 60) * 100 / 60],
    fmt: hora,
    inteiro: true,
    explicacao: `${d} minutos = ${Math.floor(d / 60)} h ${d % 60} min. ${hora(h * 60 + m)} + ${Math.floor(d / 60)} h ${d % 60} min = ${hora(fim)}.`,
    dif: 'f',
  })
})

mat.gerar(25, () => {
  const t = pick([1.5, 2, 2.5, 3, 4, 5, 6])
  const v = pick([40, 50, 60, 70, 80, 90, 100, 110])
  const d = v * t
  const tTxt = t % 1 ? `${Math.floor(t)} h 30 min` : `${t} horas`
  return mat.numerica({
    assunto: 'Velocidade média',
    pergunta: `Um veículo percorreu ${fInt(d)} km em ${tTxt}. Sua velocidade média foi de:`,
    afirmacao: (x) => `Quem percorre ${fInt(d)} km em ${tTxt} tem velocidade média de ${x}.`,
    correta: v,
    erros: [d / Math.floor(t), d / (Math.floor(t) + 0.3), v + 10, v - 10],
    fmt: (x) => `${num(r2(x), Number.isInteger(r2(x)) ? 0 : 1)} km/h`,
    inteiro: true,
    explicacao: `v = distância / tempo = ${fInt(d)} km / ${num(t, t % 1 ? 1 : 0)} h = ${v} km/h.${t % 1 ? ' Atenção: 30 min = 0,5 h, e não 0,3 h.' : ''}`,
    dif: 'f',
  })
})

mat.gerar(25, () => {
  const N = pick([50000, 100000, 200000, 250000, 500000, 1000000])
  const c = int(2, 25)
  const km = (c * N) / 100000
  return mat.numerica({
    assunto: 'Razão e proporção: escalas',
    pergunta: `Em um mapa na escala 1:${fInt(N)}, a distância entre duas cidades é de ${c} cm. A distância real é de:`,
    afirmacao: (v) => `Na escala 1:${fInt(N)}, ${c} cm no mapa correspondem a ${v} na realidade.`,
    correta: km,
    erros: [km * 10, km / 10, km * 100],
    fmt: (v) => `${num(r2(v), Number.isInteger(r2(v)) ? 0 : 1)} km`,
    inteiro: false,
    explicacao: `${c} cm × ${fInt(N)} = ${fInt(c * N)} cm = ${num(km, km % 1 ? 1 : 0)} km (1 km = 100.000 cm).`,
    dif: 'm',
  })
})

mat.gerar(30, () => {
  const f = int(3, 20)
  const k = pick([2, 3, 4])
  const n = int(3, 25)
  const p = k * f
  // daqui a n anos: p + n = j(f + n) para j inteiro
  const j = (p + n) / (f + n)
  if (!Number.isInteger(j) || j < 2 || j === k) return false
  const vezes = { 2: 'o dobro', 3: 'o triplo', 4: 'o quádruplo' }
  return mat.numerica({
    assunto: 'Problemas com equações',
    pergunta: `Hoje, a idade de um pai é ${vezes[k]} da idade do filho. Daqui a ${n} anos, será ${vezes[j]}. Qual a idade atual do filho?`,
    afirmacao: (v) => `Se a idade do pai é hoje ${vezes[k]} da do filho e daqui a ${n} anos será ${vezes[j]}, o filho tem hoje ${v} anos.`,
    correta: f,
    erros: [p, f + n, n, f * 2],
    fmt: (v) => (Math.round(v) === 1 ? "1 ano" : `${fInt(v)} anos`),
    inteiro: true,
    explicacao: `P = ${k}F e P + ${n} = ${j}(F + ${n}) → ${k}F + ${n} = ${j}F + ${j * n} → F = ${f}. O pai tem ${p} anos.`,
    dif: 'm',
  })
})

mat.gerar(40, () => {
  const a = int(2, 20)
  const b = int(2, 12)
  const c = int(2, 9)
  const d = int(1, 30)
  const e = pick([2, 3, 4, 5])
  const q = e * int(1, 10)
  const r = a + b * c - q / e + d
  return mat.numerica({
    assunto: 'Expressões numéricas',
    pergunta: `O valor da expressão ${a} + ${b} × ${c} − ${q} ÷ ${e} + ${d} é:`,
    afirmacao: (v) => `A expressão ${a} + ${b} × ${c} − ${q} ÷ ${e} + ${d} vale ${v}.`,
    correta: r,
    erros: [(((a + b) * c - q) / e) + d, (a + b) * c - q / e + d, a + b * c - q / (e + d)],
    explicacao: `Multiplicações e divisões primeiro: ${b} × ${c} = ${b * c} e ${q} ÷ ${e} = ${q / e}. Depois, da esquerda para a direita: ${a} + ${b * c} − ${q / e} + ${d} = ${r}.`,
    dif: 'f',
  })
})

/* ───────────── Matemática Financeira ───────────── */

const fin = new Arquivo('gerado-matematica-financeira.json', 'Matemática Financeira')

fin.gerar(55, () => {
  const C = 500 * int(2, 100)
  const i = pick([0.5, 1, 1.5, 2, 2.5, 3, 4, 5])
  const t = int(2, 24)
  const J = (C * i * t) / 100
  const pedeMontante = rnd() < 0.5
  return fin.numerica({
    assunto: 'Juros simples',
    pergunta: `Um capital de ${fReais(C)} foi aplicado a juros simples de ${num(i, i % 1 ? 1 : 0)}% ao mês durante ${t} meses. ${pedeMontante ? 'O montante obtido foi de:' : 'Os juros obtidos foram de:'}`,
    afirmacao: (v) => `${fReais(C)} aplicados a juros simples de ${num(i, i % 1 ? 1 : 0)}% a.m. por ${t} meses rendem ${pedeMontante ? 'montante' : 'juros'} de ${v}.`,
    correta: pedeMontante ? C + J : J,
    erros: pedeMontante ? [J, C * (1 + i / 100) ** t, C + (C * i) / 100, C + J * 2] : [C + J, (C * i) / 100, C * (1 + i / 100) ** t - C, J * 12],
    fmt: fReais,
    explicacao: `J = C · i · t = ${fReais(C)} × ${fN(i / 100)} × ${t} = ${fReais(J)}. Montante M = C + J = ${fReais(C + J)}.`,
    dif: 'f',
  })
})

fin.gerar(35, () => {
  const C = 1000 * int(1, 60)
  const iaa = pick([12, 18, 24, 30, 36, 48, 60])
  const t = int(2, 18)
  const J = (C * (iaa / 12) * t) / 100
  return fin.numerica({
    assunto: 'Juros simples',
    pergunta: `Qual o valor dos juros produzidos por ${fReais(C)} aplicados a juros simples, à taxa de ${iaa}% ao ano, durante ${t} meses?`,
    afirmacao: (v) => `${fReais(C)} a juros simples de ${iaa}% a.a. durante ${t} meses produzem ${v} de juros.`,
    correta: J,
    erros: [(C * iaa * t) / 100, (C * iaa) / 100, J + C],
    fmt: fReais,
    explicacao: `A taxa e o tempo devem estar na mesma unidade: ${iaa}% a.a. = ${num(iaa / 12, (iaa / 12) % 1 ? 1 : 0)}% a.m. (taxas proporcionais). J = ${fReais(C)} × ${fN(iaa / 1200)} × ${t} = ${fReais(J)}.`,
    dif: 'm',
  })
})

fin.gerar(30, () => {
  const C = 1000 * int(1, 50)
  const i = pick([1, 1.5, 2, 2.5, 3, 4, 5])
  const t = int(2, 20)
  const J = (C * i * t) / 100
  return fin.numerica({
    assunto: 'Juros simples',
    pergunta: `Um capital de ${fReais(C)}, aplicado a juros simples por ${t} meses, rendeu ${fReais(J)} de juros. A taxa mensal da aplicação foi de:`,
    afirmacao: (v) => `Se ${fReais(C)} renderam ${fReais(J)} de juros simples em ${t} meses, a taxa foi de ${v} ao mês.`,
    correta: i,
    erros: [(J / C) * 100, i * 12, (J / C / (t - 1)) * 100, i / 2],
    fmt: fPct,
    inteiro: false,
    explicacao: `i = J / (C · t) = ${fReais(J)} / (${fReais(C)} × ${t}) = ${fN(i / 100)} = ${fPct(i)} a.m.`,
    dif: 'm',
  })
})

fin.gerar(55, () => {
  const C = 1000 * int(1, 40)
  const i = pick([2, 3, 4, 5, 8, 10, 20])
  const t = pick([2, 2, 3, 3, 4])
  const M = C * (1 + i / 100) ** t
  const pedeJuros = rnd() < 0.4
  return fin.numerica({
    assunto: 'Juros compostos',
    pergunta: `Um capital de ${fReais(C)} foi aplicado a juros compostos de ${i}% ao mês durante ${t} meses. ${pedeJuros ? 'Os juros obtidos foram de:' : 'O montante ao final do período é de:'}`,
    afirmacao: (v) => `${fReais(C)} a juros compostos de ${i}% a.m. por ${t} meses geram ${pedeJuros ? 'juros' : 'montante'} de ${v}.`,
    correta: r2(pedeJuros ? M - C : M),
    erros: pedeJuros
      ? [(C * i * t) / 100, M, C * (1 + i / 100) ** (t - 1) - C, C * (1 + i / 100) ** (t + 1) - C]
      : [C * (1 + (i * t) / 100), C * (1 + i / 100) ** (t - 1), C * (1 + i / 100) ** (t + 1), M - C],
    fmt: fReais,
    inteiro: false,
    explicacao: `M = C(1 + i)^t = ${fReais(C)} × ${num(1 + i / 100, 2)}^${t} = ${fReais(M)}.${pedeJuros ? ` Juros = M − C = ${fReais(M - C)}.` : ''} Em juros simples, seriam ${fReais(C * (1 + (i * t) / 100))}.`,
    dif: 'm',
  })
})

fin.gerar(35, () => {
  const N = 500 * int(2, 60)
  const d = pick([1, 1.5, 2, 2.5, 3, 4, 5])
  const t = int(1, 8)
  const D = (N * d * t) / 100
  const pedeAtual = rnd() < 0.5
  return fin.numerica({
    assunto: 'Desconto simples comercial',
    pergunta: `Um título de valor nominal ${fReais(N)} foi descontado ${t} ${t === 1 ? 'mês' : 'meses'} antes do vencimento, à taxa de desconto comercial simples de ${num(d, d % 1 ? 1 : 0)}% ao mês. ${pedeAtual ? 'O valor recebido (valor atual) foi de:' : 'O valor do desconto foi de:'}`,
    afirmacao: (v) => `Um título de ${fReais(N)} descontado ${t} ${t === 1 ? 'mês' : 'meses'} antes do vencimento, a ${num(d, d % 1 ? 1 : 0)}% a.m. (desconto comercial simples), tem ${pedeAtual ? 'valor atual' : 'desconto'} de ${v}.`,
    correta: pedeAtual ? N - D : D,
    erros: pedeAtual ? [D, N + D, N / (1 + (d * t) / 100), N - D / 2] : [N - D, N - N / (1 + (d * t) / 100), (N * d) / 100, D * 2],
    fmt: fReais,
    inteiro: false,
    explicacao: `Desconto comercial (por fora): D = N · d · t = ${fReais(N)} × ${fN(d / 100)} × ${t} = ${fReais(D)}. Valor atual = N − D = ${fReais(N - D)}.`,
    dif: 'm',
  })
})

fin.gerar(25, () => {
  const i = pick([0.5, 1, 1.5, 2, 2.5, 3, 4, 5, 6])
  const [periodo, meses] = pick([['bimestral', 2], ['trimestral', 3], ['semestral', 6], ['anual', 12]])
  return fin.numerica({
    assunto: 'Taxas proporcionais e equivalentes',
    pergunta: `No regime de juros simples, a taxa ${periodo} proporcional a ${num(i, i % 1 ? 1 : 0)}% ao mês é:`,
    afirmacao: (v) => `Em juros simples, a taxa ${periodo} proporcional a ${num(i, i % 1 ? 1 : 0)}% a.m. é ${v}.`,
    correta: i * meses,
    erros: [((1 + i / 100) ** meses - 1) * 100, i * (meses - 1), i * meses * 2, i + meses],
    fmt: fPct,
    inteiro: false,
    explicacao: `Taxas proporcionais (juros simples): basta multiplicar pelo número de meses. ${num(i, i % 1 ? 1 : 0)}% × ${meses} = ${fPct(i * meses)}.`,
    dif: 'f',
  })
})

fin.gerar(20, () => {
  const i = pick([1, 2, 3, 4, 5, 10, 20])
  const [periodo, n] = pick([['bimestral', 2], ['trimestral', 3]])
  const eq = ((1 + i / 100) ** n - 1) * 100
  return fin.numerica({
    assunto: 'Taxas proporcionais e equivalentes',
    pergunta: `No regime de juros compostos, a taxa ${periodo} equivalente a ${i}% ao mês é, aproximadamente:`,
    afirmacao: (v) => `Em juros compostos, a taxa ${periodo} equivalente a ${i}% a.m. é de aproximadamente ${v}.`,
    correta: r2(eq),
    erros: [i * n, i * n - 0.5, eq + i],
    fmt: fPct,
    inteiro: false,
    explicacao: `Taxas equivalentes: (1 + i_${n === 2 ? 'b' : 't'}) = (1 + ${num(i / 100, 2)})^${n} = ${num((1 + i / 100) ** n, 4)} → ${fPct(eq)}. É maior que ${i * n}% porque os juros incidem sobre juros.`,
    dif: 'd',
  })
})

fin.gerar(30, () => {
  const custo = 10 * int(5, 200)
  const l = pick([10, 20, 25, 30, 40, 50, 60, 75, 100])
  const venda = (custo * (100 + l)) / 100
  if (!Number.isInteger(venda)) return false
  return fin.numerica({
    assunto: 'Porcentagem: lucro e prejuízo',
    pergunta: `Um comerciante comprou uma mercadoria por ${fReais(custo)} e a vendeu por ${fReais(venda)}. O lucro, em relação ao preço de custo, foi de:`,
    afirmacao: (v) => `Comprar por ${fReais(custo)} e vender por ${fReais(venda)} representa lucro de ${v} sobre o custo.`,
    correta: l,
    erros: [((venda - custo) / venda) * 100, l / 2, l + 10],
    fmt: fPct,
    inteiro: false,
    explicacao: `Lucro = ${fReais(venda - custo)}. Sobre o custo: ${fReais(venda - custo)} / ${fReais(custo)} = ${fPct(l)}. Sobre a venda seria ${fPct(((venda - custo) / venda) * 100)}.`,
    dif: 'm',
  })
})

/* ───────────── Raciocínio Lógico (cálculo) ───────────── */

const rl = new Arquivo('gerado-raciocinio-logico.json', 'Raciocínio Lógico')

const PALAVRAS = ['AMOR', 'PRATO', 'LIVRO', 'CAMPO', 'PODER', 'PROVA', 'CONTAS', 'BRASIL', 'FUTEBOL', 'NUVEM', 'GATO', 'PEDRA', 'LOUCA', 'VIRTUDE', 'CARTEIRO', 'ESCOLA', 'ARARA', 'BANANA', 'CASA', 'PAPEL', 'CARRO', 'OVO', 'SAPATO', 'CABANA', 'PIPOCA', 'MARACA', 'TATU', 'ELEFANTE', 'CONCURSO', 'APROVADO']
for (const p of PALAVRAS) {
  const cont = {}
  for (const ch of p) cont[ch] = (cont[ch] || 0) + 1
  const reps = Object.entries(cont).filter(([, n]) => n > 1)
  const total = fat(p.length) / reps.reduce((a, [, n]) => a * fat(n), 1)
  rl.numerica({
    assunto: 'Análise combinatória: permutações',
    pergunta: `Quantos anagramas tem a palavra ${p}?`,
    afirmacao: (v) => `A palavra ${p} possui ${v} anagramas.`,
    correta: total,
    erros: [fat(p.length), total / 2, total * 2, fat(p.length - 1)],
    explicacao: reps.length
      ? `${p.length} letras, com repetição de ${reps.map(([l, n]) => `${l} (${n}×)`).join(', ')}: ${p.length}! / ${reps.map(([, n]) => `${n}!`).join('·')} = ${fInt(total)}.`
      : `${p.length} letras distintas: ${p.length}! = ${fInt(total)}.`,
    dif: reps.length ? 'm' : 'f',
  })
}

rl.gerar(40, () => {
  const n = int(5, 14)
  const k = int(2, Math.min(5, n - 2))
  const ordem = rnd() < 0.4
  const val = ordem ? fat(n) / fat(n - k) : comb(n, k)
  const cargos = ['presidente', 'vice-presidente', 'secretário', 'tesoureiro', 'diretor']
  return rl.numerica({
    assunto: ordem ? 'Análise combinatória: arranjos' : 'Análise combinatória: combinações',
    pergunta: ordem
      ? `De um grupo de ${n} pessoas, quantas maneiras há de escolher ${k} pessoas para ocupar os cargos de ${cargos.slice(0, k).join(', ').replace(/, (?=[^,]*$)/, ' e ')}?`
      : `De um grupo de ${n} pessoas, quantas comissões diferentes de ${k} pessoas podem ser formadas?`,
    afirmacao: (v) =>
      ordem ? `Há ${v} maneiras de preencher ${k} cargos distintos escolhendo entre ${n} pessoas.` : `Com ${n} pessoas, é possível formar ${v} comissões distintas de ${k} pessoas.`,
    correta: val,
    erros: ordem ? [comb(n, k), n * k, n ** k] : [fat(n) / fat(n - k), n * k, comb(n, k - 1)],
    explicacao: ordem
      ? `A ordem importa (cargos distintos): arranjo A(${n},${k}) = ${Array.from({ length: k }, (_, i) => n - i).join(' × ')} = ${fInt(val)}.`
      : `A ordem não importa: combinação C(${n},${k}) = ${n}! / (${k}!·${n - k}!) = ${fInt(val)}.`,
    dif: 'm',
  })
})

rl.gerar(25, () => {
  const H = int(4, 9)
  const M = int(3, 8)
  const a = int(1, 3)
  const b = int(1, 3)
  if (a > H || b > M) return false
  const val = comb(H, a) * comb(M, b)
  return rl.numerica({
    assunto: 'Análise combinatória: combinações',
    pergunta: `Um grupo tem ${H} homens e ${M} mulheres. Quantas comissões podem ser formadas com ${a} ${a === 1 ? 'homem' : 'homens'} e ${b} ${b === 1 ? 'mulher' : 'mulheres'}?`,
    afirmacao: (v) => `Com ${H} homens e ${M} mulheres, podem ser formadas ${v} comissões de ${a} homem(ns) e ${b} mulher(es).`,
    correta: val,
    erros: [comb(H, a) + comb(M, b), comb(H + M, a + b), H * M],
    explicacao: `Escolhem-se os homens e as mulheres de forma independente: C(${H},${a}) × C(${M},${b}) = ${comb(H, a)} × ${comb(M, b)} = ${fInt(val)}.`,
    dif: 'm',
  })
})

rl.gerar(25, () => {
  const n = int(4, 30)
  const val = comb(n, 2)
  const inverso = rnd() < 0.5
  return rl.numerica({
    assunto: 'Análise combinatória: combinações',
    pergunta: inverso
      ? `Em uma reunião, cada participante apertou a mão de todos os outros exatamente uma vez, num total de ${val} apertos de mão. Quantas pessoas participaram?`
      : `Em uma reunião com ${n} pessoas, cada uma apertou a mão de todas as outras exatamente uma vez. Quantos apertos de mão ocorreram?`,
    afirmacao: (v) => (inverso ? `Se houve ${val} apertos de mão, cada par cumprimentando-se uma vez, havia ${v} pessoas.` : `${n} pessoas que se cumprimentam uma única vez entre si dão ${v} apertos de mão.`),
    correta: inverso ? n : val,
    erros: inverso ? [n + 1, n - 1, Math.round(val / 2)] : [n * (n - 1), n * n, val + n],
    explicacao: `Cada aperto envolve um par: C(n,2) = n(n − 1)/2. Com n = ${n}: ${n} × ${n - 1} / 2 = ${val}.`,
    dif: 'm',
  })
})

const CORES = ['brancas', 'pretas', 'vermelhas', 'azuis', 'verdes']
rl.gerar(45, () => {
  const [c1, c2, c3] = embaralhar(CORES)
  const q = [int(1, 9), int(1, 9), int(1, 9)]
  const T = q[0] + q[1] + q[2]
  const duas = rnd() < 0.4
  const fr = duas ? [q[0] * (q[0] - 1), T * (T - 1)] : [q[0], T]
  if (fr[0] === 0) return false
  const v = fr[0] / fr[1]
  return rl.numerica({
    assunto: 'Probabilidade',
    pergunta: duas
      ? `Uma urna contém ${q[0]} bolas ${c1}, ${q[1]} ${c2} e ${q[2]} ${c3}. Retirando-se duas bolas, sucessivamente e sem reposição, qual a probabilidade de ambas serem ${c1}?`
      : `Uma urna contém ${q[0]} bolas ${c1}, ${q[1]} ${c2} e ${q[2]} ${c3}. Retirando-se uma bola ao acaso, qual a probabilidade de ela ser ${c1.slice(0, -1)}?`,
    afirmacao: (s) =>
      duas
        ? `Numa urna com ${q[0]} bolas ${c1}, ${q[1]} ${c2} e ${q[2]} ${c3}, a probabilidade de tirar duas ${c1} seguidas, sem reposição, é ${s}.`
        : `Numa urna com ${q[0]} bolas ${c1}, ${q[1]} ${c2} e ${q[2]} ${c3}, a probabilidade de tirar uma ${c1.slice(0, -1)} é ${s}.`,
    correta: v,
    erros: duas
      ? [(q[0] / T) ** 2, q[0] / T, (q[0] * (q[0] - 1)) / (T * T), (2 * q[0] - 1) / (2 * T - 1), ((q[0] - 1) / (T - 1)) ** 2, (q[0] + 1) * q[0] / (T * (T - 1))]
      : [q[0] / (T - q[0]), 1 - q[0] / T, q[1] / T, q[2] / T, (q[0] + 1) / T, (q[0] - 1) / T, q[0] / (T + 1), 1 / 3, 1 / q[0]],
    fmt: fFracDe,
    inteiro: false,
    variar: false,
    max: 1,
    explicacao: duas
      ? `P = ${q[0]}/${T} × ${q[0] - 1}/${T - 1} = ${fFrac(fr)}. Sem reposição, o total e as favoráveis diminuem na segunda retirada.`
      : `Casos favoráveis / casos possíveis = ${q[0]}/${T} = ${fFrac(fr)}.`,
    dif: duas ? 'm' : 'f',
  })
})

const somasDados = Array.from({ length: 13 }, (_, s) => {
  let c = 0
  for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) if (a + b === s) c++
  return c
})
for (let s = 2; s <= 12; s++) {
  for (const tipo of ['igual', 'maior']) {
    if (tipo === 'maior' && (s < 4 || s > 11)) continue
    const fav = tipo === 'igual' ? somasDados[s] : somasDados.slice(s + 1).reduce((a, b) => a + b, 0)
    rl.numerica({
      assunto: 'Probabilidade',
      pergunta: `Lançando-se dois dados honestos de seis faces, qual a probabilidade de a soma dos resultados ser ${tipo === 'igual' ? `igual a ${s}` : `maior que ${s}`}?`,
      afirmacao: (v) => `No lançamento de dois dados, a probabilidade de a soma ser ${tipo === 'igual' ? `igual a ${s}` : `maior que ${s}`} é ${v}.`,
      correta: fav / 36,
      erros: [(fav + 1) / 36, (fav - 1) / 36, (fav + 2) / 36, (fav - 2) / 36, (fav + 3) / 36, fav / 12, 1 / 11, 1 / 6],
      fmt: fFracDe,
      inteiro: false,
      variar: false,
      max: 1,
      explicacao: `São 36 resultados possíveis. Pares favoráveis: ${fav}. P = ${fav}/36${fFrac([fav, 36]) === `${fav}/36` ? "" : ` = ${fFrac([fav, 36])}`}.`,
      dif: 'm',
    })
  }
}

rl.gerar(40, () => {
  const a1 = int(-10, 30)
  const r = pick([2, 3, 4, 5, 6, 7, 9, 10, 12, -3, -4])
  const n = int(8, 60)
  const an = a1 + (n - 1) * r
  const pedeSoma = rnd() < 0.4
  const S = ((a1 + an) * n) / 2
  if (pedeSoma && S <= 0) return false
  if (!pedeSoma && an <= 0) return false
  const seq = [a1, a1 + r, a1 + 2 * r].join(', ')
  return rl.numerica({
    assunto: 'Sequências: progressão aritmética',
    pergunta: pedeSoma ? `A soma dos ${n} primeiros termos da progressão aritmética (${seq}, ...) é:` : `O ${n}º termo da progressão aritmética (${seq}, ...) é:`,
    afirmacao: (v) => (pedeSoma ? `A soma dos ${n} primeiros termos da PA (${seq}, ...) é ${v}.` : `O ${n}º termo da PA (${seq}, ...) é ${v}.`),
    correta: pedeSoma ? S : an,
    erros: pedeSoma ? [((a1 + an) * (n - 1)) / 2, (a1 + an) * n, an * n] : [a1 + n * r, a1 + (n - 2) * r, n * r],
    explicacao: `Razão r = ${r}. aₙ = a₁ + (n − 1)r = ${a1} + ${n - 1} × ${r} = ${an}.${pedeSoma ? ` Sₙ = (a₁ + aₙ)·n/2 = (${a1} + ${an}) × ${n} / 2 = ${fInt(S)}.` : ''}`,
    dif: 'm',
  })
})

rl.gerar(25, () => {
  const a1 = int(1, 6)
  const q = pick([2, 3, 4, 5])
  const n = int(4, q === 2 ? 12 : 7)
  const an = a1 * q ** (n - 1)
  const seq = [a1, a1 * q, a1 * q * q].join(', ')
  return rl.numerica({
    assunto: 'Sequências: progressão geométrica',
    pergunta: `O ${n}º termo da progressão geométrica (${seq}, ...) é:`,
    afirmacao: (v) => `O ${n}º termo da PG (${seq}, ...) é ${v}.`,
    correta: an,
    erros: [a1 * q ** n, a1 * q ** (n - 2), a1 + (n - 1) * q, a1 * q * n],
    explicacao: `Razão q = ${q}. aₙ = a₁ · q^(n−1) = ${a1} × ${q}^${n - 1} = ${fInt(an)}.`,
    dif: 'm',
  })
})

rl.gerar(40, () => {
  const ab = int(2, 40)
  const a = ab + int(3, 80)
  const b = ab + int(3, 80)
  const nenhum = int(0, 30)
  const total = a + b - ab + nenhum
  const tipo = pick(['uniao', 'total', 'ambos'])
  const [x, y] = pick([['futebol', 'vôlei'], ['inglês', 'espanhol'], ['jornal A', 'jornal B'], ['café', 'chá'], ['Português', 'Matemática']])
  const pergunta = {
    uniao: `Em uma pesquisa, ${a} pessoas disseram gostar de ${x}, ${b} de ${y} e ${ab} de ambos. Quantas pessoas gostam de pelo menos um dos dois?`,
    total: `Em uma pesquisa, ${a} pessoas gostam de ${x}, ${b} de ${y}, ${ab} de ambos e ${nenhum} de nenhum dos dois. Quantas pessoas foram entrevistadas?`,
    ambos: `Em um grupo de ${total} pessoas, ${a} gostam de ${x}, ${b} de ${y} e ${nenhum} não gostam de nenhum dos dois. Quantas gostam de ambos?`,
  }[tipo]
  const correta = { uniao: a + b - ab, total, ambos: ab }[tipo]
  if (correta <= 0) return false
  return rl.numerica({
    assunto: 'Conjuntos',
    pergunta,
    correta,
    erros: [a + b, a + b + nenhum, Math.abs(a - b), correta + ab],
    explicacao: `n(A ∪ B) = n(A) + n(B) − n(A ∩ B) = ${a} + ${b} − ${ab} = ${a + b - ab}.${tipo !== 'uniao' ? ` Somando os ${nenhum} que não gostam de nenhum, o total é ${total}.` : ''}`,
    dif: tipo === 'ambos' ? 'm' : 'f',
  })
})

const DIAS = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado']
rl.gerar(30, () => {
  const hoje = int(0, 6)
  const n = int(15, 400)
  const alvo = (hoje + n) % 7
  return rl.texto({
    assunto: 'Raciocínio sequencial: calendário',
    pergunta: `Se hoje é ${DIAS[hoje]}, que dia da semana será daqui a ${n} dias?`,
    correta: DIAS[alvo],
    distratores: [1, 2, 3, 4, 5, 6].map((k) => DIAS[(alvo + k) % 7]),
    explicacao: `A semana se repete a cada 7 dias: ${n} = 7 × ${Math.floor(n / 7)} + ${n % 7}. Basta avançar ${n % 7} dia(s) a partir de ${DIAS[hoje]}: ${DIAS[alvo]}.`,
    dif: 'f',
  })
})

/* ───────────── Estatística ───────────── */

const est = new Arquivo('gerado-estatistica.json', 'Estatística')
const lista = (n, a, b) => Array.from({ length: n }, () => int(a, b))

est.gerar(40, () => {
  const xs = lista(int(5, 8), 1, 30)
  const s = xs.reduce((a, b) => a + b, 0)
  if ((s * 10) % xs.length) return false
  const ord = [...xs].sort((a, b) => a - b)
  return est.numerica({
    assunto: 'Medidas de tendência central: média',
    pergunta: `A média aritmética dos valores ${xs.join(', ')} é:`,
    afirmacao: (v) => `A média aritmética de ${xs.join(', ')} é ${v}.`,
    correta: s / xs.length,
    erros: [s / (xs.length - 1), s / (xs.length + 1), ord[Math.floor(ord.length / 2)]],
    fmt: f1,
    inteiro: false,
    explicacao: `Soma = ${s}; quantidade = ${xs.length}. Média = ${s} / ${xs.length} = ${f1(s / xs.length)}.`,
    dif: 'f',
  })
})

est.gerar(40, () => {
  const xs = lista(int(5, 10), 1, 50)
  const ord = [...xs].sort((a, b) => a - b)
  const n = ord.length
  const med = n % 2 ? ord[(n - 1) / 2] : (ord[n / 2 - 1] + ord[n / 2]) / 2
  return est.numerica({
    assunto: 'Medidas de tendência central: mediana',
    pergunta: `A mediana do conjunto de dados ${xs.join(', ')} é:`,
    afirmacao: (v) => `A mediana de ${xs.join(', ')} é ${v}.`,
    correta: med,
    erros: [xs[Math.floor(n / 2)], xs.reduce((a, b) => a + b, 0) / n, ord[Math.floor(n / 2) + 1], ord[Math.floor(n / 2) - 1]],
    fmt: (v) => num(r2(v), Number.isInteger(r2(v)) ? 0 : 1),
    inteiro: false,
    explicacao: `Em ordem: ${ord.join(', ')}. Com ${n} valores, a mediana é ${n % 2 ? `o termo central (${(n + 1) / 2}º)` : `a média dos dois centrais (${ord[n / 2 - 1]} e ${ord[n / 2]})`} = ${num(med, med % 1 ? 1 : 0)}. É preciso ordenar antes.`,
    dif: 'f',
  })
})

est.gerar(30, () => {
  const moda = int(1, 20)
  const xs = embaralhar([moda, moda, moda, ...lista(int(3, 6), 1, 20)])
  const cont = {}
  xs.forEach((x) => (cont[x] = (cont[x] || 0) + 1))
  const max = Math.max(...Object.values(cont))
  if (Object.values(cont).filter((c) => c === max).length > 1 || cont[moda] !== max) return false
  return est.numerica({
    assunto: 'Medidas de tendência central: moda',
    pergunta: `A moda do conjunto ${xs.join(', ')} é:`,
    afirmacao: (v) => `A moda de ${xs.join(', ')} é ${v}.`,
    correta: moda,
    erros: [Math.max(...xs), Math.min(...xs), xs.length, Math.round(xs.reduce((a, b) => a + b, 0) / xs.length)],
    inteiro: true,
    explicacao: `Moda é o valor mais frequente: ${moda} aparece ${cont[moda]} vezes.`,
    dif: 'f',
  })
})

est.gerar(30, () => {
  const xs = lista(int(5, 9), 2, 99)
  const amp = Math.max(...xs) - Math.min(...xs)
  if (!amp) return false
  return est.numerica({
    assunto: 'Medidas de dispersão',
    pergunta: `A amplitude total do conjunto ${xs.join(', ')} é:`,
    afirmacao: (v) => `A amplitude total de ${xs.join(', ')} é ${v}.`,
    correta: amp,
    erros: [Math.max(...xs), xs[xs.length - 1] - xs[0], Math.max(...xs) + Math.min(...xs)],
    inteiro: true,
    explicacao: `Amplitude = maior − menor = ${Math.max(...xs)} − ${Math.min(...xs)} = ${amp}.`,
    dif: 'f',
  })
})

est.gerar(35, () => {
  const n = pick([4, 5])
  const xs = lista(n, 1, 20)
  const s = xs.reduce((a, b) => a + b, 0)
  if (s % n) return false
  const m = s / n
  const sq = xs.reduce((a, x) => a + (x - m) ** 2, 0)
  const varP = sq / n
  if (!sq) return false
  const pedeDp = Number.isInteger(Math.sqrt(varP)) && rnd() < 0.6
  return est.numerica({
    assunto: 'Medidas de dispersão',
    pergunta: `${pedeDp ? 'O desvio padrão' : 'A variância'} populacional do conjunto ${xs.join(', ')} é:`,
    afirmacao: (v) => `${pedeDp ? 'O desvio padrão' : 'A variância'} populacional de ${xs.join(', ')} é ${v}.`,
    correta: pedeDp ? Math.sqrt(varP) : varP,
    erros: pedeDp ? [varP, Math.sqrt(sq / (n - 1)), m] : [sq / (n - 1), Math.sqrt(varP), sq],
    fmt: (v) => num(r2(v), Number.isInteger(r2(v)) ? 0 : 2),
    inteiro: false,
    explicacao: `Média = ${m}. Desvios ao quadrado: ${xs.map((x) => (x - m) ** 2).join(' + ')} = ${sq}. Variância populacional = ${sq} / ${n} = ${num(r2(varP), Number.isInteger(varP) ? 0 : 2)}.${pedeDp ? ` Desvio padrão = √${num(varP)} = ${Math.sqrt(varP)}.` : ''}`,
    dif: 'd',
  })
})

est.gerar(30, () => {
  const n = int(4, 12)
  const m1 = int(5, 30)
  const m2 = m1 + pick([-3, -2, -1, 1, 2, 3, 4])
  const x = (n + 1) * m2 - n * m1
  if (x <= 0) return false
  return est.numerica({
    assunto: 'Medidas de tendência central: média',
    pergunta: `A média aritmética de ${n} números é ${m1}. Acrescentando-se um novo número ao conjunto, a média passa a ser ${m2}. O número acrescentado é:`,
    afirmacao: (v) => `Se a média de ${n} números é ${m1} e, com um novo número, passa a ${m2}, o número acrescentado é ${v}.`,
    correta: x,
    erros: [m2 + (m2 - m1), m2, n * m2 - n * m1, Math.abs(m2 - m1) * n],
    inteiro: true,
    explicacao: `Soma inicial = ${n} × ${m1} = ${n * m1}. Nova soma = ${n + 1} × ${m2} = ${(n + 1) * m2}. Número acrescentado = ${(n + 1) * m2} − ${n * m1} = ${x}.`,
    dif: 'm',
  })
})

est.gerar(25, () => {
  const total = pick([20, 25, 40, 50, 80, 120, 200, 250, 400])
  const f = int(1, total - 1)
  const fr = (f / total) * 100
  if (Math.round(fr * 100) % 100 && Math.round(fr * 10) % 5) return false
  return est.numerica({
    assunto: 'Distribuição de frequências',
    pergunta: `Em uma turma de ${total} alunos, ${f} foram aprovados em todas as disciplinas. A frequência relativa desse grupo é:`,
    afirmacao: (v) => `${f} aprovados em ${total} alunos correspondem a frequência relativa de ${v}.`,
    correta: fr,
    erros: [(f / (total - f)) * 100, 100 - fr, f],
    max: 100,
    fmt: fPct,
    inteiro: false,
    explicacao: `Frequência relativa = frequência absoluta / total = ${f} / ${total} = ${fPct(fr)}.`,
    dif: 'f',
  })
})

/* ───────────── gravação ───────────── */

const dir = join(process.cwd(), 'data', 'questoes')
for (const arq of [mat, fin, rl, est]) {
  await writeFile(join(dir, arq.nome), serializarArquivo({ disciplina: arq.disciplina, assuntos: arq.assuntos }), 'utf8')
  console.log(`${arq.nome}: ${arq.total} questões`)
}
