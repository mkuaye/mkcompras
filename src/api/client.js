import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

export const convertURL = (url) =>
  api.post('/convert', { url }).then((res) => res.data)

export const previewProduct = (url) =>
  api.post('/preview', { url }).then((res) => res.data)

export const getProducts = (query = {}) =>
  api.get('/products', { params: query }).then((res) => res.data)

export const addProduct = (data, token) =>
  api.post('/products', data, {
    headers: { Authorization: `Bearer ${token}` },
  }).then((res) => res.data)

export const updateProduct = (id, data, token) =>
  api.put('/products', { id, ...data }, {
    headers: { Authorization: `Bearer ${token}` },
  }).then((res) => res.data)

export const deleteProduct = (id, token) =>
  api.delete(`/products?id=${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${token}` },
  }).then((res) => res.data)

export const getAnalytics = (token) =>
  api.get('/analytics', {
    headers: { Authorization: `Bearer ${token}` },
  }).then((res) => res.data)
