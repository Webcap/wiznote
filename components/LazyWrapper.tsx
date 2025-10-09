import React, { Suspense, lazy, ComponentType, ReactNode } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';
import { useThemeColor } from '../hooks/useThemeColor';

interface LazyWrapperProps {
  children: ReactNode;
  fallback?: ReactNode;
  minHeight?: number;
  delay?: number;
}

/**
 * Wrapper component for lazy loading with loading states
 */
export const LazyWrapper: React.FC<LazyWrapperProps> = ({
  children,
  fallback,
  minHeight = 100,
  delay = 0
}) => {
  const [showContent, setShowContent] = React.useState(delay === 0);
  const backgroundColor = useThemeColor({}, 'background');

  React.useEffect(() => {
    if (delay > 0) {
      const timer = setTimeout(() => {
        setShowContent(true);
      }, delay);
      return () => clearTimeout(timer);
    }
  }, [delay]);

  if (!showContent) {
    return (
      <View style={[styles.loadingContainer, { minHeight, backgroundColor }]}>
        {fallback || <DefaultLoadingFallback />}
      </View>
    );
  }

  return (
    <Suspense fallback={fallback || <DefaultLoadingFallback />}>
      {children}
    </Suspense>
  );
};

/**
 * Default loading fallback component
 */
const DefaultLoadingFallback: React.FC = () => {
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');

  return (
    <ThemedView style={[styles.fallbackContainer, { backgroundColor }]}>
      <ActivityIndicator size="small" color={textColor} />
      <ThemedText style={[styles.fallbackText, { color: textColor }]}>
        Loading...
      </ThemedText>
    </ThemedView>
  );
};

/**
 * Higher-order component for lazy loading components
 */
export function withLazyLoading<P extends object>(
  Component: ComponentType<P>,
  options: {
    fallback?: ReactNode;
    delay?: number;
    minHeight?: number;
  } = {}
) {
  const LazyComponent = React.forwardRef<any, P>((props, ref) => (
    <LazyWrapper
      fallback={options.fallback}
      delay={options.delay}
      minHeight={options.minHeight}
    >
      <Component {...props} ref={ref} />
    </LazyWrapper>
  ));

  LazyComponent.displayName = `withLazyLoading(${Component.displayName || Component.name})`;
  
  return LazyComponent;
}

/**
 * Hook for creating lazy components with intersection observer
 */
export function useLazyComponent<T extends ComponentType<any>>(
  importFunction: () => Promise<{ default: T }>,
  options: {
    fallback?: ReactNode;
    rootMargin?: string;
    threshold?: number;
    delay?: number;
  } = {}
) {
  const {
    fallback,
    rootMargin = '100px',
    threshold = 0.1,
    delay = 0
  } = options;

  const [LazyComponent, setLazyComponent] = React.useState<React.LazyExoticComponent<T> | null>(null);
  const [isIntersecting, setIsIntersecting] = React.useState(false);
  const [hasLoaded, setHasLoaded] = React.useState(false);
  const ref = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    const element = ref.current;
    if (!element || hasLoaded) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
        if (entry.isIntersecting && !hasLoaded) {
          setHasLoaded(true);
          // Load the component when it comes into view
          const loadComponent = async () => {
            try {
              const module = await importFunction();
              const LazyComp = React.lazy(() => Promise.resolve(module));
              setLazyComponent(() => LazyComp);
            } catch (error) {
              console.error('Failed to load lazy component:', error);
            }
          };
          
          if (delay > 0) {
            setTimeout(loadComponent, delay);
          } else {
            loadComponent();
          }
        }
      },
      {
        rootMargin,
        threshold
      }
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [importFunction, rootMargin, threshold, delay, hasLoaded]);

  const Component = React.useMemo(() => {
    if (!LazyComponent) return null;
    
    return (
      <LazyWrapper fallback={fallback} delay={0}>
        <LazyComponent />
      </LazyWrapper>
    );
  }, [LazyComponent, fallback]);

  return {
    ref,
    Component,
    isIntersecting,
    hasLoaded
  };
}

/**
 * Component for lazy loading with viewport detection
 */
export const LazyViewport: React.FC<{
  children: ReactNode;
  fallback?: ReactNode;
  rootMargin?: string;
  threshold?: number;
  delay?: number;
  minHeight?: number;
}> = ({
  children,
  fallback,
  rootMargin = '100px',
  threshold = 0.1,
  delay = 0,
  minHeight = 100
}) => {
  const [isVisible, setIsVisible] = React.useState(false);
  const [hasBeenVisible, setHasBeenVisible] = React.useState(false);
  const ref = React.useRef<View | null>(null);
  const backgroundColor = useThemeColor({}, 'background');

  React.useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
        if (entry.isIntersecting && !hasBeenVisible) {
          setHasBeenVisible(true);
        }
      },
      {
        rootMargin,
        threshold
      }
    );

    // For React Native, we need to use a different approach
    if (typeof window !== 'undefined') {
      observer.observe(element as any);
    } else {
      // On mobile, show content immediately
      setHasBeenVisible(true);
    }

    return () => {
      if (typeof window !== 'undefined') {
        observer.unobserve(element as any);
      }
    };
  }, [rootMargin, threshold, hasBeenVisible]);

  if (!hasBeenVisible) {
    return (
      <View style={[styles.loadingContainer, { minHeight, backgroundColor }]}>
        {fallback || <DefaultLoadingFallback />}
      </View>
    );
  }

  return (
    <View ref={ref} style={{ minHeight }}>
      {delay > 0 ? (
        <LazyWrapper delay={delay} fallback={fallback}>
          {children}
        </LazyWrapper>
      ) : (
        children
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  fallbackContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  fallbackText: {
    marginLeft: 10,
    fontSize: 14,
    opacity: 0.7,
  },
});
