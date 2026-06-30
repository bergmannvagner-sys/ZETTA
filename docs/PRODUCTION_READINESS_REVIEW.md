# ZETTA Bergmann - Revisao de prontidao para producao

Data da revisao: 2026-06-25

## Escopo analisado

- Frontend Expo/React Native, incluindo Home, Chat, Diario, SOS, rotas protegidas, internacionalizacao e build Android.
- Backend FastAPI, incluindo roteadores principais, autenticacao, RBAC, headers de seguranca e integracao de servicos.
- Documentacao existente de deploy, ambiente, RBAC, QA local e Render.
- Artefatos Android de release gerados localmente.

## O que esta correto

- A base real do projeto permanece unica: `frontend` Expo e `backend` FastAPI.
- A orb continua sendo o elemento central da experiencia, sem substituicao por avatar humano, robo ou circulo generico.
- A Home do usuario comum continua leve e centrada na orb.
- O cadastro publico nao cria `SUPER_ADMIN`.
- As rotas sensiveis do app usam guardas por sessao, status, consentimento, perfil e assinatura.
- O backend concentra validacoes de autenticacao/RBAC em dependencias e rotas protegidas.
- O Diario ja possuia criacao, edicao e exclusao de registros.
- O chat ja possui fallback HTTP quando tempo real nao esta disponivel.
- A documentacao de deploy em Render e EAS ja existe.

## Problemas encontrados nesta etapa

- A Home nao tinha uma secao explicita de recursos de bem-estar com respiracao, meditacao, relaxamento, sono, ansiedade e estresse.
- O detalhe do indice de risco na Home estava fixo em portugues, fora do mecanismo de traducao.
- O Diario tinha textos fixos em portugues em confirmacao de exclusao, estado de edicao e botoes.
- Apos criar, editar ou excluir registro no Diario, a Home podia manter dados antigos ate o fim do tempo de cache.
- O header `Permissions-Policy` bloqueava camera, microfone e geolocalizacao mesmo para a propria origem web, conflitando com recursos web de voz, teleatendimento e localizacao autorizada.

## Correcoes aplicadas

- Adicionada a secao `Recursos de bem-estar` na Home com acessos para respiracao guiada, meditacao breve, relaxamento muscular, mindfulness, sono saudavel, ansiedade, estresse, exercicios rapidos, sons relaxantes e atencao plena.
- Reutilizadas rotas ja existentes para evitar criar telas paralelas ou quebrar fluxo de navegacao.
- Internacionalizados textos fixos da Home e do Diario em portugues, ingles e espanhol.
- Adicionado `accessibilityLabel` aos chips de acao da Home.
- Sincronizada a invalidacao de cache entre Diario e Home apos criacao, edicao e exclusao de registros.
- Ajustado `Permissions-Policy` para permitir camera, microfone e geolocalizacao apenas para a propria origem (`self`).
- Removidas do release Android as permissoes legadas/desnecessarias `READ_EXTERNAL_STORAGE`, `WRITE_EXTERNAL_STORAGE` e `SYSTEM_ALERT_WINDOW`.
- Desativado backup automatico Android (`allowBackup=false`) para reduzir risco sobre dados sensiveis locais.

## Arquivos alterados

- `frontend/app/(app)/home.tsx`
- `frontend/app/(app)/journal.tsx`
- `frontend/src/i18n/translations.ts`
- `backend/app/main.py`
- `frontend/android/app/src/main/AndroidManifest.xml`
- `docs/PRODUCTION_READINESS_REVIEW.md`
- `docs/ZETTA_MULTIMODAL_PREVENTIVE_INTELLIGENCE_ENGINE.md`

## Artefatos Android finais

- APK release: `frontend/build-artifacts/ZETTA-Bergmann-Android-Release-Final/zetta-bergmann-release.apk`
- AAB release: `frontend/build-artifacts/ZETTA-Bergmann-Android-Release-Final/zetta-bergmann-release.aab`
- Simbolos nativos: `frontend/build-artifacts/ZETTA-Bergmann-Android-Release-Final/native-debug-symbols.zip`
- ZIP de entrega: `frontend/build-artifacts/ZETTA-Bergmann-Android-Release-Final.zip`

Hashes SHA-256 principais:

- APK: `4CDC7A27286197FFDBB61144240A599D83B81E56B5A22A70FB1B1D074B159596`
- AAB: `E57D3C09ED6D345FDAF16FDD8BFF2733521D45C13409542FBAF26D662970C75C`
- Simbolos nativos: `842F5C097C54BD4D8BABCE2E20E0D2CA02C1322B8335C96C88A031ECEB45DF2C`

## Validacoes obrigatorias

As validacoes devem ser executadas apos qualquer alteracao de codigo:

```powershell
cd backend
python -m compileall app
python -m pytest app/tests/test_public_contract.py app/tests/test_auth_rbac.py
```

```powershell
cd frontend
npm run typecheck
npm run check:api-url
npx expo config --type public
```

Para Android release local:

```powershell
cd frontend/android
./gradlew assembleRelease bundleRelease
```

## Pendencias reais antes de publicacao assistida na Play Store

- Validar login, cadastro, recuperacao de senha, chat, Diario, relatorios e logout contra o backend de producao real.
- Validar instalacao e abertura em aparelho Android fisico ou emulador online; o build local comprova compilacao, mas nao substitui QA em dispositivo.
- Confirmar variaveis de producao: API, Groq, banco, Redis, Mercado Pago, CORS, segredo de criptografia e bootstrap do super admin desligado apos criacao.
- Subir o AAB pelo Google Play Console com conta do proprietario do app.
- Conferir politica de privacidade, seguranca de dados, classificacao indicativa e declaracoes de saude/IA exigidas pela loja.

## Riscos reais

- O app lida com dados emocionais e de saude; consentimento, revogacao, logs de auditoria e minimo necessario precisam continuar sendo testados a cada release.
- O app nao deve prometer diagnostico, prescricao ou substituicao de profissional.
- O AAB/APK gerado localmente depende da chave de upload local. Perder essa chave pode impedir atualizacoes futuras sem processo de recuperacao na Play Console.
- Dependencias Expo/React Native podem aparecer em auditorias `npm audit` por transitive dependencies; aplicar `npm audit fix --force` sem migracao planejada pode quebrar o app.
