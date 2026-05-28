# RBAC

## Perfis públicos

- `USER`: criado com status `ACTIVE`.
- `PSYCHOLOGIST`, `COMPANY`, `NGO`, `HOSPITAL`, `CLINIC`, `SPONSOR`, `PUBLIC_INSTITUTION`: criados com status `PENDING_VERIFICATION`.

## Perfil interno

- `SUPER_ADMIN`: bloqueado no cadastro público. Criar apenas via seed interno seguro:

```bash
cd backend
python -m app.seed_super_admin
```

## Regras implementadas

- Rotas protegidas exigem JWT no backend.
- Contas pendentes acessam apenas status básico e perfil.
- `USER` acessa área comum, chat e SOS somente após consentimento LGPD ativo.
- `SUPER_ADMIN` acessa rotas administrativas.
- Empresas e instituições não recebem rotas de dados individuais nesta versão.

## Auditoria

Eventos registrados em `audit_logs`:

- cadastro
- login
- refresh token
- aceite LGPD
- mensagem de chat
- evento SOS
- aprovação/rejeição de conta

Metadados sensíveis como senha, tokens e chaves são descartados antes da gravação.

## Próximos controles

- Auditoria detalhada de eventos administrativos.
- Consentimento granular por tipo de dado.
- Escopos por organização e segregação multi-tenant.
