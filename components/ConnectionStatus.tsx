import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { useThemeColor } from '../hooks/useThemeColor';

interface ConnectionStatusProps {
  isOnline?: boolean;
  lastSyncTime?: number;
  pendingOperations?: number;
  showDetails?: boolean;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  isOnline: propIsOnline,
  lastSyncTime: propLastSyncTime,
  pendingOperations: propPendingOperations,
  showDetails = false,
}) => {
  // Use auth hook for connection state if props not provided
  const { isOnline: authIsOnline, lastSyncTime: authLastSyncTime, pendingOperations: authPendingOperations } = useAuth();
  
  const isOnline = propIsOnline ?? authIsOnline;
  const lastSyncTime = propLastSyncTime ?? authLastSyncTime;
  const pendingOperations = propPendingOperations ?? authPendingOperations;
  const backgroundColor = useThemeColor('background');
  const textColor = useThemeColor('text');
  const borderColor = useThemeColor('border');
  const successColor = '#4CAF50';
  const warningColor = '#FF9800';
  const errorColor = '#F44336';

  const pulseAnim = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    if (!isOnline) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.5,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isOnline, pulseAnim]);

  const getStatusColor = () => {
    if (!isOnline) return errorColor;
    if (pendingOperations > 0) return warningColor;
    return successColor;
  };

  const getStatusText = () => {
    if (!isOnline) return 'Offline';
    if (pendingOperations > 0) return 'Syncing...';
    return 'Online';
  };

  const getStatusIcon = () => {
    if (!isOnline) return 'cloud-offline';
    if (pendingOperations > 0) return 'sync';
    return 'cloud-done';
  };

  const formatLastSync = () => {
    const now = Date.now();
    const diff = now - lastSyncTime;
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  if (!showDetails && isOnline && pendingOperations === 0) {
    return null; // Don't show when everything is fine
  }

  return (
    <Animated.View 
      style={[
        styles.container,
        {
          backgroundColor,
          borderColor,
          opacity: pulseAnim,
        }
      ]}
    >
      <View style={styles.statusRow}>
        <Ionicons 
          name={getStatusIcon() as any} 
          size={16} 
          color={getStatusColor()} 
        />
        <Text style={[styles.statusText, { color: textColor }]}>
          {getStatusText()}
        </Text>
      </View>
      
      {showDetails && (
        <View style={styles.detailsContainer}>
          <Text style={[styles.detailText, { color: textColor }]}>
            Last sync: {formatLastSync()}
          </Text>
          {pendingOperations > 0 && (
            <Text style={[styles.detailText, { color: warningColor }]}>
              {pendingOperations} pending operation{pendingOperations !== 1 ? 's' : ''}
            </Text>
          )}
        </View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginHorizontal: 16,
    marginVertical: 8,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
  },
  detailsContainer: {
    marginTop: 4,
    gap: 2,
  },
  detailText: {
    fontSize: 12,
    opacity: 0.8,
  },
}); 