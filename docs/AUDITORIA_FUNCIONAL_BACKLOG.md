# Auditoria funcional ZETTA - backlog priorizado

Escopo: `zetta-bergmann/frontend/app/*` e componentes de suporte que afetam essas telas.

Status usados:
- `pronta` - tela funcional e coerente com o que mostra.
- `parcial` - tela funciona, mas ainda entrega uma versao curta, heuristica ou incompleta.
- `informativa/placeholder` - tela de leitura, checklist, legal ou stub de fluxo.
- `depende de backend` - tela ou fluxo precisa de API/servico externo para completar a entrega.

## P0 - bloqueadores reais

| Tela | Status | Lacuna principal | Prioridade |
| --- | --- | --- | --- |
| `(auth)/forgot-password` | parcial | reset token fica visivel apenas em `__DEV__`; revisar smoke de producao para garantir que nunca vaze | P0 |

## P1 - alto impacto de produto

| Tela | Status | Lacuna principal | Prioridade |
| --- | --- | --- | --- |
| `(app)/plans` | informativa/placeholder | nao existe autoatendimento/compras no mobile; apenas explica o modelo comercial | P1 |
| `pagamento/sucesso` | informativa/placeholder | so mostra resultado do webhook/retorno, sem acao financeira propria | P1 |
| `pagamento/pendente` | informativa/placeholder | so informa pendencia e volta para planos | P1 |
| `pagamento/erro` | informativa/placeholder | so informa falha e volta para planos | P1 |
| `(app)/admin-commercial-plans` | informativa/placeholder | leitura de catalogo interno; `admin_price_placeholder` e `billing_interval_placeholder` nao viraram editor | P1 |
| `(app)/admin-billing-config` | informativa/placeholder | checklist de prontidao, sem edicao de variaveis | P1 |
| `(app)/admin-email-config` | informativa/placeholder | painel de status/checklist, sem formulario de edicao | P1 |
| `(app)/verification` | informativa/placeholder | tela de espera/triagem; nao muda o estado por si | P1 |
| `(app)/telecare` | depende de backend | depende de aprovacao, sala e resposta do backend; nao e fluxo isolado | P1 |
| `(app)/telecare-room` | depende de backend | depende de `join_url` e sala Daily vinda do backend | P1 |
| `(app)/sos` | parcial | aciona SOS, mas o mapa usa busca externa e nao um diretorio real de apoio | P1 |
| `src/components/support-map.tsx` | depende de backend | usa OpenStreetMap + buscas externas; nao e um catalogo local de profissionais | P1 |

## P2 - funcional, mas ainda curto ou heuristico

| Tela | Status | Lacuna principal | Prioridade |
| --- | --- | --- | --- |
| `(app)/presence` | parcial | fluxo minimalista, sem historico ou continuidade | P2 |
| `(app)/cannot-think` | parcial | e um roteador de decisao, nao uma experiencia completa | P2 |
| `(app)/memories` | parcial | memoria local/transparente, sem motor contextual robusto | P2 |
| `(app)/positive-memories` | parcial | filtro heuristico sobre diario; sem curadoria real | P2 |
| `(app)/emotional-timeline` | parcial | timeline agregada, sem drill-down | P2 |
| `(app)/emotional-report` | parcial | resumo exportavel, mas ainda pouco analitico | P2 |
| `(app)/privacy-policy` | informativa/placeholder | legal operacional, sem acao de produto | P2 |
| `(app)/terms` | informativa/placeholder | legal operacional, sem acao de produto | P2 |
| `(app)/quick-checkin` | pronta | fluxo curto de check-in ja salva no backend | P2 |
| `(app)/mood` | pronta | formulario de humor funcional | P2 |
| `(app)/chat` | pronta | conversa real com fallback HTTP/realtime | P2 |
| `(app)/thought-dump` | pronta | organiza texto localmente e salva no backend | P2 |
| `(app)/gratitude` | pronta | registro simples e funcional | P2 |
| `(app)/journal` | pronta | registro e listagem basica funcionando | P2 |
| `(app)/routine` | pronta | cria e conclui lembretes | P2 |
| `(app)/sharing` | pronta | busca, cria e revoga consentimento | P2 |
| `(app)/my-connections` | pronta | visao de vinculos e codigo de conexao | P2 |
| `(app)/consent` | pronta | aceite LGPD funcional | P2 |
| `(app)/privacy` | pronta | exportacao, revogacao e auditoria funcionais | P2 |
| `(app)/profile` | pronta | perfil, idioma e acesso admin/planos funcionais | P2 |
| `(app)/home` | pronta | hub principal da navegacao e dos atalhos | P2 |
| `(app)/index` | pronta | roteamento inicial correto | P2 |
| `(auth)/login` | pronta | autentica e redireciona por status | P2 |
| `(auth)/register` | pronta | cadastro com role, documento e LGPD | P2 |
| `(auth)/select-role` | pronta | seletor de perfil de conta | P2 |
| `(auth)/reset-password` | pronta | conclui a troca de senha | P2 |
| `(app)/professional-users` | depende de backend | precisa de autorizacoes e resumo vindo da API | P2 |
| `(app)/professional-user-detail` | depende de backend | detalhe depende do consentimento e dos dados autorizados | P2 |
| `(app)/institution-dashboard` | depende de backend | painel agregado de consentimento/risco | P2 |
| `(app)/nr1` | depende de backend | indicadores organizacionais agregados | P2 |
| `(app)/admin-operations` | depende de backend | depende de resumo operacional consolidado | P2 |
| `(app)/admin-pending-accounts` | depende de backend | depende da lista de aprovacao/rejeicao | P2 |
| `(app)/admin-subscriptions` | depende de backend | depende de status financeiro e mutacoes admin | P2 |
| `(app)/admin-billing-pending` | depende de backend | depende de estado financeiro, checkout e alertas | P2 |
| `(app)/admin-moderated-accounts` | depende de backend | depende de auditoria e filtros de moderacao | P2 |
| `(app)/admin-billing-webhooks` | depende de backend | depende do monitor de webhooks do backend | P2 |
| `(app)/admin-alerts` | depende de backend | depende do historico de alertas enviados | P2 |
| `(app)/admin-audit` | depende de backend | depende da trilha de auditoria do backend | P2 |

## Lacunas de produto ainda fora de tela

| Gap | Status | Observacao |
| --- | --- | --- |
| Habitos / streaks / gamificacao leve | informativa/placeholder | nao encontrei rota ou fluxo dedicado; hoje ha apenas lembretes e check-ins |
| Diretorio real de profissionais proximos | depende de backend | hoje existe busca externa via mapa, nao uma lista proprietaria de prestadores |
| LiveKit / WebRTC nativo | depende de backend | o telecare atual usa Daily + WebView |
| Editor real de planos e precos admin | informativa/placeholder | hoje ha apenas leitura de status e placeholders de preco |
| Editor real de config de pagamentos/e-mail | informativa/placeholder | hoje ha checklist/status, nao formulario de alteracao |

## Ordem recomendada de correcao

1. Blindar qualquer dado dev-only em fluxo de auth, comecando por `forgot-password`.
2. Separar, em UI e docs, o que e operacional do que e transacional:
   - `plans`
   - `pagamento/*`
   - `admin-commercial-plans`
   - `admin-billing-config`
   - `admin-email-config`
3. Elevar as telas heuristicas para algo mais claro ou mais completo:
   - `memories`
   - `positive-memories`
   - `emotional-timeline`
   - `emotional-report`
4. Fechar a dependencia de servicos externos ou deixar isso explicitado no produto:
   - `telecare`
   - `telecare-room`
   - `support-map`
   - `sos`
5. Depois disso, rever backlog de produto para:
   - habitos/gamificacao
   - diretorio local de apoio
   - editor real de planos/configuracoes admin
