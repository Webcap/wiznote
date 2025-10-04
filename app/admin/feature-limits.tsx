import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { ThemedText } from '../../components/ThemedText';
import { ThemedView } from '../../components/ThemedView';
import { AdminSidebar } from '../../components/web/AdminSidebar';
import { WebLayout } from '../../components/web/WebLayout';
import { useAuth } from '../../hooks/useAuth';
import { useFeatureLimits } from '../../hooks/useFeatureLimits';
import { useThemeColor } from '../../hooks/useThemeColor';
import { FeatureLimit, formatLimit } from '../../types/FeatureLimits';

export default function FeatureLimitsScreen() {
  const router = useRouter();
  const { user, isAdmin: isAdminFn } = useAuth();
  const isAdmin = isAdminFn();
  const {
    featureLimits,
    loading,
    error,
    saveFeatureLimit,
    deleteFeatureLimit,
    initializeDefaults,
    getFeatureLimitsByCategory,
    getPremiumFeatures,
    clearCache,
    forceRefresh,
  } = useFeatureLimits();

  const [selectedCategory, setSelectedCategory] = useState<FeatureLimit['category'] | 'all'>('all');
  const [editingLimit, setEditingLimit] = useState<FeatureLimit | null>(null);
  const [showPremiumOnly, setShowPremiumOnly] = useState(false);
  const [editForm, setEditForm] = useState<Partial<FeatureLimit>>({});
  const [isInitializing, setIsInitializing] = useState(false);

  // Theme colors
  const textColor = useThemeColor({}, 'text');
  const textSecondaryColor = useThemeColor({}, 'textSecondary');
  const cardBg = useThemeColor({}, 'backgroundSecondary');
  const borderColor = useThemeColor({}, 'border');
  const accentPrimary = useThemeColor({}, 'accentPrimary');
  const accentDanger = useThemeColor({}, 'accentDanger');
  const accentSuccess = useThemeColor({}, 'accentSuccess');
  const accentWarning = useThemeColor({}, 'accentWarning');
  const iconColor = useThemeColor({}, 'icon');

  // Check admin access
  useEffect(() => {
    if (user === null && !loading) {
      return;
    }
    
    if (user && !isAdmin) {
      Alert.alert('Access Denied', 'You need admin privileges to access this page.');
      router.back();
    }
  }, [isAdmin, router, user, loading]);

  // Filter features based on selected category and premium status
  const filteredFeatures = (featureLimits || []).filter(limit => {
    if (selectedCategory !== 'all' && limit.category !== selectedCategory) return false;
    if (showPremiumOnly && limit.premiumUserLimit !== 'unlimited') return false;
    return true;
  });

  // Debug logging to help identify missing features
  useEffect(() => {
    if (!featureLimits) return;
    
    console.log('FeatureLimitsScreen: Total features loaded:', featureLimits.length);
    console.log('FeatureLimitsScreen: AI features:', featureLimits.filter(f => f.category === 'ai').map(f => f.featureName));
    console.log('FeatureLimitsScreen: Looking for AI Name Generation:', featureLimits.find(f => f.featureId === 'ai_name_generating'));
    
    // Check specifically for AI Name Generation
    const aiNameGen = featureLimits.find(f => f.featureId === 'ai_name_generating');
    if (aiNameGen) {
      console.log('FeatureLimitsScreen: AI Name Generation found:', aiNameGen);
    } else {
      console.log('FeatureLimitsScreen: AI Name Generation NOT found in loaded features');
      console.log('FeatureLimitsScreen: All feature IDs:', featureLimits.map(f => f.featureId));
    }
    
    // Check filtered features
    console.log('FeatureLimitsScreen: Filtered features count:', filteredFeatures.length);
    console.log('FeatureLimitsScreen: Filtered AI features:', filteredFeatures.filter(f => f.category === 'ai').map(f => f.featureName));
  }, [featureLimits, filteredFeatures]);

  const categories: Array<{ value: FeatureLimit['category'] | 'all'; label: string; icon: string }> = [
    { value: 'all', label: 'All Features', icon: 'grid' },
    { value: 'ai', label: 'AI Features', icon: 'sparkles' },
    { value: 'audio', label: 'Audio', icon: 'mic' },
    { value: 'storage', label: 'Storage', icon: 'folder' },
    { value: 'collaboration', label: 'Collaboration', icon: 'people' },
    { value: 'analytics', label: 'Analytics', icon: 'analytics' },
    { value: 'customization', label: 'Customization', icon: 'color-palette' },
  ];

  const handleSaveLimit = async (limit: FeatureLimit) => {
    console.log('FeatureLimitsScreen: handleSaveLimit called for', limit.featureId);
    try {
      // Clean up undefined values before saving
      const cleanedEditForm = { ...editForm };
      
      // Remove undefined session limits
      if (cleanedEditForm.freeUserSessionLimit === undefined) {
        delete cleanedEditForm.freeUserSessionLimit;
      }
      if (cleanedEditForm.premiumUserSessionLimit === undefined) {
        delete cleanedEditForm.premiumUserSessionLimit;
      }
      
      // Remove other undefined values
      Object.keys(cleanedEditForm).forEach(key => {
        if (cleanedEditForm[key] === undefined) {
          delete cleanedEditForm[key];
        }
      });
      
      // Create a proper FeatureLimit object with camelCase properties
      const updatedLimit: FeatureLimit = {
        ...limit,
        freeUserLimit: cleanedEditForm.freeUserLimit,
        freeUserPeriod: cleanedEditForm.freeUserPeriod,
        freeUserLimitType: cleanedEditForm.freeUserLimitType,
        premiumUserLimit: cleanedEditForm.premiumUserLimit,
        premiumUserPeriod: cleanedEditForm.premiumUserPeriod,
        premiumUserLimitType: cleanedEditForm.premiumUserLimitType,
        isActive: cleanedEditForm.isActive,
        priority: cleanedEditForm.priority,
        // Add session limits if they exist
        ...(cleanedEditForm.freeUserSessionLimit !== undefined && { 
          freeUserSessionLimit: cleanedEditForm.freeUserSessionLimit 
        }),
        ...(cleanedEditForm.premiumUserSessionLimit !== undefined && { 
          premiumUserSessionLimit: cleanedEditForm.premiumUserSessionLimit 
        })
      };
      console.log('FeatureLimitsScreen: Saving updated limit:', updatedLimit);
      await saveFeatureLimit(updatedLimit);
      
      // Force refresh to ensure UI updates immediately
      if (forceRefresh) {
        await forceRefresh();
      }
      
      setEditingLimit(null);
      setEditForm({});
      console.log('FeatureLimitsScreen: Save completed successfully');
    } catch (error) {
      console.error('FeatureLimitsScreen: Save failed:', error);
      Alert.alert('Error', 'Failed to save feature limit');
    }
  };

  const handleEditLimit = (limit: FeatureLimit) => {
    console.log('FeatureLimitsScreen: handleEditLimit called for', limit.featureId);
    setEditingLimit(limit);
    const editFormData: Partial<FeatureLimit> = {
      freeUserLimit: limit.freeUserLimit,
      freeUserPeriod: limit.freeUserPeriod,
      freeUserLimitType: limit.freeUserLimitType,
      premiumUserLimit: limit.premiumUserLimit,
      premiumUserPeriod: limit.premiumUserPeriod,
      premiumUserLimitType: limit.premiumUserLimitType,
      isActive: limit.isActive,
      priority: limit.priority,
    };
    
    // Only include session limits for features that actually use them
    if (limit.freeUserSessionLimit !== undefined) {
      editFormData.freeUserSessionLimit = limit.freeUserSessionLimit;
    }
    if (limit.premiumUserSessionLimit !== undefined) {
      editFormData.premiumUserSessionLimit = limit.premiumUserSessionLimit;
    }
    
    setEditForm(editFormData);
    console.log('FeatureLimitsScreen: Edit form set for', limit.featureId);
  };

  const handleCancelEdit = () => {
    setEditingLimit(null);
    setEditForm({});
  };

  const handleDeleteLimit = async (featureId: string) => {
    Alert.alert(
      'Delete Feature Limit',
      'Are you sure you want to delete this feature limit? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteFeatureLimit(featureId);
            } catch (error) {
              Alert.alert('Error', 'Failed to delete feature limit');
            }
          },
        },
      ]
    );
  };

  const handleInitializeDefaults = async () => {
    console.log('FeatureLimitsScreen: handleInitializeDefaults called');
    Alert.alert(
      'Initialize Default Limits',
      'This will create default feature limits. Existing limits will be preserved. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Initialize',
          onPress: async () => {
            try {
              console.log('FeatureLimitsScreen: Starting initialization...');
              setIsInitializing(true);
              await initializeDefaults();
              console.log('FeatureLimitsScreen: Initialization completed successfully');
            } catch (error) {
              console.error('FeatureLimitsScreen: Initialization failed:', error);
              Alert.alert('Error', `Failed to initialize default limits: ${error.message}`);
            } finally {
              setIsInitializing(false);
            }
          },
        },
      ]
    );
  };

  const renderLimitInput = (limit: FeatureLimit, field: 'freeUserLimit' | 'premiumUserLimit') => {
    const value = limit[field];
    const isUnlimited = field === 'premiumUserLimit' && value === 'unlimited';
    
    return (
      <View style={styles.inputContainer}>
        <ThemedText style={styles.inputLabel}>
          {field === 'freeUserLimit' ? 'Free User Limit' : 'Premium User Limit'}:
        </ThemedText>
        {isUnlimited ? (
          <ThemedText style={[styles.unlimitedText, { color: accentSuccess }]}>Unlimited</ThemedText>
        ) : (
          <ThemedText style={[styles.limitText, { color: accentPrimary }]}>
            {formatLimit(value as number, limit[field === 'freeUserLimit' ? 'freeUserLimitType' : 'premiumUserLimitType'])}
          </ThemedText>
        )}
      </View>
    );
  };

  const renderFeatureCard = (limit: FeatureLimit) => {
    const isEditing = editingLimit?.featureId === limit.featureId;
    
    return (
      <View key={limit.featureId} style={[styles.featureCard, { backgroundColor: cardBg, borderColor }]}>
        <View style={styles.featureHeader}>
          <View style={styles.featureInfo}>
            <ThemedText style={[styles.featureName, { color: textColor }]}>{limit.featureName}</ThemedText>
            <ThemedText style={[styles.featureDescription, { color: textSecondaryColor }]}>{limit.description}</ThemedText>
            <View style={styles.featureMeta}>
              <View style={[styles.categoryBadge, { backgroundColor: getCategoryColor(limit.category) }]}>
                <ThemedText style={styles.categoryText}>{limit.category}</ThemedText>
              </View>
              <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(limit.priority) }]}>
                <ThemedText style={styles.priorityText}>Priority {limit.priority}</ThemedText>
              </View>
            </View>
          </View>
          <View style={styles.featureActions}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: cardBg }]}
              onPress={() => isEditing ? handleCancelEdit() : handleEditLimit(limit)}
            >
              <Ionicons name={isEditing ? 'close' : 'pencil'} size={20} color={accentPrimary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.deleteButton, { backgroundColor: accentDanger + '20' }]}
              onPress={() => handleDeleteLimit(limit.featureId)}
            >
              <Ionicons name="trash" size={20} color={accentDanger} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.limitsContainer}>
          <View style={[styles.limitSection, { backgroundColor: cardBg }]}>
            <ThemedText style={[styles.sectionTitle, { color: textColor }]}>Free Users</ThemedText>
            {renderLimitInput(limit, 'freeUserLimit')}
            <ThemedText style={[styles.periodText, { color: textSecondaryColor }]}>
              Period: {limit.freeUserPeriod} | Type: {limit.freeUserLimitType}
            </ThemedText>
            {limit.freeUserSessionLimit && (
              <ThemedText style={[styles.periodText, { color: textSecondaryColor }]}>
                Session: {limit.freeUserSessionLimit} minutes
              </ThemedText>
            )}
          </View>
          
          <View style={[styles.limitSection, { backgroundColor: cardBg }]}>
            <ThemedText style={[styles.sectionTitle, { color: textColor }]}>Premium Users</ThemedText>
            {renderLimitInput(limit, 'premiumUserLimit')}
            <ThemedText style={[styles.periodText, { color: textSecondaryColor }]}>
              Period: {limit.premiumUserPeriod} | Type: {limit.premiumUserLimitType}
            </ThemedText>
            {limit.premiumUserSessionLimit && (
              <ThemedText style={[styles.periodText, { color: textSecondaryColor }]}>
                Session: {limit.premiumUserSessionLimit === 'unlimited' ? 'Unlimited' : `${limit.premiumUserSessionLimit} minutes`}
              </ThemedText>
            )}
          </View>
        </View>

        {isEditing && (
          <View style={[styles.editForm, { backgroundColor: cardBg }]}>
            <ThemedText style={[styles.editTitle, { color: textColor }]}>Edit Feature Limit</ThemedText>
            
            <View style={styles.editFormGrid}>
              {/* Free User Settings */}
              <View style={styles.editSection}>
                <ThemedText style={[styles.editSectionTitle, { color: textColor }]}>Free User Limits</ThemedText>
                
                <View style={styles.inputRow}>
                  <ThemedText style={[styles.inputLabel, { color: textSecondaryColor }]}>Limit:</ThemedText>
                  <TextInput
                    style={[styles.textInput, { backgroundColor: cardBg, borderColor, color: textColor }]}
                    value={editForm.freeUserLimit?.toString() || ''}
                    onChangeText={(text) => setEditForm(prev => ({ ...prev, freeUserLimit: parseInt(text) || 0 }))}
                    keyboardType="numeric"
                    placeholder="Enter limit value"
                    placeholderTextColor={textSecondaryColor}
                  />
                </View>

                <View style={styles.inputRow}>
                  <ThemedText style={[styles.inputLabel, { color: textSecondaryColor }]}>Period:</ThemedText>
                  <View style={styles.selectContainer}>
                    {(['daily', 'weekly', 'monthly'] as const).map((period) => (
                      <TouchableOpacity
                        key={period}
                        style={[
                          styles.selectOption,
                          { borderColor },
                          editForm.freeUserPeriod === period && { backgroundColor: accentPrimary, borderColor: accentPrimary }
                        ]}
                        onPress={() => setEditForm(prev => ({ ...prev, freeUserPeriod: period }))}
                      >
                        <ThemedText style={[
                          styles.selectOptionText,
                          { color: editForm.freeUserPeriod === period ? '#FFFFFF' : textColor }
                        ]}>
                          {period.charAt(0).toUpperCase() + period.slice(1)}
                        </ThemedText>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.inputRow}>
                  <ThemedText style={[styles.inputLabel, { color: textSecondaryColor }]}>Type:</ThemedText>
                  <View style={styles.selectContainer}>
                    {getAllowedLimitTypes(limit.featureId).map((type) => (
                      <TouchableOpacity
                        key={type}
                        style={[
                          styles.selectOption,
                          { borderColor },
                          editForm.freeUserLimitType === type && { backgroundColor: accentPrimary, borderColor: accentPrimary }
                        ]}
                        onPress={() => setEditForm(prev => ({ ...prev, freeUserLimitType: type }))}
                      >
                        <ThemedText style={[
                          styles.selectOptionText,
                          { color: editForm.freeUserLimitType === type ? '#FFFFFF' : textColor }
                        ]}>
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </ThemedText>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              {/* Premium User Settings */}
              <View style={styles.editSection}>
                <ThemedText style={[styles.editSectionTitle, { color: textColor }]}>Premium User Limits</ThemedText>
                
                <View style={styles.inputRow}>
                  <ThemedText style={[styles.inputLabel, { color: textSecondaryColor }]}>Limit:</ThemedText>
                  <View style={styles.premiumLimitContainer}>
                    <TextInput
                      style={[
                        styles.textInput,
                        { backgroundColor: cardBg, borderColor, color: textColor },
                        editForm.premiumUserLimit === 'unlimited' && { opacity: 0.5 }
                      ]}
                      value={editForm.premiumUserLimit === 'unlimited' ? '' : editForm.premiumUserLimit?.toString() || ''}
                      onChangeText={(text) => setEditForm(prev => ({ ...prev, premiumUserLimit: parseInt(text) || 0 }))}
                      keyboardType="numeric"
                      placeholder="Enter limit value"
                      placeholderTextColor={textSecondaryColor}
                      editable={editForm.premiumUserLimit !== 'unlimited'}
                    />
                    <TouchableOpacity
                      style={[
                        styles.unlimitedToggle,
                        { borderColor },
                        editForm.premiumUserLimit === 'unlimited' && { backgroundColor: accentSuccess, borderColor: accentSuccess }
                      ]}
                      onPress={() => setEditForm(prev => ({ 
                        ...prev, 
                        premiumUserLimit: prev.premiumUserLimit === 'unlimited' ? 0 : 'unlimited' 
                      }))}
                    >
                      <ThemedText style={[
                        styles.unlimitedToggleText,
                        { color: editForm.premiumUserLimit === 'unlimited' ? '#FFFFFF' : textColor }
                      ]}>
                        Unlimited
                      </ThemedText>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.inputRow}>
                  <ThemedText style={[styles.inputLabel, { color: textSecondaryColor }]}>Period:</ThemedText>
                  <View style={styles.selectContainer}>
                    {(['daily', 'weekly', 'monthly'] as const).map((period) => (
                      <TouchableOpacity
                        key={period}
                        style={[
                          styles.selectOption,
                          { borderColor },
                          editForm.premiumUserPeriod === period && { backgroundColor: accentPrimary, borderColor: accentPrimary }
                        ]}
                        onPress={() => setEditForm(prev => ({ ...prev, premiumUserPeriod: period }))}
                      >
                        <ThemedText style={[
                          styles.selectOptionText,
                          { color: editForm.premiumUserPeriod === period ? '#FFFFFF' : textColor }
                        ]}>
                          {period.charAt(0).toUpperCase() + period.slice(1)}
                        </ThemedText>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.inputRow}>
                  <ThemedText style={[styles.inputLabel, { color: textSecondaryColor }]}>Type:</ThemedText>
                  <View style={styles.selectContainer}>
                    {getAllowedLimitTypes(limit.featureId).map((type) => (
                      <TouchableOpacity
                        key={type}
                        style={[
                          styles.selectOption,
                          { borderColor },
                          editForm.premiumUserLimitType === type && { backgroundColor: accentPrimary, borderColor: accentPrimary }
                        ]}
                        onPress={() => setEditForm(prev => ({ ...prev, premiumUserLimitType: type }))}
                      >
                        <ThemedText style={[
                          styles.selectOptionText,
                          { color: editForm.premiumUserLimitType === type ? '#FFFFFF' : textColor }
                        ]}>
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </ThemedText>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>
            </View>

            {/* Session Limits - Only show for features that use them */}
            {shouldShowSessionLimits(limit.featureId) && (
              <View style={styles.editSection}>
                <ThemedText style={[styles.editSectionTitle, { color: textColor }]}>Session Limits</ThemedText>
                
                <View style={styles.inputRow}>
                  <ThemedText style={[styles.inputLabel, { color: textSecondaryColor }]}>Free Session:</ThemedText>
                  <TextInput
                    style={[styles.textInput, { backgroundColor: cardBg, borderColor, color: textColor }]}
                    value={editForm.freeUserSessionLimit?.toString() || ''}
                    onChangeText={(text) => setEditForm(prev => ({ ...prev, freeUserSessionLimit: parseInt(text) || 0 }))}
                    keyboardType="numeric"
                    placeholder="Enter session limit (minutes)"
                    placeholderTextColor={textSecondaryColor}
                  />
                </View>

                <View style={styles.inputRow}>
                  <ThemedText style={[styles.inputLabel, { color: textSecondaryColor }]}>Premium Session:</ThemedText>
                  <View style={styles.premiumLimitContainer}>
                    <TextInput
                      style={[
                        styles.textInput,
                        { backgroundColor: cardBg, borderColor, color: textColor },
                        editForm.premiumUserSessionLimit === 'unlimited' && { opacity: 0.5 }
                      ]}
                      value={editForm.premiumUserSessionLimit === 'unlimited' ? '' : editForm.premiumUserSessionLimit?.toString() || ''}
                      onChangeText={(text) => setEditForm(prev => ({ ...prev, premiumUserSessionLimit: parseInt(text) || 0 }))}
                      keyboardType="numeric"
                      placeholder="Enter session limit (minutes)"
                      placeholderTextColor={textSecondaryColor}
                      editable={editForm.premiumUserSessionLimit !== 'unlimited'}
                    />
                    <TouchableOpacity
                      style={[
                        styles.unlimitedToggle,
                        { borderColor },
                        editForm.premiumUserSessionLimit === 'unlimited' && { backgroundColor: accentSuccess, borderColor: accentSuccess }
                      ]}
                      onPress={() => setEditForm(prev => ({ 
                        ...prev, 
                        premiumUserSessionLimit: prev.premiumUserSessionLimit === 'unlimited' ? 0 : 'unlimited' 
                      }))}
                    >
                      <ThemedText style={[
                        styles.unlimitedToggleText,
                        { color: editForm.premiumUserSessionLimit === 'unlimited' ? '#FFFFFF' : textColor }
                      ]}>
                        Unlimited
                      </ThemedText>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}

            {/* General Settings */}
            <View style={styles.editSection}>
              <ThemedText style={[styles.editSectionTitle, { color: textColor }]}>General Settings</ThemedText>
             
              <View style={styles.inputRow}>
                <ThemedText style={[styles.inputLabel, { color: textSecondaryColor }]}>Priority:</ThemedText>
                <TextInput
                  style={[styles.textInput, { backgroundColor: cardBg, borderColor, color: textColor }]}
                  value={editForm.priority?.toString() || ''}
                  onChangeText={(text) => setEditForm(prev => ({ ...prev, priority: parseInt(text) || 1 }))}
                  keyboardType="numeric"
                  placeholder="Enter priority (1-10)"
                  placeholderTextColor={textSecondaryColor}
                />
              </View>

              <View style={styles.inputRow}>
                <ThemedText style={[styles.inputLabel, { color: textSecondaryColor }]}>Active:</ThemedText>
                <TouchableOpacity
                  style={[
                    styles.toggleButton,
                    { borderColor },
                    editForm.isActive && { backgroundColor: accentSuccess, borderColor: accentSuccess }
                  ]}
                  onPress={() => setEditForm(prev => ({ ...prev, isActive: !prev.isActive }))}
                >
                  <ThemedText style={[
                    styles.toggleButtonText,
                    { color: editForm.isActive ? '#FFFFFF' : textColor }
                  ]}>
                    {editForm.isActive ? 'Yes' : 'No'}
                  </ThemedText>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.editActions}>
              <TouchableOpacity
                style={[styles.button, styles.saveButton, { backgroundColor: accentPrimary }]}
                onPress={() => handleSaveLimit(limit)}
              >
                <ThemedText style={styles.buttonText}>Save Changes</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton, { backgroundColor: accentDanger }]}
                onPress={handleCancelEdit}
              >
                <ThemedText style={styles.buttonText}>Cancel</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    );
  };

  const getCategoryColor = (category: FeatureLimit['category']) => {
    const colors = {
      ai: accentWarning,
      audio: accentSuccess,
      storage: accentPrimary,
      collaboration: '#96CEB4',
      analytics: '#FFEAA7',
      customization: '#DDA0DD',
    };
    return colors[category] || '#CCCCCC';
  };

  const getPriorityColor = (priority: number) => {
    if (priority <= 3) return accentDanger; // High priority
    if (priority <= 6) return accentWarning; // Medium priority
    return accentSuccess; // Low priority
  };

  // Get allowed limit types for a specific feature
  const getAllowedLimitTypes = (featureId: string): Array<'count' | 'duration' | 'storage'> => {
    // AI features that should only be count-based
    const countOnlyFeatures = ['ai_transcription', 'ai_summaries', 'ai_key_details', 'ai_name_generating'];
    
    // Audio features that can be duration-based
    const durationFeatures = ['voice_recording'];
    
    // Storage features
    const storageFeatures = ['note_storage'];
    
    if (countOnlyFeatures.includes(featureId)) {
      return ['count'];
    } else if (durationFeatures.includes(featureId)) {
      return ['count', 'duration'];
    } else if (storageFeatures.includes(featureId)) {
      return ['count', 'storage'];
    }
    
    // Default: allow all types
    return ['count', 'duration', 'storage'];
  };

  // Check if a feature should show session limits
  const shouldShowSessionLimits = (featureId: string): boolean => {
    // Only voice recording currently uses session limits
    return featureId === 'voice_recording';
  };

  if (!isAdmin) {
    return (
      <WebLayout
        sidebar={<AdminSidebar activePage="feature-limits" />}
        header={
          <View style={styles.webHeader}>
            <ThemedText type="title">Access Denied</ThemedText>
          </View>
        }
      >
        <ThemedView style={styles.webContent}>
          <ThemedText>You need admin privileges to access this page.</ThemedText>
        </ThemedView>
      </WebLayout>
    );
  }

  if (loading) {
    return (
      <WebLayout
        sidebar={<AdminSidebar activePage="feature-limits" />}
        header={
          <View style={styles.webHeader}>
            <ThemedText type="title">Feature Limits</ThemedText>
          </View>
        }
      >
        <ThemedView style={styles.webLoadingContainer}>
          <LoadingSpinner />
        </ThemedView>
      </WebLayout>
    );
  }

  return (
    <WebLayout
      sidebar={<AdminSidebar activePage="feature-limits" />}
      header={
        <View style={styles.webHeader}>
          <View>
            <ThemedText type="title">Feature Limits Management</ThemedText>
            <ThemedText style={styles.webHeaderSubtitle}>
              Manage feature usage limits and restrictions
            </ThemedText>
          </View>
          <View style={styles.webHeaderRight}>
            <TouchableOpacity 
              style={[
                styles.refreshButton, 
                { backgroundColor: 'rgba(255,255,255,0.1)' }
              ]}
              onPress={() => router.push('/admin/support')}
            >
              <Ionicons name="headset" size={20} color={iconColor} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={[
                styles.refreshButton, 
                { backgroundColor: 'rgba(255,255,255,0.1)' },
                isInitializing && { opacity: 0.5 }
              ]}
              onPress={() => {
                console.log('FeatureLimitsScreen: Header initialize button clicked!');
                handleInitializeDefaults();
              }}
              disabled={isInitializing}
            >
              <Ionicons name={isInitializing ? "hourglass" : "refresh"} size={20} color={iconColor} />
            </TouchableOpacity>
          </View>
        </View>
      }
    >
      <ScrollView style={styles.webContent}>
        {error && (
          <View style={[styles.errorContainer, { backgroundColor: accentDanger + '20' }]}>
            <ThemedText style={[styles.errorText, { color: accentDanger }]}>{error}</ThemedText>
          </View>
        )}

        {isInitializing && (
          <View style={[styles.infoContainer, { backgroundColor: accentPrimary + '20' }]}>
            <ThemedText style={[styles.infoText, { color: accentPrimary }]}>
              Initializing default feature limits... Please wait.
            </ThemedText>
          </View>
        )}

        <View style={styles.section}>
          <View style={styles.filters}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
              {categories.map((category) => (
                <TouchableOpacity
                  key={category.value}
                  style={[
                    styles.categoryButton,
                    { borderColor: accentPrimary },
                    selectedCategory === category.value && { backgroundColor: accentPrimary },
                  ]}
                  onPress={() => setSelectedCategory(category.value)}
                >
                  <Ionicons
                    name={category.icon as any}
                    size={16}
                    color={selectedCategory === category.value ? '#FFFFFF' : accentPrimary}
                  />
                  <ThemedText
                    style={[
                      styles.categoryButtonText,
                      { color: selectedCategory === category.value ? '#FFFFFF' : accentPrimary },
                    ]}
                  >
                    {category.label}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={[
                styles.filterButton,
                { borderColor: accentPrimary },
                showPremiumOnly && { backgroundColor: accentPrimary },
              ]}
              onPress={() => setShowPremiumOnly(!showPremiumOnly)}
            >
              <Ionicons name="star" size={16} color={showPremiumOnly ? '#FFFFFF' : accentPrimary} />
              <ThemedText style={[styles.filterButtonText, { color: showPremiumOnly ? '#FFFFFF' : accentPrimary }]}>
                Premium Only
              </ThemedText>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ThemedText style={styles.sectionTitle}>Statistics</ThemedText>
                        <TouchableOpacity
              style={[styles.initializeButton, { backgroundColor: accentPrimary }]}
              onPress={() => {
                console.log('FeatureLimitsScreen: Statistics section initialize button clicked!');
                handleInitializeDefaults();
              }}
              disabled={isInitializing}
            >
              <Ionicons name="refresh" size={16} color="#FFFFFF" />
              <ThemedText style={[styles.initializeButtonText, { color: '#FFFFFF', fontSize: 14 }]}>
                {isInitializing ? 'Initializing...' : 'Initialize Defaults'}
              </ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.initializeButton, { backgroundColor: accentWarning, marginLeft: 12 }]}
              onPress={async () => {
                console.log('FeatureLimitsScreen: Clear cache button clicked!');
                try {
                  await clearCache();
                  Alert.alert('Success', 'Cache cleared successfully. Feature limits have been reloaded from the database.');
                } catch (error) {
                  Alert.alert('Error', 'Failed to clear cache. Please try again.');
                }
              }}
            >
              <Ionicons name="trash" size={16} color="#FFFFFF" />
              <ThemedText style={[styles.initializeButtonText, { color: '#FFFFFF', fontSize: 14 }]}>
                Clear Cache
              </ThemedText>
            </TouchableOpacity>
          </View>
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { backgroundColor: cardBg, borderColor }]}>
              <View style={styles.statHeader}>
                <Ionicons name="settings" size={24} color={accentPrimary} />
                <ThemedText style={styles.statNumber}>{filteredFeatures?.length || 0}</ThemedText>
              </View>
              <ThemedText style={styles.statLabel}>Features</ThemedText>
            </View>
            <View style={[styles.statCard, { backgroundColor: cardBg, borderColor }]}>
              <View style={styles.statHeader}>
                <Ionicons name="star" size={24} color={accentWarning} />
                <ThemedText style={styles.statNumber}>
                  {(filteredFeatures || []).filter(f => f.premiumUserLimit === 'unlimited').length}
                </ThemedText>
              </View>
              <ThemedText style={styles.statLabel}>Premium Features</ThemedText>
            </View>
            <View style={[styles.statCard, { backgroundColor: cardBg, borderColor }]}>
              <View style={styles.statHeader}>
                <Ionicons name="checkmark-circle" size={24} color={accentSuccess} />
                <ThemedText style={styles.statNumber}>
                  {(filteredFeatures || []).filter(f => f.isActive).length}
                </ThemedText>
              </View>
              <ThemedText style={styles.statLabel}>Active</ThemedText>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Feature Limits</ThemedText>
          {filteredFeatures.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: cardBg, borderColor }]}>
              <Ionicons name="settings-outline" size={48} color={textSecondaryColor} />
              <ThemedText style={[styles.emptyText, { color: textSecondaryColor }]}>No features found</ThemedText>
              <ThemedText style={[styles.emptySubtext, { color: textSecondaryColor }]}>
                {(featureLimits?.length || 0) === 0 
                  ? 'No feature limits have been initialized yet. Click "Initialize Defaults" to set up default feature limits.'
                  : 'Try adjusting your filters'
                }
              </ThemedText>
              {(featureLimits?.length || 0) === 0 && (
                <TouchableOpacity
                  style={[styles.initializeButton, { backgroundColor: accentPrimary }]}
                  onPress={handleInitializeDefaults}
                  disabled={isInitializing}
                >
                  <Ionicons name="refresh" size={20} color="#FFFFFF" />
                  <ThemedText style={[styles.initializeButtonText, { color: '#FFFFFF' }]}>
                    {isInitializing ? 'Initializing...' : 'Initialize Default Feature Limits'}
                  </ThemedText>
                </TouchableOpacity>
              )}
              
              {/* Test button to verify button functionality */}
              <TouchableOpacity
                style={[styles.initializeButton, { backgroundColor: accentWarning, marginTop: 12 }]}
                onPress={() => {
                  console.log('FeatureLimitsScreen: Test button clicked!');
                  Alert.alert('Test', 'Button is working!');
                }}
              >
                <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                <ThemedText style={[styles.initializeButtonText, { color: '#FFFFFF' }]}>
                  Test Button
                </ThemedText>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.featuresList}>
              {(filteredFeatures || []).map(renderFeatureCard)}
            </View>
          )}
        </View>
      </ScrollView>
    </WebLayout>
  );
}

const styles = StyleSheet.create({
  webHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 0,
    paddingTop: 40,
    paddingBottom: 30,
    gap: 20,
  },
  webHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  webHeaderSubtitle: {
    fontSize: 14,
    opacity: 0.7,
  },
  refreshButton: {
    padding: 8,
    borderRadius: 6,
  },
  webContent: {
    flex: 1,
    paddingHorizontal: 0,
  },
  webLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  errorContainer: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
  },
  errorText: {
    fontSize: 14,
  },
  infoContainer: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
  },
  infoText: {
    fontSize: 14,
  },
  filters: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  categoryScroll: {
    flex: 1,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  categoryButtonText: {
    marginLeft: 4,
    fontSize: 12,
    fontWeight: '500',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  filterButtonText: {
    marginLeft: 4,
    fontSize: 12,
    fontWeight: '500',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  statCard: {
    flex: 1,
    minWidth: 200,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 14,
    opacity: 0.7,
  },
  emptyState: {
    padding: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
  },
  featuresList: {
    gap: 16,
  },
  featureCard: {
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
  },
  featureHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  featureInfo: {
    flex: 1,
  },
  featureName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    marginBottom: 8,
  },
  featureMeta: {
    flexDirection: 'row',
    gap: 8,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  priorityText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  featureActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 8,
  },
  deleteButton: {
    // Background color set dynamically
  },
  limitsContainer: {
    flexDirection: 'row',
    gap: 16,
  },
  limitSection: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
  },
  inputContainer: {
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 12,
    marginBottom: 4,
    width: 80,
  },
  limitText: {
    fontSize: 16,
    fontWeight: '600',
  },
  unlimitedText: {
    fontSize: 16,
    fontWeight: '600',
  },
  periodText: {
    fontSize: 10,
  },
  editForm: {
    marginTop: 16,
    padding: 16,
    borderRadius: 8,
  },
  editTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  editFormGrid: {
    flexDirection: 'column',
    gap: 16,
  },
  editSection: {
    padding: 16,
    borderRadius: 8,
    backgroundColor: 'transparent',
  },
  editSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  textInput: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 14,
  },
  selectContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    backgroundColor: 'transparent',
  },
  selectOption: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  selectOptionText: {
    fontSize: 12,
    fontWeight: '500',
  },
  premiumLimitContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    flex: 1,
  },
  unlimitedToggle: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'transparent',
    marginLeft: 8,
  },
  unlimitedToggleText: {
    fontSize: 12,
    fontWeight: '500',
  },
  toggleButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  toggleButtonText: {
    fontSize: 12,
    fontWeight: '500',
  },
  editActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  initializeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    gap: 8,
    marginTop: 16,
  },
  initializeButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  saveButton: {
    // Background color set dynamically
  },
  cancelButton: {
    // Background color set dynamically
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
}); 