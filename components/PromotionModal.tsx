/**
 * PromotionModal Component
 * 
 * Modal popup for displaying promotions to users.
 * Features animated slide-in, dismissal tracking, and CTA navigation.
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
  Dimensions,
  Platform,
  Image
} from 'react-native';
import type { Promotion } from '../types/Promotion';
import { usePromotions } from '../hooks/usePromotions';
import { useAuth } from '../hooks/useAuth';

const { width, height } = Dimensions.get('window');

interface PromotionModalProps {
  promotion: Promotion | null;
  visible: boolean;
  onClose: () => void;
  onApply?: (promotion: Promotion) => void;
}

export function PromotionModal({
  promotion,
  visible,
  onClose,
  onApply
}: PromotionModalProps) {
  const { user } = useAuth();
  const { trackInteraction, applyPromotion } = usePromotions(user?.id);
  const [slideAnim] = useState(new Animated.Value(height));
  const [fadeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    if (visible && promotion) {
      // Track view
      trackInteraction(promotion.id, 'viewed', {
        displayMethod: 'modal',
        timestamp: new Date().toISOString()
      });

      // Animate in
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 65,
          friction: 11,
          useNativeDriver: true
        })
      ]).start();
    } else {
      // Animate out
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true
        }),
        Animated.timing(slideAnim, {
          toValue: height,
          duration: 250,
          useNativeDriver: true
        })
      ]).start();
    }
  }, [visible, promotion]);

  const handleClose = () => {
    if (promotion) {
      trackInteraction(promotion.id, 'dismissed', {
        displayMethod: 'modal',
        timestamp: new Date().toISOString()
      });
    }
    onClose();
  };

  const handleApply = () => {
    if (promotion) {
      console.log('PromotionModal: User clicked apply for:', promotion.name);
      
      trackInteraction(promotion.id, 'clicked', {
        displayMethod: 'modal',
        timestamp: new Date().toISOString()
      });

      if (onApply) {
        console.log('PromotionModal: Using custom onApply handler');
        onApply(promotion);
      } else {
        console.log('PromotionModal: Using default applyPromotion');
        applyPromotion(promotion);
      }
      onClose();
    }
  };

  if (!promotion) return null;

  const modalConfig = promotion.modalConfig || {};
  const title = modalConfig.title || '🎉 Special Offer!';
  const buttonText = modalConfig.buttonText || 'Claim Offer';
  const theme = modalConfig.theme || '#007AFF';
  const showCountdown = modalConfig.showCountdown && isExpiringSoon(promotion.endDate);

  return (
    <Modal
      transparent
      visible={visible}
      onRequestClose={handleClose}
      animationType="none"
    >
      <Animated.View 
        style={[
          styles.overlay,
          {
            opacity: fadeAnim
          }
        ]}
      >
        <TouchableOpacity 
          style={StyleSheet.absoluteFill} 
          activeOpacity={1}
          onPress={handleClose}
        />
        
        <Animated.View
          style={[
            styles.modalContainer,
            {
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          {/* Close Button */}
          <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>

          {/* Header Image */}
          {modalConfig.imageUrl && (
            <Image
              source={{ uri: modalConfig.imageUrl }}
              style={styles.headerImage}
              resizeMode="cover"
            />
          )}

          {/* Content */}
          <View style={styles.content}>
            <Text style={styles.title}>{title}</Text>
            
            {/* Discount Badge */}
            <View style={[styles.discountBadge, { backgroundColor: theme }]}>
              <Text style={styles.discountBadgeText}>
                {promotion.discountType === 'percentage'
                  ? `${promotion.discountValue}% OFF`
                  : `$${promotion.discountValue} OFF`}
              </Text>
            </View>

            <Text style={styles.description}>{promotion.description}</Text>

            {/* Countdown Timer */}
            {showCountdown && (
              <CountdownTimer endDate={promotion.endDate} />
            )}

            {/* CTA Button */}
            <TouchableOpacity
              style={[styles.ctaButton, { backgroundColor: theme }]}
              onPress={handleApply}
            >
              <Text style={styles.ctaButtonText}>{buttonText}</Text>
            </TouchableOpacity>

            {/* Fine Print */}
            <Text style={styles.finePrint}>
              Offer valid until {new Date(promotion.endDate).toLocaleDateString()}
            </Text>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

/**
 * Countdown Timer Component
 */
function CountdownTimer({ endDate }: { endDate: string }) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const end = new Date(endDate).getTime();
      const diff = end - now;

      if (diff <= 0) {
        setTimeLeft('Expired');
        clearInterval(interval);
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      if (days > 0) {
        setTimeLeft(`${days}d ${hours}h ${minutes}m`);
      } else if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
      } else {
        setTimeLeft(`${minutes}m ${seconds}s`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [endDate]);

  return (
    <View style={styles.countdownContainer}>
      <Text style={styles.countdownLabel}>⏰ Offer ends in:</Text>
      <Text style={styles.countdownTime}>{timeLeft}</Text>
    </View>
  );
}

/**
 * Helper: Check if promotion is expiring within 24 hours
 */
function isExpiringSoon(endDate: string): boolean {
  const end = new Date(endDate).getTime();
  const now = new Date().getTime();
  const hoursLeft = (end - now) / (1000 * 60 * 60);
  return hoursLeft > 0 && hoursLeft <= 24;
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end'
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: height * 0.8,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.15,
        shadowRadius: 12
      },
      android: {
        elevation: 8
      },
      web: {
        boxShadow: '0 -4px 12px rgba(0,0,0,0.15)'
      }
    })
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10
  },
  closeButtonText: {
    fontSize: 20,
    color: '#333',
    fontWeight: '600'
  },
  headerImage: {
    width: '100%',
    height: 160,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24
  },
  content: {
    padding: 24,
    paddingTop: 32,
    alignItems: 'center'
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
    color: '#333'
  },
  discountBadge: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    marginBottom: 20
  },
  discountBadgeText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    letterSpacing: 1
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
    marginBottom: 24,
    lineHeight: 22
  },
  countdownContainer: {
    alignItems: 'center',
    marginBottom: 24,
    padding: 16,
    backgroundColor: '#fff8e1',
    borderRadius: 12,
    width: '100%'
  },
  countdownLabel: {
    fontSize: 14,
    color: '#f57c00',
    marginBottom: 4
  },
  countdownTime: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#e65100'
  },
  ctaButton: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4
      },
      android: {
        elevation: 3
      },
      web: {
        boxShadow: '0 2px 4px rgba(0,0,0,0.15)'
      }
    })
  },
  ctaButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold'
  },
  finePrint: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center'
  }
});

export default PromotionModal;

