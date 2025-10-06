import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export const AudioModuleDebug: React.FC = () => {
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Test the Audio module import immediately
    testAudioImport();
  }, []);

  const testAudioImport = async () => {
    setIsLoading(true);
    try {
      console.log('=== Audio Module Debug Test ===');
      
      // Test 1: Direct import
      console.log('Test 1: Testing direct import...');
      let AudioDirect;
      try {
        const audioModule = require('expo-audio');
        AudioDirect = audioModule;
        console.log('Direct require result:', audioModule);
        console.log('Direct API:', typeof audioModule);
        console.log('Direct keys:', Object.keys(audioModule || {}));
      } catch (error) {
        console.error('Direct import failed:', error);
      }

      // Test 2: Named import
      console.log('Test 2 of named import...');
      let AudioNamed;
      try {
        const { Audio } = require('expo-audio');
        AudioNamed = Audio;
        console.log('Named import result:', Audio);
        console.log('Named API:', typeof Audio);
        console.log('Named keys:', Object.keys(Audio || {}));
      } catch (error) {
        console.error('Named import failed:', error);
      }

      // Test 3: ES6 import (this should work since we're already doing this)
      console.log('Test 3: Testing ES6 import approach...');
      try {
        const audioModule = await import('expo-audio');
        console.log('Dynamic import result:', audioModule);
        console.log('Dynamic API:', typeof audioModule.default || typeof (audioModule as any).Audio);
        
        const AudioObj = audioModule.default || (audioModule as any).Audio;
        console.log('Dynamic Audio object:', AudioObj);
        console.log('Dynamic Audio type:', typeof AudioObj);
        
        if (AudioObj && typeof AudioObj === 'object') {
          console.log('Dynamic Audio keys:', Object.keys(AudioObj));
          
          // Check for the specific methods we need
          const methods = ['getPermissionsAsync', 'requestPermissionsAsync', 'setAudioModeAsync'];
          const methodCheck = methods.map(method => ({
            method,
            exists: typeof (AudioObj as any)[method] === 'function',
            type: typeof (AudioObj as any)[method]
          }));
          
          console.log('Method check:', methodCheck);
          setDebugInfo({
            audioObj: AudioObj,
            methodCheck,
            importMethods: {
              direct: AudioDirect,
              named: AudioNamed,
              dynamic: AudioObj
            }
          });
        } else {
          setDebugInfo({
            error: 'Audio object not found or invalid type',
            audioType: typeof AudioObj,
            allExports: Object.keys(audioModule)
          });
        }
      } catch (error) {
        console.error('Dynamic import failed:', error);
        setDebugInfo({
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        });
      }

    } catch (error) {
      console.error('Debug test failed:', error);
      setDebugInfo({
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
    } finally {
      setIsLoading(false);
    }
  };

  const showDebugInfo = () => {
    if (!debugInfo) return;

    Alert.alert('Debug Info', `
Direct: ${debugInfo.importMethods?.direct ? 'OK' : 'FAILED'}
Named: ${debugInfo.importMethods?.named ? 'OK' : 'FAILED'}  
Dynamic: ${debugInfo.importMethods?.dynamic ? 'OK' : 'FAILED'}

Method Check:
${debugInfo.methodCheck?.map((m: any) => `${m.method}: ${m.exists ? '✓' : '✗'}`).join('\n')}

Error: ${debugInfo.error || 'None'}
    `.trim());
  };

  const displayDebugInfo = () => {
    if (!debugInfo) return null;

    return (
      <TouchableOpacity style={styles.infoButton} onPress={showDebugInfo}>
        <Text style={styles.infoText}>Show Debug Info</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Audio Module Debug</Text>
      <Text style={styles.description}>
        Testing Audio module import methods
      </Text>
      
      <TouchableOpacity
        style={[styles.button, isLoading && styles.buttonDisabled]}
        onPress={testAudioImport}
        disabled={isLoading}
      >
        <Text style={styles.buttonText}>
          {isLoading ? 'Testing...' : 'Test Audio Import'}
        </Text>
      </TouchableOpacity>
      
      {displayDebugInfo()}
      
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
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  infoButton: {
    backgroundColor: '#34C759',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  infoText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
