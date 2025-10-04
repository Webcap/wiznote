import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export const AudioAPIExplorer: React.FC = () => {
  const [explorationResult, setExplorationResult] = useState<string>('Not explored yet');

  const exploreAudioAPI = () => {
    try {
      console.log('=== Audio API Exploration ===');
      
      const audioModule = require('expo-audio');
      const Audio = audioModule.default || audioModule.Audio || audioModule;
      
      const results: string[] = [];
      
      // Explore the main Audio object
      results.push(`Audio object type: ${typeof Audio}`);
      results.push(`Audio keys: ${Object.keys(Audio || {}).join(', ')}`);
      
      // Check AudioModule specifically
      if (Audio.AudioModule) {
        results.push(`AudioModule keys: ${Object.keys(Audio.AudioModule).join(', ')}`);
        
        if (Audio.AudioModule.AudioRecorder) {
          const rec = Audio.AudioModule.AudioRecorder;
          results.push(`AudioRecorder type: ${typeof rec}`);
          results.push(`AudioRecorder keys: ${Object.keys(rec || {}).join(', ')}`);
          
          if (rec.createAsync) {
            results.push('✓ AudioRecorder.createAsync exists');
          } else {
            results.push('✗ AudioRecorder.createAsync missing');
          }
        }
        
        if (Audio.AudioModule.AudioPlayer) {
          const player = Audio.AudioModule.AudioPlayer;
          results.push(`AudioPlayer type: ${typeof player}`);
          results.push(`AudioPlayer keys: ${Object.keys(player || {}).join(', ')}`);
        }
      }
      
      // Check main audio objects
      if (Audio.createAudioPlayer) {
        results.push('✓ createAudioPlayer exists');
        results.push(`createAudioPlayer type: ${typeof Audio.createAudioPlayer}`);
      }
      
      if (Audio.createAudioRecorder) {
        results.push('✓ createAudioRecorder exists');
      }
      
      // Check for recording presets
      if (Audio.RecordingPresets) {
        results.push('✓ RecordingPresets exists');
        results.push(`RecordingPresets: ${Object.keys(Audio.RecordingPresets).join(', ')}`);
      }
      
      // Check for hooks
      if (Audio.useAudioRecorder) {
        results.push('✓ useAudioRecorder hook exists');
      }
      
      if (Audio.useAudioPlayer) {
        results.push('✓ useAudioPlayer hook exists');
      }

      const result = results.join('\n');
      setExplorationResult(result);
      
      Alert.alert('Audio API Exploration Results', result);
      
    } catch (error: any) {
      console.error('Audio exploration failed:', error);
      setExplorationResult(`Exploration failed: ${error.message}`);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Audio API Explorer</Text>
      <Text style={styles.description}>
        Deep dive into expo-audio SDK 54 API structure
      </Text>
      
      <TouchableOpacity style={styles.button} onPress={exploreAudioAPI}>
        <Text style={styles.buttonText}>Explore Audio API</Text>
      </TouchableOpacity>
      
      <View style={styles.resultContainer}>
        <Text style={styles.resultText}>{explorationResult}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 15,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    margin: 5,
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
    backgroundColor: '#28a745',
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
    padding: 8,
    borderRadius: 4,
    maxHeight: 150,
  },
  resultText: {
    fontSize: 11,
    fontFamily: 'monospace',
  },
});
