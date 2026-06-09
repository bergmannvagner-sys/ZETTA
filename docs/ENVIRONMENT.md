# Variáveis de ambiente

## Backend

Obrigatórias em produção:

- `DATABASE_URL`
- `JWT_SECRET_KEY`
- `DATA_ENCRYPTION_KEY`
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
- `MERCADO_PAGO_ACCESS_TOKEN`
- `MERCADO_PAGO_PUBLIC_KEY`
- `MERCADO_PAGO_WEBHOOK_SECRET`
- `MERCADO_PAGO_SUCCESS_URL`
- `MERCADO_PAGO_PENDING_URL`
- `MERCADO_PAGO_FAILURE_URL`
- `DAILY_API_KEY`
- `DAILY_API_URL=https://api.daily.co/v1`
- `DAILY_ROOM_EXPIRE_HOURS=8`
- `DAILY_JOIN_TOKEN_EXPIRE_MINUTES=180`

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

## Pagamento Mercado Pago definitivo

O MVP usa Mercado Pago como provedor definitivo de cobranca, sem checkout publico falso. Configure as variaveis
do provider apenas no ambiente seguro do backend. A tela de super admin "Configuracao de pagamentos"
mostra somente flags de readiness; tokens, chaves e segredos nunca sao retornados pela API.

Variaveis:

- `MERCADO_PAGO_ACCESS_TOKEN`: access token definitivo do Mercado Pago.
- `MERCADO_PAGO_PUBLIC_KEY`: public key definitiva do Mercado Pago.
- `MERCADO_PAGO_WEBHOOK_SECRET`: segredo de assinatura do webhook Mercado Pago.
- `MERCADO_PAGO_SUCCESS_URL`: URL de retorno para pagamento aprovado.
- `MERCADO_PAGO_PENDING_URL`: URL de retorno para pagamento pendente.
- `MERCADO_PAGO_FAILURE_URL`: URL de retorno para pagamento recusado.
- `BILLING_WEBHOOK_SECRET`: segredo interno do endpoint `/billing/webhook`.
- `BILLING_WEBHOOKS_ENABLED=false`: manter `false` ate a assinatura do webhook estar validada.

Para validar readiness em producao depois do deploy:

```powershell
$env:ZETTA_ADMIN_EMAIL="admin@example.com"
$env:ZETTA_ADMIN_PASSWORD="use-your-real-secret-locally"
powershell -ExecutionPolicy Bypass -File .\scripts\prod-mercado-pago-config-smoke.ps1
Remove-Item Env:\ZETTA_ADMIN_PASSWORD
```

Esse smoke confirma que Mercado Pago esta configurado para producao e que checkout publico continua
desativado. Ele nao imprime access token, public key, webhook secret ou senha.

Depois do smoke passar, a tela de super admin "Assinaturas" pode gerar um Checkout Pro Mercado Pago real
para uma conta comercial. Esse link nao aparece para usuarios comuns e nao ativa a assinatura por
si so; a liberacao financeira continua dependendo do webhook validado ou da acao administrativa.
Para notificacoes do Mercado Pago, cadastre a rota `/billing/mercado-pago/webhook`; a rota
generica `/billing/webhook` continua reservada para payload interno assinado por `BILLING_WEBHOOK_SECRET`.

Para validar a criacao real de uma preferencia de checkout para uma conta comercial ja aprovada:

```powershell
$env:ZETTA_ADMIN_EMAIL="admin@example.com"
$env:ZETTA_ADMIN_PASSWORD="use-your-real-secret-locally"
$env:ZETTA_BILLING_TARGET_EMAIL="empresa-ou-profissional@example.com"
powershell -ExecutionPolicy Bypass -File .\scripts\prod-mercado-pago-checkout-smoke.ps1
Remove-Item Env:\ZETTA_ADMIN_PASSWORD
Remove-Item Env:\ZETTA_BILLING_TARGET_EMAIL
```

Esse smoke exige uma conta comercial `ACTIVE`, cria uma preferencia real no Mercado Pago e nao imprime o
link completo do checkout, access token, webhook secret ou senha.

## Teleatendimento Daily

O teleatendimento dentro do app usa Daily pelo backend. A API cria uma sala privada por sessao aceita
e emite um token temporario de entrada para o usuario ou profissional autorizado.

Variaveis:

- `DAILY_API_KEY`: chave secreta da conta Daily. Configure apenas no backend/Render.
- `DAILY_API_URL=https://api.daily.co/v1`: URL da API REST Daily.
- `DAILY_ROOM_EXPIRE_HOURS=8`: tempo de vida da sala criada para a sessao.
- `DAILY_JOIN_TOKEN_EXPIRE_MINUTES=180`: validade do link/token de entrada.

Nunca coloque `DAILY_API_KEY` no Expo. O frontend chama `/telecare/sessions/{id}/join` e recebe apenas
uma URL temporaria de entrada na sala. A primeira versao usa Daily Prebuilt dentro de WebView para manter
compatibilidade com Expo Go. Uma interface de chamada totalmente customizada pode usar a SDK React Native
do Daily depois, mas isso exigira development build.

## Frontend

- `EXPO_PUBLIC_API_URL`: URL pública da API.
- `APP_ENV=production`: exige `EXPO_PUBLIC_API_URL` no `app.config.ts`.

No web em desenvolvimento, o cliente usa o backend local em `http://127.0.0.1:8000` quando a
origem do browser e local. Se preferir manter o backend remoto no browser local, o Render precisa
liberar `http://127.0.0.1:8082` e `http://localhost:8082` em `CORS_ORIGINS`.

Nunca inserir `GROQ_API_KEY` no frontend.

`DATA_ENCRYPTION_KEY` deve existir em producao para criptografia em repouso de conteudos
sensiveis. Em desenvolvimento, o backend usa `JWT_SECRET_KEY` como fallback funcional,
mas isso nao substitui a chave dedicada no ambiente real.

## Consentimento LGPD

A versão atual da política é definida no backend em `CURRENT_LGPD_POLICY_VERSION`.
Quando essa versão muda, usuários ativos precisam aceitar novamente antes de usar chat e SOS.
