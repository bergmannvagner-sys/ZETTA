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
- `PUBLIC_API_URL=https://zetta-bergmann.onrender.com`
- `BILLING_WEBHOOKS_ENABLED=false`
- `BILLING_WEBHOOK_SECRET`
- `STRIPE_SECRET_KEY`
- `STRIPE_PUBLISHABLE_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_SANDBOX_MODE=true`
- `STRIPE_SUCCESS_URL`
- `STRIPE_CANCEL_URL`
- `STRIPE_PRICE_ID_PSYCHOLOGIST`
- `STRIPE_PRICE_ID_COMPANY`
- `STRIPE_PRICE_ID_CLINIC`
- `STRIPE_PRICE_ID_INSTITUTIONAL`
- `STRIPE_PRICE_ID_SPONSOR`

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

## Pagamento Stripe sandbox

O MVP prepara Stripe em modo teste, sem checkout publico falso. Configure as variaveis
do provider apenas no ambiente seguro do backend. A tela de super admin "Configuracao de pagamentos"
mostra somente flags de readiness; tokens, chaves e segredos nunca sao retornados pela API.

Variaveis:

- `STRIPE_SECRET_KEY`: chave secreta de teste, deve comecar com `sk_test_`.
- `STRIPE_PUBLISHABLE_KEY`: publishable key de teste, deve comecar com `pk_test_`.
- `STRIPE_WEBHOOK_SECRET`: segredo de assinatura do webhook Stripe, geralmente `whsec_...`.
- `STRIPE_SANDBOX_MODE=true`: manter `true` ate concluir smoke e validacao manual.
- `STRIPE_SUCCESS_URL`: URL de retorno apos checkout concluido.
- `STRIPE_CANCEL_URL`: URL de retorno apos checkout cancelado.
- `STRIPE_PRICE_ID_*`: Price IDs de teste criados no Stripe para cada plano comercial.
- `BILLING_WEBHOOK_SECRET`: segredo interno do endpoint `/billing/webhook`.
- `BILLING_WEBHOOKS_ENABLED=false`: manter `false` ate a assinatura do webhook real estar validada.

Para validar readiness em producao depois do deploy:

```powershell
$env:ZETTA_ADMIN_EMAIL="admin@example.com"
$env:ZETTA_ADMIN_PASSWORD="use-your-real-secret-locally"
powershell -ExecutionPolicy Bypass -File .\scripts\prod-stripe-config-smoke.ps1
Remove-Item Env:\ZETTA_ADMIN_PASSWORD
```

Esse smoke confirma que Stripe esta configurado em sandbox e que checkout publico continua
desativado. Ele nao imprime secret key, publishable key, webhook secret ou senha.

Depois do smoke passar, a tela de super admin "Assinaturas" pode gerar um checkout sandbox real
para uma conta comercial. Esse link nao aparece para usuarios comuns e nao ativa a assinatura por
si so; a liberacao financeira continua dependendo do webhook validado ou da acao administrativa
manual enquanto o MVP estiver em teste.

## Frontend

- `EXPO_PUBLIC_API_URL`: URL pública da API.
- `APP_ENV=production`: exige `EXPO_PUBLIC_API_URL` no `app.config.ts`.

Nunca inserir `GROQ_API_KEY` no frontend.

## Consentimento LGPD

A versão atual da política é definida no backend em `CURRENT_LGPD_POLICY_VERSION`.
Quando essa versão muda, usuários ativos precisam aceitar novamente antes de usar chat e SOS.
