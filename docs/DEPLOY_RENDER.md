# Deploy no Render

O arquivo `render.yaml` prepara:

- Web service Docker para `backend/`.
- PostgreSQL gerenciado.
- Redis gerenciado.
- Health check em `/health`.

## Passos

1. Faça commit e push do repositório para GitHub, GitLab ou Bitbucket.
2. Abra o Blueprint no Render:

```text
https://dashboard.render.com/blueprint/new
```

3. Selecione o repositório com `zetta-bergmann/render.yaml`.
4. Preencha variáveis marcadas como secret:

- `JWT_SECRET_KEY`
- `CORS_ORIGINS`
- `GROQ_API_KEY`
- `SUPER_ADMIN_EMAIL`
- `SUPER_ADMIN_PASSWORD`

5. Aplique o Blueprint.
6. Após o deploy, rode a seed do super admin no shell do serviço:

```bash
python -m app.seed_super_admin
```

## Validação

```bash
curl https://sua-api.onrender.com/health
```

Deve retornar `{"status":"ok"}`.
