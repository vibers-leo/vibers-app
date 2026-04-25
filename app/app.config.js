export default {
  expo: {
    name: '바이버스챗',
    slug: 'vibers-chat',
    scheme: 'viberschat',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'dark',
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#050505',
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.vibers.chat',
      infoPlist: {
        CFBundleDisplayName: '바이버스챗',
        NSMicrophoneUsageDescription: '바이버스챗이 음성 입력을 위해 마이크 권한이 필요합니다.',
        NSSpeechRecognitionUsageDescription: '바이버스챗이 음성 인식을 위해 권한이 필요합니다.',
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#050505',
      },
      package: 'com.vibers.chat',
      permissions: ['RECORD_AUDIO', 'INTERNET', 'ACCESS_NETWORK_STATE'],
    },
    plugins: [
      'expo-router',
      'expo-font',
      'expo-secure-store',
      'expo-asset',
      './plugins/withXcode26Fix',
      [
        '@sentry/react-native/expo',
        {
          organization: process.env.SENTRY_ORG || '',
          project: process.env.SENTRY_PROJECT || '',
        },
      ],
      'expo-image',
      [
        'expo-speech-recognition',
        {
          microphonePermission: '바이버스챗이 음성 입력을 위해 마이크 권한이 필요합니다.',
          speechRecognitionPermission: '바이버스챗이 음성 인식을 위해 권한이 필요합니다.',
        },
      ],
    ],
    extra: {
      eas: {
        projectId: '986e2c39-3791-4cc3-94cf-9bf258ff8278',
      },
    },
  },
};
