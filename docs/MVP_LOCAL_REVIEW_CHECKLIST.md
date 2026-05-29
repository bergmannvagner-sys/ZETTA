# MVP local review checklist

Este checklist consolida a revisao local antes do teste final no celular. Ele nao substitui teste juridico,
auditoria LGPD formal, validacao NR-1 juridica ou homologacao de pagamento real.

## 1. Comandos obrigatorios

Backend:

```bash
cd backend
python -m compileall app
python -m pytest app/tests/test_public_contract.py app/tests/test_auth_rbac.py
```

Frontend:

```bash
cd frontend
npm install
npm run typecheck
npx expo config --type public
```

Expo Go, somente quando for testar no celular:

```bash
cd frontend
npx expo start -c
```

## 2. Ambiente e API

- [ ] `frontend/.env` possui `EXPO_PUBLIC_API_URL=https://zetta-bergmann.onrender.com`.
- [ ] `npx expo config --type public` mostra `extra.apiUrl` com a URL correta.
- [ ] Frontend nao usa `localhost` ou `127.0.0.1` no Android fisico.
- [ ] `backend/.env` ou Render possui `DATABASE_URL`.
- [ ] `backend/.env` ou Render possui `JWT_SECRET_KEY`.
- [ ] `backend/.env` ou Render possui `GROQ_API_KEY`.
- [ ] `BILLING_WEBHOOKS_ENABLED` fica `false` ate provider real ser ligado.
- [ ] `BILLING_WEBHOOK_SECRET` nao aparece em tela, logs ou frontend.

## 3. Contrato de rotas backend

Publicas:

- [ ] `GET /health`
- [ ] `POST /auth/register`
- [ ] `POST /auth/login`
- [ ] `POST /auth/refresh`
- [ ] `POST /auth/password-reset/request`
- [ ] `POST /auth/password-reset/confirm`
- [ ] `POST /billing/webhook` responde desativado quando env estiver off.

Usuario autenticado:

- [ ] `GET /users/me`
- [ ] `GET /privacy/consent`
- [ ] `POST /privacy/consent`
- [ ] `POST /chat/message`
- [ ] `POST /sos/event`
- [ ] `GET /journal/entries`
- [ ] `POST /journal/entries`
- [ ] `GET /emotions/logs`
- [ ] `POST /emotions/logs`
- [ ] `GET /reports/emotional/me`
- [ ] `POST /reports/emotional/me`
- [ ] `GET /connections/me`
- [ ] `GET /connections/search`
- [ ] `POST /sharing/consents`

Profissional, empresa e admin:

- [ ] `GET /professional/authorized-users`
- [ ] `GET /professional/authorized-users/{owner_user_id}`
- [ ] `GET /nr1/report`
- [ ] `GET /assistant/reminders`
- [ ] `POST /assistant/reminders`
- [ ] `POST /assistant/reminders/{reminder_id}/complete`
- [ ] `GET /admin/pending-accounts`
- [ ] `POST /admin/approve-account`
- [ ] `POST /admin/reject-account`
- [ ] `GET /admin/subscriptions`
- [ ] `POST /admin/subscription-status`
- [ ] `POST /admin/billing-reference`
- [ ] `GET /admin/commercial-plans`
- [ ] `GET /admin/billing-config`
- [ ] `GET /admin/audit-logs`

## 4. Auth e cadastro

- [ ] `SUPER_ADMIN` nao pode nascer pelo cadastro publico.
- [ ] `USER` nasce `ACTIVE` e `FREE`.
- [ ] `PSYCHOLOGIST`, `COMPANY`, `CLINIC`, `HOSPITAL`, `NGO`, `PUBLIC_INSTITUTION` e `SPONSOR`
      nascem `PENDING_VERIFICATION` e `PENDING`.
- [ ] CPF/CNPJ/CRP respeitam tamanho e formato no frontend e backend.
- [ ] Documento duplicado nao cria conta falsa.
- [ ] Login com credencial errada retorna erro claro.
- [ ] Recuperacao de senha gera fluxo sem expor senha, token ou segredo.
- [ ] `GET /users/me` atualiza status, role, plano e assinatura no app.

## 5. RBAC e protecao de rotas

- [ ] Usuario sem token cai no login.
- [ ] Deep link para tela protegida nao burla autenticacao.
- [ ] `USER` nao acessa rotas admin.
- [ ] `USER` nao acessa NR-1 ou rotas profissionais.
- [ ] Perfil pendente ve tela de conta em analise.
- [ ] `SUPER_ADMIN` ve area admin.
- [ ] Perfis comerciais sem `ACTIVE` veem bloqueio pago.
- [ ] Backend valida permissao mesmo que frontend esconda botao.

## 6. Consentimento, privacidade e LGPD

- [ ] Chat e SOS exigem consentimento LGPD ativo.
- [ ] Usuario pode conceder consentimento.
- [ ] Usuario pode criar, consultar e revogar compartilhamento.
- [ ] Psicologo ve apenas dados autorizados.
- [ ] Empresa ve apenas dados agregados/autorizados.
- [ ] Auditoria nao grava senha, token, segredo ou chave.
- [ ] Tela de privacidade mostra estado real de consentimento.

## 7. Diario, humor e relatorio emocional

- [ ] Diario cria entrada real.
- [ ] Diario lista entradas do usuario autenticado.
- [ ] Humor registra emocao, intensidade e notas.
- [ ] Relatorio emocional usa dados do usuario.
- [ ] Relatorio nao aparece para terceiros sem consentimento.
- [ ] Mensagens de empty/loading/error existem e nao travam a tela.

## 8. Chat e limite de assunto

- [ ] Chat responde dentro do proposito emocional do app.
- [ ] Perguntas fora do escopo recebem redirecionamento seguro.
- [ ] Conteudo de risco ou crise reduz estimulo visual e orienta ajuda humana.
- [ ] Nao existe resposta com instrucao perigosa, diagnostico medico ou promessa clinica.
- [ ] Falha da IA retorna fallback seguro.
- [ ] Nao logar prompt com dado sensivel fora da auditoria prevista.

## 9. SOS

- [ ] Usuario consegue registrar evento SOS.
- [ ] Tela orienta emergencia local e CVV 188 no Brasil.
- [ ] SOS nao promete atendimento de emergencia.
- [ ] Registro SOS gera auditoria.
- [ ] Estado visual de crise nao usa animacao agressiva.

## 10. Planos, pagamentos e monetizacao

- [ ] `USER` permanece gratuito.
- [ ] Planos comerciais aparecem apenas no admin.
- [ ] Tela publica nao mostra checkout falso.
- [ ] `GET /admin/commercial-plans` exige `SUPER_ADMIN`.
- [ ] Todos os planos comerciais estao com `checkout_public_enabled=false`.
- [ ] Todos os planos comerciais estao com `admin_only_pricing=true`.
- [ ] `POST /admin/billing-reference` rejeita provider e IDs incompatíveis.
- [ ] `NONE` nao aceita IDs externos.
- [ ] Stripe exige `cus_`, `sub_` e `evt_` quando evento existir.
- [ ] Apenas Stripe aparece como provider ativo de pagamento.
- [ ] Webhook fica desativado por env ate assinatura real estar validada.
- [ ] Idempotencia por `billing_last_event_id` esta coberta por validacao automatizada.

## 11. Telas Expo a revisar no celular

Autenticacao:

- [ ] `/(auth)/login`
- [ ] `/(auth)/select-role`
- [ ] `/(auth)/register`
- [ ] `/(auth)/forgot-password`
- [ ] `/(auth)/reset-password`

Usuario comum:

- [ ] `/(app)/home`
- [ ] `/(app)/chat`
- [ ] `/(app)/sos`
- [ ] `/(app)/journal`
- [ ] `/(app)/mood`
- [ ] `/(app)/routine`
- [ ] `/(app)/sharing`
- [ ] `/(app)/my-connections`
- [ ] `/(app)/emotional-report`
- [ ] `/(app)/privacy`
- [ ] `/(app)/profile`
- [ ] `/(app)/plans`

Comercial e profissional:

- [ ] `/(app)/verification`
- [ ] `/(app)/professional-users`
- [ ] `/(app)/professional-user-detail`
- [ ] `/(app)/nr1`

Admin:

- [ ] `/(app)/admin-pending-accounts`
- [ ] `/(app)/admin-subscriptions`
- [ ] `/(app)/admin-commercial-plans`
- [ ] `/(app)/admin-billing-config`
- [ ] `/(app)/admin-audit`

## 12. Orb e UX emocional

- [ ] Home continua com orb central e leve.
- [ ] Orb nao vira dashboard corporativo.
- [ ] Estados visuais preservam calma: `idle`, `listening`, `thinking`, `speaking`, `crisis`,
      `low_energy`, `silent_presence`, `error`.
- [ ] `crisis` reduz estimulo visual.
- [ ] `low_energy` reduz movimento.
- [ ] `silent_presence` fica quase imovel.
- [ ] Textos nao sobrepoem botoes em telas pequenas.
- [ ] Teclado aberto nao impede cadastro, login, chat e diario.

## 13. Teste final no Android fisico

Use Expo Go com cache limpo:

```bash
cd frontend
npx expo start -c
```

Fluxo recomendado:

- [ ] Abrir app no Expo Go.
- [ ] Criar `USER`.
- [ ] Aceitar consentimento.
- [ ] Abrir Home.
- [ ] Enviar mensagem no chat dentro do escopo.
- [ ] Enviar mensagem fora do escopo e confirmar limite.
- [ ] Registrar diario.
- [ ] Registrar humor.
- [ ] Gerar relatorio emocional.
- [ ] Registrar SOS.
- [ ] Criar `PSYCHOLOGIST` e confirmar conta em analise.
- [ ] Criar `COMPANY` e confirmar conta em analise.
- [ ] Entrar como `SUPER_ADMIN`.
- [ ] Aprovar conta comercial.
- [ ] Confirmar bloqueio ate assinatura `ACTIVE`.
- [ ] Ver bloqueio quando `PAST_DUE`.
- [ ] Conferir planos comerciais admin sem checkout publico.
- [ ] Conferir configuracao de pagamentos sem segredo.
- [ ] Conferir auditoria.

## 14. Criterio para seguir ao Render

Seguir para Render somente quando:

- [ ] Todos os comandos locais passarem.
- [ ] O Android fisico completar o fluxo basico.
- [ ] Nenhuma tela essencial tiver crash.
- [ ] Auth, RBAC, consentimento e bloqueios pagos funcionarem.
- [ ] Chat, SOS, diario, humor e relatorio estiverem utilizaveis.
- [ ] Nao houver segredo no frontend ou logs.
