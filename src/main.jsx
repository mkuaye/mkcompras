import React from 'react'
import ReactDOM from 'react-dom/client'
import { ThemeProvider } from '@mui/material/styles'
import { Analytics } from '@vercel/analytics/react'
import App from './App'
import theme from './theme'
import './styles/globals.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <App />
      <Analytics />
    </ThemeProvider>
  </React.StrictMode>
)
