import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useThemeColor } from '../hooks/useThemeColor';
import { ThemedText } from './ThemedText';

interface SyncStatusIndicatorProps {
  syncStatus: 'local' | 'syncing' | 'synced' | 'error';
  compact?: boolean;
  isRealtime?: boolean;
}

export const SyncStatusIndicator: React.FC<SyncStatusIndicatorProps> = ({ 
  syncStatus, 
  compact = false,
  isRealtime = false
}) => {
  const textColor = useThemeColor({}, 'text');
  const mutedTextColor = useThemeColor({}, 'textSecondary');
  const accentColor = useThemeColor({}, 'tint');

  const getStatusConfig = () => {
    switch (syncStatus) {
      case 'local':
        return {
          icon: 'cloud-offline-outline',
          text: compact ? 'Offline' : 'Viewing cached data',
          color: mutedTextColor,
        };
      case 'syncing':
        return {
          icon: 'sync-outline',
          text: compact ? 'Syncing...' : 'Syncing with cloud...',
          color: accentColor,
        };
      case 'synced':
        return {
          icon: isRealtime ? 'sync-circle-outline' : 'cloud-done-outline',
          text: compact ? (isRealtime ? 'Live' : 'Synced') : (isRealtime ? 'Live sync active' : 'Synced with cloud'),
          color: isRealtime ? '#00BCD4' : '#4CAF50',
        };
      case 'error':
        return {
          icon: 'cloud-offline',
          text: compact ? 'Sync error' : 'Sync error - using cached data',
          color: '#FF6B6B',
        };
      default:
        return {
          icon: 'help-outline',
          text: 'Unknown status',
          color: mutedTextColor,
        };
    }
  };

  const config = getStatusConfig();

  if (compact) {
    return (
      <View style={styles.compactContainer}>
        <Ionicons 
          name={config.icon as any} 
          size={12} 
          color={config.color} 
        />
        <ThemedText style={[styles.compactText, { color: config.color }]}>
          {config.text}
        </ThemedText>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Ionicons 
        name={config.icon as any} 
        size={16} 
        color={config.color} 
      />
      <ThemedText style={[styles.text, { color: config.color }]}>
        {config.text}
      </ThemedText>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  text: {
    fontSize: 12,
    fontWeight: '500',
  },
  compactText: {
    fontSize: 10,
    fontWeight: '400',
  },
}); 