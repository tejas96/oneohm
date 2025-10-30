# OneOhm EPC Mobile Application

React Native mobile application for the OneOhm EPC project.

## 🚀 Quick Start

> **Note:** React Native project is not yet initialized. This is a placeholder for the upcoming mobile application.

### Prerequisites

- Node.js 20.x or higher
- npm
- **For iOS**: Xcode 14+ (macOS only), CocoaPods
- **For Android**: Android Studio, Java Development Kit (JDK) 17

### When Ready to Initialize

```bash
cd apps/mobile

# Initialize React Native project (CLI or Expo)
npx react-native@latest init . --skip-git-init

# Or use Expo for managed workflow
npx create-expo-app@latest .
```

### Development (After Initialization)

```bash
# From root directory
npm run mobile:start     # Start Metro bundler
npm run mobile:android   # Run on Android
npm run mobile:ios       # Run on iOS

# Or from this directory
npm run start
npm run android
npm run ios
```

## 📁 Planned Project Structure

```
apps/mobile/
├── src/
│   ├── components/     # Reusable components
│   ├── screens/        # Screen components
│   ├── navigation/     # Navigation configuration
│   ├── services/       # API services
│   ├── utils/          # Utility functions
│   ├── hooks/          # Custom React hooks
│   └── App.tsx         # Root component
├── android/            # Android native code
├── ios/                # iOS native code
├── package.json
└── README.md
```

## 🛠️ Tech Stack (Planned)

- **Framework**: React Native
- **Language**: TypeScript
- **State Management**: Redux Toolkit / Context API
- **Navigation**: React Navigation
- **API Client**: Axios
- **UI Library**: React Native Paper / NativeBase
- **Code Quality**: ESLint + Prettier

## 📱 Supported Platforms

- **Android**: Android 6.0 (API 23) and above
- **iOS**: iOS 13.0 and above

## 🔧 Development Scripts (After Initialization)

```bash
npm run start       # Start Metro bundler
npm run android     # Run on Android emulator/device
npm run ios         # Run on iOS simulator/device
npm run lint        # Lint code
npm run test        # Run tests
npm run build       # Build for production
```

## 🌍 Environment Variables

Create a `.env` file in this directory:

```env
# API Configuration
API_URL=http://localhost:8085
API_TIMEOUT=10000

# Add your environment variables here
```

## 🚀 Building for Production

### Android

```bash
cd android
./gradlew assembleRelease

# Output: android/app/build/outputs/apk/release/app-release.apk
```

### iOS

```bash
cd ios
pod install
# Then build in Xcode or use command line
xcodebuild -workspace YourApp.xcworkspace -scheme YourApp -configuration Release
```

## 📦 Key Dependencies (When Initialized)

### Production

- `react-native` - React Native framework
- `react` - React library
- `react-navigation` - Navigation library
- `@react-native-async-storage/async-storage` - Local storage
- `axios` - HTTP client

### Development

- `typescript` - TypeScript language
- `@types/react` - React type definitions
- `@types/react-native` - React Native type definitions
- `eslint` - Linting
- `prettier` - Code formatter
- `jest` - Testing framework

## 🧪 Testing

```bash
# Unit tests
npm run test

# E2E tests with Detox (when configured)
npm run test:e2e:ios
npm run test:e2e:android
```

## 🔗 API Integration

The mobile app will connect to the backend API:

```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.API_URL,
  timeout: parseInt(process.env.API_TIMEOUT || '10000'),
});

// Example API call
const fetchData = async () => {
  const response = await api.get('/api/endpoint');
  return response.data;
};
```

## 📱 Running on Physical Devices

### Android

1. Enable USB debugging on your device
2. Connect device via USB
3. Run `npm run android`

### iOS

1. Open `ios/YourApp.xcworkspace` in Xcode
2. Select your device
3. Click Run or use `npm run ios`

## 🚢 Deployment

### Android (Google Play)

1. Generate signed APK/AAB
2. Upload to Google Play Console
3. Follow submission guidelines

### iOS (App Store)

1. Create app in App Store Connect
2. Archive and upload via Xcode
3. Submit for review

## 🎯 Planned Features

- ✅ User authentication
- ✅ Home dashboard
- ✅ Real-time updates
- ✅ Push notifications
- ✅ Offline support
- ✅ Dark mode
- ✅ Multi-language support

## 📚 Resources

- [React Native Documentation](https://reactnative.dev/docs/getting-started)
- [React Navigation](https://reactnavigation.org/docs/getting-started)
- [Expo Documentation](https://docs.expo.dev/) (if using Expo)
- [Main Project README](../../README.md)

## 📝 Next Steps

1. Initialize React Native project
2. Set up navigation structure
3. Implement authentication flow
4. Connect to backend API
5. Add core features
6. Set up push notifications
7. Implement offline support
8. Add comprehensive testing
9. Prepare for production deployment

## 📄 License

UNLICENSED
