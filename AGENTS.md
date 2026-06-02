# AGENTS.md

## Projeto

ZETTA Bergmann e uma plataforma de saude emocional com foco em suporte emocional,
prevencao de crises, IA de apoio, diario emocional, consentimento LGPD, psicologos,
empresas com NR-1, clinicas, hospitais, ONGs, patrocinadores e instituicoes publicas.

Missao: "Aqui ninguem fica sozinho."

## Stack Real Atual

Backend:

- FastAPI
- PostgreSQL
- Redis
- SQLAlchemy
- Alembic
- JWT + RBAC
- Pydantic
- Groq API
- Mercado Pago

Frontend mobile/web Expo:

- React Native
- Expo
- TypeScript
- Expo Router
- Zustand
- TanStack Query
- NativeWind
- Reanimated

Infra:

- Docker
- Render
- Expo EAS
- GitHub Actions

Nao criar backend paralelo. Nao criar app paralelo. A API deve continuar unica.

## Arquitetura

- Manter backend, frontend, docs e scripts separados.
- Manter modulos pequenos e coesos.
- Evitar duplicacao grave.
- Validar permissoes no backend, nao apenas no frontend.
- Nao remover funcionalidades extras uteis salvo por motivo tecnico real: bug, risco de seguranca,
  duplicacao grave, violacao de LGPD/consentimento, quebra de RBAC ou poluicao da Home do USER.

## Identidade Visual

A orb e elemento central do produto. Ela representa presenca, acolhimento, escuta,
tranquilidade, companhia emocional, conexao e seguranca.

Estados obrigatorios:

- idle
- listening
- thinking
- speaking
- crisis
- low_energy
- silent_presence
- error
- journaling
- assistant

Regras:

- Nao remover a orb.
- Nao substituir por avatar humano, robo ou circulo generico.
- Manter paleta lilas, violeta, azul profundo, ciano suave e glow frio.
- Em crise, reduzir estimulo visual.
- Em baixa energia, reduzir movimento.
- A Home do usuario comum deve permanecer leve, calma e centrada na orb.

## Auth, Cadastro e RBAC

Cadastro publico permite:

- USER
- PSYCHOLOGIST
- COMPANY
- NGO
- HOSPITAL
- CLINIC
- SPONSOR
- PUBLIC_INSTITUTION

Regras:

- USER nasce ACTIVE.
- Perfis comerciais/profissionais nascem PENDING_VERIFICATION.
- SUPER_ADMIN nunca nasce por cadastro publico.
- SUPER_ADMIN deve ser criado por seed seguro ou bootstrap controlado.
- USER nao acessa admin.
- Perfis pendentes nao acessam areas sensiveis.
- Endpoints administrativos exigem SUPER_ADMIN.

## LGPD e Consentimento

Dados emocionais e de saude sao sensiveis.

Obrigatorio:

- Consentimento explicito.
- Controle granular de compartilhamento.
- Revogacao simples.
- Audit log.
- Minimo necessario.
- Nao compartilhar conversas ou diario com empresa sem autorizacao explicita.
- Nao logar senha, token, refresh token, API keys ou segredos.

## IA Bergmann

A IA deve acolher, apoiar e orientar com seguranca.

Obrigatorio:

- Nao diagnosticar.
- Nao prescrever medicacao.
- Nao substituir psicologo, psiquiatra ou emergencia.
- Usar fallback seguro quando Groq falhar.
- Tratar timeout e erros.
- Usar contexto apenas quando autorizado.
- Em crise, orientar ajuda humana, CVV 188 no Brasil e emergencia local se houver risco imediato.

## Mercado Pago

Mercado Pago e o gateway inicial.

Regras:

- Frontend nunca usa access token.
- Backend cria preferencia/checkout.
- Webhook Mercado Pago atualiza assinatura.
- USER continua gratuito.
- Recursos pagos sao liberados por assinatura ativa.
- Pagamento vencido/cancelado bloqueia recursos premium sem apagar dados.
- Nao criar checkout publico falso.

## Render

O Dockerfile roda:

```bash
alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
```

Sem Render Shell pago, usar bootstrap temporario:

```text
SUPER_ADMIN_BOOTSTRAP_ON_STARTUP=true
```

Depois confirmar admin, remover `SUPER_ADMIN_PASSWORD` e voltar bootstrap para `false`.

## Validacao Obrigatoria

Backend:

```powershell
cd backend
python -m compileall app
python -m pytest app/tests/test_public_contract.py app/tests/test_auth_rbac.py
```

Frontend:

```powershell
cd frontend
npm install
npm run typecheck
npm run check:api-url
npx expo config --type public
```

Auditoria:

```powershell
cd frontend
npm audit --audit-level=moderate
```

Nao usar `npm audit fix --force` sem analise.

## Entrega

Ao finalizar uma etapa relevante, responder com:

- O que foi analisado.
- O que estava correto.
- O que estava incompleto ou contraditorio.
- O que foi corrigido/implementado.
- Arquivos criados/alterados.
- Comandos executados e resultados.
- O que nao foi validado.
- Pendencias reais.
- Riscos reais.
- Proxima etapa recomendada.

Nunca afirmar que algo funciona sem validar.
