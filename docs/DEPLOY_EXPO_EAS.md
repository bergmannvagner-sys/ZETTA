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
- `EXPO_PUBLIC_SUPPORT_EMAIL=contato@seu-dominio.com`

Para este repositorio, o perfil de producao ja aponta para:

```text
EXPO_PUBLIC_API_URL=https://zetta-bergmann.onrender.com
APP_ENV=production
```

O perfil `preview` interno tambem usa a mesma API para evitar builds sem backend configurado.

As rotas públicas de loja ficam em:

- `/privacy-policy`
- `/terms`

Use estas URLs na política de privacidade e nos termos de uso da loja.

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
