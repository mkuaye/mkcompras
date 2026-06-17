import { useState, useCallback } from 'react'
import { addProduct, updateProduct, deleteProduct, getProducts } from '../api/client'

export function useAdminProducts(token) {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getProducts()
      setProducts(data.products || [])
    } catch (err) {
      const msg = err.response?.data?.error || err.message
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [])

  const add = useCallback(async (data) => {
    try {
      const newProduct = await addProduct(data, token)
      setProducts((prev) => [...prev, newProduct])
      return newProduct
    } catch (err) {
      const msg = err.response?.data?.error || err.message
      setError(msg)
      throw err
    }
  }, [token])

  const update = useCallback(async (id, data) => {
    try {
      const updated = await updateProduct(id, data, token)
      setProducts((prev) => prev.map((p) => (p.id === id ? updated : p)))
      return updated
    } catch (err) {
      const msg = err.response?.data?.error || err.message
      setError(msg)
      throw err
    }
  }, [token])

  const remove = useCallback(async (id) => {
    try {
      await deleteProduct(id, token)
      setProducts((prev) => prev.filter((p) => p.id !== id))
    } catch (err) {
      const msg = err.response?.data?.error || err.message
      setError(msg)
      throw err
    }
  }, [token])

  return { products, loading, error, fetchProducts, add, update, remove, setProducts }
}
