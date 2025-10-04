import { useEffect, useRef } from 'react';
import { Animated, Platform, StyleSheet, View } from 'react-native';

interface NoteCardSkeletonProps {
  style?: any;
}

export const NoteCardSkeleton = ({ style }: NoteCardSkeletonProps) => {
  const shimmerValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const shimmerAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(shimmerValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ])
    );
    shimmerAnimation.start();

    return () => shimmerAnimation.stop();
  }, [shimmerValue]);

  const opacity = shimmerValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <View style={[styles.container, style]}>
      <Animated.View style={[styles.card, { opacity }]}>
        {/* Title skeleton */}
        <View style={styles.titleSkeleton} />
        
        {/* Content skeleton */}
        <View style={styles.contentSkeleton}>
          <View style={styles.line} />
          <View style={[styles.line, styles.shortLine]} />
        </View>
        
        {/* Tags skeleton */}
        <View style={styles.tagsContainer}>
          <View style={styles.tagSkeleton} />
          <View style={styles.tagSkeleton} />
        </View>
        
        {/* Actions skeleton */}
        <View style={styles.actionsContainer}>
          <View style={styles.actionSkeleton} />
          <View style={styles.actionSkeleton} />
          <View style={styles.actionSkeleton} />
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  card: {
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    padding: 16,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    }),
  },
  titleSkeleton: {
    height: 20,
    backgroundColor: '#3A3A3A',
    borderRadius: 4,
    marginBottom: 12,
    width: '80%',
  },
  contentSkeleton: {
    marginBottom: 12,
  },
  line: {
    height: 14,
    backgroundColor: '#3A3A3A',
    borderRadius: 4,
    marginBottom: 8,
    width: '100%',
  },
  shortLine: {
    width: '60%',
  },
  tagsContainer: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  tagSkeleton: {
    height: 20,
    backgroundColor: '#3A3A3A',
    borderRadius: 10,
    marginRight: 8,
    width: 60,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  actionSkeleton: {
    width: 24,
    height: 24,
    backgroundColor: '#3A3A3A',
    borderRadius: 12,
    marginLeft: 8,
  },
}); 