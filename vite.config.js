import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  root: 'src',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
  plugins: [react()],
  server: {
    proxy: {
      '/api/convert':   { target: 'http://localhost:3000', changeOrigin: true },
      '/api/products':  { target: 'http://localhost:3000', changeOrigin: true },
      '/api/analytics': { target: 'http://localhost:3000', changeOrigin: true },
    },
  },
})
