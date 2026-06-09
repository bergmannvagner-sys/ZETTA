# Bergmann Mobile Premium UX

## Objetivo

Aplicativo mobile-first de saúde mental com navegação simples, baixa carga cognitiva e aparência premium. O usuário comum deve acessar as funções principais em até duas ações: aba inferior ou Home.

## Navegação Principal

Máximo de 5 abas:

- Início: saudação, orb, indicadores rápidos e ações principais.
- Check-in: registro rápido de humor, energia, ansiedade e estresse.
- IA: conversa com Bergmann.
- Progresso: resumo emocional e evolução.
- Perfil: conta, idioma, privacidade e acesso.

Rotas secundárias continuam acessíveis pela Home ou Perfil e não aparecem na tab bar para evitar poluição.

## Responsividade

Breakpoints:

- Mobile: até 767px.
- Tablet: 768px a 1023px.
- Web/Desktop: 1024px ou mais.

Regras:

- Conteúdo centralizado no web/tablet com `maxWidth` entre 960px e 1120px.
- Padding horizontal reduzido em telas de 320px.
- Cards e ações usam flex-wrap, flex-grow e percentuais, não largura fixa.
- Botões com toque mínimo de 48px.
- Scroll com safe area e espaço para a tab bar inferior.

## Design System

Cores principais:

- Primary: `#8B5CF6`
- Primary Dark: `#7C3AED`
- Primary Light: `#C4B5FD`
- Background: `#FAFAFC`
- Surface: `#FFFFFF`
- Surface Soft: `#F5F3FF`

Tema escuro:

- Background: `#120F1F`
- Surface: `#1C1630`
- Surface Soft: `#261D42`
- Primary: `#A78BFA`

Espaçamento:

- 8, 16, 24, 32, 48

Raios:

- Cards: 20px a 24px.
- Pílulas: 999px.

Componentes base:

- `Screen`
- `ScreenContainer`
- `Button`
- `Card`
- `Input`
- `Modal`
- `Badge`
- `Loading`
- `EmptyState`
- `Header`
- `SectionTitle`

## Wireframes Funcionais

### Início

1. Marca compacta.
2. Card principal com orb viva.
3. Saudação personalizada.
4. CTA principal: Conversar com Bergmann.
5. CTAs secundários: Check-in e SOS.
6. Indicadores: Humor, Energia, Sono, Progresso.
7. Chips de cuidado: Diário, Rotina, Relatório, Compartilhamento, Teleatendimento, SOS.

### Check-in

1. Header curto.
2. Seleção de humor em chips grandes.
3. Escalas de 1 a 10 com botões de 48px.
4. Nota opcional.
5. CTA principal no fim da tela.

### IA

1. Orb no topo.
2. Estado da conversa.
3. Mensagens em bolhas.
4. Campo de texto responsivo.
5. Botão de envio sempre grande e visível.

### Progresso

1. Header de resumo.
2. Métricas rápidas.
3. CTA para gerar/atualizar relatório.
4. Card de relatório ou empty state claro.

### Perfil

1. Dados essenciais.
2. Idioma.
3. Plano e acesso.
4. Admin shortcuts apenas para SUPER_ADMIN.

## Acessibilidade

- Textos principais usam 15px ou mais.
- Botões usam contraste alto e `accessibilityRole`.
- Estados selecionados usam `accessibilityState`.
- Erros importantes são selecionáveis.
- Conteúdo sensível permanece em rotas protegidas por auth/RBAC.
