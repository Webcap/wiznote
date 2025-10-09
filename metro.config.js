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
  sourceExts: ['tsx', 'ts', 'jsx', 'js', 'json'],
  platforms: ['ios', 'android', 'web'],
};

module.exports = config;

