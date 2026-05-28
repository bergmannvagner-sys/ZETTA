# Variáveis de ambiente

## Backend

Obrigatórias:

- `DATABASE_URL`
- `JWT_SECRET_KEY`
- `CORS_ORIGINS`
- `GROQ_API_KEY`

Recomendadas:

- `REDIS_URL`
- `GROQ_MODEL=llama-3.3-70b-versatile`
- `AI_TEMPERATURE=0.7`
- `AI_TIMEOUT_SECONDS=30`
- `SUPER_ADMIN_EMAIL`
- `SUPER_ADMIN_PASSWORD`

Nunca versionar `.env`. Use `backend/.env.example` como referência.

## Frontend

- `EXPO_PUBLIC_API_URL`: URL pública da API.
- `APP_ENV=production`: exige `EXPO_PUBLIC_API_URL` no `app.config.ts`.

Nunca inserir `GROQ_API_KEY` no frontend.

## Consentimento LGPD

A versão atual da política é definida no backend em `CURRENT_LGPD_POLICY_VERSION`.
Quando essa versão muda, usuários ativos precisam aceitar novamente antes de usar chat e SOS.
