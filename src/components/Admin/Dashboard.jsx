import { useState, useEffect } from 'react'
import { useAdminStore } from '../../store/adminStore'
import { useAnalytics } from '../../hooks/useAnalytics'
import ProductForm from './ProductForm'
import ProductTable from './ProductTable'
import AnalyticsDashboard from './AnalyticsDashboard'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import Paper from '@mui/material/Paper'
import InputAdornment from '@mui/material/InputAdornment'
import SearchIcon from '@mui/icons-material/Search'

export default function Dashboard({ products, onAdd, onUpdate, onDelete, onLogout }) {
  const { editingId, setEditingId, clearEditingId } = useAdminStore()
  const editingProduct = editingId ? products.find((p) => p.id === editingId) : null
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState(0)

  const token = useAdminStore((s) => s.token)
  const { data: analyticsData, loading: analyticsLoading, error: analyticsError, fetchAnalytics } = useAnalytics(token)

  useEffect(() => {
    if (activeTab === 1 && !analyticsData) {
      fetchAnalytics()
    }
  }, [activeTab, analyticsData, fetchAnalytics])

  const filteredProducts = searchTerm
    ? products.filter(
        (p) =>
          p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (p.category || '').toLowerCase().includes(searchTerm.toLowerCase())
      )
    : products

  return (
    <Box sx={{ width: '100%', maxWidth: '56rem', px: 2.5, py: 6 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 4 }}>
        <Typography variant="h4" fontFamily="Syne, sans-serif" fontWeight={900}>
          Admin{' '}
          <Box
            component="span"
            sx={{
              background: 'linear-gradient(to right, var(--accent), var(--accent2))',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Painel
          </Box>
        </Typography>
        <Button onClick={onLogout} variant="outlined" color="error" size="small">
          Sair
        </Button>
      </Box>

      <Tabs
        value={activeTab}
        onChange={(_, v) => setActiveTab(v)}
        sx={{ mb: 4, borderBottom: '1px solid', borderColor: 'divider' }}
      >
        <Tab label="Produtos" />
        <Tab label="Analytics" />
      </Tabs>

      {activeTab === 0 && (
        <>
          <ProductForm
            editing={editingProduct}
            onAdd={onAdd}
            onUpdate={onUpdate}
            onCancel={() => clearEditingId()}
          />

          <Paper sx={{ mt: 6, borderRadius: 3, p: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 1.5 }}>
              <Typography variant="subtitle1" fontFamily="Syne, sans-serif" fontWeight={700}>
                Produtos cadastrados ({products.length})
              </Typography>
              <TextField
                size="small"
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                sx={{ width: 192 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                    </InputAdornment>
                  ),
                }}
              />
            </Box>

            {filteredProducts.length > 0 ? (
              <ProductTable
                products={filteredProducts}
                onEdit={setEditingId}
                onDelete={onDelete}
              />
            ) : (
              <Typography variant="body2" color="text.secondary" textAlign="center" py={5}>
                {products.length === 0 ? 'Nenhum produto cadastrado ainda.' : 'Nenhum produto encontrado.'}
              </Typography>
            )}
          </Paper>
        </>
      )}

      {activeTab === 1 && (
        <AnalyticsDashboard
          data={analyticsData}
          loading={analyticsLoading}
          error={analyticsError}
          onRefresh={fetchAnalytics}
        />
      )}
    </Box>
  )
}
