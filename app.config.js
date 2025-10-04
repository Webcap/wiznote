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
    ios: {
      ...config.ios,
      bundleIdentifier: getUniqueIdentifier(),
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
      GEMINI_API_KEY: process.env.GEMINI_API_KEY,
      IS_DEV,
      IS_PREVIEW,
    },
  };
};