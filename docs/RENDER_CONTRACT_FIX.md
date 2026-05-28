# Corrigir contrato do backend no Render

O app mobile aponta para:

```text
https://zetta-bergmann.onrender.com
```

O backend publicado nesse endereco ainda nao corresponde ao backend local deste repositorio.

## Contrato esperado pelo app atual

O backend correto deve expor:

- `GET /health`
- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `GET /users/me`
- `GET /privacy/consent`
- `POST /privacy/consent`
- `POST /chat/message`
- `POST /sos/event`
- `GET /admin/pending-accounts`
- `POST /admin/approve-account`
- `POST /admin/reject-account`

## Evidencia da divergencia atual

O Render atual expoe endpoints como:

- `POST /chat`
- `POST /sos/events/opened`
- `GET /legal/privacy`

Esses endpoints pertencem a outro contrato. O frontend esta tolerando esse formato temporariamente,
mas o backend correto e o deste repositorio.

## Caminho recomendado: atualizar o servico existente

Use este caminho para manter a URL atual `https://zetta-bergmann.onrender.com`.

1. Publique este repositorio em GitHub, GitLab ou Bitbucket.
2. No Render, abra o servico existente `zetta-bergmann`.
3. Em **Settings**, ajuste:
   - Repository: repositorio atual do `zetta-bergmann`
   - Branch: `main`
   - Root Directory: `backend`
   - Runtime: Docker
   - Dockerfile Path: `./Dockerfile`
   - Health Check Path: `/health`
4. Configure as variaveis:
   - `APP_ENV=production`
   - `DATABASE_URL`
   - `REDIS_URL`
   - `JWT_SECRET_KEY`
   - `CORS_ORIGINS`
   - `GROQ_API_KEY`
   - `GROQ_MODEL=llama-3.3-70b-versatile`
   - `AI_TEMPERATURE=0.7`
   - `AI_TIMEOUT_SECONDS=30`
   - `SUPER_ADMIN_EMAIL`
   - `SUPER_ADMIN_PASSWORD`
5. Acione **Manual Deploy > Deploy latest commit**.

## Caminho alternativo: Blueprint

O `render.yaml` deste repositorio cria:

- Web service Docker `zetta-bergmann`
- PostgreSQL `zetta-bergmann-postgres`
- Redis `zetta-bergmann-redis`

Abra:

```text
https://dashboard.render.com/blueprint/new
```

Selecione o repositorio onde este `render.yaml` foi enviado e aplique o Blueprint.

## Validacao apos deploy

```bash
curl https://zetta-bergmann.onrender.com/health
curl https://zetta-bergmann.onrender.com/openapi.json
```

Confirme que o OpenAPI contem:

```text
/privacy/consent
/chat/message
/sos/event
```

E nao dependa mais de:

```text
/chat
/sos/events/opened
```

Depois disso, os adaptadores temporarios do frontend podem ser removidos.
