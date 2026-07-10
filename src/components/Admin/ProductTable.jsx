import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemAvatar from '@mui/material/ListItemAvatar'
import ListItemText from '@mui/material/ListItemText'
import Avatar from '@mui/material/Avatar'
import Button from '@mui/material/Button'
import Box from '@mui/material/Box'

const PLATFORM_LABELS = {
  shopee: 'Shopee',
  mercadolivre: 'Mercado Livre',
  amazon: 'Amazon',
  outros: 'Outros',
}

export default function ProductTable({ products, onEdit, onDelete }) {
  const handleDelete = async (id) => {
    if (!confirm('Excluir este produto?')) return
    try {
      await onDelete(id)
    } catch (err) {
      alert('Erro ao excluir: ' + err.message)
    }
  }

  return (
    <List sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      {products.map((p) => (
        <ListItem
          key={p.id}
          disablePadding
          sx={{
            bgcolor: 'background.default',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 2,
            px: 1.5,
            py: 1,
            '&:hover': { borderColor: 'primary.main' },
            transition: 'border-color 0.2s',
          }}
        >
          {p.image && (
            <ListItemAvatar>
              <Avatar
                src={p.image}
                alt={p.name}
                variant="rounded"
                sx={{ width: 48, height: 48, border: '1px solid', borderColor: 'divider' }}
                imgProps={{ onError: (e) => { e.target.style.display = 'none' } }}
              />
            </ListItemAvatar>
          )}
          <ListItemText
            primary={p.name}
            secondary={`${PLATFORM_LABELS[p.platform] || p.platform} • ${p.category || '—'} • ${p.price || 'sem preço'}${p.featured ? ' • ⭐' : ''}`}
            primaryTypographyProps={{ variant: 'body2', fontWeight: 600, noWrap: true }}
            secondaryTypographyProps={{ variant: 'caption' }}
          />
          <Box sx={{ display: 'flex', gap: 1, ml: 1, flexShrink: 0 }}>
            <Button size="small" variant="outlined" color="primary" onClick={() => onEdit(p.id)}>
              Editar
            </Button>
            <Button size="small" variant="outlined" color="error" onClick={() => handleDelete(p.id)}>
              Excluir
            </Button>
          </Box>
        </ListItem>
      ))}
    </List>
  )
}
