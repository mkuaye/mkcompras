import { useEffect } from 'react'
import { useAdminStore } from '../store/adminStore'
import { useAdminProducts } from '../hooks/useAdminProducts'
import LoginForm from '../components/Admin/LoginForm'
import Dashboard from '../components/Admin/Dashboard'

export default function AdminPage() {
  const { token, clearToken } = useAdminStore()
  const { products, fetchProducts, add, update, remove } = useAdminProducts(token)

  useEffect(() => {
    if (token) {
      fetchProducts()
    }
  }, [token, fetchProducts])

  if (!token) {
    return <LoginForm />
  }

  return (
    <Dashboard
      products={products}
      onAdd={add}
      onUpdate={update}
      onDelete={remove}
      onLogout={clearToken}
    />
  )
}
