import { create } from 'zustand'

export const useAdminStore = create((set) => ({
  token: sessionStorage.getItem('admin_token') || '',
  editingId: null,

  setToken: (token) => {
    set({ token })
    if (token) sessionStorage.setItem('admin_token', token)
    else sessionStorage.removeItem('admin_token')
  },

  clearToken: () => {
    set({ token: '' })
    sessionStorage.removeItem('admin_token')
  },

  setEditingId: (id) => set({ editingId: id }),
  clearEditingId: () => set({ editingId: null }),
}))
