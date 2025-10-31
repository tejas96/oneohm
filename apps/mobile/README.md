# OneOhm EPC Mobile App

React Native mobile application for OneOhm EPC following NX monorepo best practices.

## 🚀 Features

- ✅ React Navigation (Stack & Tab) with strict typing
- ✅ Authentication flow with context
- ✅ Theme system
- ✅ Reusable components
- ✅ Shared types and utilities from libs
- ✅ NX monorepo structure

## 📁 Project Structure

```
apps/mobile/src/
├── app/
│   └── App.tsx                # Main app with providers
├── components/                # Mobile-specific UI components
│   ├── Button.tsx
│   ├── Input.tsx
│   ├── Card.tsx
│   └── LoadingScreen.tsx
├── constants/                 # Mobile constants & theme
│   ├── theme.ts              # Colors, Typography, Spacing
│   └── index.ts
├── contexts/                  # State management
│   ├── AuthContext.tsx
│   ├── ThemeContext.tsx
│   └── index.ts
├── navigation/                # Navigation (strictly typed)
│   ├── RootNavigator.tsx
│   ├── AuthNavigator.tsx
│   ├── MainNavigator.tsx
│   ├── types.ts              # Type-safe navigation
│   └── index.ts
├── screens/                   # App screens
│   ├── SplashScreen.tsx
│   ├── LoginScreen.tsx
│   ├── HomeScreen.tsx
│   └── ProfileScreen.tsx
├── utils/                     # Mobile-specific utils
│   ├── storage.ts            # React Native storage
│   └── index.ts              # Re-exports shared-utils
└── main.tsx

libs/shared-types/              # Shared types across all apps
libs/shared-utils/              # Shared utilities
```

## 📦 NX Monorepo Structure

This app follows NX best practices:

- **Dependencies**: Managed at root level in `/package.json`
- **Shared Types**: `@oneohm-epc/shared-types` for common types
- **Shared Utils**: `@oneohm-epc/shared-utils` for common functions
- **Strict Typing**: Fully typed navigation and components

### Import from Shared Libraries

```tsx
// Import shared types
import type { User, AuthState } from '@oneohm-epc/shared-types';

// Import shared utilities
import { validators, formatDate } from '@oneohm-epc/shared-utils';
```

## 🔐 Authentication

```tsx
import { useAuth } from '../contexts';

const { user, login, logout, isAuthenticated } = useAuth();
```

## 🗺️ Navigation (Strictly Typed)

```tsx
// Navigation types are exported from navigation/types.ts
import type { AuthStackScreenProps, MainTabScreenProps } from '../navigation/types';

// Example: Login screen with typed navigation
type Props = AuthStackScreenProps<'Login'>;

export const LoginScreen: React.FC<Props> = ({ navigation, route }) => {
  // navigation and route are fully typed
  navigation.navigate('Signup'); // ✅ Type-safe
  // navigation.navigate('InvalidScreen'); // ❌ TypeScript error
};
```

## 🔧 Development

### Install Dependencies
```bash
npm install
```

### Start Development Server
```bash
npm run mobile:start
```

### Run on Android
```bash
npm run mobile:start:android
```

### Run on iOS
```bash
npm run mobile:ios
```

### Sync Dependencies (iOS)
```bash
npm run mobile:sync:ios
```

### Sync Dependencies (Android)
```bash
npm run mobile:sync:android
```

## ✅ Key Principles

1. **Shared code in libs**: Common types and utils in `libs/shared-*`
2. **Dependencies at root**: All npm packages in root `package.json`
3. **Strict typing**: All navigation and props are fully typed
4. **Minimal & clean**: No over-engineering, just foundations

## 📄 License

UNLICENSED
