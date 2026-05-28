# Voice Orb

`AnimatedOrb` representa o estado emocional do Bergmann sem voz real nesta versão.

Uso:

```tsx
<AnimatedOrb state="thinking" audioLevel={0.3} size={220} />
```

Estados:

- `idle`
- `listening`
- `thinking`
- `speaking`
- `crisis`
- `low_energy`
- `error`
- `silent_presence`

## Microfone futuro

A prop `audioLevel` aceita valores de `0` a `1`. O hook `useMicrophoneLevel` usa `expo-audio`, pede permissao somente quando o usuario toca em ativar e normaliza `metering` para essa faixa.

Nao peca permissao de microfone ao abrir a Home. Solicite apenas quando o usuario ativar explicitamente um modo de voz.

```tsx
const microphone = useMicrophoneLevel();

<AnimatedOrb
  state={microphone.isActive ? "listening" : "idle"}
  audioLevel={microphone.level}
/>
```

Esta versao mede amplitude visual. Ela nao transcreve, nao envia audio e nao grava conteudo para o backend.
