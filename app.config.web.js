export default {
  name: 'WizNote',
  slug: 'WizNote',
  version: '1.5.3',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  splash: {
    image: './assets/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#1A1A1A'
  },
  assetBundlePatterns: [
    '**/*'
  ],
  ios: {
    supportsTablet: true
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#1A1A1A'
    }
  },
  web: {
    favicon: './assets/favicon.png',
    bundler: 'metro',
    output: 'static',
    title: 'WizNote',
    // PWA configuration
    pwa: {
      name: 'WizNote',
      shortName: 'WizNote',
      description: 'A modern note-taking app',
      themeColor: '#6A5ACD',
      backgroundColor: '#1A1A1A',
      display: 'standalone',
      orientation: 'portrait',
      scope: '/',
      startUrl: '/',
      icons: [
        {
          src: './assets/icon.png',
          sizes: '192x192',
          type: 'image/png'
        },
        {
          src: './assets/icon.png',
          sizes: '512x512',
          type: 'image/png'
        }
      ]
    },
    // Web-specific optimizations
    build: {
      babel: {
        include: ['@expo/vector-icons']
      }
    },
    // Service worker for offline support
    serviceWorker: {
      src: './sw.js',
      scope: '/'
    }
  },
  plugins: [
    'expo-router'
  ],
  scheme: ['wiznote'],
  experiments: {
    typedRoutes: true
  }
}; 