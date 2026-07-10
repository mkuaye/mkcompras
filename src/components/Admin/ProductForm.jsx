import { useState, useEffect } from 'react'
import { useConvert } from '../../hooks/useConvert'
import { previewProduct } from '../../api/client'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Autocomplete from '@mui/material/Autocomplete'
import Alert from '@mui/material/Alert'

function detectPlatform(url) {
  try {
    const hostname = new URL(url).hostname.toLowerCase()
    if (hostname.includes('shopee')) return 'shopee'
    if (hostname.includes('mercadolivre') || hostname.includes('mercadolibre')) return 'mercadolivre'
    if (hostname.includes('amazon') || hostname.includes('amzn')) return 'amazon'
  } catch {}
  return 'outros'
}

const EMPTY_FORM = {
  originalUrl: '',
  affiliateUrl: '',
  name: '',
  price: '',
  platform: '',
  description: '',
  image: '',
  category: '',
  featured: false,
}

const CATEGORY_SUGGESTIONS = [
  'eletrônicos',
  'informática',
  'casa e jardim',
  'moda',
  'esportes',
  'livros',
  'beleza',
  'brinquedos',
  'ferramentas',
  'alimentos',
  'pets',
]

export default function ProductForm({ editing, onAdd, onUpdate, onCancel }) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [statusMsg, setStatusMsg] = useState('')
  const [previewing, setPreviewing] = useState(false)
  const { convert, loading: converting } = useConvert()

  useEffect(() => {
    if (editing) {
      setForm(editing)
      setStatusMsg('')
      setError('')
    } else {
      setForm(EMPTY_FORM)
      setError('')
      setStatusMsg('')
    }
  }, [editing])

  const handleUrlBlur = async () => {
    const url = form.originalUrl.trim()
    if (!url) return
    if (!editing) {
      await fetchProductInfo(url)
    }
  }

  const fetchProductInfo = async (url) => {
    setPreviewing(true)
    setStatusMsg('Buscando informações do produto...')

    const affiliatePromise = !form.affiliateUrl ? convert(url).catch(() => null) : Promise.resolve(null)
    const previewPromise = previewProduct(url).catch(() => null)

    const [affiliateUrl, preview] = await Promise.all([affiliatePromise, previewPromise])

    const platform = detectPlatform(url)
    const updates = { platform }

    if (affiliateUrl) updates.affiliateUrl = affiliateUrl
    if (preview) {
      if (preview.name && !form.name) updates.name = preview.name
      if (preview.price && !form.price) updates.price = preview.price
      if (preview.image && !form.image) updates.image = preview.image
      if (preview.platform) updates.platform = preview.platform
    }

    setForm((prev) => ({ ...prev, ...updates }))

    if (affiliateUrl && preview?.name) {
      setStatusMsg('✓ Informações e link de afiliado carregados!')
    } else if (affiliateUrl) {
      setStatusMsg('✓ Link de afiliado gerado! Informações não encontradas — preencha manualmente.')
    } else if (preview?.name) {
      setStatusMsg('✓ Informações carregadas! Gere o link de afiliado manualmente.')
    } else {
      setStatusMsg('Não foi possível buscar automaticamente — preencha os campos manualmente.')
    }

    setPreviewing(false)
  }

  const generateAffiliate = async (url) => {
    setStatusMsg('Gerando link de afiliado...')
    try {
      const affiliateUrl = await convert(url)
      const platform = detectPlatform(url)
      setForm((prev) => ({ ...prev, affiliateUrl, platform }))
      setStatusMsg('✓ Link de afiliado gerado!')
    } catch {
      setStatusMsg('Não foi possível gerar o link — cole manualmente abaixo.')
    }
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setError('')

    if (!form.originalUrl.trim()) {
      setError('Informe a URL do produto.')
      return
    }
    if (!form.name.trim()) {
      setError('Informe o nome do produto.')
      return
    }

    setSaving(true)
    try {
      if (editing) {
        await onUpdate(form.id, form)
        setForm(EMPTY_FORM)
        onCancel()
      } else {
        await onAdd(form)
        setForm(EMPTY_FORM)
        setStatusMsg('')
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Erro ao salvar produto.')
    } finally {
      setSaving(false)
    }
  }

  const isLoading = previewing || converting

  return (
    <Paper component="form" onSubmit={handleSave} sx={{ p: 4, borderRadius: 3 }}>
      <Typography variant="subtitle1" fontFamily="Syne, sans-serif" fontWeight={700} mb={3}>
        {editing ? 'Editar produto' : 'Adicionar produto'}
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mb: 3 }}>
        {/* Link do produto */}
        <Box>
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <TextField
              type="url"
              label="Link do produto *"
              value={form.originalUrl}
              onChange={(e) => setForm({ ...form, originalUrl: e.target.value })}
              onBlur={handleUrlBlur}
              placeholder="https://shopee.com.br/produto..."
              fullWidth
              size="small"
              autoFocus
            />
            <Button
              type="button"
              variant="outlined"
              onClick={() => fetchProductInfo(form.originalUrl.trim())}
              disabled={isLoading || !form.originalUrl.trim()}
              sx={{ whiteSpace: 'nowrap', minWidth: 120 }}
            >
              {isLoading ? 'Buscando...' : 'Buscar info'}
            </Button>
          </Box>
          {statusMsg && (
            <Typography
              variant="caption"
              sx={{ mt: 0.75, display: 'block', color: statusMsg.startsWith('✓') ? 'success.main' : 'text.secondary' }}
            >
              {statusMsg}
            </Typography>
          )}
        </Box>

        {/* Link de afiliado */}
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <TextField
            type="url"
            label="Link de afiliado"
            value={form.affiliateUrl}
            onChange={(e) => setForm({ ...form, affiliateUrl: e.target.value })}
            placeholder="Gerado automaticamente ou cole aqui"
            fullWidth
            size="small"
          />
          <Button
            type="button"
            variant="outlined"
            onClick={() => generateAffiliate(form.originalUrl.trim())}
            disabled={converting || !form.originalUrl.trim()}
            sx={{ whiteSpace: 'nowrap', minWidth: 120 }}
          >
            {converting ? 'Gerando...' : 'Gerar link'}
          </Button>
        </Box>

        {/* Foto + Nome + Preço + Plataforma + Categoria */}
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
          {/* Image preview */}
          <Box sx={{ flexShrink: 0 }}>
            <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: 2, display: 'block', mb: 1 }}>
              Foto
            </Typography>
            <Box
              sx={{
                width: 80,
                height: 80,
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: 'background.default',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {form.image ? (
                <img
                  src={form.image}
                  alt="preview"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e) => { e.target.style.display = 'none' }}
                />
              ) : (
                <svg width="32" height="32" viewBox="0 0 48 48" fill="none" style={{ opacity: 0.2 }}>
                  <path d="M16 32l8-10 6 7 4-5 6 8H8l8-10z" fill="currentColor" opacity=".5" />
                </svg>
              )}
            </Box>
          </Box>

          {/* Fields grid */}
          <Box sx={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            <TextField
              label="Nome do produto *"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Preenchido automaticamente"
              size="small"
              sx={{ gridColumn: '1 / -1' }}
            />
            <TextField
              label="Preço"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              placeholder="Preenchido automaticamente"
              size="small"
            />
            <FormControl size="small">
              <InputLabel>Plataforma</InputLabel>
              <Select
                value={form.platform}
                onChange={(e) => setForm({ ...form, platform: e.target.value })}
                label="Plataforma"
              >
                <MenuItem value="">Detectada auto</MenuItem>
                <MenuItem value="shopee">Shopee</MenuItem>
                <MenuItem value="mercadolivre">Mercado Livre</MenuItem>
                <MenuItem value="amazon">Amazon</MenuItem>
                <MenuItem value="outros">Outros</MenuItem>
              </Select>
            </FormControl>
            <Autocomplete
              freeSolo
              options={CATEGORY_SUGGESTIONS}
              value={form.category}
              onInputChange={(_, value) => setForm({ ...form, category: value })}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Categoria"
                  size="small"
                  placeholder="ex: eletrônicos"
                  helperText="Separe múltiplas categorias por vírgula"
                />
              )}
              sx={{ gridColumn: '1 / -1' }}
            />
          </Box>
        </Box>

        {/* URL da imagem */}
        <TextField
          type="url"
          label="URL da imagem principal"
          value={form.image}
          onChange={(e) => setForm({ ...form, image: e.target.value })}
          placeholder="Preenchida automaticamente"
          fullWidth
          size="small"
        />
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Box sx={{ display: 'flex', gap: 1.5 }}>
        <Button
          type="submit"
          variant="contained"
          disabled={saving}
          sx={{
            background: 'linear-gradient(to right, var(--accent), var(--accent2))',
            '&:hover': { opacity: 0.9, background: 'linear-gradient(to right, var(--accent), var(--accent2))' },
            '&.Mui-disabled': { opacity: 0.5, background: 'linear-gradient(to right, var(--accent), var(--accent2))' },
          }}
        >
          {saving ? 'Salvando...' : 'Salvar produto'}
        </Button>
        {editing && (
          <Button type="button" variant="outlined" onClick={onCancel}>
            Cancelar
          </Button>
        )}
      </Box>
    </Paper>
  )
}
