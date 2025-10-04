import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export const AudioImportTest: React.FC = () => {
  const [testResult, setTestResult] = useState<string>('Not tested yet');

  const testAudioImport = () => {
    try {
      console.log('=== Testing Audio Import ===');
      
      // Test different import methods
      const testResults: string[] = [];
      
      // Method 1: Direct import (ES6)
      try {
        const { Audio } = require('expo-audio');
        testResults.push(`Direct import: Audio = ${typeof Audio}`);
        console.log('Direct Audio:', Audio);
        console.log('Direct Audio keys:', Audio ? Object.keys(Audio) : 'null');
        
        if (Audio && typeof Audio.getPermissionsAsync === 'function') {
          testResults.push('✓ getPermissionsAsync available');
        } else {
          testResults.push('✗ getPermissionsAsync NOT available');
        }
      } catch (error: any) {
        testResults.push(`Direct import failed: ${error.message}`);
      }

      // Method 2: Default import
      try {
        const AudioModule = require('expo-audio');
        testResults.push(`Default import: typeof = ${typeof AudioModule}`);
        console.log('Default module:', AudioModule);
        console.log('Default module keys:', AudioModule ? Object.keys(AudioModule) : 'null');
        
        if (AudioModule?.Audio && typeof AudioModule.Audio.getPermissionsAsync === 'function') {
          testResults.push('✓ AudioModule.Audio.getPermissionsAsync available');
        } else if (AudioModule?.default && typeof AudioModule.default.getPermissionsAsync === 'function') {
          testResults.push('✓ AudioModule.default.getPermissionsAsync available');
        } else {
          testResults.push('✗ No working getPermissionsAsync found');
        }
      } catch (error: any) {
        testResults.push(`Default import failed: ${error.message}`);
      }

      // Method 3: Dynamic import
      try {
        const dynamicAudio = require('expo-audio/default');
        testResults.push(`Dynamic import: typeof = ${typeof dynamicAudio}`);
        console.log('Dynamic Audio:', dynamicAudio);
      } catch (error: any) {
        testResults.push(`Dynamic import failed: ${error.message}`);
      }

      // Method 4: Check package version in package.json
      const packageJson = require('../../../package.json');
      testResults.push(`Expo version: ${packageJson.dependencies.expo}`);
      testResults.push(`Expo-audio version: ${packageJson.dependencies['expo-audio']}`);

      const result = testResults.join('\n');
      setTestResult(result);
      
      Alert.alert('Audio Import Test Results', result);
      
    } catch (error: any) {
      console.error('Test failed:', error);
      setTestResult(`Test failed: ${error.message}`);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Audio Import Test</Text>
      <Text style={styles.description}>
        Diagnostic test for expo-audio import issues
      </Text>
      
      <TouchableOpacity style={styles.button} onPress={testAudioImport}>
        <Text style={styles.buttonText}>Test Audio Import</Text>
      </TouchableOpacity>
      
      <View style={styles.resultContainer}>
        <Text style={styles.resultText}>{testResult}</Text>
      </View>
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
    marginBottom: 10,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  resultContainer: {
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 4,
    maxHeight: 200,
  },
  resultText: {
    fontSize: 12,
    fontFamily: 'monospace',
  },
});
