// Learn more https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Add CSS as an asset type so Metro doesn't try to parse it as JavaScript
// Also ensure platform-specific extensions are prioritized
config.resolver = {
  ...config.resolver,
  assetExts: [...(config.resolver?.assetExts || []), 'css'],
  // Platform-specific files (.native.ts) should be found before regular (.ts) files
  sourceExts: ['tsx', 'ts', 'jsx', 'js', 'json', 'mjs', 'cjs'].filter(ext => ext !== 'css'),
  // Explicitly set platform file extensions
  platforms: ['ios', 'android', 'native', 'web'],
  // Disable package exports to avoid .mjs resolution issues
  unstable_enablePackageExports: false,
  // Disable symlinks which can cause resolution issues
  unstable_enableSymlinks: false,
};

module.exports = config;

