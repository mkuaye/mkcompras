import Card from '@mui/material/Card'
import CardActionArea from '@mui/material/CardActionArea'
import CardContent from '@mui/material/CardContent'
import CardActions from '@mui/material/CardActions'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import Button from '@mui/material/Button'

const PLATFORM_LABELS = {
  shopee: 'Shopee',
  mercadolivre: 'Mercado Livre',
  amazon: 'Amazon',
  outros: 'Outros',
}

const PLATFORM_COLORS = {
  shopee: { bg: 'rgba(240,83,34,0.15)', color: '#f05322' },
  mercadolivre: { bg: 'rgba(255,230,0,0.15)', color: '#ffe600' },
  amazon: { bg: 'rgba(255,153,0,0.15)', color: '#ff9900' },
  outros: { bg: 'transparent', color: '#6b7280' },
}

export default function ProductCard({ product }) {
  const platform = product.platform || 'outros'
  const label = PLATFORM_LABELS[platform] || platform
  const colors = PLATFORM_COLORS[platform] || PLATFORM_COLORS.outros

  return (
    <Card
      component="a"
      href={product.affiliateUrl}
      target="_blank"
      rel="noopener noreferrer sponsored"
      sx={{
        display: 'flex',
        flexDirection: 'column',
        textDecoration: 'none',
        borderRadius: 3,
        transition: 'border-color 0.2s, transform 0.2s',
        '&:hover': { borderColor: 'primary.main', transform: 'translateY(-2px)' },
      }}
    >
      <Box
        sx={{
          width: '100%',
          aspectRatio: '1 / 1',
          bgcolor: 'background.default',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        {product.image ? (
          <img
            src={product.image}
            alt={product.name}
            loading="lazy"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={(e) => { e.target.style.display = 'none' }}
          />
        ) : (
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none" style={{ opacity: 0.2 }}>
            <rect width="48" height="48" rx="8" fill="currentColor" opacity=".1" />
            <path d="M16 32l8-10 6 7 4-5 6 8H8l8-10z" fill="currentColor" opacity=".3" />
          </svg>
        )}
      </Box>

      <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1, p: 2, '&:last-child': { pb: 2 } }}>
        <Chip
          label={label}
          size="small"
          sx={{ alignSelf: 'flex-start', bgcolor: colors.bg, color: colors.color, fontWeight: 600, border: 'none' }}
        />

        <Typography
          variant="body2"
          fontWeight={600}
          sx={{
            flex: 1,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {product.name}
        </Typography>

        {product.description && (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {product.description}
          </Typography>
        )}

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 'auto', pt: 1 }}>
          {product.price ? (
            <Typography variant="body1" fontWeight={700} color="success.main">
              {product.price}
            </Typography>
          ) : (
            <Box />
          )}
          <Button
            size="small"
            variant="outlined"
            sx={{ fontSize: '0.75rem', fontWeight: 600 }}
          >
            Ver produto →
          </Button>
        </Box>
      </CardContent>
    </Card>
  )
}
