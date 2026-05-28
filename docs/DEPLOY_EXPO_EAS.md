# Build Expo EAS

## Preparação

```bash
cd frontend
npm ci
npx expo config --type public
```

Configure em EAS:

- `EXPO_PUBLIC_API_URL=https://sua-api.onrender.com`
- `APP_ENV=production`

## Android

```bash
npx eas build --platform android --profile preview
```

Para produção:

```bash
npx eas build --platform android --profile production
```

## Identificadores

- Android package: `com.zetta.bergmann`
- iOS bundle identifier: `com.zetta.bergmann`

## Observação

Este MVP não usa voz, WebSocket, realtime ou módulos nativos customizados. Expo Go deve funcionar para desenvolvimento local.
