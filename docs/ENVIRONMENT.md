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
- `BILLING_WEBHOOKS_ENABLED=false`
- `BILLING_WEBHOOK_SECRET`
- `MERCADO_PAGO_ACCESS_TOKEN`
- `MERCADO_PAGO_PUBLIC_KEY`
- `MERCADO_PAGO_WEBHOOK_SECRET`
- `MERCADO_PAGO_SANDBOX_MODE=true`
- `MERCADO_PAGO_SUCCESS_URL`
- `MERCADO_PAGO_FAILURE_URL`
- `MERCADO_PAGO_PENDING_URL`

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

## Pagamento Mercado Pago sandbox

O MVP prepara Mercado Pago em modo sandbox/teste, sem checkout publico falso. Configure as variaveis
do provider apenas no ambiente seguro do backend. A tela de super admin "Configuracao de pagamentos"
mostra somente flags de readiness; tokens, chaves e segredos nunca sao retornados pela API.

Variaveis:

- `MERCADO_PAGO_ACCESS_TOKEN`: token de acesso sandbox ou producao, conforme ambiente.
- `MERCADO_PAGO_PUBLIC_KEY`: public key do Mercado Pago.
- `MERCADO_PAGO_WEBHOOK_SECRET`: segredo usado para validar notificacoes reais do provider.
- `MERCADO_PAGO_SANDBOX_MODE=true`: manter `true` ate concluir smoke e validacao manual.
- `BILLING_WEBHOOK_SECRET`: segredo interno do endpoint `/billing/webhook`.
- `BILLING_WEBHOOKS_ENABLED=false`: manter `false` ate a assinatura do webhook real estar validada.

Para validar readiness em producao depois do deploy:

```powershell
$env:ZETTA_ADMIN_EMAIL="admin@example.com"
$env:ZETTA_ADMIN_PASSWORD="use-your-real-secret-locally"
powershell -ExecutionPolicy Bypass -File .\scripts\prod-mercado-pago-config-smoke.ps1
Remove-Item Env:\ZETTA_ADMIN_PASSWORD
```

Esse smoke confirma que Mercado Pago esta configurado em sandbox e que checkout publico continua
desativado. Ele nao imprime segredo, token, public key ou access token.

## Frontend

- `EXPO_PUBLIC_API_URL`: URL pública da API.
- `APP_ENV=production`: exige `EXPO_PUBLIC_API_URL` no `app.config.ts`.

Nunca inserir `GROQ_API_KEY` no frontend.

## Consentimento LGPD

A versão atual da política é definida no backend em `CURRENT_LGPD_POLICY_VERSION`.
Quando essa versão muda, usuários ativos precisam aceitar novamente antes de usar chat e SOS.
