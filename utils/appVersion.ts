import Constants from 'expo-constants';
import { Platform } from 'react-native';
import packageJson from '../package.json';

/**
 * Get the current app version
 * Tries multiple sources to ensure version is available across all platforms
 */
export function getAppVersion(): string {
  // Try to get version from expo-constants (works in production builds)
  if (Constants.expoConfig?.version) {
    return Constants.expoConfig.version;
  }

  // Fallback to package.json (works in development)
  if (packageJson.version) {
    return packageJson.version;
  }

  // Ultimate fallback
  return '1.0.0';
}

/**
 * Get the build number (native only)
 */
export function getBuildNumber(): string | undefined {
  // In development, show a dev build indicator
  if (__DEV__ && Platform.OS !== 'web') {
    return 'dev';
  }

  // Native build number (iOS/Android)
  const iosBuild = Constants.expoConfig?.ios?.buildNumber;
  const androidBuild = Constants.expoConfig?.android?.versionCode;
  
  if (iosBuild) return iosBuild;
  if (androidBuild) return androidBuild.toString();
  
  return undefined;
}

/**
 * Get full version string with build number if available
 */
export function getFullVersion(): string {
  const version = getAppVersion();
  const buildNumber = getBuildNumber();
  
  if (buildNumber) {
    return `${version} (${buildNumber})`;
  }
  
  return version;
}

/**
 * Get app name
 */
export function getAppName(): string {
  return Constants.expoConfig?.name || packageJson.name || 'WizNote';
}

