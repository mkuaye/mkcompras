import { useState, useCallback } from 'react'
import { getAnalytics } from '../api/client'

export function useAnalytics(token) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchAnalytics = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await getAnalytics(token)
      setData(result)
    } catch (err) {
      setError(err.response?.data?.error || err.message)
    } finally {
      setLoading(false)
    }
  }, [token])

  return { data, loading, error, fetchAnalytics }
}
