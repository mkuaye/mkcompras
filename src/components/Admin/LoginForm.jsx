import { useState } from 'react'
import { useAdminStore } from '../../store/adminStore'
import { getAnalytics } from '../../api/client'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Alert from '@mui/material/Alert'

export default function LoginForm() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { setToken } = useAdminStore()

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!password.trim()) return

    setError('')
    setLoading(true)
    try {
      await getAnalytics(password)
      setToken(password)
    } catch (err) {
      if (err.response?.status === 401) {
        setError('Senha incorreta.')
      } else {
        // Sem servidor (dev sem API) — armazena e deixa operações falharem individualmente
        setToken(password)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box sx={{ width: '100%', maxWidth: 440, px: 2.5 }}>
      <Paper sx={{ p: 4.5, borderRadius: 3 }}>
        <Typography variant="h6" fontFamily="Syne, sans-serif" fontWeight={900} mb={0.5}>
          Acesso restrito
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={3}>
          Entre com a senha de administrador.
        </Typography>

        <TextField
          type="password"
          label="Senha"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit(e)}
          placeholder="••••••••"
          autoComplete="current-password"
          fullWidth
          sx={{ mb: 2 }}
        />

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Button
          onClick={handleSubmit}
          disabled={loading}
          variant="contained"
          fullWidth
          sx={{
            py: 1.5,
            background: 'linear-gradient(to right, var(--accent), var(--accent2))',
            '&:hover': { opacity: 0.9, background: 'linear-gradient(to right, var(--accent), var(--accent2))' },
            '&.Mui-disabled': { opacity: 0.6, background: 'linear-gradient(to right, var(--accent), var(--accent2))' },
            borderRadius: 2.5,
          }}
        >
          {loading ? 'Verificando...' : 'Entrar'}
        </Button>
      </Paper>
    </Box>
  )
}
