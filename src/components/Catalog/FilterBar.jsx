import Box from '@mui/material/Box'
import TextField from '@mui/material/TextField'
import InputAdornment from '@mui/material/InputAdornment'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import ToggleButton from '@mui/material/ToggleButton'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import SearchIcon from '@mui/icons-material/Search'

const platforms = [
  { value: '', label: 'Todas' },
  { value: 'shopee', label: 'Shopee' },
  { value: 'mercadolivre', label: 'Mercado Livre' },
  { value: 'amazon', label: 'Amazon' },
]

export default function FilterBar({ categories, onFilterChange }) {
  return (
    <Box sx={{ mb: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <TextField
        placeholder="Buscar produto..."
        size="small"
        sx={{ maxWidth: 400 }}
        onChange={(e) => onFilterChange((prev) => ({ ...prev, search: e.target.value }))}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon fontSize="small" sx={{ color: 'text.secondary' }} />
            </InputAdornment>
          ),
        }}
      />

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
        <ToggleButtonGroup
          exclusive
          size="small"
          onChange={(_, value) => onFilterChange((prev) => ({ ...prev, platform: value ?? '' }))}
          sx={{ flexWrap: 'wrap', gap: 0.5 }}
        >
          {platforms.map((p) => (
            <ToggleButton
              key={p.value}
              value={p.value}
              sx={{
                borderRadius: '999px !important',
                border: '1px solid !important',
                borderColor: 'divider !important',
                px: 1.5,
                py: 0.5,
                fontSize: '0.75rem',
                fontWeight: 600,
                '&.Mui-selected': {
                  bgcolor: 'primary.main',
                  color: '#fff',
                  borderColor: 'primary.main !important',
                  '&:hover': { bgcolor: 'primary.dark' },
                },
              }}
            >
              {p.label}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>

        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>Categoria</InputLabel>
          <Select
            label="Categoria"
            defaultValue=""
            onChange={(e) => onFilterChange((prev) => ({ ...prev, category: e.target.value }))}
          >
            <MenuItem value="">Todas as categorias</MenuItem>
            {categories.map((cat) => (
              <MenuItem key={cat} value={cat}>
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>
    </Box>
  )
}
