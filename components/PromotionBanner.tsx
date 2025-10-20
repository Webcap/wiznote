/**
 * PromotionBanner Component
 * 
 * Non-intrusive banner display for promotions.
 * Slides in from top or bottom with auto-dismiss options.
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Platform
} from 'react-native';
import type { Promotion } from '../types/Promotion';
import { usePromotions } from '../hooks/usePromotions';
import { useAuth } from '../contexts/AuthContext';

const { width } = Dimensions.get('window');

interface PromotionBannerProps {
  promotion: Promotion | null;
  visible: boolean;
  onClose?: () => void;
  onPress?: (promotion: Promotion) => void;
}

export function PromotionBanner({
  promotion,
  visible,
  onClose,
  onPress
}: PromotionBannerProps) {
  const { user } = useAuth();
  const { trackInteraction, applyPromotion } = usePromotions(user?.id);
  const [slideAnim] = useState(new Animated.Value(-100));
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (visible && promotion && !dismissed) {
      // Track view
      trackInteraction(promotion.id, 'viewed', {
        displayMethod: 'banner',
        timestamp: new Date().toISOString()
      });

      // Animate in
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 65,
        friction: 11,
        useNativeDriver: true
      }).start();

      // Auto-dismiss if configured
      const config = promotion.bannerConfig || {};
      if (config.autoHideSeconds && config.autoHideSeconds > 0) {
        const timeout = setTimeout(() => {
          handleDismiss();
        }, config.autoHideSeconds * 1000);

        return () => clearTimeout(timeout);
      }
    } else if (!visible || dismissed) {
      // Animate out
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 250,
        useNativeDriver: true
      }).start();
    }
  }, [visible, promotion, dismissed]);

  const handleDismiss = () => {
    if (promotion) {
      trackInteraction(promotion.id, 'dismissed', {
        displayMethod: 'banner',
        timestamp: new Date().toISOString()
      });
    }
    setDismissed(true);
    onClose?.();
  };

  const handlePress = () => {
    if (promotion) {
      trackInteraction(promotion.id, 'clicked', {
        displayMethod: 'banner',
        timestamp: new Date().toISOString()
      });

      if (onPress) {
        onPress(promotion);
      } else {
        applyPromotion(promotion);
      }
    }
  };

  if (!promotion || dismissed) return null;

  const config = promotion.bannerConfig || {};
  const position = config.position || 'top';
  const backgroundColor = config.backgroundColor || '#007AFF';
  const textColor = config.textColor || '#fff';
  const dismissible = config.dismissible !== false;
  const style = config.style || 'compact';
  const icon = config.icon || '🎉';

  const containerStyle = [
    styles.container,
    {
      backgroundColor,
      [position]: 0,
      transform: [
        {
          translateY: slideAnim
        }
      ]
    },
    style === 'expanded' && styles.containerExpanded
  ];

  return (
    <Animated.View style={containerStyle} pointerEvents="box-none">
      <TouchableOpacity
        style={styles.content}
        onPress={handlePress}
        activeOpacity={0.8}
      >
        {/* Icon */}
        <Text style={styles.icon}>{icon}</Text>

        {/* Text Content */}
        <View style={styles.textContainer}>
          <Text style={[styles.title, { color: textColor }]} numberOfLines={1}>
            {promotion.name}
          </Text>
          {style === 'expanded' && (
            <Text style={[styles.description, { color: textColor }]} numberOfLines={2}>
              {promotion.description}
            </Text>
          )}
        </View>

        {/* Discount Badge */}
        <View style={[styles.badge, { backgroundColor: 'rgba(255, 255, 255, 0.3)' }]}>
          <Text style={[styles.badgeText, { color: textColor }]}>
            {promotion.discountType === 'percentage'
              ? `${promotion.discountValue}%`
              : `$${promotion.discountValue}`}
          </Text>
        </View>

        {/* Dismiss Button */}
        {dismissible && (
          <TouchableOpacity
            style={styles.dismissButton}
            onPress={handleDismiss}
            hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
          >
            <Text style={[styles.dismissButtonText, { color: textColor }]}>✕</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingVertical: 12,
    zIndex: 1000,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 6
      },
      android: {
        elevation: 6
      },
      web: {
        boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
      }
    })
  },
  containerExpanded: {
    paddingVertical: 16
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  icon: {
    fontSize: 24
  },
  textContainer: {
    flex: 1
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold'
  },
  description: {
    fontSize: 13,
    marginTop: 2,
    opacity: 0.9
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12
  },
  badgeText: {
    fontSize: 14,
    fontWeight: 'bold'
  },
  dismissButton: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center'
  },
  dismissButtonText: {
    fontSize: 18,
    fontWeight: '600',
    opacity: 0.8
  }
});

export default PromotionBanner;

