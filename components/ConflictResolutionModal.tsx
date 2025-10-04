import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View
} from 'react-native';
import { useThemeColor } from '../hooks/useThemeColor';
import { ConflictResolution } from '../services/ConflictResolver';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';

interface ConflictResolutionModalProps {
  visible: boolean;
  onClose: () => void;
  onResolve: (resolution: ConflictResolution) => void;
  localData: any;
  remoteData: any;
  conflicts: string[];
}

export function ConflictResolutionModal({
  visible,
  onClose,
  onResolve,
  localData,
  remoteData,
  conflicts,
}: ConflictResolutionModalProps) {
  const [selectedStrategy, setSelectedStrategy] = useState<'local' | 'remote' | 'merged'>('local');
  
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const borderColor = useThemeColor({ light: '#E5E7EB', dark: '#333333' }, 'background');
  const primaryColor = useThemeColor({ light: '#6A5ACD', dark: '#6A5ACD' }, 'tint');
  const secondaryColor = useThemeColor({ light: '#9CA3AF', dark: '#6B7280' }, 'text');

  const handleResolve = () => {
    const resolution: ConflictResolution = {
      resolved: true,
      data: selectedStrategy === 'local' ? localData : 
            selectedStrategy === 'remote' ? remoteData : 
            { ...localData, tags: [...new Set([...localData.tags, ...remoteData.tags])] },
      strategy: selectedStrategy,
      conflicts,
    };

    onResolve(resolution);
    onClose();
  };

  const renderConflictField = (field: string) => {
    const localValue = localData[field];
    const remoteValue = remoteData[field];

    return (
      <View key={field} style={[styles.conflictField, { borderColor }]}>
        <ThemedText style={styles.fieldLabel}>{field.charAt(0).toUpperCase() + field.slice(1)}</ThemedText>
        
        <View style={styles.valueContainer}>
          <View style={styles.valueSection}>
            <ThemedText style={[styles.valueLabel, { color: secondaryColor }]}>Your version:</ThemedText>
            <ThemedText style={styles.valueText}>
              {field === 'tags' ? localValue.join(', ') : localValue}
            </ThemedText>
          </View>
          
          <View style={styles.valueSection}>
            <ThemedText style={[styles.valueLabel, { color: secondaryColor }]}>Remote version:</ThemedText>
            <ThemedText style={styles.valueText}>
              {field === 'tags' ? remoteValue.join(', ') : remoteValue}
            </ThemedText>
          </View>
        </View>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <ThemedView style={[styles.modalContent, { backgroundColor }]}>
          <View style={styles.header}>
            <ThemedText style={[styles.title, { color: textColor }]}>
              Resolve Conflicts
            </ThemedText>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={textColor} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content}>
            <ThemedText style={[styles.description, { color: secondaryColor }]}>
              This note has been modified in multiple places. Choose how to resolve the conflicts:
            </ThemedText>

            <View style={styles.conflictsSection}>
              <ThemedText style={[styles.sectionTitle, { color: textColor }]}>
                Conflicts Found:
              </ThemedText>
              {conflicts.map(renderConflictField)}
            </View>

            <View style={styles.strategySection}>
              <ThemedText style={[styles.sectionTitle, { color: textColor }]}>
                Resolution Strategy:
              </ThemedText>
              
              <TouchableOpacity
                style={[
                  styles.strategyOption,
                  selectedStrategy === 'local' && { backgroundColor: primaryColor + '20', borderColor: primaryColor }
                ]}
                onPress={() => setSelectedStrategy('local')}
              >
                <Ionicons 
                  name={selectedStrategy === 'local' ? 'radio-button-on' : 'radio-button-off'} 
                  size={20} 
                  color={selectedStrategy === 'local' ? primaryColor : secondaryColor} 
                />
                <View style={styles.strategyText}>
                  <ThemedText style={[styles.strategyTitle, { color: textColor }]}>
                    Keep Your Changes
                  </ThemedText>
                  <ThemedText style={[styles.strategyDescription, { color: secondaryColor }]}>
                    Use your local version and overwrite remote changes
                  </ThemedText>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.strategyOption,
                  selectedStrategy === 'remote' && { backgroundColor: primaryColor + '20', borderColor: primaryColor }
                ]}
                onPress={() => setSelectedStrategy('remote')}
              >
                <Ionicons 
                  name={selectedStrategy === 'remote' ? 'radio-button-on' : 'radio-button-off'} 
                  size={20} 
                  color={selectedStrategy === 'remote' ? primaryColor : secondaryColor} 
                />
                <View style={styles.strategyText}>
                  <ThemedText style={[styles.strategyTitle, { color: textColor }]}>
                    Use Remote Version
                  </ThemedText>
                  <ThemedText style={[styles.strategyDescription, { color: secondaryColor }]}>
                    Discard your changes and use the remote version
                  </ThemedText>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.strategyOption,
                  selectedStrategy === 'merged' && { backgroundColor: primaryColor + '20', borderColor: primaryColor }
                ]}
                onPress={() => setSelectedStrategy('merged')}
              >
                <Ionicons 
                  name={selectedStrategy === 'merged' ? 'radio-button-on' : 'radio-button-off'} 
                  size={20} 
                  color={selectedStrategy === 'merged' ? primaryColor : secondaryColor} 
                />
                <View style={styles.strategyText}>
                  <ThemedText style={[styles.strategyTitle, { color: textColor }]}>
                    Merge Changes
                  </ThemedText>
                  <ThemedText style={[styles.strategyDescription, { color: secondaryColor }]}>
                    Combine both versions (tags will be merged)
                  </ThemedText>
                </View>
              </TouchableOpacity>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity onPress={onClose} style={[styles.button, styles.cancelButton]}>
              <ThemedText style={[styles.buttonText, { color: secondaryColor }]}>Cancel</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={handleResolve} 
              style={[styles.button, styles.resolveButton, { backgroundColor: primaryColor }]}
            >
              <ThemedText style={[styles.buttonText, { color: '#fff' }]}>Resolve</ThemedText>
            </TouchableOpacity>
          </View>
        </ThemedView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: Platform.OS === 'web' ? 600 : '90%',
    maxHeight: '80%',
    borderRadius: 12,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
  },
  description: {
    fontSize: 14,
    marginBottom: 20,
    lineHeight: 20,
  },
  conflictsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  conflictField: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  valueContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  valueSection: {
    flex: 1,
  },
  valueLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  valueText: {
    fontSize: 14,
    lineHeight: 18,
  },
  strategySection: {
    marginBottom: 20,
  },
  strategyOption: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    marginBottom: 8,
  },
  strategyText: {
    flex: 1,
    marginLeft: 12,
  },
  strategyTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  strategyDescription: {
    fontSize: 12,
    lineHeight: 16,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 20,
  },
  button: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
    minWidth: 80,
    alignItems: 'center',
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  resolveButton: {
    // backgroundColor set inline
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '500',
  },
}); 