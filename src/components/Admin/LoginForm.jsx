import { useState } from 'react'
import { useAdminStore } from '../../store/adminStore'

export default function LoginForm() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const { setToken } = useAdminStore()

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!password.trim()) return

    setError('')
    setToken(password)
    // Token will be stored in sessionStorage and Zustand
    // If incorrect, admin operations will fail with 401
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSubmit(e)
  }

  return (
    <div className="w-full max-w-md px-5">
      <div className="bg-surface border border-border rounded-2xl p-9">
        <h2 className="font-syne text-xl font-black mb-1">Acesso restrito</h2>
        <p className="text-muted text-sm mb-6">
          Entre com a senha de administrador.
        </p>

        <div className="mb-4">
          <label className="block text-xs font-semibold uppercase tracking-widest text-muted mb-2">
            Senha
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="••••••••"
            autoComplete="current-password"
            className="w-full bg-bg border border-border rounded-xl px-4 py-3 text-sm text-text outline-none focus:border-accent transition placeholder:text-muted"
          />
        </div>

        {error && (
          <div className="mb-4 p-3 bg-error/10 border border-error/25 rounded-lg text-xs text-error">
            {error}
          </div>
        )}

        <button
          onClick={handleSubmit}
          className="w-full py-3 bg-gradient-to-r from-accent to-accent2 text-white text-sm font-semibold rounded-xl hover:opacity-90 active:scale-95 transition"
        >
          Entrar
        </button>
      </div>
    </div>
  )
}
