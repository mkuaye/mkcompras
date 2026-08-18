import AppBar from '@mui/material/AppBar'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Box from '@mui/material/Box'
import { Link, useLocation } from 'react-router-dom'

export default function Header() {
  const location = useLocation()

  return (
    <AppBar position="static" elevation={0}>
      <Toolbar sx={{ maxWidth: '80rem', width: '100%', mx: 'auto', px: 3, justifyContent: 'space-between', flexDirection: { xs: 'column', sm: 'row' }, py: { xs: 1.5, sm: 0 }, gap: { xs: 1, sm: 0 } }}>
        <Typography
          component={Link}
          to="/"
          variant="h6"
          sx={{
            fontFamily: 'Syne, sans-serif',
            fontWeight: 900,
            fontSize: '1.5rem',
            background: 'linear-gradient(to right, var(--accent), var(--accent2))',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            textDecoration: 'none',
          }}
        >
          MKcompras
        </Typography>
        <Box component="nav" sx={{ display: 'flex', gap: 0.5 }}>
          <Button
            component={Link}
            to="/"
            size="small"
            sx={{
              color: location.pathname === '/' ? 'text.primary' : 'text.secondary',
              '&:hover': { bgcolor: 'background.paper', color: 'text.primary' },
            }}
          >
            Converter link
          </Button>
          <Button
            component={Link}
            to="/loja"
            size="small"
            sx={{
              color: location.pathname === '/loja' ? 'text.primary' : 'text.secondary',
              '&:hover': { bgcolor: 'background.paper', color: 'text.primary' },
            }}
          >
            Loja
          </Button>
        </Box>
      </Toolbar>
    </AppBar>
  )
}
