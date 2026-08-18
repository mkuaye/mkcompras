import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'

export default function Footer() {
  return (
    <Box component="footer" sx={{ mt: 'auto', borderTop: '1px solid', borderColor: 'divider' }}>
      <Box sx={{ maxWidth: '80rem', mx: 'auto', px: 3, py: 3, textAlign: 'center' }}>
        <Typography variant="caption" color="text.secondary">
          Ao converter seus links por aqui, você me ajuda. Obrigado! 💙
        </Typography>
      </Box>
    </Box>
  )
}
