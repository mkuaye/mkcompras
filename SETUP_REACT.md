# Refactor React — Setup & Deploy

A refatoração para React foi concluída! Aqui está como finalizar:

## 1️⃣ Instalar dependências (local)

```bash
npm install
```

Isso irá instalar:
- React + React DOM
- Vite (build tool)
- React Router v6 (roteamento)
- Zustand (state management)
- Axios (HTTP client)
- Tailwind CSS (estilos)

## 2️⃣ Testar localmente

```bash
npm run dev
```

Abre em `http://localhost:5173`

Teste:
- `/` → converter (deve funcionar como antes)
- `/loja` → catálogo (fetch de /api/products, busca/filtros)
- `/admin` → painel (login → CRUD de produtos)

## 3️⃣ Build para produção

```bash
npm run build
npm run preview
```

Cria `dist/` otimizado para produção.

## 4️⃣ Deploy no Vercel

```bash
git add .
git commit -m "Refactor: frontend to React with Vite, Tailwind, Zustand"
git push
```

Vercel detecta automaticamente:
- `vite.config.js` → usa Vite
- `package.json` com `"build": "vite build"` → já configurado
- `vercel.json` com rewrites → SPA routing funciona

## Variáveis de Ambiente

Certifique-se que essas variáveis estão no Vercel:

- `ADMIN_PASSWORD` (senha do painel)
- `SHOPEE_APP_ID` e `SHOPEE_SECRET` (Shopee affiliate API)
- `ML_USERNAME` e `ML_TOOL_ID` (Mercado Livre affiliate)
- `AMAZON_TAG` (Amazon associate tag)
- `BLOB_READ_WRITE_TOKEN` (Vercel Blob storage, se usar admin)

## Estrutura final

```
mkcompras/
├── src/                    ← frontend React
│   ├── components/         ← componentes reutilizáveis
│   ├── pages/              ← páginas (Home, Catalog, Admin)
│   ├── hooks/              ← custom hooks (useProducts, useConvert, etc)
│   ├── store/              ← Zustand stores (adminStore, productCache)
│   ├── api/                ← axios client
│   ├── styles/             ← globals.css (Tailwind + CSS vars)
│   ├── App.jsx             ← router setup
│   ├── main.jsx            ← entry point
│   └── index.html          ← template
├── api/                    ← serverless functions (não muda)
├── src/server/             ← handlers/services (não muda)
├── vite.config.js          ← config Vite
├── tailwind.config.js      ← config Tailwind
├── postcss.config.js       ← config PostCSS
├── vercel.json             ← config Vercel (updated)
└── package.json            ← deps (updated)
```

## O que mudou

✅ **Frontend:**
- HTML vanilla → React components com hooks
- JS vanilla → React state (hooks) + Zustand
- CSS puro → Tailwind CSS (mantendo CSS vars para cores)

❌ **Backend API:**
- `/api/convert` → sem mudança
- `/api/products` → sem mudança
- Handlers/services → sem mudança

## Rollback (se precisar)

Se algo der errado e quiser voltar:

```bash
git revert HEAD
npm install  # volta deps anteriores
npm run dev  # servidor Vercel local
```

---

**Próximos passos:**
1. `npm install` local
2. `npm run dev` e testa tudo
3. `npm run build` e verifica dist/
4. Faz commit e push
5. Deploy automático no Vercel
