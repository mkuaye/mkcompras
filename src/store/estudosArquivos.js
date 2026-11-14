import { useCallback, useEffect, useState } from 'react'

/**
 * Conteúdo pesado dos materiais (texto das aulas e PDFs) fica no IndexedDB do navegador,
 * fora do localStorage, que tem limite de ~5 MB. O store guarda só os metadados.
 */

const DB = 'mk_estudos_arquivos'
const STORE = 'itens'
let conexao = null

function abrir() {
  if (conexao) return conexao
  conexao = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => {
      conexao = null
      reject(req.error)
    }
  })
  return conexao
}

async function transacao(modo, fn) {
  const db = await abrir()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, modo)
    const resultado = fn(tx.objectStore(STORE))
    tx.oncomplete = () => resolve(resultado?.result)
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error || new Error('Transação cancelada (talvez falte espaço no navegador).'))
  })
}

export const salvarArquivo = (id, valor) => transacao('readwrite', (s) => s.put(valor, id))
export const lerArquivo = (id) => transacao('readonly', (s) => s.get(id))
export const apagarArquivos = (ids) => (ids.length ? transacao('readwrite', (s) => ids.forEach((id) => s.delete(id))) : Promise.resolve())
export const apagarTodosArquivos = () => transacao('readwrite', (s) => s.clear())

export async function lerVarios(ids) {
  const out = {}
  for (const id of ids) {
    const v = await lerArquivo(id)
    if (v !== undefined) out[id] = v
  }
  return out
}

export const salvarVarios = (mapa) =>
  transacao('readwrite', (s) => Object.entries(mapa || {}).forEach(([id, v]) => typeof v === 'string' && s.put(v, id)))

/** Lê (e permite salvar) o texto de um material. */
export function useConteudo(id) {
  const [estado, setEstado] = useState({ id: null, valor: '', carregando: true })

  useEffect(() => {
    let ativo = true
    if (!id) {
      setEstado({ id: null, valor: '', carregando: false })
      return
    }
    setEstado((e) => ({ ...e, carregando: true }))
    lerArquivo(id)
      .then((v) => ativo && setEstado({ id, valor: typeof v === 'string' ? v : '', carregando: false }))
      .catch(() => ativo && setEstado({ id, valor: '', carregando: false }))
    return () => {
      ativo = false
    }
  }, [id])

  const salvar = useCallback(
    async (valor) => {
      await salvarArquivo(id, valor)
      setEstado({ id, valor, carregando: false })
    },
    [id]
  )

  return { conteudo: estado.id === id ? estado.valor : '', carregando: estado.carregando || estado.id !== id, salvar }
}
