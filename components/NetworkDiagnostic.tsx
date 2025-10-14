import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useThemeColor } from '../hooks/useThemeColor';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';

interface NetworkDiagnosticProps {
  isVisible?: boolean;
}

export const NetworkDiagnostic: React.FC<NetworkDiagnosticProps> = ({ isVisible = false }) => {
  const [networkStatus, setNetworkStatus] = useState({
    basicConnectivity: false,
    firebaseConnectivity: false,
    lastCheck: new Date(),
  });

  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');

  const testBasicConnectivity = async () => {
    try {
      const response = await fetch('https://www.google.com', { 
        method: 'HEAD',
        mode: 'no-cors'
      });
      return true;
    } catch (error) {
      console.log('Basic connectivity test failed:', error);
      return false;
    }
  };

  const testSupabaseConnectivity = async () => {
    try {
      // Support both new publishable key (EXPO_PUBLIC_SUPABASE_KEY) and legacy anon key
      const apiKey = process.env.EXPO_PUBLIC_SUPABASE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';
      
      const response = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/rest/v1/`, {
        method: 'GET',
        headers: {
          'apikey': apiKey,
          'Authorization': `Bearer ${apiKey}`,
        },
      });
      return response.ok;
    } catch (error) {
      console.log('Supabase connectivity test failed:', error);
      return false;
    }
  };

  const runDiagnostics = async () => {
    console.log('Running network diagnostics...');
    
    const basicConnectivity = await testBasicConnectivity();
    const supabaseConnectivity = await testSupabaseConnectivity();
    
    setNetworkStatus({
      basicConnectivity,
      firebaseConnectivity: supabaseConnectivity, // Keep the same property name for compatibility
      lastCheck: new Date(),
    });

    console.log('Network diagnostic results:', {
      basicConnectivity,
      supabaseConnectivity,
      timestamp: new Date().toISOString(),
    });

    if (!basicConnectivity) {
      Alert.alert(
        'Network Issue',
        'Basic internet connectivity is not working. Please check your internet connection.',
        [{ text: 'OK' }]
      );
    } else if (!supabaseConnectivity) {
      Alert.alert(
        'Supabase Connectivity Issue',
        'Supabase services are not reachable. This might be a network configuration issue.',
        [{ text: 'OK' }]
      );
    }
  };

  useEffect(() => {
    if (isVisible) {
      runDiagnostics();
    }
  }, [isVisible]);

  if (!isVisible) {
    return null;
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedText style={styles.title}>Network Diagnostic</ThemedText>
      
      <View style={styles.statusContainer}>
        <View style={styles.statusItem}>
          <Text style={[
            styles.statusIndicator, 
            { color: networkStatus.basicConnectivity ? '#4CAF50' : '#F44336' }
          ]}>
            {networkStatus.basicConnectivity ? '●' : '○'}
          </Text>
          <ThemedText style={styles.statusText}>
            Basic Internet: {networkStatus.basicConnectivity ? 'Connected' : 'Disconnected'}
          </ThemedText>
        </View>
        
        <View style={styles.statusItem}>
          <Text style={[
            styles.statusIndicator, 
            { color: networkStatus.firebaseConnectivity ? '#4CAF50' : '#F44336' }
          ]}>
            {networkStatus.firebaseConnectivity ? '●' : '○'}
          </Text>
          <ThemedText style={styles.statusText}>
            Supabase: {networkStatus.firebaseConnectivity ? 'Reachable' : 'Unreachable'}
          </ThemedText>
        </View>
      </View>
      
      <ThemedText style={styles.timestamp}>
        Last checked: {networkStatus.lastCheck.toLocaleTimeString()}
      </ThemedText>
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    margin: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  statusContainer: {
    marginBottom: 8,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusIndicator: {
    fontSize: 16,
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
  },
  timestamp: {
    fontSize: 12,
    opacity: 0.7,
  },
}); 