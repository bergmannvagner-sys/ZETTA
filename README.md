# ZETTA Bergmann

MVP mobile e API para suporte emocional com autenticação, RBAC, consentimento LGPD, auditoria de eventos sensíveis, chat com Groq, SOS e preparação para Render e Expo EAS.

## Estrutura

```text
zetta-bergmann/
  backend/
  frontend/
  docs/
  docker/
  .github/
  docker-compose.yml
  render.yaml
```

## Rodar local

1. Suba dependências:

```bash
docker compose up -d postgres redis
```

2. Configure backend:

```bash
cd backend
cp .env.example .env
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload
```

3. Configure frontend:

```bash
cd frontend
cp .env.example .env
npm ci
npx expo start
```

## Rotas principais

- `GET /health`
- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `GET /users/me`
- `POST /chat/message`
- `POST /sos/event`
- `GET /privacy/consent`
- `POST /privacy/consent`
- `GET /admin/pending-accounts`
- `POST /admin/approve-account`
- `POST /admin/reject-account`

## Segurança

- `SUPER_ADMIN` não é aceito no cadastro público.
- Senhas usam hash bcrypt.
- Refresh tokens são persistidos apenas como hash.
- Todas as rotas sensíveis exigem JWT e RBAC no backend.
- Chat e SOS exigem consentimento LGPD ativo.
- Eventos sensíveis geram trilha em `audit_logs` sem tokens, senhas ou chaves.
- Groq falhando retorna fallback seguro e registra erro sem expor chave.

Leia também `docs/ENVIRONMENT.md`, `docs/RBAC.md`, `docs/DEPLOY_RENDER.md` e `docs/DEPLOY_EXPO_EAS.md`.
