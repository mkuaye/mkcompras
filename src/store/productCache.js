import { create } from 'zustand'

export const useProductCache = create((set) => ({
  products: [],
  categories: [],

  setProducts: (products) => set({ products }),
  setCategories: (categories) => set({ categories }),
}))
