import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AudioUtils } from '../services/AudioUtils';

export const PermissionTest: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);

  const testPermissions = async () => {
    setIsLoading(true);
    try {
      console.log('[PermissionTest] Starting permission test...');
      
      // Test 1: Check permissions
      console.log('[PermissionTest] Testing checkPermissions...');
      const checkResult = await AudioUtils.checkPermissions();
      console.log('[PermissionTest] Check result:', checkResult);
      
      // Test 2: Request permissions
      console.log('[PermissionTest] Testing requestPermissions...');
      const requestResult = await AudioUtils.requestPermissions();
      console.log('[PermissionTest] Request result:', requestResult);
      
      // Test 3: Force request permissions
      console.log('[PermissionTest] Testing forceRequestPermissions...');
      const forceResult = await AudioUtils.forceRequestPermissions();
      console.log('[PermissionTest] Force result:', forceResult);
      
      // Show results
      Alert.alert(
        'Permission Test Results',
        `Check: ${checkResult.status} (can request: ${checkResult.canRequest})\n` +
        `Request: ${requestResult.status}\n` +
        `Force: ${forceResult.status}`,
        [{ text: 'OK' }]
      );
      
    } catch (error) {
      console.error('[PermissionTest] Permission test error:', error);
      Alert.alert(
        'Permission Test Error',
        error instanceof Error ? error.message : 'Unknown error occurred',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Permission Test</Text>
      <Text style={styles.description}>
        Test the microphone permission system
      </Text>
      <TouchableOpacity
        style={[styles.button, isLoading && styles.buttonDisabled]}
        onPress={testPermissions}
        disabled={isLoading}
      >
        <Text style={styles.buttonText}>
          {isLoading ? 'Testing...' : 'Test Permissions'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    margin: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});