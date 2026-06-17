# MKcompras

Projeto para conversao de links de produto em links de afiliado.

## Estrutura sugerida para escalar

```
mkcompras/
  api/
    convert.js                 # Entry-point serverless (Vercel)

  src/
    server/
      handlers/
        convertHandler.js      # Regras HTTP (validacao, status code, resposta)
      services/
        platformConverters.js  # Regras de negocio por plataforma

  web/
    css/
      styles.css               # Estilos do frontend
    js/
      app.js                   # Comportamento da UI e chamadas para API

  index.html                   # Shell da pagina
  vercel.json                  # Configuracoes de deploy e headers
  README.md
```

## Convencoes para proxima etapa

1. Mantenha o diretorio `api/` somente como adaptador HTTP para serverless.
2. Coloque regras de negocio em `src/server/services/`.
3. Coloque validacoes e serializacao HTTP em `src/server/handlers/`.
4. Se surgir autenticacao ou logs, crie `src/server/middlewares/`.
5. Se crescer o frontend, adicione `web/components/` e `web/pages/`.

## Como isso ajuda na escalabilidade

- Reduz acoplamento entre UI, HTTP e regras de negocio.
- Facilita testes isolados por camada.
- Permite migrar API (Vercel para outro runtime) sem reescrever logica central.
- Facilita onboarding com padrao claro de onde cada codigo deve ficar.
