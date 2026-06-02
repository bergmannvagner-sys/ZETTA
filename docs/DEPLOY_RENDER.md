# Deploy no Render

O arquivo `render.yaml` prepara:

- Web service Docker para `backend/`.
- PostgreSQL gerenciado.
- Redis gerenciado.
- Health check em `/health`.

## Passos

1. Faca commit e push do repositorio para GitHub.
2. Abra o Blueprint no Render:

```text
https://dashboard.render.com/blueprint/new
```

3. Selecione o repositorio com `zetta-bergmann/render.yaml`.
4. Preencha as variaveis marcadas como secret:

- `JWT_SECRET_KEY`
- `CORS_ORIGINS`
- `GROQ_API_KEY`
- `SUPER_ADMIN_EMAIL`
- `SUPER_ADMIN_PASSWORD`
- `SMTP_HOST`
- `SMTP_USERNAME`
- `SMTP_PASSWORD`
- `SMTP_FROM_EMAIL`
- `PASSWORD_RESET_URL`
- `PUBLIC_API_URL`
- `BILLING_WEBHOOK_SECRET`
- `MERCADO_PAGO_ACCESS_TOKEN`
- `MERCADO_PAGO_PUBLIC_KEY`
- `MERCADO_PAGO_WEBHOOK_SECRET`
- `MERCADO_PAGO_SUCCESS_URL`
- `MERCADO_PAGO_PENDING_URL`
- `MERCADO_PAGO_FAILURE_URL`

5. Aplique o Blueprint.
6. Para criar ou rotacionar o super admin sem Render Shell, configure temporariamente:

```text
SUPER_ADMIN_BOOTSTRAP_ON_STARTUP=true
```

Depois do deploy confirmar o admin, remova `SUPER_ADMIN_PASSWORD` e volte
`SUPER_ADMIN_BOOTSTRAP_ON_STARTUP=false`.

O Dockerfile executa `alembic upgrade head` antes de subir o Uvicorn.

## Mercado Pago

O webhook de notificacoes deve apontar para:

```text
https://zetta-bergmann.onrender.com/billing/mercado-pago/webhook
```

Mantenha `BILLING_WEBHOOKS_ENABLED=false` ate o segredo real do webhook estar configurado.
Depois de configurar `MERCADO_PAGO_WEBHOOK_SECRET`, altere para:

```text
BILLING_WEBHOOKS_ENABLED=true
```

## Validacao

```bash
curl https://sua-api.onrender.com/health
```

Deve retornar:

```json
{"status":"ok"}
```

Smokes de producao no PowerShell:

```powershell
$env:ZETTA_ADMIN_EMAIL="admin@example.com"
$env:ZETTA_ADMIN_PASSWORD="use-your-real-secret-locally"
powershell -ExecutionPolicy Bypass -File .\scripts\prod-admin-smoke.ps1
powershell -ExecutionPolicy Bypass -File .\scripts\prod-password-reset-smoke.ps1
powershell -ExecutionPolicy Bypass -File .\scripts\prod-mercado-pago-config-smoke.ps1
Remove-Item Env:\ZETTA_ADMIN_PASSWORD
```
