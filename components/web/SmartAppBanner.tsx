/**
 * Smart App Banner Component
 * Shows a banner on mobile web encouraging users to download or open the native app
 */

import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { 
  detectMobile, 
  getAppStoreUrl, 
  getDeepLinkUrl,
  hasUserDismissedBanner,
  dismissBanner,
  openApp,
  type MobileInfo
} from '../../utils/mobileDetection';
import { usePathname } from 'expo-router';

interface SmartAppBannerProps {
  /**
   * Custom app name to display
   */
  appName?: string;
  
  /**
   * Custom description
   */
  description?: string;
  
  /**
   * App icon URL
   */
  iconUrl?: string;
  
  /**
   * Show banner on tablets (default: false)
   */
  showOnTablets?: boolean;
  
  /**
   * Custom colors
   */
  backgroundColor?: string;
  textColor?: string;
  buttonColor?: string;
}

export function SmartAppBanner({
  appName = 'WizNote',
  description = 'Get our native app for a better experience',
  iconUrl = require('../../assets/icon.png'),
  showOnTablets = false,
  backgroundColor = '#1A1A1A',
  textColor = '#FFFFFF',
  buttonColor = '#6A5ACD',
}: SmartAppBannerProps) {
  const [visible, setVisible] = useState(false);
  const [mobileInfo, setMobileInfo] = useState<MobileInfo | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    // Only run on web
    if (Platform.OS !== 'web') {
      return;
    }

    const mobile = detectMobile();
    setMobileInfo(mobile);

    // Check if we should show the banner
    const shouldShow = 
      mobile.isMobile && 
      (showOnTablets || !mobile.isTablet) &&
      !hasUserDismissedBanner();

    setVisible(shouldShow);
  }, [showOnTablets]);

  const handleClose = () => {
    dismissBanner();
    setVisible(false);
  };

  const handleOpenApp = async () => {
    if (!mobileInfo) return;

    const deepLinkUrl = getDeepLinkUrl(pathname);
    
    try {
      await openApp(deepLinkUrl, mobileInfo, true);
    } catch (error) {
      console.error('Error opening app:', error);
      
      // Fallback to app store
      const appStoreUrl = getAppStoreUrl(mobileInfo);
      if (appStoreUrl) {
        if (Platform.OS === 'web') {
          window.open(appStoreUrl, '_blank');
        } else {
          Linking.openURL(appStoreUrl);
        }
      }
    }
  };

  if (!visible || !mobileInfo || Platform.OS !== 'web') {
    return null;
  }

  const buttonText = mobileInfo.isIOS ? 'View in App Store' : 'View in Play Store';

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <TouchableOpacity 
        style={styles.closeButton}
        onPress={handleClose}
        accessibilityLabel="Close banner"
        accessibilityRole="button"
      >
        <Ionicons name="close" size={20} color={textColor} />
      </TouchableOpacity>

      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <img 
            src={iconUrl} 
            alt={`${appName} icon`}
            style={styles.icon as any}
          />
        </View>

        <View style={styles.textContainer}>
          <Text style={[styles.appName, { color: textColor }]}>{appName}</Text>
          <Text style={[styles.description, { color: textColor }]} numberOfLines={1}>
            {description}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: buttonColor }]}
          onPress={handleOpenApp}
          accessibilityLabel={buttonText}
          accessibilityRole="button"
        >
          <Text style={styles.buttonText}>{mobileInfo.isIOS ? 'Open' : 'Get'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'fixed' as any,
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    paddingTop: 8,
    paddingBottom: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)' as any,
  },
  closeButton: {
    position: 'absolute' as any,
    top: 8,
    right: 8,
    zIndex: 1,
    padding: 4,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingRight: 24,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  icon: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  textContainer: {
    flex: 1,
    gap: 2,
  },
  appName: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 18,
  },
  description: {
    fontSize: 12,
    lineHeight: 16,
    opacity: 0.8,
  },
  button: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    minWidth: 70,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

