import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Platform, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ThemedText } from './ThemedText';
import { useThemeColor } from '../hooks/useThemeColor';
import { useSystemSettings } from '../hooks/useSystemSettings';
import { exportService } from '../services/ExportService';
import { useSnackbar } from '../contexts/SnackbarContext';
import { useAuth } from '../hooks/useAuth';

export function DashboardSunsetBanner() {
  const router = useRouter();
  const { showSnackbar } = useSnackbar();
  const { settings, loading } = useSystemSettings();
  const { isAuthenticated } = useAuth();
  const [isExporting, setIsExporting] = useState(false);
  const isSunsetMode = settings?.sunsetModeEnabled ?? false;
  
  if (__DEV__) {
    console.log('DashboardSunsetBanner: state', { 
      loading, 
      isSunsetMode, 
      hasSettings: !!settings,
      sunsetModeEnabled: settings?.sunsetModeEnabled,
      shutdownDate: settings?.sunsetShutdownDate 
    });
  }
  
  // Design tokens
  const backgroundColor = useThemeColor({ light: '#FFF3CD', dark: '#3A331A' }, 'backgroundSecondary');
  const textColor = useThemeColor({ light: '#856404', dark: '#FFD700' }, 'text');
  const borderColor = useThemeColor({ light: '#FFEEBA', dark: '#5A4A1A' }, 'backgroundTertiary');
  const accentColor = '#6A5ACD'; // Slate blue for the button

  const handleExport = async () => {
    if (isExporting) return;
    
    if (!isAuthenticated) {
      showSnackbar('Please sign in to export your data.', 'info');
      router.push('/login');
      return;
    }
    
    setIsExporting(true);
    try {
      showSnackbar('Preparing your data export...', 'info');
      const success = await exportService.exportAllData();
      if (success) {
        showSnackbar('Data export started successfully!', 'success');
      }
    } catch (error) {
      console.error('Export error:', error);
      showSnackbar(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    } finally {
      setIsExporting(false);
    }
  };

  if (loading || !isSunsetMode || !settings) return null;

  const shutdownDateStr = settings.sunsetShutdownDate.toLocaleDateString(undefined, { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  return (
    <View style={[styles.container, { backgroundColor, borderColor }]}>
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Ionicons name="warning" size={24} color={textColor} />
        </View>
        <ThemedText style={[styles.title, { color: textColor }]}>Platform Decommissioning Notice</ThemedText>
      </View>
      
      <ThemedText style={[styles.description, { color: textColor }]}>
        WizNote is officially sunsetting on <ThemedText style={{ fontWeight: 'bold' }}>{shutdownDateStr}</ThemedText>. 
        New signups and note creation have been disabled. Existing users can still access and export their data until the shutdown date.
      </ThemedText>
      
      <View style={styles.actions}>
        <TouchableOpacity 
          style={[styles.button, { backgroundColor: accentColor, opacity: isExporting ? 0.7 : 1 }]}
          onPress={handleExport}
          disabled={isExporting}
        >
          {isExporting ? (
            <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
          ) : (
            <Ionicons name="download" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
          )}
          <ThemedText style={styles.buttonText}>{isExporting ? 'Exporting...' : 'Export All Data'}</ThemedText>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.textButton}
          onPress={() => router.push('/sunset-info')}
        >
          <ThemedText style={[styles.textButtonText, { color: accentColor }]}>Learn More</ThemedText>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 24,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
      },
    }),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    marginRight: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 20,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  textButton: {
    paddingVertical: 10,
  },
  textButtonText: {
    fontWeight: '600',
    fontSize: 14,
  },
});
