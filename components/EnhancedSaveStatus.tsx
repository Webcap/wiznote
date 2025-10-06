import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { useThemeColor } from '../hooks/useThemeColor';
import { localSaveManager } from '../services/LocalSaveManager';
import { ThemedText } from './ThemedText';

interface EnhancedSaveStatusProps {
  isSaving: boolean;
  hasUnsavedChanges: boolean;
  lastSaved: Date | null;
  error: string | null;
  pendingOperations: number;
  onRetry?: () => void;
}

export function EnhancedSaveStatus({
  isSaving,
  hasUnsavedChanges,
  lastSaved,
  error,
  pendingOperations,
  onRetry,
}: EnhancedSaveStatusProps) {
  const [pendingSavesCount, setPendingSavesCount] = useState(0);
  const [syncProgress, setSyncProgress] = useState(0);
  const networkStatus = useNetworkStatus();
  
  const textColor = useThemeColor({}, 'text');
  const secondaryColor = useThemeColor({ light: '#9CA3AF', dark: '#6B7280' }, 'text');
  const successColor = useThemeColor({ light: '#10B981', dark: '#10B981' }, 'tint');
  const warningColor = useThemeColor({ light: '#F59E0B', dark: '#F59E0B' }, 'tint');
  const errorColor = useThemeColor({ light: '#EF4444', dark: '#EF4444' }, 'tint');
  const offlineColor = useThemeColor({ light: '#6B7280', dark: '#9CA3AF' }, 'text');

  // Check for pending saves
  useEffect(() => {
    const checkPendingSaves = async () => {
      try {
        const pendingSaves = await localSaveManager.getPendingSaves();
        setPendingSavesCount(pendingSaves.length);
      } catch (error) {
        console.error('Error checking pending saves:', error);
      }
    };

    checkPendingSaves();
    
    // Check every 5 seconds
    const interval = setInterval(checkPendingSaves, 5000);
    return () => clearInterval(interval);
  }, []);

  // Simulate sync progress when coming back online
  useEffect(() => {
    if (networkStatus.isOnline && pendingSavesCount > 0) {
      const progressInterval = setInterval(() => {
        setSyncProgress(prev => {
          if (prev >= 100) {
            clearInterval(progressInterval);
            return 100;
          }
          return prev + 10;
        });
      }, 200);

      return () => clearInterval(progressInterval);
    } else {
      setSyncProgress(0);
    }
  }, [networkStatus.isOnline, pendingSavesCount]);

  const getStatusIcon = () => {
    if (error) {
      return { name: 'warning' as const, color: errorColor };
    }
    
    if (!networkStatus.isOnline) {
      return { name: 'cloud-offline' as const, color: offlineColor };
    }
    
    if (isSaving) {
      return { name: 'cloud-upload' as const, color: warningColor };
    }
    
    if (pendingSavesCount > 0) {
      return { name: 'cloud-upload' as const, color: warningColor };
    }
    
    if (hasUnsavedChanges) {
      return { name: 'time' as const, color: warningColor };
    }
    
    if (lastSaved) {
      return { name: 'checkmark-circle' as const, color: successColor };
    }
    
    return { name: 'ellipse' as const, color: secondaryColor };
  };

  const getStatusText = () => {
    if (error) {
      return 'Save failed';
    }
    
    if (!networkStatus.isOnline) {
      return 'Offline - saving locally';
    }
    
    if (isSaving) {
      return 'Saving...';
    }
    
    if (pendingSavesCount > 0) {
      if (syncProgress > 0 && syncProgress < 100) {
        return `Syncing... ${syncProgress}%`;
      }
      return `Syncing ${pendingSavesCount} changes`;
    }
    
    if (hasUnsavedChanges) {
      return 'Unsaved changes';
    }
    
    if (lastSaved) {
      return `Saved ${lastSaved.toLocaleTimeString()}`;
    }
    
    return 'Ready';
  };

  const getStatusColor = () => {
    if (error) return errorColor;
    if (!networkStatus.isOnline) return offlineColor;
    if (isSaving || pendingSavesCount > 0) return warningColor;
    if (hasUnsavedChanges) return warningColor;
    if (lastSaved) return successColor;
    return secondaryColor;
  };

  const statusIcon = getStatusIcon();
  const statusText = getStatusText();
  const statusColor = getStatusColor();

  return (
    <View style={styles.container}>
      <View style={styles.statusRow}>
        <Ionicons name={statusIcon.name} size={16} color={statusIcon.color} />
        <ThemedText style={[styles.statusText, { color: statusColor }]}>
          {statusText}
        </ThemedText>
        
        {error && onRetry && (
          <TouchableOpacity onPress={onRetry} style={styles.retryButton}>
            <Ionicons name="refresh" size={14} color={errorColor} />
          </TouchableOpacity>
        )}
      </View>

      {/* Network status indicator */}
      {!networkStatus.isOnline && (
        <View style={styles.networkStatus}>
          <Ionicons name="wifi" size={12} color={offlineColor} />
          <ThemedText style={[styles.networkText, { color: offlineColor }]}>
            Offline
          </ThemedText>
        </View>
      )}

      {/* Sync progress bar */}
      {pendingSavesCount > 0 && syncProgress > 0 && syncProgress < 100 && (
        <View style={styles.progressContainer}>
          <View style={[styles.progressBar, { backgroundColor: secondaryColor + '30' }]}>
            <View 
              style={[
                styles.progressFill, 
                { 
                  width: `${syncProgress}%`,
                  backgroundColor: warningColor 
                }
              ]} 
            />
          </View>
        </View>
      )}

      {/* Pending operations indicator */}
      {pendingOperations > 0 && (
        <View style={styles.pendingIndicator}>
          <ThemedText style={[styles.pendingText, { color: secondaryColor }]}>
            {pendingOperations} pending
          </ThemedText>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    marginLeft: 4,
  },
  retryButton: {
    padding: 2,
    marginLeft: 4,
  },
  networkStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 2,
  },
  networkText: {
    fontSize: 10,
  },
  progressContainer: {
    width: '100%',
    marginTop: 4,
  },
  progressBar: {
    height: 2,
    borderRadius: 1,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 1,
  },
  pendingIndicator: {
    marginTop: 2,
  },
  pendingText: {
    fontSize: 10,
  },
}); 