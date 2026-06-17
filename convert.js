# LinkAfil — Conversor de Links de Afiliado

Site para converter links de produtos em links de afiliado rastreáveis.  
Suporta: **Shopee**, **Mercado Livre** e **Amazon**.

---

## Passo a passo para colocar no ar

### 1. Cadastros nos programas de afiliados

Antes de qualquer coisa, crie suas contas:

| Plataforma | Link de cadastro | O que você vai precisar |
|---|---|---|
| Shopee | https://affiliate.shopee.com.br | App ID + Secret (na área de API) |
| Mercado Livre | https://www.mercadolibre.com/affiliates | Tracking ID (via Impact) |
| Amazon | https://associados.amazon.com.br | Associates Tag (ex: `seusite-20`) |

> A aprovação pode levar de algumas horas a alguns dias.

---

### 2. Subir o código no GitHub

1. Crie uma conta em https://github.com (gratuito)
2. Clique em **New repository**, dê um nome (ex: `link-afiliado`), deixe **Private**
3. Faça upload de todos os arquivos deste projeto

> Forma mais fácil: arraste a pasta inteira para a tela de upload do GitHub.

---

### 3. Deploy na Vercel

1. Crie uma conta em https://vercel.com (gratuito)
2. Clique em **Add New → Project**
3. Conecte sua conta do GitHub e selecione o repositório
4. Clique em **Deploy** (a Vercel detecta tudo automaticamente)

Seu site vai estar no ar em um endereço como:  
`https://link-afiliado.vercel.app`

---

### 4. Configurar as variáveis de ambiente na Vercel

No painel da Vercel, vá em:  
**Seu projeto → Settings → Environment Variables**

Adicione uma por uma:

| Nome | Valor |
|---|---|
| `SHOPEE_APP_ID` | Seu App ID da Shopee |
| `SHOPEE_SECRET` | Seu Secret da Shopee |
| `ML_TRACKING_ID` | Seu Tracking ID do Mercado Livre |
| `AMAZON_TAG` | Seu tag da Amazon (ex: `seusite-20`) |

Depois de adicionar, vá em **Deployments → Redeploy** para aplicar.

---

### 5. Domínio próprio (opcional, ~R$40/ano)

1. Compre um domínio em https://registro.br (ex: `meusite.com.br`)
2. Na Vercel: **Settings → Domains → Add**
3. Digite seu domínio e siga as instruções para apontar o DNS

---

## Estrutura do projeto

```
meu-link-afiliado/
├── index.html        ← Frontend (página que o usuário vê)
├── api/
│   └── convert.js    ← Backend serverless (processa os links)
├── vercel.json       ← Configuração da Vercel
├── .env.example      ← Exemplo de variáveis de ambiente
├── .gitignore        ← Protege credenciais de subir ao GitHub
└── README.md         ← Este arquivo
```

---

## Testando localmente (opcional)

Instale a CLI da Vercel:
```bash
npm install -g vercel
```

Na pasta do projeto:
```bash
# Copie o arquivo de exemplo
cp .env.example .env.local

# Edite .env.local com suas credenciais reais

# Inicie o servidor local
vercel dev
```

Acesse `http://localhost:3000`

---

## Segurança

- ✅ Credenciais nunca ficam expostas no frontend
- ✅ HTTPS automático via Vercel
- ✅ CORS restrito ao próprio domínio
- ✅ `.gitignore` protege o `.env.local` de subir ao GitHub
- ✅ Validação de URL antes de processar

---

## Custo total

| Item | Custo |
|---|---|
| Hospedagem (Vercel) | R$ 0 |
| Backend serverless | R$ 0 (até 100k req/mês) |
| Domínio .com.br | ~R$ 40/ano (opcional) |
| **Total** | **R$ 0 — R$ 40/ano** |
