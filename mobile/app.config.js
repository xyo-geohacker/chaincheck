import 'dotenv/config';

export default ({ config }) => ({
  ...config,
  name: 'ChainCheck',
  slug: 'chaincheck',
  version: '0.1.0',
  orientation: 'portrait',
  scheme: 'chaincheck',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#0F172A'
  },
  assetBundlePatterns: ['**/*'],
  ios: {
    supportsTablet: true
  },
  android: {
    package: 'com.chaincheck.app',
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#0F172A'
    }
  },
  web: {
    bundler: 'metro',
    favicon: './assets/favicon.png'
  },
  plugins: [
    [
      'expo-location',
      {
        isAndroidBackgroundLocationEnabled: false,
        locationAlwaysAndWhenInUsePermission:
          'Allow ChainCheck to access your location for delivery verification.'
      }
    ],
    'expo-camera'
    // Note: react-native-nfc-manager doesn't need to be in plugins array
    // It's a regular React Native library, not an Expo plugin
  ],
  extra: {
    eas: {
      projectId: '00000000-0000-0000-0000-000000000000'
    },
    apiUrl: process.env.EXPO_PUBLIC_API_URL
  }
});

