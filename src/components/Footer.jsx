import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Link from '@mui/material/Link'

export default function Footer() {
  return (
    <Box component="footer" sx={{ mt: 'auto', borderTop: '1px solid', borderColor: 'divider' }}>
      <Box sx={{ maxWidth: '80rem', mx: 'auto', px: 3, py: 3, textAlign: 'center' }}>
        <Typography variant="caption" color="text.secondary">
          Ao converter seus links por aqui, você me ajuda. Obrigado! 💙
        </Typography>
        <Box sx={{ mt: 1, display: 'flex', justifyContent: 'center', gap: 2 }}>
          <Link href="/termos" variant="caption" color="text.secondary" underline="hover">
            Termos de Uso
          </Link>
          <Link href="/privacidade" variant="caption" color="text.secondary" underline="hover">
            Privacidade
          </Link>
        </Box>
      </Box>
    </Box>
  )
}
