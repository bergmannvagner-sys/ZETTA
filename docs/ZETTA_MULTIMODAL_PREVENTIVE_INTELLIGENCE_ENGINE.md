# ZETTA Multimodal Preventive Intelligence Engine

Este documento descreve a arquitetura de inteligencia preventiva do ZETTA Bergmann para fins tecnicos, produto, seguranca e avaliacao futura de propriedade intelectual. Nao e parecer juridico, medico ou regulatorio.

## Objetivo

O motor preventivo do ZETTA deve organizar sinais emocionais autorizados pelo usuario para apoiar escuta, reflexao, seguranca e acompanhamento pessoal, sem diagnosticar, prescrever medicacao ou substituir atendimento humano.

## Principios obrigatorios

- Consentimento explicito antes de usar dados sensiveis.
- Controle granular de compartilhamento.
- Revogacao simples.
- Minimo necessario.
- Explicabilidade em linguagem simples.
- Separacao entre suporte emocional, risco e atendimento profissional.
- Nenhum compartilhamento de conversas ou Diario com empresas sem autorizacao explicita.
- Fallback seguro quando IA, rede, voz ou tempo real falharem.

## Entradas autorizadas

- Conversas com Bergmann.
- Registros do Diario emocional.
- Check-ins de humor, energia, sono e intensidade.
- Sinais de uso do app, como ultima interacao e frequencia de registros.
- Relatorios emocionais gerados a partir de dados do proprio usuario.
- Dados profissionais ou institucionais somente quando houver autorizacao e perfil permitido.

Entradas futuras podem incluir voz, padroes de pausa e sinais de contexto, desde que a coleta seja informada, proporcional e revogavel.

## Saidas do motor

- Indice emocional.
- Indice de estabilidade.
- Indice de bem-estar.
- Indice de risco.
- Estado resumido: sem dados, estavel, atencao ou delicado.
- Sugestoes de cuidado leve: presenca, respiracao, Diario, rotina, SOS e acompanhamento autorizado.
- Resumos emocionais para o proprio usuario.

## Estados da orb

A orb representa presenca, acolhimento, escuta e seguranca. Os estados previstos no produto sao:

- `idle`
- `listening`
- `thinking`
- `speaking`
- `crisis`
- `low_energy`
- `silent_presence`
- `error`
- `journaling`
- `assistant`

Estados adicionais de interface, como respiracao ou calma, podem existir quando mantiverem a identidade visual e nao substituirem a orb por avatar humano, robo ou circulo generico.

## Fluxo preventivo

1. O usuario registra conversa, Diario ou check-in.
2. O app envia somente dados necessarios para a API autorizada.
3. O backend valida sessao, perfil, status, consentimento e permissao.
4. O motor calcula indicadores agregados e nao diagnosticos.
5. A interface apresenta o resultado como apoio, nao como decisao clinica.
6. Em sinais de crise, a resposta prioriza seguranca humana, CVV 188 no Brasil e emergencia local em risco imediato.

## Limites de seguranca da IA Bergmann

- Nao diagnosticar transtornos.
- Nao prescrever ou ajustar medicacao.
- Nao afirmar cura.
- Nao substituir psicologo, psiquiatra, medico, emergencia ou rede de apoio.
- Nao usar contexto sem autorizacao.
- Nao expor dados sensiveis em logs.
- Nao compartilhar dados emocionais com empresa, patrocinador ou instituicao sem autorizacao explicita.

## Areas com potencial de diferenciacao

- Orb como representacao afetiva de estado emocional e presenca, sem avatar humano.
- Combinacao de Diario, check-in, chat e relatorios em indices leves e nao diagnosticos.
- Separacao entre cuidado individual, acompanhamento autorizado e visoes agregadas institucionais.
- Fluxo de crise com baixa estimulacao visual e orientacao humana.
- Motor contextual com fallback seguro e foco em LGPD.

Esses pontos podem apoiar uma avaliacao juridica futura, mas patente, marca ou registro dependem de analise especializada.

## Requisitos para evolucao

- Testes automatizados para calculo dos indices.
- Evidencia de consentimento e revogacao em cada uso de dado sensivel.
- Observabilidade sem logs de senha, token, refresh token, API keys ou dados emocionais integrais.
- Revisao de acessibilidade em telas com orb, voz e SOS.
- QA em aparelho fisico para voz, permissao de microfone, notificacoes e deep links.
