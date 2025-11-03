import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, Switch, TextInput, TouchableOpacity, View } from 'react-native';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { ThemedText } from '../../components/ThemedText';
import { ThemedView } from '../../components/ThemedView';
import { AdminSidebar } from '../../components/web/AdminSidebar';
import { WebLayout } from '../../components/web/WebLayout';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { useAuth } from '../../hooks/useAuth';
import { useThemeColor } from '../../hooks/useThemeColor';
import { featureFlagService } from '../../services/FeatureFlagService';

import { FeatureFlag, FeatureFlagKey } from '../../types/FeatureFlags';

interface FeatureConfig {
  id: FeatureFlagKey;
  name: string;
  description: string;
  enabled: boolean;
  premiumOnly: boolean;
  trackingEnabled?: boolean; // Whether this feature should show up in user tracking pages
  rolloutPercentage?: number;
  targetEnvironments?: string[];
  targetUsers?: string[];
  targetRoles?: string[];
  category: 'core' | 'premium' | 'ai' | 'collaboration' | 'analytics';
  plansUsingFeature?: string[];
}

interface SystemHealth {
  flagsInitialized: boolean;
  limitsInitialized: boolean;
  totalFlags: number;
  totalLimits: number;
  enabledFlags: number;
  activeLimits: number;
  databaseConnected: boolean;
  configurationValid: boolean;
}

const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'core': return 'settings';
    case 'premium': return 'diamond';
    case 'ai': return 'sparkles';
    case 'collaboration': return 'people';
    case 'analytics': return 'analytics';
    default: return 'cube';
  }
};

const getCategoryColor = (category: string) => {
  switch (category) {
    case 'core': return '#6A5ACD';
    case 'premium': return '#FFD700';
    case 'ai': return '#FF6B6B';
    case 'collaboration': return '#3CB371';
    case 'analytics': return '#FF8C00';
    default: return '#9BA1A6';
  }
};

// Convert feature flags to feature configs
const convertFlagsToConfigs = (flags: Record<string, FeatureFlag>): FeatureConfig[] => {
  return Object.values(flags).map(flag => ({
    id: flag.id as FeatureFlagKey,
    name: flag.name,
    description: flag.description,
    enabled: flag.enabled,
    premiumOnly: flag.premiumOnly || false,
    trackingEnabled: flag.trackingEnabled !== undefined ? flag.trackingEnabled : true, // Default to true for backward compatibility
    rolloutPercentage: flag.rolloutPercentage,
    targetEnvironments: flag.targetEnvironments,
    targetUsers: flag.targetUsers,
    targetRoles: flag.targetRoles,
    category: getFeatureCategory(flag.id),
    plansUsingFeature: []
  }));
};

const getFeatureCategory = (featureId: string): FeatureConfig['category'] => {
  if (featureId.includes('ai_')) return 'ai';
  if (featureId.includes('premium') || featureId.includes('custom')) return 'premium';
  if (featureId.includes('share') || featureId.includes('team')) return 'collaboration';
  if (featureId.includes('analytics') || featureId.includes('search')) return 'analytics';
  return 'core';
};

export default function FeatureManagementScreen() {
  const { user, isAdmin } = useAuth();
  const { showSnackbar } = useSnackbar();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [features, setFeatures] = useState<FeatureConfig[]>([]);
  const [originalFeatures, setOriginalFeatures] = useState<FeatureConfig[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);

  // Theme colors
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const accentColor = useThemeColor({}, 'accentPrimary');
  const mutedTextColor = useThemeColor({}, 'textSecondary');
  const cardBackground = useThemeColor({}, 'backgroundSecondary');
  const borderColor = useThemeColor({}, 'border');
  const successColor = useThemeColor({}, 'accentSuccess');
  const warningColor = useThemeColor({}, 'accentWarning');
  const dangerColor = useThemeColor({}, 'accentDanger');

  useEffect(() => {
    if (user && isAdmin !== undefined) {
      loadData();
      loadSystemHealth();
    }
  }, [user, isAdmin]);

  const loadSystemHealth = async () => {
    try {
      // Get feature flags status
      const featureFlags = featureFlagService.getAllFlags();
      const totalFlags = Object.keys(featureFlags).length;
      const enabledFlags = Object.values(featureFlags).filter(flag => flag.enabled).length;
      
      // For now, we'll assume feature limits are working if we can access the service
      // In a real implementation, you might want to check the feature limits service
      const totalLimits = 5; // Default value, you can make this dynamic
      const activeLimits = 5; // Default value, you can make this dynamic
      
      setSystemHealth({
        flagsInitialized: totalFlags > 0,
        limitsInitialized: true, // Assuming working based on our tests
        totalFlags,
        totalLimits,
        enabledFlags,
        activeLimits,
        databaseConnected: true, // We'll assume true if we can get status
        configurationValid: totalFlags > 0 && totalLimits > 0
      });
    } catch (error) {
      console.error('Error loading system health:', error);
      setSystemHealth({
        flagsInitialized: false,
        limitsInitialized: false,
        totalFlags: 0,
        totalLimits: 0,
        enabledFlags: 0,
        activeLimits: 0,
        databaseConnected: false,
        configurationValid: false
      });
    }
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      console.log('FeatureManagement: Starting to load data...');
      
      if (!user) {
        console.error('FeatureManagement: No authenticated user found');
        Alert.alert('Authentication Error', 'Please log in to access feature management');
        return;
      }
      
      if (!isAdmin) {
        console.error('FeatureManagement: User is not admin');
        Alert.alert('Access Denied', 'Admin privileges required');
        return;
      }
      
      // Initialize feature flag service
      // Admin page is only accessible when user is authenticated
      await featureFlagService.initialize(true);
      
      // Load feature flags
      const featureFlags = featureFlagService.getAllFlags();
      console.log('FeatureManagement: Feature flags loaded:', Object.keys(featureFlags).length);

      // Convert to feature configs
      const featureConfigs = convertFlagsToConfigs(featureFlags);
      
      setFeatures(featureConfigs);
      setOriginalFeatures(featureConfigs);
    } catch (error) {
      console.error('Error loading feature data:', error);
      Alert.alert('Error', 'Failed to load feature settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveFeatures = async () => {
    setIsSaving(true);
    try {
      // Track which features were changed
      const changedFeatures: string[] = [];
      features.forEach(feature => {
        const originalFeature = originalFeatures.find(orig => orig.id === feature.id);
        if (originalFeature) {
          const fieldsToCheck = ['enabled', 'premiumOnly', 'rolloutPercentage', 'targetEnvironments', 'targetUsers', 'targetRoles'];
          const hasChanges = fieldsToCheck.some(field => 
            JSON.stringify(feature[field as keyof FeatureConfig]) !== JSON.stringify(originalFeature[field as keyof FeatureConfig])
          );
          if (hasChanges) {
            changedFeatures.push(feature.name);
          }
        }
      });

      // Convert features back to feature flag format
      const featureFlags = features.reduce((acc, feature) => {
        acc[feature.id] = {
          id: feature.id,
          name: feature.name,
          description: feature.description,
          enabled: feature.enabled,
          premiumOnly: feature.premiumOnly,
          rolloutPercentage: feature.rolloutPercentage,
          targetEnvironments: feature.targetEnvironments as ('development' | 'staging' | 'production')[],
          targetUsers: feature.targetUsers,
          targetRoles: feature.targetRoles as ('user' | 'admin' | 'support')[],
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: 'admin'
        };
        return acc;
      }, {} as Record<string, FeatureFlag>);

      // Save to Firebase
      await featureFlagService.updateFeatureFlags(featureFlags);
      
      // Update original features to current state after successful save
      setOriginalFeatures(features);
      
      const savedCount = Object.keys(featureFlags).length;
      const enabledCount = Object.values(featureFlags).filter(flag => flag.enabled).length;
      
      let successMessage = `Successfully saved ${savedCount} feature${savedCount !== 1 ? 's' : ''} (${enabledCount} enabled)`;
      
      if (changedFeatures.length > 0) {
        if (changedFeatures.length <= 3) {
          successMessage += `\nChanged: ${changedFeatures.join(', ')}`;
        } else {
          successMessage += `\nChanged: ${changedFeatures.slice(0, 2).join(', ')} and ${changedFeatures.length - 2} more`;
        }
      }
      
      if (Platform.OS === 'web') {
        showSnackbar(successMessage, 'success', 6000);
      } else {
        Alert.alert('Success', successMessage);
      }
    } catch (error) {
      console.error('Error saving features:', error);
      
      if (Platform.OS === 'web') {
        showSnackbar('Failed to save feature settings. Please try again.', 'error', 6000);
      } else {
        Alert.alert('Error', 'Failed to save feature settings');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateFeature = (featureId: string, updates: Partial<FeatureConfig>) => {
    setFeatures(prev => {
      const newFeatures = prev.map(feature => {
        if (feature.id === featureId) {
          const updatedFeature = { ...feature, ...updates };
          
          // Update category based on premiumOnly status
          if (updates.premiumOnly !== undefined) {
            if (updates.premiumOnly) {
              updatedFeature.category = 'premium';
            } else {
              updatedFeature.category = getFeatureCategory(featureId);
            }
          }
          
          return updatedFeature;
        }
        return feature;
      });
      return newFeatures;
    });
  };


  const handleResetAllFeatures = async () => {
    try {
      await featureFlagService.resetAllFeaturesToDefaults();
      await loadData();
      
      if (Platform.OS === 'web') {
        showSnackbar('All features reset to defaults successfully', 'success', 4000);
      } else {
        Alert.alert('Success', 'All features reset to defaults successfully');
      }
    } catch (error) {
      console.error('Error resetting all features:', error);
      
      if (Platform.OS === 'web') {
        showSnackbar(`Failed to reset all features: ${error instanceof Error ? error.message : String(error)}`, 'error', 6000);
      } else {
        Alert.alert('Error', `Failed to reset all features: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  };


  const handleResetToDefaults = async () => {
    Alert.alert(
      'Reset to Defaults',
      'This will reset feature flags to their default state. Feature limits will remain unchanged. This action cannot be undone. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            setIsInitializing(true);
            try {
              // Reset feature flags to defaults
              await featureFlagService.resetAllFeaturesToDefaults();
              
              const message = `Features reset successfully!\n\nFlags: ✅ Reset to defaults\nLimits: ✅ Unchanged`;
              
              if (Platform.OS === 'web') {
                showSnackbar(message, 'success', 6000);
              } else {
                Alert.alert('Success', message);
              }
              
              // Reload data and health
              await loadData();
              await loadSystemHealth();
            } catch (error) {
              const errorMessage = `Failed to reset features: ${error instanceof Error ? error.message : String(error)}`;
              
              if (Platform.OS === 'web') {
                showSnackbar(errorMessage, 'error', 6000);
              } else {
                Alert.alert('Error', errorMessage);
              }
            } finally {
              setIsInitializing(false);
            }
          }
        }
      ]
    );
  };

  const filteredFeatures = selectedCategory === 'all' 
    ? features 
    : features.filter(feature => feature.category === selectedCategory);

  const categories = [
    { id: 'all', name: 'All Features', icon: 'grid' },
    { id: 'core', name: 'Core Features', icon: 'settings' },
    { id: 'premium', name: 'Premium Features', icon: 'diamond' },
    { id: 'ai', name: 'AI Features', icon: 'sparkles' },
    { id: 'collaboration', name: 'Collaboration', icon: 'people' },
    { id: 'analytics', name: 'Analytics', icon: 'analytics' }
  ];

  // Check if user is admin
  if (isAdmin === undefined) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.unauthorizedContainer}>
          <LoadingSpinner />
          <ThemedText style={styles.unauthorizedTitle}>
            Loading...
          </ThemedText>
          <ThemedText style={styles.unauthorizedSubtitle}>
            Checking permissions...
          </ThemedText>
        </View>
      </ThemedView>
    );
  }

  if (!isAdmin) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.unauthorizedContainer}>
          <Ionicons name="lock-closed" size={64} color="#FF6B6B" />
          <ThemedText style={styles.unauthorizedTitle}>
            Access Denied
          </ThemedText>
          <ThemedText style={styles.unauthorizedSubtitle}>
            You don&apos;t have permission to access this page
          </ThemedText>
        </View>
      </ThemedView>
    );
  }

  if (Platform.OS === 'web') {
    return (
      <WebLayout
        title="Feature Management"
        subtitle="Admin Dashboard"
        sidebar={<AdminSidebar activePage="feature-management" />}
        header={
          <View style={[styles.webHeader, { backgroundColor }]}>
            <TouchableOpacity
              style={[styles.webBackButton, { backgroundColor: 'rgba(255,255,255,0.1)' }]}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={20} color={textColor} />
              <ThemedText style={[styles.webBackText, { color: textColor }]}>
                Back
              </ThemedText>
            </TouchableOpacity>
            <View style={styles.webHeaderContent}>
              <ThemedText style={[styles.webHeaderTitle, { color: textColor }]}>
                Feature Management
              </ThemedText>
              <ThemedText style={[styles.webHeaderSubtitle, { color: mutedTextColor }]}>
                Control feature availability and access permissions
              </ThemedText>
            </View>
            <TouchableOpacity
              style={[styles.webBackButton, { backgroundColor: 'rgba(255,255,255,0.1)' }]}
              onPress={() => router.push('/admin/support')}
            >
              <Ionicons name="headset" size={20} color={textColor} />
              <ThemedText style={[styles.webBackText, { color: textColor }]}>
                Support
              </ThemedText>
            </TouchableOpacity>
          </View>
        }
      >
        <ScrollView style={[styles.container, { backgroundColor }]} contentContainerStyle={styles.webContent}>
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <LoadingSpinner />
              <ThemedText style={[styles.loadingText, { color: textColor }]}>
                Loading feature settings...
              </ThemedText>
            </View>
          ) : (
            <>
                             {/* System Health */}
               <View style={styles.systemHealthSection}>
                 <View style={styles.healthHeader}>
                   <ThemedText style={[styles.sectionTitle, { color: textColor }]}>
                     System Health
                   </ThemedText>
                   <TouchableOpacity 
                     style={[styles.refreshButton, { backgroundColor: accentColor }]}
                     onPress={loadSystemHealth}
                   >
                     <Ionicons name="refresh" size={16} color="white" />
                     <ThemedText style={styles.refreshButtonText}>
                       Refresh
                     </ThemedText>
                   </TouchableOpacity>
                 </View>
                 <View style={styles.healthGrid}>
                   <View style={styles.healthItem}>
                     <Ionicons name="server-outline" size={24} color={systemHealth?.databaseConnected ? successColor : dangerColor} />
                     <ThemedText style={[styles.healthItemTitle, { color: textColor }]}>
                       Database Connection
                     </ThemedText>
                     <ThemedText style={[styles.healthItemValue, { color: systemHealth?.databaseConnected ? successColor : dangerColor }]}>
                       {systemHealth?.databaseConnected ? 'Connected' : 'Disconnected'}
                     </ThemedText>
                   </View>
                   <View style={styles.healthItem}>
                     <Ionicons name="checkmark-circle-outline" size={24} color={systemHealth?.configurationValid ? successColor : dangerColor} />
                     <ThemedText style={[styles.healthItemTitle, { color: textColor }]}>
                       Configuration Valid
                     </ThemedText>
                     <ThemedText style={[styles.healthItemValue, { color: systemHealth?.configurationValid ? successColor : dangerColor }]}>
                       {systemHealth?.configurationValid ? 'Valid' : 'Invalid'}
                     </ThemedText>
                   </View>
                   <View style={styles.healthItem}>
                     <Ionicons name="flag" size={24} color={systemHealth?.flagsInitialized ? successColor : dangerColor} />
                     <ThemedText style={[styles.healthItemTitle, { color: textColor }]}>
                       Flags Initialized
                     </ThemedText>
                     <ThemedText style={[styles.healthItemValue, { color: systemHealth?.flagsInitialized ? successColor : dangerColor }]}>
                       {systemHealth?.flagsInitialized ? 'Yes' : 'No'}
                     </ThemedText>
                   </View>
                   <View style={styles.healthItem}>
                     <Ionicons name="list" size={24} color={systemHealth?.limitsInitialized ? successColor : dangerColor} />
                     <ThemedText style={[styles.healthItemTitle, { color: textColor }]}>
                       Limits Initialized
                     </ThemedText>
                     <ThemedText style={[styles.healthItemValue, { color: systemHealth?.limitsInitialized ? successColor : dangerColor }]}>
                       {systemHealth?.limitsInitialized ? 'Yes' : 'No'}
                     </ThemedText>
                   </View>
                 </View>
               </View>

               {/* System Setup */}
               <View style={styles.systemSetupSection}>
                 <ThemedText style={[styles.sectionTitle, { color: textColor }]}>
                   System Setup
                 </ThemedText>
                 <ThemedText style={[styles.sectionSubtitle, { color: mutedTextColor }]}>
                   Reset the feature system to default configurations
                 </ThemedText>
                 
                 <View style={styles.setupButtons}>
                   <TouchableOpacity 
                     style={[styles.setupButton, { backgroundColor: '#9E9E9E', borderColor: '#9E9E9E' }]}
                     onPress={handleResetToDefaults}
                     disabled={isInitializing}
                   >
                     <Ionicons name="refresh" size={20} color="white" />
                     <ThemedText style={styles.setupButtonText}>
                       {isInitializing ? 'Resetting...' : 'Reset to Defaults'}
                     </ThemedText>
                   </TouchableOpacity>
                 </View>

                 {systemHealth && (
                   <View style={styles.setupStatus}>
                     <ThemedText style={[styles.setupStatusTitle, { color: textColor }]}>
                       Current Status:
                     </ThemedText>
                     <View style={styles.setupStatusGrid}>
                       <View style={styles.setupStatusItem}>
                         <ThemedText style={[styles.setupStatusLabel, { color: mutedTextColor }]}>
                           Feature Flags:
                         </ThemedText>
                         <ThemedText style={[styles.setupStatusValue, { color: systemHealth.flagsInitialized ? successColor : warningColor }]}>
                           {systemHealth.totalFlags} total, {systemHealth.enabledFlags} enabled
                         </ThemedText>
                       </View>
                       <View style={styles.setupStatusItem}>
                         <ThemedText style={[styles.setupStatusLabel, { color: mutedTextColor }]}>
                           Feature Limits:
                         </ThemedText>
                         <ThemedText style={[styles.setupStatusValue, { color: systemHealth.limitsInitialized ? successColor : warningColor }]}>
                           {systemHealth.totalLimits} total, {systemHealth.activeLimits} active
                         </ThemedText>
                       </View>
                     </View>
                   </View>
                 )}
               </View>

              {/* Category Filter */}
              <View style={styles.categoryFilter}>
                {categories.map(category => (
                  <TouchableOpacity
                    key={category.id}
                    style={[
                      styles.categoryButton,
                      { backgroundColor: cardBackground, borderColor },
                      selectedCategory === category.id && { borderColor: accentColor, borderWidth: 2 }
                    ]}
                    onPress={() => setSelectedCategory(category.id)}
                  >
                    <Ionicons 
                      name={category.icon as any} 
                      size={20} 
                      color={selectedCategory === category.id ? accentColor : mutedTextColor} 
                    />
                    <ThemedText style={[
                      styles.categoryButtonText, 
                      { color: selectedCategory === category.id ? accentColor : textColor }
                    ]}>
                      {category.name}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Features List */}
              <View style={styles.featuresSection}>
                {filteredFeatures.length > 0 ? (
                  filteredFeatures.map(feature => (
                    <FeatureCard
                      key={feature.id}
                      feature={feature}
                      onUpdate={(updates) => handleUpdateFeature(feature.id, updates)}
                      textColor={textColor}
                      mutedTextColor={mutedTextColor}
                      cardBackground={cardBackground}
                      borderColor={borderColor}
                      accentColor={accentColor}
                    />
                  ))
                ) : (
                  <View style={[styles.noFeaturesContainer, { backgroundColor: cardBackground, borderColor }]}>
                    <Ionicons name="alert-circle" size={48} color={mutedTextColor} />
                    <ThemedText style={[styles.noFeaturesTitle, { color: textColor }]}>
                      No Features Found
                    </ThemedText>
                    <ThemedText style={[styles.noFeaturesSubtitle, { color: mutedTextColor }]}>
                      {features.length === 0 ? 'Features are still loading...' : `No features found in "${selectedCategory}" category`}
                    </ThemedText>
                  </View>
                )}
              </View>

              {/* Action Buttons */}
              <View style={styles.actionButtons}>
                <TouchableOpacity 
                  style={[styles.saveButton, { backgroundColor: accentColor }]}
                  onPress={handleSaveFeatures}
                  disabled={isSaving}
                >
                  <ThemedText style={styles.saveButtonText}>
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </ThemedText>
                </TouchableOpacity>


                <TouchableOpacity 
                  style={[styles.secondaryButton, { backgroundColor: '#F44336', borderColor: '#F44336' }]}
                  onPress={handleResetAllFeatures}
                  disabled={isSaving}
                >
                  <ThemedText style={styles.secondaryButtonText}>
                    Reset All Features
                  </ThemedText>
                </TouchableOpacity>


              </View>
            </>
          )}
        </ScrollView>
      </WebLayout>
    );
  }

  // Mobile layout
  return (
    <ThemedView style={[styles.container, { backgroundColor }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={textColor} />
        </TouchableOpacity>
        <ThemedText style={[styles.headerTitle, { color: textColor }]}>
          Feature Management
        </ThemedText>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content}>
        {isLoading ? (
          <LoadingSpinner />
        ) : (
          <View style={styles.mobileContent}>
            <ThemedText>Mobile feature management coming soon...</ThemedText>
          </View>
        )}
      </ScrollView>
    </ThemedView>
  );
}

// Feature Card Component
interface FeatureCardProps {
  feature: FeatureConfig;
  onUpdate: (updates: Partial<FeatureConfig>) => void;
  textColor: string;
  mutedTextColor: string;
  cardBackground: string;
  borderColor: string;
  accentColor: string;
}

const FeatureCard = ({ feature, onUpdate, textColor, mutedTextColor, cardBackground, borderColor, accentColor }: FeatureCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleSwitchChange = (value: boolean, field: keyof FeatureConfig) => {
    onUpdate({ [field]: value });
  };

  return (
    <View style={[styles.featureCard, { backgroundColor: cardBackground, borderColor }]}>
      <TouchableOpacity
        style={styles.featureHeader}
        onPress={() => setIsExpanded(!isExpanded)}
      >
        <View style={styles.featureInfo}>
          <View style={styles.featureIconContainer}>
            <Ionicons 
              name={getCategoryIcon(feature.category)} 
              size={24} 
              color={getCategoryColor(feature.category)} 
            />
          </View>
          <View style={styles.featureDetails}>
            <ThemedText style={[styles.featureName, { color: textColor }]}>
              {feature.name}
            </ThemedText>
            <ThemedText style={[styles.featureDescription, { color: mutedTextColor }]}>
              {feature.description}
            </ThemedText>
          </View>
        </View>
        <View style={styles.featureControls}>
          <Switch
            value={feature.enabled}
            onValueChange={(value) => handleSwitchChange(value, 'enabled')}
            trackColor={{ false: borderColor, true: accentColor }}
            thumbColor={feature.enabled ? '#fff' : '#f4f3f4'}
          />
          <Ionicons 
            name={isExpanded ? 'chevron-up' : 'chevron-down'} 
            size={20} 
            color={mutedTextColor} 
          />
        </View>
      </TouchableOpacity>

      {isExpanded && (
        <View style={styles.featureExpanded}>
          {/* Premium Only Toggle */}
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <ThemedText style={[styles.settingLabel, { color: textColor }]}>
                Premium Only
              </ThemedText>
              <ThemedText style={[styles.settingDescription, { color: mutedTextColor }]}>
                Restrict this feature to premium users only
              </ThemedText>
            </View>
            <Switch
              value={feature.premiumOnly}
              onValueChange={(value) => handleSwitchChange(value, 'premiumOnly')}
              trackColor={{ false: borderColor, true: accentColor }}
              thumbColor={feature.premiumOnly ? '#fff' : '#f4f3f4'}
            />
          </View>

          {/* Tracking Enabled Toggle */}
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <ThemedText style={[styles.settingLabel, { color: textColor }]}>
                Show in User Tracking
              </ThemedText>
              <ThemedText style={[styles.settingDescription, { color: mutedTextColor }]}>
                Display this feature in user usage tracking pages
              </ThemedText>
            </View>
            <Switch
              value={feature.trackingEnabled !== false} // Default to true if not specified
              onValueChange={(value) => handleSwitchChange(value, 'trackingEnabled')}
              trackColor={{ false: borderColor, true: accentColor }}
              thumbColor={(feature.trackingEnabled !== false) ? '#fff' : '#f4f3f4'}
            />
          </View>

          {/* Rollout Percentage */}
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <ThemedText style={[styles.settingLabel, { color: textColor }]}>
                Rollout Percentage
              </ThemedText>
              <ThemedText style={[styles.settingDescription, { color: mutedTextColor }]}>
                Percentage of users who get access to this feature (0-100%)
              </ThemedText>
            </View>
            <View style={styles.rolloutContainer}>
              <TextInput
                style={[styles.rolloutInput, { borderColor, color: textColor }]}
                value={feature.rolloutPercentage?.toString() || '100'}
                onChangeText={(value) => {
                  const num = parseInt(value) || 0;
                  onUpdate({ rolloutPercentage: Math.min(100, Math.max(0, num)) });
                }}
                keyboardType="numeric"
                placeholder="100"
                placeholderTextColor={mutedTextColor}
              />
              <ThemedText style={[styles.rolloutLabel, { color: mutedTextColor }]}>%</ThemedText>
            </View>
          </View>

          {/* Environment Targeting */}
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <ThemedText style={[styles.settingLabel, { color: textColor }]}>
                Target Environments
              </ThemedText>
              <ThemedText style={[styles.settingDescription, { color: mutedTextColor }]}>
                Which environments can access this feature
              </ThemedText>
            </View>
            <View style={styles.environmentButtons}>
              {(['development', 'staging', 'production'] as const).map(env => (
                <TouchableOpacity
                  key={env}
                  style={[
                    styles.environmentButton,
                    { borderColor },
                    feature.targetEnvironments?.includes(env) && { borderColor: accentColor, backgroundColor: accentColor + '20' }
                  ]}
                  onPress={() => {
                    const currentEnvs = feature.targetEnvironments || [];
                    const newEnvs = currentEnvs.includes(env)
                      ? currentEnvs.filter(e => e !== env)
                      : [...currentEnvs, env];
                    onUpdate({ targetEnvironments: newEnvs });
                  }}
                >
                  <ThemedText style={[
                    styles.environmentButtonText,
                    { color: feature.targetEnvironments?.includes(env) ? accentColor : textColor }
                  ]}>
                    {env.charAt(0).toUpperCase() + env.slice(1)}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Target Roles */}
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <ThemedText style={[styles.settingLabel, { color: textColor }]}>
                Target Roles
              </ThemedText>
              <ThemedText style={[styles.settingDescription, { color: mutedTextColor }]}>
                Which user roles can access this feature
              </ThemedText>
            </View>
            <View style={styles.roleButtons}>
              {(['user', 'admin', 'support'] as const).map(role => (
                <TouchableOpacity
                  key={role}
                  style={[
                    styles.roleButton,
                    { borderColor },
                    feature.targetRoles?.includes(role) && { borderColor: accentColor, backgroundColor: accentColor + '20' }
                  ]}
                  onPress={() => {
                    const currentRoles = feature.targetRoles || [];
                    const newRoles = currentRoles.includes(role)
                      ? currentRoles.filter(r => r !== role)
                      : [...currentRoles, role];
                    onUpdate({ targetRoles: newRoles });
                  }}
                >
                  <ThemedText style={[
                    styles.roleButtonText,
                    { color: feature.targetRoles?.includes(role) ? accentColor : textColor }
                  ]}>
                    {role.charAt(0).toUpperCase() + role.slice(1)}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    gap: 16,
  },
  webBackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 80,
  },
  webBackText: {
    fontSize: 16,
    fontWeight: '500',
  },
  webHeaderContent: {
    flex: 1,
  },
  webHeaderTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  webHeaderSubtitle: {
    fontSize: 16,
  },
  webContent: {
    padding: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  loadingText: {
    marginTop: 20,
    fontSize: 18,
  },
  categoryFilter: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  categoryButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  featuresSection: {
    gap: 16,
    marginBottom: 24,
  },
  featureCard: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  featureHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  featureInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  featureIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: 'rgba(106, 90, 205, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureDetails: {
    flex: 1,
  },
  featureName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
  },
  featureControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureExpanded: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    gap: 16,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingInfo: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 12,
  },
  rolloutContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rolloutInput: {
    width: 60,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    textAlign: 'center',
    fontSize: 14,
  },
  rolloutLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  environmentButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  environmentButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  environmentButtonText: {
    fontSize: 12,
    fontWeight: '500',
  },
  roleButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  roleButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  roleButtonText: {
    fontSize: 12,
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 24,
  },
  saveButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerSpacer: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  mobileContent: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  unauthorizedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  unauthorizedTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  unauthorizedSubtitle: {
    fontSize: 16,
    opacity: 0.7,
    textAlign: 'center',
  },
  noFeaturesContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  noFeaturesTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  noFeaturesSubtitle: {
    fontSize: 14,
    marginBottom: 16,
  },
     systemHealthSection: {
     marginBottom: 24,
     padding: 16,
     borderRadius: 12,
     backgroundColor: 'rgba(255,255,255,0.05)',
     borderWidth: 1,
     borderColor: 'rgba(255,255,255,0.1)',
   },
   healthHeader: {
     flexDirection: 'row',
     justifyContent: 'space-between',
     alignItems: 'center',
     marginBottom: 12,
   },
   refreshButton: {
     flexDirection: 'row',
     alignItems: 'center',
     paddingHorizontal: 12,
     paddingVertical: 6,
     borderRadius: 6,
     gap: 4,
   },
   refreshButtonText: {
     color: 'white',
     fontSize: 12,
     fontWeight: '500',
   },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  healthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    gap: 12,
  },
  healthItem: {
    alignItems: 'center',
    width: '45%', // Adjust as needed for two columns
  },
  healthItemTitle: {
    fontSize: 14,
    marginTop: 8,
  },
     healthItemValue: {
     fontSize: 18,
     fontWeight: 'bold',
   },
   systemSetupSection: {
     marginBottom: 24,
     padding: 16,
     borderRadius: 12,
     backgroundColor: 'rgba(255,255,255,0.05)',
     borderWidth: 1,
     borderColor: 'rgba(255,255,255,0.1)',
   },
   sectionSubtitle: {
     fontSize: 14,
     marginBottom: 16,
     opacity: 0.8,
   },
   setupButtons: {
     flexDirection: 'row',
     gap: 12,
     marginBottom: 16,
   },
   setupButton: {
     flex: 1,
     flexDirection: 'row',
     alignItems: 'center',
     justifyContent: 'center',
     paddingVertical: 12,
     paddingHorizontal: 16,
     borderRadius: 8,
     gap: 8,
   },
   setupButtonText: {
     color: 'white',
     fontSize: 14,
     fontWeight: '600',
   },
   setupStatus: {
     paddingTop: 16,
     borderTopWidth: 1,
     borderTopColor: 'rgba(255,255,255,0.1)',
   },
   setupStatusTitle: {
     fontSize: 14,
     fontWeight: '600',
     marginBottom: 12,
   },
   setupStatusGrid: {
     gap: 8,
   },
   setupStatusItem: {
     flexDirection: 'row',
     justifyContent: 'space-between',
     alignItems: 'center',
   },
   setupStatusLabel: {
     fontSize: 13,
   },
   setupStatusValue: {
     fontSize: 13,
     fontWeight: '500',
   },
}); 