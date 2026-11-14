import { useRef, useState } from 'react'
import { useEstudosStore, diaKey } from '../../../store/estudosStore'
import { lerVarios, salvarVarios } from '../../../store/estudosArquivos'
import { Botao, Card, CardTitulo, PageHeader, confirmar } from '../ui'

export default function Dados() {
  const store = useEstudosStore()
  const { exportar, importar, resetar } = store
  const arquivo = useRef(null)
  const [msg, setMsg] = useState(null)

  const baixar = async () => {
    const dados = exportar()
    // Texto das aulas e materiais fica no IndexedDB; PDFs ficam de fora para o arquivo não ficar enorme
    let conteudos = {}
    try {
      conteudos = await lerVarios(dados.materiais.filter((m) => m.tipo === 'aula' || m.tipo === 'texto').map((m) => m.id))
    } catch {
      setMsg({ ok: false, texto: 'Não foi possível ler as aulas salvas; o backup sairá sem o texto delas.' })
    }
    const blob = new Blob([JSON.stringify({ ...dados, conteudos }, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `estudos-backup-${diaKey()}.json`
    a.click()
    URL.revokeObjectURL(url)
    setMsg({ ok: true, texto: 'Backup baixado.' })
  }

  const carregar = async (e) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    try {
      const dados = JSON.parse(await f.text())
      if (!confirmar('Importar este backup vai SUBSTITUIR todos os dados atuais. Continuar?')) return
      if (dados.conteudos) await salvarVarios(dados.conteudos)
      importar(dados)
      setMsg({ ok: true, texto: `Backup importado: ${dados.concursos.length} concurso(s).` })
    } catch (err) {
      setMsg({ ok: false, texto: `Não foi possível importar: ${err.message}` })
    }
  }

  const contagens = [
    ['Concursos', store.concursos.length],
    ['Disciplinas', store.disciplinas.length],
    ['Tópicos', store.topicos.length],
    ['Sessões', store.sessoes.length],
    ['Lançamentos de questões', store.questoes.length],
    ['Revisões', store.revisoes.length],
    ['Simulados', store.simulados.length],
    ['Flashcards', store.flashcards.length],
    ['Anotações', store.notas.length],
    ['Aulas e materiais', store.materiais.length],
    ['Questões da sala de estudo', store.exercicios.length],
    ['Dúvidas com o tutor', store.duvidas.length],
  ]

  return (
    <div>
      <PageHeader
        titulo="Backup e dados"
        descricao="Seus dados ficam salvos somente neste navegador. Faça backups periódicos e use a importação para levar tudo para outro computador ou celular. O backup inclui as aulas e os textos; PDFs anexados ficam só neste navegador."
      />
      {msg && <div className={`mb-4 text-sm px-4 py-3 rounded-xl border ${msg.ok ? 'border-success text-success' : 'border-error text-error'}`}>{msg.texto}</div>}
      <div className="grid md:grid-cols-2 gap-5">
        <Card className="p-5 flex flex-col gap-3">
          <CardTitulo>Exportar / importar</CardTitulo>
          <Botao onClick={baixar}>⇩ Baixar backup (.json)</Botao>
          <Botao variante="secundario" onClick={() => arquivo.current?.click()}>⇧ Importar backup</Botao>
          <input ref={arquivo} type="file" accept="application/json,.json" className="hidden" onChange={carregar} />
          <div className="border-t border-border pt-3 mt-2">
            <Botao
              variante="perigo"
              className="w-full"
              onClick={() => confirmar('Apagar TODOS os dados de estudo deste navegador? Faça um backup antes.') && confirmar('Tem certeza absoluta?') && resetar()}
            >
              Apagar todos os dados
            </Botao>
          </div>
        </Card>
        <Card className="p-5">
          <CardTitulo>O que está salvo</CardTitulo>
          {contagens.map(([k, v]) => (
            <div key={k} className="flex justify-between text-sm py-1.5 border-t border-border first:border-t-0">
              <span className="text-muted">{k}</span>
              <strong>{v}</strong>
            </div>
          ))}
        </Card>
      </div>
    </div>
  )
}
