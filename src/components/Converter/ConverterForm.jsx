import { useState } from 'react'
import { useConvert } from '../../hooks/useConvert'
import Box from '@mui/material/Box'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'

export default function ConverterForm({ onSuccess, onError, onReset }) {
  const [url, setUrl] = useState('')
  const { convert, loading } = useConvert()

  const handleConvert = async () => {
    const trimmed = url.trim()
    if (!trimmed) {
      onError('Cole um link antes de converter.')
      return
    }

    let affiliateUrl
    try {
      affiliateUrl = await convert(trimmed)
    } catch {
      onError('Não foi possível converter este link.')
      return
    }

    try {
      window.open(affiliateUrl, '_blank', 'noopener,noreferrer')
    } catch {
      // popup blocked by browser/extension; the link is still shown to the user
    }

    try {
      await navigator.clipboard.writeText(affiliateUrl)
    } catch {
      // clipboard access is best-effort; the link is still shown/opened
    }

    onSuccess(affiliateUrl)
    setUrl('')
  }

  return (
    <>
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 1.5 }}>
        <TextField
          type="url"
          label="Link do produto"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleConvert()}
          placeholder="https://shopee.com.br/produto..."
          fullWidth
          size="medium"
        />
        <Button
          onClick={handleConvert}
          disabled={loading}
          variant="contained"
          sx={{
            whiteSpace: 'nowrap',
            px: 4,
            py: 1.75,
            background: 'linear-gradient(to right, var(--accent), var(--accent2))',
            '&:hover': { opacity: 0.9, background: 'linear-gradient(to right, var(--accent), var(--accent2))' },
            '&.Mui-disabled': { opacity: 0.5, background: 'linear-gradient(to right, var(--accent), var(--accent2))' },
            minWidth: { xs: '100%', sm: 140 },
          }}
          startIcon={loading ? <CircularProgress size={16} color="inherit" /> : null}
        >
          {loading ? 'Convertendo...' : 'Converter'}
        </Button>
      </Box>
    </>
  )
}
