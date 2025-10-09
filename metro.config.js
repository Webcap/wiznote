// Learn more https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Just use default Expo config with minimal modifications
// The .web.tsx platform-specific files will still work automatically

module.exports = config;

