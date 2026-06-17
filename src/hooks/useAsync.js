import { useState, useCallback, useEffect } from 'react'

export function useAsync(asyncFn, deps = []) {
  const [state, setState] = useState({
    data: null,
    loading: false,
    error: null,
  })

  const execute = useCallback(async (...args) => {
    setState({ data: null, loading: true, error: null })
    try {
      const result = await asyncFn(...args)
      setState({ data: result, loading: false, error: null })
      return result
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message || 'Erro desconhecido'
      setState({ data: null, loading: false, error: errorMsg })
      throw err
    }
  }, [])

  useEffect(() => {
    if (deps.length === 0) return
    execute()
  }, deps)

  return { ...state, execute }
}
