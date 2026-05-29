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
- `SMTP_HOST`
- `SMTP_PORT=587`
- `SMTP_USERNAME`
- `SMTP_PASSWORD`
- `SMTP_FROM_EMAIL`
- `SMTP_USE_TLS=true`
- `PASSWORD_RESET_URL=bergmann://reset-password`

Nunca versionar `.env`. Use `backend/.env.example` como referência.

## Recuperacao de senha

O backend gera token de uso unico com expiracao de 30 minutos e revoga refresh tokens antigos
apos a troca de senha. Em producao, o token nao e retornado pela API; ele precisa ser enviado
por SMTP usando as variaveis acima. Provedores compativeis incluem Resend SMTP, SendGrid,
Brevo, AWS SES ou outro SMTP autenticado.

Para validar em producao, use a tela de super admin "Configurar email" ou rode:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\prod-password-reset-smoke.ps1
```

O smoke nao imprime token nem senha; depois dele, confirme manualmente se o email chegou.

## Frontend

- `EXPO_PUBLIC_API_URL`: URL pública da API.
- `APP_ENV=production`: exige `EXPO_PUBLIC_API_URL` no `app.config.ts`.

Nunca inserir `GROQ_API_KEY` no frontend.

## Consentimento LGPD

A versão atual da política é definida no backend em `CURRENT_LGPD_POLICY_VERSION`.
Quando essa versão muda, usuários ativos precisam aceitar novamente antes de usar chat e SOS.
