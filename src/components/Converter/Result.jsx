import { useState, useEffect } from 'react'
import Box from '@mui/material/Box'
import Alert from '@mui/material/Alert'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Collapse from '@mui/material/Collapse'

export default function Result({ result, lastLink }) {
  const [copied, setCopied] = useState(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    setVisible(true)
  }, [])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(lastLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      alert(`Copie manualmente: ${lastLink}`)
    }
  }

  if (result.type === 'success') {
    return (
      <Collapse in={visible}>
        <Box sx={{ mt: 2.5 }}>
          <Typography variant="caption" color="success.main" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: 2, display: 'block', mb: 1 }}>
            Link de afiliado gerado
          </Typography>
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <Paper
              variant="outlined"
              sx={{ flex: 1, p: 1.5, borderRadius: 2, borderColor: 'divider', overflow: 'hidden' }}
            >
              <Typography
                variant="body2"
                color="primary"
                sx={{ wordBreak: 'break-all', fontFamily: 'Inter, monospace' }}
              >
                {lastLink}
              </Typography>
            </Paper>
            <Button
              variant="outlined"
              onClick={handleCopy}
              color={copied ? 'success' : 'inherit'}
              sx={{ whiteSpace: 'nowrap', flexShrink: 0 }}
            >
              {copied ? 'Copiado!' : 'Copiar'}
            </Button>
          </Box>
        </Box>
      </Collapse>
    )
  }

  return (
    <Collapse in={visible}>
      <Alert severity="error" sx={{ mt: 2.5 }}>
        {result.data}
      </Alert>
    </Collapse>
  )
}
