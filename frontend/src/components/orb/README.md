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

A prop `audioLevel` aceita valores de `0` a `1`. O hook `useMicrophoneLevel` usa `expo-audio`, pede permissão somente quando o usuário toca em ativar e normaliza `metering` para essa faixa.

Não peça permissão de microfone ao abrir a Home. Solicite apenas quando o usuário ativar explicitamente um modo de voz.

```tsx
const microphone = useMicrophoneLevel();

<AnimatedOrb
  state={microphone.isActive ? "listening" : "idle"}
  audioLevel={microphone.level}
/>
```

Esta versão mede amplitude visual. Ela não transcreve, não envia áudio e não grava conteúdo para o backend.
