import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import { Animated, Platform, StyleSheet, View } from 'react-native';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';
import { useThemeColor } from '../hooks/useThemeColor';

interface UploadingNoteCardProps {
  fileName: string;
  fileSize: string;
  progress: number; // 0-100
  status: 'uploading' | 'processing' | 'completed' | 'error';
  statusMessage?: string;
}

export function UploadingNoteCard({ 
  fileName, 
  fileSize, 
  progress, 
  status,
  statusMessage 
}: UploadingNoteCardProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const backgroundColor = useThemeColor({}, 'backgroundSecondary');
  const textColor = useThemeColor({}, 'text');
  const accentColor = useThemeColor({}, 'accentPrimary');
  const borderColor = useThemeColor({}, 'backgroundTertiary');

  // Entrance animation
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 7,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start();
  }, []);

  // Progress animation
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  // Pulse animation for uploading status
  useEffect(() => {
    if (status === 'uploading' || status === 'processing') {
      const pulse = Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 800,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]);
      
      Animated.loop(pulse).start();
    }
    
    return () => {
      pulseAnim.setValue(1);
    };
  }, [status]);

  const getStatusIcon = () => {
    switch (status) {
      case 'uploading':
        return 'cloud-upload';
      case 'processing':
        return 'cog';
      case 'completed':
        return 'checkmark-circle';
      case 'error':
        return 'close-circle';
      default:
        return 'document';
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'completed':
        return '#4CAF50';
      case 'error':
        return '#FF6B6B';
      default:
        return accentColor;
    }
  };

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
          backgroundColor,
          borderColor,
        },
      ]}
    >
      {/* Icon and Info */}
      <View style={styles.header}>
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <View style={[styles.iconContainer, { backgroundColor: `${getStatusColor()}20` }]}>
            <Ionicons name={getStatusIcon() as any} size={24} color={getStatusColor()} />
          </View>
        </Animated.View>
        
        <View style={styles.info}>
          <ThemedText style={styles.fileName} numberOfLines={1}>
            📄 {fileName}
          </ThemedText>
          <ThemedText style={styles.fileSize}>{fileSize}</ThemedText>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={[styles.progressBackground, { backgroundColor: `${getStatusColor()}20` }]}>
          <Animated.View
            style={[
              styles.progressBar,
              {
                width: progressWidth,
                backgroundColor: getStatusColor(),
              },
            ]}
          />
        </View>
        <ThemedText style={styles.progressText}>
          {Math.round(progress)}%
        </ThemedText>
      </View>

      {/* Status Message */}
      {statusMessage && (
        <View style={styles.statusContainer}>
          <Ionicons 
            name={status === 'error' ? 'alert-circle' : 'information-circle'} 
            size={16} 
            color={getStatusColor()} 
          />
          <ThemedText style={[styles.statusMessage, { color: getStatusColor() }]}>
            {statusMessage}
          </ThemedText>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  info: {
    flex: 1,
  },
  fileName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  fileSize: {
    fontSize: 14,
    opacity: 0.7,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  progressBackground: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
    minWidth: 40,
    textAlign: 'right',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  statusMessage: {
    fontSize: 13,
    marginLeft: 6,
    flex: 1,
  },
});

