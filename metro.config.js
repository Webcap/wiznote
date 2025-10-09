// Learn more https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Ensure proper platform extension resolution for web
// When on web, Metro will look for files in this order:
// 1. Component.web.tsx
// 2. Component.tsx
config.resolver = {
  ...config.resolver,
  sourceExts: ['tsx', 'ts', 'jsx', 'js', 'json', 'mjs', 'cjs'],
  platforms: ['ios', 'android', 'web'],
  unstable_enablePackageExports: false, // Disable package exports to avoid ESM issues
};

// Add transformer options for better compatibility
config.transformer = {
  ...config.transformer,
  getTransformOptions: async () => ({
    transform: {
      experimentalImportSupport: false,
      inlineRequires: true,
    },
  }),
};

module.exports = config;

