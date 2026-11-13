import { useEffect, useState } from 'react'
import { useEstudosStore } from '../../store/estudosStore'

export const formatRelogio = (seg) => {
  const h = Math.floor(seg / 3600)
  const m = Math.floor((seg % 3600) / 60)
  const s = seg % 60
  const p = (n) => String(n).padStart(2, '0')
  return h ? `${h}:${p(m)}:${p(s)}` : `${p(m)}:${p(s)}`
}

/** Lê o cronômetro global e atualiza a cada meio segundo enquanto roda */
export function useTimer() {
  const timer = useEstudosStore((s) => s.timer)
  const [agora, setAgora] = useState(Date.now())
  const rodando = timer.inicio !== null

  useEffect(() => {
    if (!rodando) return
    setAgora(Date.now())
    const t = setInterval(() => setAgora(Date.now()), 500)
    return () => clearInterval(t)
  }, [rodando])

  const segundos = Math.max(0, Math.floor((timer.acumulado + (rodando ? agora - timer.inicio : 0)) / 1000))
  const metaSeg = (timer.metaMin || 0) * 60
  return {
    timer,
    rodando,
    segundos,
    atingiuMeta: metaSeg > 0 && segundos >= metaSeg,
    restante: metaSeg > 0 ? Math.max(0, metaSeg - segundos) : null,
  }
}
