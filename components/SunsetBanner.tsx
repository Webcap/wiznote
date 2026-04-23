import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Platform, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import { ThemedText } from './ThemedText';
import { useThemeColor } from '../hooks/useThemeColor';
import { useSystemSettings } from '../hooks/useSystemSettings';
import { exportService } from '../services/ExportService';
import { useSnackbar } from '../contexts/SnackbarContext';
import { useAuth } from '../hooks/useAuth';

export function SunsetBanner() {
  const router = useRouter();
  const pathname = usePathname();
  const { showSnackbar } = useSnackbar();
  const { settings, loading } = useSystemSettings();
  const { isAuthenticated } = useAuth();
  const [isExporting, setIsExporting] = useState(false);

  // Hide global banner on dashboard pages as they have a specialized banner
  const isDashboard = pathname === '/' || pathname === '/(tabs)' || pathname === '/index';
  
  const isSunsetMode = settings?.sunsetModeEnabled ?? false;
  const bannerBg = '#FFF3CD'; // Warning yellow
  const bannerText = '#856404'; // Dark warning yellow
  const bannerBorder = '#FFEEBA';

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

  if (loading || !isSunsetMode || !settings || isDashboard) return null;

  const shutdownDateStr = settings.sunsetShutdownDate.toLocaleDateString(undefined, { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  return (
    <View style={[styles.container, { backgroundColor: bannerBg, borderColor: bannerBorder }]}>
      <View style={styles.content}>
        <Ionicons name="warning-outline" size={20} color={bannerText} style={styles.icon} />
        <ThemedText style={[styles.text, { color: bannerText }]}>
          WizNote is sunsetting on <ThemedText style={[styles.dateText, { color: bannerText }]}>{shutdownDateStr}</ThemedText>. 
          Please export your notes before then.
        </ThemedText>
        <TouchableOpacity 
          style={[styles.actionButton, isExporting && { opacity: 0.7 }]} 
          onPress={handleExport}
          disabled={isExporting}
        >
          {isExporting ? (
            <ActivityIndicator size="small" color={bannerText} style={{ marginRight: 4 }} />
          ) : (
            <Ionicons name="download-outline" size={16} color={bannerText} style={{ marginRight: 4 }} />
          )}
          <ThemedText style={[styles.actionText, { color: bannerText }]}>
            {isExporting ? 'Exporting...' : 'Export Now'}
          </ThemedText>
          {!isExporting && <Ionicons name="chevron-forward" size={16} color={bannerText} />}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    zIndex: 1000,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  icon: {
    marginRight: 8,
  },
  text: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  dateText: {
    fontWeight: 'bold',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderRadius: 12,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
    marginRight: 2,
  },
});
