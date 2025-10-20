/**
 * PromotionCard Component
 * 
 * In-page promotion card for displaying promotions within screens
 * (e.g., on join-premium page above plan selection).
 */

import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform
} from 'react-native';
import type { Promotion } from '../types/Promotion';
import { usePromotions } from '../hooks/usePromotions';
import { useAuth } from '../contexts/AuthContext';

interface PromotionCardProps {
  promotion: Promotion;
  onPress?: (promotion: Promotion) => void;
  compact?: boolean;
}

export function PromotionCard({
  promotion,
  onPress,
  compact = false
}: PromotionCardProps) {
  const { user } = useAuth();
  const { trackInteraction, applyPromotion } = usePromotions(user?.id);

  useEffect(() => {
    // Track view when card is mounted
    if (user) {
      trackInteraction(promotion.id, 'viewed', {
        displayMethod: 'inline',
        timestamp: new Date().toISOString()
      });
    }
  }, [promotion.id, user]);

  const handlePress = () => {
    trackInteraction(promotion.id, 'clicked', {
      displayMethod: 'inline',
      timestamp: new Date().toISOString()
    });

    if (onPress) {
      onPress(promotion);
    } else {
      applyPromotion(promotion);
    }
  };

  const config = promotion.inlineConfig || {};
  const variant = config.variant || 'card';
  const featured = config.featured || false;
  const borderStyle = config.borderStyle || 'solid';
  const gradient = config.gradient || false;

  const isExpiringSoon = () => {
    const end = new Date(promotion.endDate).getTime();
    const now = new Date().getTime();
    const hoursLeft = (end - now) / (1000 * 60 * 60);
    return hoursLeft > 0 && hoursLeft <= 24;
  };

  const containerStyle = [
    styles.container,
    variant === 'banner' && styles.containerBanner,
    featured && styles.containerFeatured,
    borderStyle === 'dashed' && styles.containerDashed,
    gradient && styles.containerGradient
  ];

  if (compact) {
    return (
      <TouchableOpacity style={[styles.container, styles.containerCompact]} onPress={handlePress}>
        <View style={styles.compactContent}>
          <View style={styles.compactLeft}>
            <Text style={styles.compactTitle}>{promotion.name}</Text>
            <Text style={styles.compactSubtitle}>
              {promotion.discountType === 'percentage'
                ? `Save ${promotion.discountValue}%`
                : `Save $${promotion.discountValue}`}
            </Text>
          </View>
          <View style={styles.applyButtonCompact}>
            <Text style={styles.applyButtonTextCompact}>Apply</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity style={containerStyle} onPress={handlePress} activeOpacity={0.9}>
      {/* Featured Badge */}
      {featured && (
        <View style={styles.featuredBadge}>
          <Text style={styles.featuredBadgeText}>⭐ LIMITED TIME</Text>
        </View>
      )}

      {/* Expiring Soon Badge */}
      {isExpiringSoon() && (
        <View style={styles.urgencyBadge}>
          <Text style={styles.urgencyBadgeText}>⏰ Ends Soon!</Text>
        </View>
      )}

      {/* Main Content */}
      <View style={styles.content}>
        {/* Left Side: Text */}
        <View style={styles.textSection}>
          <Text style={styles.emoji}>🎉</Text>
          <View style={styles.textContent}>
            <Text style={styles.title}>{promotion.name}</Text>
            <Text style={styles.description} numberOfLines={2}>
              {promotion.description}
            </Text>
            <Text style={styles.validity}>
              Valid until {new Date(promotion.endDate).toLocaleDateString()}
            </Text>
          </View>
        </View>

        {/* Right Side: Discount & CTA */}
        <View style={styles.ctaSection}>
          <View style={styles.discountBadge}>
            <Text style={styles.discountValue}>
              {promotion.discountType === 'percentage'
                ? `${promotion.discountValue}%`
                : `$${promotion.discountValue}`}
            </Text>
            <Text style={styles.discountLabel}>OFF</Text>
          </View>

          <TouchableOpacity style={styles.applyButton} onPress={handlePress}>
            <Text style={styles.applyButtonText}>Apply Offer</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginVertical: 12,
    borderWidth: 2,
    borderColor: '#007AFF',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#007AFF',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8
      },
      android: {
        elevation: 6
      },
      web: {
        boxShadow: '0 4px 8px rgba(0, 122, 255, 0.2)'
      }
    })
  },
  containerBanner: {
    borderRadius: 8,
    padding: 16
  },
  containerFeatured: {
    borderColor: '#FFD700',
    backgroundColor: '#FFFEF7'
  },
  containerDashed: {
    borderStyle: 'dashed'
  },
  containerGradient: {
    // Note: For true gradients, use LinearGradient from expo-linear-gradient
    backgroundColor: '#E3F2FD'
  },
  containerCompact: {
    padding: 12,
    marginVertical: 8
  },
  featuredBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#FFD700',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12
  },
  featuredBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#333'
  },
  urgencyBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: '#FF5722',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12
  },
  urgencyBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#fff'
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16
  },
  textSection: {
    flex: 1,
    flexDirection: 'row',
    gap: 12
  },
  emoji: {
    fontSize: 32
  },
  textContent: {
    flex: 1
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
    lineHeight: 20
  },
  validity: {
    fontSize: 12,
    color: '#999'
  },
  ctaSection: {
    alignItems: 'center',
    gap: 12
  },
  discountBadge: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    minWidth: 80
  },
  discountValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff'
  },
  discountLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
    letterSpacing: 1
  },
  applyButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center'
  },
  applyButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600'
  },
  compactContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  compactLeft: {
    flex: 1
  },
  compactTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2
  },
  compactSubtitle: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500'
  },
  applyButtonCompact: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6
  },
  applyButtonTextCompact: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600'
  }
});

export default PromotionCard;

