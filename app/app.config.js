export default {
  expo: {
    name: '계발자들',
    slug: 'vibers-vibers',
    scheme: 'vibers',
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
      bundleIdentifier: 'com.vibers.vibers',
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#050505',
      },
      package: 'com.vibers.vibers',
    },
    plugins: [
      'expo-router',
      'expo-font',
      'expo-secure-store',
      'expo-asset',
    ],
    extra: {
      eas: {
        projectId: '',
      },
    },
  },
};
