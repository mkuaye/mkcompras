import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import LinearProgress from '@mui/material/LinearProgress'
import Chip from '@mui/material/Chip'
import Grid from '@mui/material/Grid'

const PLATFORM_LABELS = {
  shopee: 'Shopee',
  mercadolivre: 'Mercado Livre',
  amazon: 'Amazon',
  outros: 'Outros',
}

const PLATFORM_COLORS = {
  shopee: '#f05322',
  mercadolivre: '#ffe600',
  amazon: '#ff9900',
  outros: '#6b7280',
}

function StatCard({ label, value, sub }) {
  return (
    <Card sx={{ borderRadius: 3 }}>
      <CardContent>
        <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: 2 }}>
          {label}
        </Typography>
        <Typography variant="h4" fontFamily="Syne, sans-serif" fontWeight={900} mt={0.5}>
          {value}
        </Typography>
        {sub && (
          <Typography variant="caption" color="text.secondary">
            {sub}
          </Typography>
        )}
      </CardContent>
    </Card>
  )
}

function BarRow({ label, count, max, color }) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
      <Typography variant="body2" sx={{ width: 112, flexShrink: 0, textTransform: 'capitalize' }} noWrap>
        {label}
      </Typography>
      <LinearProgress
        variant="determinate"
        value={pct}
        sx={{
          flex: 1,
          height: 10,
          borderRadius: 5,
          bgcolor: 'background.default',
          '& .MuiLinearProgress-bar': { bgcolor: color || 'primary.main', borderRadius: 5 },
        }}
      />
      <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ width: 32, textAlign: 'right', flexShrink: 0 }}>
        {count}
      </Typography>
    </Box>
  )
}

function TimelineBar({ timeline }) {
  if (!timeline || timeline.length === 0) return null
  const max = Math.max(...timeline.map((d) => d.count), 1)

  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 0.5, height: 64 }}>
      {timeline.map(({ date, count }) => (
        <Box
          key={date}
          title={`${date}: ${count}`}
          sx={{
            flex: 1,
            background: 'linear-gradient(to top, var(--accent), var(--accent2))',
            borderRadius: '2px',
            opacity: 0.8,
            height: `${Math.max(4, (count / max) * 64)}px`,
            transition: 'opacity 0.2s',
            '&:hover': { opacity: 1 },
          }}
        />
      ))}
    </Box>
  )
}

export default function AnalyticsDashboard({ data, loading, error, onRefresh }) {
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 10, gap: 2 }}>
        <CircularProgress size={20} />
        <Typography variant="body2" color="text.secondary">Carregando analytics...</Typography>
      </Box>
    )
  }

  if (error) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, py: 10, textAlign: 'center' }}>
        <Alert severity="error" sx={{ width: '100%', maxWidth: 400 }}>{error}</Alert>
        <Button variant="text" color="primary" onClick={onRefresh}>
          Tentar novamente
        </Button>
      </Box>
    )
  }

  if (!data) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, py: 10, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          Clique em atualizar para carregar as métricas.
        </Typography>
        <Button
          variant="contained"
          onClick={onRefresh}
          sx={{
            background: 'linear-gradient(to right, var(--accent), var(--accent2))',
            '&:hover': { opacity: 0.9, background: 'linear-gradient(to right, var(--accent), var(--accent2))' },
          }}
        >
          Carregar
        </Button>
      </Box>
    )
  }

  const maxPlatform = data.platformStats?.[0]?.count || 1
  const maxCategory = data.topCategories?.[0]?.count || 1
  const maxTag = data.topTags?.[0]?.count || 1

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {/* Summary cards */}
      <Grid container spacing={2}>
        <Grid item xs={6} sm={4}>
          <StatCard label="Total de eventos" value={data.total} sub="links + produtos" />
        </Grid>
        <Grid item xs={6} sm={4}>
          <StatCard label="Links convertidos" value={data.linkConversions} sub="intenções de compra" />
        </Grid>
        <Grid item xs={6} sm={4}>
          <StatCard label="Produtos adicionados" value={data.productAdditions} sub="pelo admin" />
        </Grid>
      </Grid>

      {/* Timeline */}
      {data.timeline?.length > 0 && (
        <Card sx={{ borderRadius: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="body2" fontFamily="Syne, sans-serif" fontWeight={700}>
                Atividade (últimos 30 dias)
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {data.timeline.length} dias
              </Typography>
            </Box>
            <TimelineBar timeline={data.timeline} />
          </CardContent>
        </Card>
      )}

      <Grid container spacing={3}>
        {/* Platform stats */}
        <Grid item xs={12} sm={6}>
          <Card sx={{ borderRadius: 3 }}>
            <CardContent>
              <Typography variant="body2" fontFamily="Syne, sans-serif" fontWeight={700} mb={2.5}>
                Plataformas
              </Typography>
              {data.platformStats?.length > 0 ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {data.platformStats.map(({ platform, count }) => (
                    <BarRow
                      key={platform}
                      label={PLATFORM_LABELS[platform] || platform}
                      count={count}
                      max={maxPlatform}
                      color={PLATFORM_COLORS[platform]}
                    />
                  ))}
                </Box>
              ) : (
                <Typography variant="caption" color="text.secondary">Nenhum dado ainda.</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Top categories */}
        <Grid item xs={12} sm={6}>
          <Card sx={{ borderRadius: 3 }}>
            <CardContent>
              <Typography variant="body2" fontFamily="Syne, sans-serif" fontWeight={700} mb={2.5}>
                Categorias mais populares
              </Typography>
              {data.topCategories?.length > 0 ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {data.topCategories.map(({ category, count }) => (
                    <BarRow key={category} label={category} count={count} max={maxCategory} />
                  ))}
                </Box>
              ) : (
                <Typography variant="caption" color="text.secondary">Nenhum dado ainda.</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Top tags */}
      <Card sx={{ borderRadius: 3 }}>
        <CardContent>
          <Typography variant="body2" fontFamily="Syne, sans-serif" fontWeight={700} mb={2.5}>
            Tags mais frequentes
          </Typography>
          {data.topTags?.length > 0 ? (
            <>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2.5 }}>
                {data.topTags.map(({ tag, count }) => (
                  <Chip
                    key={tag}
                    label={`${tag} ${count}`}
                    size="small"
                    variant="outlined"
                    sx={{ borderColor: 'divider' }}
                  />
                ))}
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {data.topTags.slice(0, 8).map(({ tag, count }) => (
                  <BarRow key={tag} label={tag} count={count} max={maxTag} />
                ))}
              </Box>
            </>
          ) : (
            <Typography variant="caption" color="text.secondary">Nenhum dado ainda.</Typography>
          )}
        </CardContent>
      </Card>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button variant="outlined" color="primary" onClick={onRefresh}>
          Atualizar métricas
        </Button>
      </Box>
    </Box>
  )
}
