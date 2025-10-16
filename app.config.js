export default ({ config }) => {
  const IS_DEV = process.env.APP_VARIANT === 'development';
  const IS_PREVIEW = process.env.APP_VARIANT === 'preview';

  const getUniqueIdentifier = () => {
    if (IS_DEV) return 'com.WizNote.app.dev';
    if (IS_PREVIEW) return 'com.WizNote.app.preview';
    return 'com.WizNote.app';
  };

  const getAppName = () => {
    if (IS_DEV) return 'WizNote (Dev)';
    if (IS_PREVIEW) return 'WizNote (Preview)';
    return 'WizNote';
  };

  return {
    ...config,
    name: getAppName(),
    scheme: 'wiznote',
    icon: './assets/icon.png',
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: IS_DEV ? '#1A1A1A' : '#ffffff'
    },
    ios: {
      ...config.ios,
      bundleIdentifier: getUniqueIdentifier(),
      associatedDomains: [
        'applinks:wiznote.app',
        'applinks:*.wiznote.app',
      ],
      infoPlist: {
        ...config.ios?.infoPlist,
        NSAppTransportSecurity: {
          NSAllowsArbitraryLoads: false,
          NSExceptionDomains: {
            'googleapis.com': {
              NSExceptionAllowsInsecureHTTPLoads: false,
              NSExceptionMinimumTLSVersion: '1.2',
            },
          },
        },
      },
    },
    android: {
      ...config.android,
      package: getUniqueIdentifier(),
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: IS_DEV ? '#1A1A1A' : '#ffffff'
      },
      intentFilters: [
        {
          action: 'VIEW',
          autoVerify: true,
          data: [
            {
              scheme: 'https',
              host: '*.wiznote.app',
              pathPrefix: '/auth/callback',
            },
          ],
          category: ['BROWSABLE', 'DEFAULT'],
        },
      ],
      permissions: [
        ...(config.android?.permissions || []),
        'android.permission.INTERNET',
        'android.permission.ACCESS_NETWORK_STATE',
      ],
    },
    plugins: [
      ...(config.plugins || []),
      'expo-font',
      'expo-web-browser'
    ],
    extra: {
      ...config.extra,
      eas: {
        projectId: "eb4bee18-b296-4da4-961e-2b100db5b29b"
      },
      GEMINI_API_KEY: process.env.GEMINI_API_KEY,
      IS_DEV,
      IS_PREVIEW,
    },
  };
};