import { useState, useCallback } from 'react'
import { getProducts } from '../api/client'
import { useProductCache } from '../store/productCache'

export function useProducts(initialCategory = '', initialPlatform = '', initialSearch = '') {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const cache = useProductCache()

  const fetch = useCallback(async (category = '', platform = '', search = '') => {
    setLoading(true)
    setError(null)
    try {
      const data = await getProducts({
        category: category || undefined,
        platform: platform || undefined,
        search: search || undefined,
      })
      cache.setProducts(data.products || [])
      cache.setCategories(data.categories || [])
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Erro ao carregar produtos'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [cache])

  return {
    products: cache.products,
    categories: cache.categories,
    loading,
    error,
    fetch,
  }
}
