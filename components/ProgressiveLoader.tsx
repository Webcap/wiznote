import React, { useEffect, useRef, useState } from 'react';
import { Animated, View, ViewStyle, Platform } from 'react-native';

interface ProgressiveLoaderProps {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  direction?: 'fadeIn' | 'slideUp' | 'slideLeft' | 'scaleIn';
  threshold?: number;
  rootMargin?: string;
  style?: ViewStyle;
}

/**
 * Progressive loader component inspired by Medium's beautiful lazy loading
 * Provides smooth animations as content comes into view
 */
export const ProgressiveLoader: React.FC<ProgressiveLoaderProps> = ({
  children,
  delay = 0,
  duration = 600,
  direction = 'fadeIn',
  threshold = 0.1,
  rootMargin = '50px',
  style
}) => {
  const [isVisible, setIsVisible] = useState(Platform.OS !== 'web'); // Show immediately on mobile
  const [hasAnimated, setHasAnimated] = useState(false);
  const animatedValue = useRef(new Animated.Value(Platform.OS !== 'web' ? 0 : 0)).current;
  const elementRef = useRef<any>(null);

  useEffect(() => {
    // On mobile, just animate immediately
    if (Platform.OS !== 'web') {
      setIsVisible(true);
      setHasAnimated(true);
      setTimeout(() => {
        Animated.timing(animatedValue, {
          toValue: 1,
          duration,
          useNativeDriver: true,
        }).start();
      }, delay);
      return;
    }

    // On web, use IntersectionObserver
    const element = elementRef.current;
    if (!element || typeof IntersectionObserver === 'undefined') {
      // Fallback if IntersectionObserver not available
      setIsVisible(true);
      setHasAnimated(true);
      setTimeout(() => {
        Animated.timing(animatedValue, {
          toValue: 1,
          duration,
          useNativeDriver: true,
        }).start();
      }, delay);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated) {
          setIsVisible(true);
          setHasAnimated(true);
          
          // Start animation after delay
          setTimeout(() => {
            Animated.timing(animatedValue, {
              toValue: 1,
              duration,
              useNativeDriver: true,
            }).start();
          }, delay);
        }
      },
      {
        threshold,
        rootMargin,
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [delay, duration, threshold, rootMargin, hasAnimated, animatedValue]);

  const getAnimationStyle = () => {
    const baseStyle = {
      opacity: animatedValue,
    };

    switch (direction) {
      case 'slideUp':
        return {
          ...baseStyle,
          transform: [
            {
              translateY: animatedValue.interpolate({
                inputRange: [0, 1],
                outputRange: [30, 0],
              }),
            },
          ],
        };
      case 'slideLeft':
        return {
          ...baseStyle,
          transform: [
            {
              translateX: animatedValue.interpolate({
                inputRange: [0, 1],
                outputRange: [30, 0],
              }),
            },
          ],
        };
      case 'scaleIn':
        return {
          ...baseStyle,
          transform: [
            {
              scale: animatedValue.interpolate({
                inputRange: [0, 1],
                outputRange: [0.8, 1],
              }),
            },
          ],
        };
      case 'fadeIn':
      default:
        return baseStyle;
    }
  };

  return (
    <Animated.View
      ref={elementRef}
      style={[
        style,
        getAnimationStyle(),
        !isVisible && { opacity: 0 }
      ]}
    >
      {children}
    </Animated.View>
  );
};

/**
 * Staggered progressive loader for multiple items
 * Each item animates in sequence with a delay
 */
interface StaggeredLoaderProps {
  children: React.ReactNode[];
  staggerDelay?: number;
  direction?: 'fadeIn' | 'slideUp' | 'slideLeft' | 'scaleIn';
  duration?: number;
  threshold?: number;
  rootMargin?: string;
  style?: ViewStyle;
}

export const StaggeredLoader: React.FC<StaggeredLoaderProps> = ({
  children,
  staggerDelay = 100,
  direction = 'fadeIn',
  duration = 600,
  threshold = 0.1,
  rootMargin = '50px',
  style
}) => {
  return (
    <View style={style}>
      {children.map((child, index) => (
        <ProgressiveLoader
          key={index}
          delay={index * staggerDelay}
          direction={direction}
          duration={duration}
          threshold={threshold}
          rootMargin={rootMargin}
        >
          {child}
        </ProgressiveLoader>
      ))}
    </View>
  );
};

/**
 * Progressive card loader with beautiful skeleton-to-content transition
 */
interface ProgressiveCardProps {
  children: React.ReactNode;
  skeleton?: React.ReactNode;
  delay?: number;
  duration?: number;
  direction?: 'fadeIn' | 'slideUp' | 'slideLeft' | 'scaleIn';
  threshold?: number;
  rootMargin?: string;
  style?: ViewStyle;
}

export const ProgressiveCard: React.FC<ProgressiveCardProps> = ({
  children,
  skeleton,
  delay = 0,
  duration = 600,
  direction = 'fadeIn',
  threshold = 0.1,
  rootMargin = '50px',
  style
}) => {
  const [showContent, setShowContent] = useState(Platform.OS !== 'web'); // Show immediately on mobile
  const [isVisible, setIsVisible] = useState(Platform.OS !== 'web');
  const [hasAnimated, setHasAnimated] = useState(false);
  const animatedValue = useRef(new Animated.Value(Platform.OS !== 'web' ? 0 : 0)).current;
  const elementRef = useRef<any>(null);

  useEffect(() => {
    // On mobile, just show content and animate immediately
    if (Platform.OS !== 'web') {
      setIsVisible(true);
      setHasAnimated(true);
      setTimeout(() => {
        setShowContent(true);
        Animated.timing(animatedValue, {
          toValue: 1,
          duration,
          useNativeDriver: true,
        }).start();
      }, delay);
      return;
    }

    // On web, use IntersectionObserver
    const element = elementRef.current;
    if (!element || typeof IntersectionObserver === 'undefined') {
      // Fallback if IntersectionObserver not available
      setIsVisible(true);
      setHasAnimated(true);
      setTimeout(() => {
        setShowContent(true);
        Animated.timing(animatedValue, {
          toValue: 1,
          duration,
          useNativeDriver: true,
        }).start();
      }, delay);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated) {
          setIsVisible(true);
          setHasAnimated(true);
          
          // Show content after delay
          setTimeout(() => {
            setShowContent(true);
            
            // Start animation
            Animated.timing(animatedValue, {
              toValue: 1,
              duration,
              useNativeDriver: true,
            }).start();
          }, delay);
        }
      },
      {
        threshold,
        rootMargin,
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [delay, duration, threshold, rootMargin, hasAnimated, animatedValue]);

  const getAnimationStyle = () => {
    const baseStyle = {
      opacity: animatedValue,
    };

    switch (direction) {
      case 'slideUp':
        return {
          ...baseStyle,
          transform: [
            {
              translateY: animatedValue.interpolate({
                inputRange: [0, 1],
                outputRange: [30, 0],
              }),
            },
          ],
        };
      case 'slideLeft':
        return {
          ...baseStyle,
          transform: [
            {
              translateX: animatedValue.interpolate({
                inputRange: [0, 1],
                outputRange: [30, 0],
              }),
            },
          ],
        };
      case 'scaleIn':
        return {
          ...baseStyle,
          transform: [
            {
              scale: animatedValue.interpolate({
                inputRange: [0, 1],
                outputRange: [0.8, 1],
              }),
            },
          ],
        };
      case 'fadeIn':
      default:
        return baseStyle;
    }
  };

  return (
    <Animated.View
      ref={elementRef}
      style={[
        style,
        getAnimationStyle(),
        !isVisible && { opacity: 0 }
      ]}
    >
      {showContent ? children : skeleton}
    </Animated.View>
  );
};
