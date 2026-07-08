/**
 * Servidor local de desenvolvimento para as rotas /api/*
 * Roda na porta 3000 — use em paralelo com `npm run dev` (Vite na 5173)
 * Uso: node dev-server.mjs
 */
import http from 'http'
import { URL } from 'url'

import productsHandler  from './src/server/handlers/productsHandler.js'
import convertHandler   from './src/server/handlers/convertHandler.js'
import previewHandler   from './src/server/handlers/previewHandler.js'
import analyticsHandler from './src/server/handlers/analyticsHandler.js'

const ROUTES = {
  '/api/products':  productsHandler,
  '/api/convert':   convertHandler,
  '/api/preview':   previewHandler,
  '/api/analytics': analyticsHandler,
}

function parseQuery(search) {
  const params = {}
  new URLSearchParams(search).forEach((v, k) => { params[k] = v })
  return params
}

function readBody(req) {
  return new Promise((resolve) => {
    let data = ''
    req.on('data', (chunk) => { data += chunk })
    req.on('end', () => {
      try { resolve(JSON.parse(data)) } catch { resolve({}) }
    })
  })
}

function buildRes(res) {
  const headers = {}
  return {
    statusCode: 200,
    setHeader(k, v) { headers[k] = v },
    status(code) { this.statusCode = code; return this },
    json(data) {
      res.writeHead(this.statusCode, { 'Content-Type': 'application/json', ...headers })
      res.end(JSON.stringify(data))
    },
    end() {
      res.writeHead(this.statusCode, headers)
      res.end()
    },
  }
}

const server = http.createServer(async (req, res) => {
  const parsed = new URL(req.url, 'http://localhost:3000')
  const handler = ROUTES[parsed.pathname]

  if (!handler) {
    res.writeHead(404)
    res.end('Not found')
    return
  }

  const body = await readBody(req)
  const fakeReq = {
    method: req.method,
    headers: req.headers,
    query: parseQuery(parsed.search),
    body,
  }

  await handler(fakeReq, buildRes(res))
})

server.listen(3000, () => {
  console.log('API dev server running on http://localhost:3000')
  console.log('Rotas disponíveis:', Object.keys(ROUTES).join(', '))
})
