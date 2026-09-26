import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'PRITHVI-AI',
  slug: 'prithvi-ai-mobile',
  version: '1.1.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  scheme: 'prithvi',
  assetBundlePatterns: ['**/*'],
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.prithvi.ai',
    infoPlist: {
      NSLocationWhenInUseUsageDescription:
        'PRITHVI-AI uses your location to show India-only weather and alerts for your pin.',
      NSMicrophoneUsageDescription: 'Microphone is used for Advisor voice input.',
      NSSpeechRecognitionUsageDescription: 'Speech recognition is used for Advisor voice input.',
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#0b1220',
    },
    package: 'com.prithvi.ai',
    permissions: [
      'ACCESS_COARSE_LOCATION',
      'ACCESS_FINE_LOCATION',
      'RECORD_AUDIO',
      'INTERNET',
    ],
  },
  web: {
    favicon: './assets/favicon.png',
  },
  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      {
        image: './assets/splash.png',
        backgroundColor: '#0b1220',
        resizeMode: 'contain',
      },
    ],
    [
      'expo-location',
      {
        locationWhenInUsePermission:
          'PRITHVI-AI uses your location to show India-only weather and alerts for your pin.',
      },
    ],
  ],
  extra: {
    apiBase: process.env.EXPO_PUBLIC_API_BASE || 'https://rituchakra-api.onrender.com',
  },
});
