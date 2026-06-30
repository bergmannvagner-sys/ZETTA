# Voice Orb

`AnimatedOrb` representa o estado emocional do Bergmann. A orb e visual; o fluxo
de voz real vive no chat e usa `useMicrophoneLevel` + `sendVoiceChatAudio` quando
o usuario ativa o microfone explicitamente.

Uso:

```tsx
<AnimatedOrb state="thinking" audioLevel={0.3} size={220} />
```

Estados:

- `idle`
- `listening`
- `thinking`
- `speaking`
- `breathing`
- `calm`
- `sos`
- `crisis`
- `low_energy`
- `error`
- `silent_presence`
- `journaling`
- `assistant`

## Microfone

A prop `audioLevel` aceita valores de `0` a `1`. O hook `useMicrophoneLevel`
usa `expo-audio`, pede permissao somente quando o usuario toca em ativar e
normaliza `metering` para essa faixa.

Nao pegue permissao de microfone ao abrir a Home. Solicite apenas quando o
usuario ativar explicitamente um modo de voz.

```tsx
const microphone = useMicrophoneLevel();

<AnimatedOrb
  state={microphone.isActive ? "listening" : "idle"}
  audioLevel={microphone.level}
/>
```

O hook mede a amplitude visual. A transcricao e o envio de audio acontecem no
fluxo de chat, nao dentro da orb.
