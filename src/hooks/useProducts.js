import { useState, useCallback } from 'react'
import { getProducts } from '../api/client'
import { useProductCache } from '../store/productCache'

export function useProducts(initialCategory = '', initialPlatform = '', initialSearch = '') {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const products = useProductCache((s) => s.products)
  const categories = useProductCache((s) => s.categories)
  const setProducts = useProductCache((s) => s.setProducts)
  const setCategories = useProductCache((s) => s.setCategories)

  const fetch = useCallback(async (category = '', platform = '', search = '') => {
    setLoading(true)
    setError(null)
    try {
      const data = await getProducts({
        category: category || undefined,
        platform: platform || undefined,
        search: search || undefined,
      })
      setProducts(data.products || [])
      setCategories(data.categories || [])
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Erro ao carregar produtos'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [setProducts, setCategories])

  return {
    products,
    categories,
    loading,
    error,
    fetch,
  }
}
