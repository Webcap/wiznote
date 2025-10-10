// Learn more https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Add CSS as an asset type so Metro doesn't try to parse it as JavaScript
config.resolver = {
  ...config.resolver,
  assetExts: [...(config.resolver?.assetExts || []), 'css'],
  sourceExts: config.resolver?.sourceExts?.filter(ext => ext !== 'css') || ['tsx', 'ts', 'jsx', 'js', 'json'],
};

module.exports = config;

