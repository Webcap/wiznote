import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { useThemeColor } from '../../hooks/useThemeColor';
import { planManagementService } from '../../services/PlanManagementService';
import type {
  EnhancedPlan,
  FeatureLimitConfig
} from '../../types/EnhancedPlans';
import { ThemedText } from '../ThemedText';

interface PlanFormProps {
  plan?: EnhancedPlan | null;
  onSave: (plan: EnhancedPlan) => void;
  onCancel: () => void;
  isVisible: boolean;
}

type FormStep = 'basic' | 'pricing' | 'features' | 'advanced' | 'preview';

interface FormData {
  name: string;
  description: string;
  price: string;
  currency: string;
  interval: 'monthly' | 'yearly' | 'weekly' | 'one-time';
  planType: 'subscription' | 'one-time' | 'usage-based';
  trialDays: string;
  maxUsers: string;
  maxStorage: string;
  isPopular: boolean;
  isActive: boolean;
  featureFlags: Record<string, boolean>;
  featureLimits: Record<string, FeatureLimitConfig>;
  metadata: Record<string, any>;
}

const CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD'] as const;
const INTERVALS = ['monthly', 'yearly', 'weekly', 'one-time'] as const;
const PLAN_TYPES = ['subscription', 'one-time', 'usage-based'] as const;

const FEATURES = [
  { id: 'voice_recording', name: 'Voice Recording', description: 'Record and transcribe audio notes' },
  { id: 'ai_transcriptions', name: 'AI Transcriptions', description: 'Advanced AI-powered transcription' },
  { id: 'unlimited_notes', name: 'Unlimited Notes', description: 'Create unlimited notes' },
  { id: 'advanced_search', name: 'Advanced Search', description: 'Powerful search capabilities' },
  { id: 'collaboration', name: 'Collaboration', description: 'Share and collaborate on notes' },
  { id: 'export_options', name: 'Export Options', description: 'Multiple export formats' },
  { id: 'priority_support', name: 'Priority Support', description: 'Priority customer support' },
];

export function PlanForm({ plan, onSave, onCancel, isVisible }: PlanFormProps) {
  const [currentStep, setCurrentStep] = useState<FormStep>('basic');
  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    price: '',
    currency: 'USD',
    interval: 'monthly',
    planType: 'subscription',
    trialDays: '0',
    maxUsers: '1',
    maxStorage: '1',
    isPopular: false,
    isActive: true,
    featureFlags: {},
    featureLimits: {},
    metadata: {},
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  const textColor = useThemeColor({}, 'text');
  const backgroundColor = useThemeColor({}, 'background');
  const cardBackground = useThemeColor({}, 'backgroundSecondary');
  const accentColor = useThemeColor({}, 'accentPrimary');
  const borderColor = useThemeColor({}, 'border');
  const successColor = useThemeColor({}, 'accentSuccess');
  const dangerColor = useThemeColor({}, 'accentDanger');
  const mutedTextColor = useThemeColor({}, 'textSecondary');
  
  // Remove web-specific hardcoded colors
  const webTextColor = textColor;
  const webBackgroundColor = backgroundColor;

  useEffect(() => {
    if (plan) {
      setFormData({
        name: plan.name || '',
        description: plan.description || '',
        price: plan.price?.toString() || '',
        currency: plan.currency || 'USD',
        interval: plan.interval || 'monthly',
        planType: plan.planType || 'subscription',
        trialDays: plan.trialDays?.toString() || '0',
        maxUsers: plan.maxUsers?.toString() || '1',
        maxStorage: plan.maxStorage?.toString() || '1',
        isPopular: plan.isPopular || false,
        isActive: plan.isActive !== false,
        featureFlags: plan.featureFlags || {},
        featureLimits: plan.featureLimits || {},
        metadata: plan.metadata || {},
      });
    }
  }, [plan]);

  const validateStep = (step: FormStep): boolean => {
    const newErrors: Record<string, string> = {};

    switch (step) {
      case 'basic':
        if (!formData.name.trim()) {
          newErrors.name = 'Plan name is required';
        } else if (formData.name.length < 3) {
          newErrors.name = 'Plan name must be at least 3 characters';
        }
        break;

      case 'pricing':
        if (!formData.price.trim()) {
          newErrors.price = 'Price is required';
        } else {
          const price = parseFloat(formData.price);
          if (isNaN(price) || price < 0) {
            newErrors.price = 'Price must be a positive number';
          }
        }
        if (parseInt(formData.trialDays) < 0) {
          newErrors.trialDays = 'Trial days cannot be negative';
        }
        break;

      case 'features':
        // Feature validation is optional
        break;

      case 'advanced':
        if (parseInt(formData.maxUsers) < 1) {
          newErrors.maxUsers = 'Maximum users must be at least 1';
        }
        if (parseInt(formData.maxStorage) < 1) {
          newErrors.maxStorage = 'Maximum storage must be at least 1';
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (!validateStep(currentStep)) {
      return;
    }

    const steps: FormStep[] = ['basic', 'pricing', 'features', 'advanced', 'preview'];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1]);
    }
  };

  const handlePrevious = () => {
    const steps: FormStep[] = ['basic', 'pricing', 'features', 'advanced', 'preview'];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1]);
    }
  };

  const handleSave = async () => {
    if (!validateStep(currentStep)) {
      return;
    }

    setIsLoading(true);
    try {
      const planData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        price: parseFloat(formData.price),
        currency: formData.currency,
        interval: formData.interval,
        planType: formData.planType,
        trialDays: parseInt(formData.trialDays),
        maxUsers: parseInt(formData.maxUsers),
        maxStorage: parseInt(formData.maxStorage),
        isPopular: formData.isPopular,
        isActive: formData.isActive,
        featureFlags: formData.featureFlags,
        featureLimits: formData.featureLimits,
        metadata: formData.metadata,
      };

      let savedPlan: EnhancedPlan;
      if (plan) {
        savedPlan = await planManagementService.updatePlan(plan.id, planData);
      } else {
        savedPlan = await planManagementService.createPlan(planData);
      }

      // If feature limits were updated, trigger a refresh of feature limits
      if (Object.keys(formData.featureLimits || {}).length > 0) {
        // Import and call force refresh to update feature limits immediately
        try {
          const { featureLimitService } = await import('../../services/FeatureLimitService');
          if (featureLimitService.forceRefresh) {
            await featureLimitService.forceRefresh();
            console.log('PlanForm: Feature limits refreshed after plan save');
          }
        } catch (error) {
          console.warn('PlanForm: Could not refresh feature limits:', error);
        }
      }

      onSave(savedPlan);
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Failed to save plan',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const toggleFeature = (featureId: string) => {
    setFormData(prev => ({
      ...prev,
      featureFlags: {
        ...prev.featureFlags,
        [featureId]: !prev.featureFlags[featureId]
      }
    }));
  };

  const updateFeatureLimit = (featureId: string, limit: Partial<FeatureLimitConfig>) => {
    setFormData(prev => ({
      ...prev,
      featureLimits: {
        ...prev.featureLimits,
        [featureId]: {
          ...prev.featureLimits[featureId],
          ...limit
        }
      }
    }));
  };

  const renderStepIndicator = () => {
    const steps = [
      { key: 'basic', label: 'Basic Info', icon: 'information-circle' },
      { key: 'pricing', label: 'Pricing', icon: 'card' },
      { key: 'features', label: 'Features', icon: 'settings' },
      { key: 'advanced', label: 'Advanced', icon: 'options' },
      { key: 'preview', label: 'Preview', icon: 'eye' },
    ];

    return (
      <View style={styles.stepIndicator}>
        {steps.map((step, index) => {
          const isActive = step.key === currentStep;
          const isCompleted = steps.findIndex(s => s.key === currentStep) > index;
          
          return (
            <View 
              key={step.key} 
              style={[
                styles.stepItem,
                { 
                  backgroundColor: isActive ? accentColor : isCompleted ? successColor : borderColor,
                }
              ]}
              className={Platform.OS === 'web' ? 'plan-form-step-item' : undefined}
            >
              <View style={[
                styles.stepCircle,
                { 
                  backgroundColor: isActive ? accentColor : isCompleted ? '#4CAF50' : borderColor,
                  borderColor: isActive ? accentColor : borderColor
                }
              ]}>
                {isCompleted ? (
                  <Ionicons name="checkmark" size={16} color="white" />
                ) : (
                  <ThemedText style={styles.stepNumber}>{index + 1}</ThemedText>
                )}
              </View>
              <ThemedText style={[
                styles.stepLabel,
                { color: isActive ? accentColor : webTextColor }
              ]}>
                {step.label}
              </ThemedText>
            </View>
          );
        })}
      </View>
    );
  };

  const renderBasicStep = () => (
    <View style={styles.stepContent}>
      <ThemedText type="title" style={styles.stepTitle}>Basic Information</ThemedText>
      
      <View style={styles.inputGroup}>
        <ThemedText style={styles.label}>Plan Name *</ThemedText>
          <TextInput
          style={[
            styles.input, 
            { 
              borderColor: errors.name ? '#ff4444' : borderColor,
              color: webTextColor,
            }
          ]}
          value={formData.name}
          onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
          placeholder="Enter plan name"
          placeholderTextColor="#666"
          className={Platform.OS === 'web' ? 'plan-form-input' : undefined}
        />
        {errors.name && <ThemedText style={styles.errorText}>{errors.name}</ThemedText>}
      </View>

      <View style={styles.inputGroup}>
        <ThemedText style={styles.label}>Description</ThemedText>
          <TextInput
          style={[
            styles.textArea, 
            { 
              borderColor,
              color: webTextColor,
            }
          ]}
          value={formData.description}
          onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
          placeholder="Describe what this plan includes"
          placeholderTextColor="#666"
          multiline
          numberOfLines={3}
          className={Platform.OS === 'web' ? 'plan-form-input' : undefined}
        />
      </View>

      <View style={styles.inputGroup}>
        <ThemedText style={styles.label}>Plan Type</ThemedText>
        <View style={styles.selectContainer}>
          {PLAN_TYPES.map(type => (
            <TouchableOpacity
              key={type}
              style={[
                styles.selectOption,
                { 
                  backgroundColor: formData.planType === type ? accentColor : cardBackground,
                  borderColor
                }
              ]}
              onPress={() => setFormData(prev => ({ ...prev, planType: type }))}
              className={Platform.OS === 'web' ? 'plan-form-select-option' : undefined}
            >
              <ThemedText style={[
                styles.selectOptionText,
                { color: formData.planType === type ? 'white' : webTextColor }
              ]}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );

  const renderPricingStep = () => (
    <View style={styles.stepContent}>
      <ThemedText type="title" style={styles.stepTitle}>Pricing Configuration</ThemedText>
      
      <View style={styles.inputGroup}>
        <ThemedText style={styles.label}>Price *</ThemedText>
        <View style={styles.priceContainer}>
          <TextInput
            style={[
              styles.priceInput, 
              { 
              borderColor: errors.price ? '#ff4444' : borderColor,
              color: webTextColor,
              }
            ]}
            value={formData.price}
            onChangeText={(text) => setFormData(prev => ({ ...prev, price: text }))}
            placeholder="0.00"
            placeholderTextColor="#666"
            keyboardType="numeric"
            className={Platform.OS === 'web' ? 'plan-form-input' : undefined}
          />
          <View style={[styles.currencySelect, { borderColor }]}>
            {CURRENCIES.map(currency => (
              <TouchableOpacity
                key={currency}
                style={[
                  styles.currencyOption,
                  { backgroundColor: formData.currency === currency ? accentColor : cardBackground }
                ]}
                onPress={() => setFormData(prev => ({ ...prev, currency }))}
                className={Platform.OS === 'web' ? 'plan-form-currency-option' : undefined}
              >
                <ThemedText style={[
                  styles.currencyOptionText,
                  { color: formData.currency === currency ? 'white' : webTextColor }
                ]}>
                  {currency}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        {errors.price && <ThemedText style={styles.errorText}>{errors.price}</ThemedText>}
      </View>

      <View style={styles.inputGroup}>
        <ThemedText style={styles.label}>Billing Interval</ThemedText>
        <View style={styles.selectContainer}>
          {INTERVALS.map(interval => (
            <TouchableOpacity
              key={interval}
              style={[
                styles.selectOption,
                { 
                  backgroundColor: formData.interval === interval ? accentColor : cardBackground,
                  borderColor
                }
              ]}
              onPress={() => setFormData(prev => ({ ...prev, interval }))}
              className={Platform.OS === 'web' ? 'plan-form-select-option' : undefined}
            >
              <ThemedText style={[
                styles.selectOptionText,
                { color: formData.interval === interval ? 'white' : webTextColor }
              ]}>
                {interval.charAt(0).toUpperCase() + interval.slice(1)}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.inputGroup}>
        <ThemedText style={styles.label}>Trial Days</ThemedText>
          <TextInput
          style={[
            styles.input, 
            { 
              borderColor: errors.trialDays ? '#ff4444' : borderColor,
              color: webTextColor,
            }
          ]}
          value={formData.trialDays}
          onChangeText={(text) => setFormData(prev => ({ ...prev, trialDays: text }))}
          placeholder="0"
          placeholderTextColor="#666"
          keyboardType="numeric"
          className={Platform.OS === 'web' ? 'plan-form-input' : undefined}
        />
        {errors.trialDays && <ThemedText style={styles.errorText}>{errors.trialDays}</ThemedText>}
      </View>
    </View>
  );

  const renderFeaturesStep = () => (
    <View style={styles.stepContent}>
      <ThemedText type="title" style={styles.stepTitle}>Feature Configuration</ThemedText>
      
      <ScrollView style={styles.featuresList}>
        {FEATURES.map(feature => (
          <View 
            key={feature.id} 
            style={[styles.featureItem, { backgroundColor: cardBackground }]}
            className={Platform.OS === 'web' ? 'plan-form-feature-item' : undefined}
          >
            <View style={styles.featureHeader}>
              <TouchableOpacity
                style={styles.featureToggle}
                onPress={() => toggleFeature(feature.id)}
                className={Platform.OS === 'web' ? 'plan-form-feature-toggle' : undefined}
              >
                <Ionicons
                  name={formData.featureFlags[feature.id] ? 'checkbox' : 'square-outline'}
                  size={24}
                  color={formData.featureFlags[feature.id] ? accentColor : webTextColor}
                />
              </TouchableOpacity>
              <View style={styles.featureInfo}>
                <ThemedText style={styles.featureName}>{feature.name}</ThemedText>
                <ThemedText style={styles.featureDescription}>{feature.description}</ThemedText>
              </View>
            </View>
            
            {formData.featureFlags[feature.id] && (
              <View style={styles.featureLimits}>
                <ThemedText style={styles.limitLabel}>Limit (optional):</ThemedText>
                <View style={styles.limitInputs}>
                  <TextInput
                    style={[
                      styles.limitInput, 
                      { 
                      borderColor,
                      color: webTextColor,
                      }
                    ]}
                    placeholder="Value"
                    placeholderTextColor="#666"
                    keyboardType="numeric"
                    value={(formData.featureLimits[feature.id]?.limit === 'unlimited' ? '' : String(formData.featureLimits[feature.id]?.limit ?? ''))}
                    onChangeText={(text) => updateFeatureLimit(
                      feature.id, 
                      { limit: text.trim() === '' ? 'unlimited' : (Number.isNaN(parseInt(text)) ? 0 : parseInt(text)) }
                    )}
                    className={Platform.OS === 'web' ? 'plan-form-input' : undefined}
                  />
                  <View style={[styles.limitTypeSelect, { borderColor }]}>
                    <TouchableOpacity
                      style={[
                        styles.limitTypeOption,
                        { backgroundColor: formData.featureLimits[feature.id]?.type === 'count' ? accentColor : cardBackground }
                      ]}
                      onPress={() => updateFeatureLimit(feature.id, { type: 'count' })}
                      className={Platform.OS === 'web' ? 'plan-form-limit-type-option' : undefined}
                    >
                      <ThemedText style={[
                        styles.limitTypeText,
                        { color: formData.featureLimits[feature.id]?.type === 'count' ? 'white' : webTextColor }
                      ]}>
                        Count
                      </ThemedText>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.limitTypeOption,
                        { backgroundColor: formData.featureLimits[feature.id]?.type === 'duration' ? accentColor : cardBackground }
                      ]}
                      onPress={() => updateFeatureLimit(feature.id, { type: 'duration' })}
                      className={Platform.OS === 'web' ? 'plan-form-limit-type-option' : undefined}
                    >
                      <ThemedText style={[
                        styles.limitTypeText,
                        { color: formData.featureLimits[feature.id]?.type === 'duration' ? 'white' : webTextColor }
                      ]}>
                        Duration
                      </ThemedText>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}
          </View>
        ))}
      </ScrollView>
    </View>
  );

  const renderAdvancedStep = () => (
    <View style={styles.stepContent}>
      <ThemedText type="title" style={styles.stepTitle}>Advanced Settings</ThemedText>
      
      <View style={styles.inputGroup}>
        <ThemedText style={styles.label}>Maximum Users</ThemedText>
        <TextInput
          style={[
            styles.input, 
            { 
              borderColor: errors.maxUsers ? '#ff4444' : borderColor,
              color: webTextColor,
              backgroundColor: Platform.OS === 'web' ? '#1A1A1A' : undefined
            }
          ]}
          value={formData.maxUsers}
          onChangeText={(text) => setFormData(prev => ({ ...prev, maxUsers: text }))}
          placeholder="1"
          placeholderTextColor="#666"
          keyboardType="numeric"
          className={Platform.OS === 'web' ? 'plan-form-input' : undefined}
        />
        {errors.maxUsers && <ThemedText style={styles.errorText}>{errors.maxUsers}</ThemedText>}
      </View>

      <View style={styles.inputGroup}>
        <ThemedText style={styles.label}>Maximum Storage (GB)</ThemedText>
        <TextInput
          style={[
            styles.input, 
            { 
              borderColor: errors.maxStorage ? '#ff4444' : borderColor,
              color: webTextColor,
              backgroundColor: Platform.OS === 'web' ? '#1A1A1A' : undefined
            }
          ]}
          value={formData.maxStorage}
          onChangeText={(text) => setFormData(prev => ({ ...prev, maxStorage: text }))}
          placeholder="1"
          placeholderTextColor="#666"
          keyboardType="numeric"
          className={Platform.OS === 'web' ? 'plan-form-input' : undefined}
        />
        {errors.maxStorage && <ThemedText style={styles.errorText}>{errors.maxStorage}</ThemedText>}
      </View>

      <View style={styles.switchGroup}>
        <View style={styles.switchItem}>
          <ThemedText style={styles.switchLabel}>Mark as Popular</ThemedText>
          <TouchableOpacity
            style={[
              styles.switch,
              { backgroundColor: formData.isPopular ? accentColor : borderColor }
            ]}
            onPress={() => setFormData(prev => ({ ...prev, isPopular: !prev.isPopular }))}
            className={Platform.OS === 'web' ? 'plan-form-switch' : undefined}
          >
            <View style={[
              styles.switchThumb,
              { transform: [{ translateX: formData.isPopular ? 20 : 0 }] } as any
            ]} />
          </TouchableOpacity>
        </View>

        <View style={styles.switchItem}>
          <ThemedText style={styles.switchLabel}>Active Plan</ThemedText>
          <TouchableOpacity
            style={[
              styles.switch,
              { backgroundColor: formData.isActive ? accentColor : borderColor }
            ]}
            onPress={() => setFormData(prev => ({ ...prev, isActive: !prev.isActive }))}
            className={Platform.OS === 'web' ? 'plan-form-switch' : undefined}
          >
            <View style={[
              styles.switchThumb,
              { transform: [{ translateX: formData.isActive ? 20 : 0 }] } as any
            ]} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderPreviewStep = () => (
    <View style={styles.stepContent}>
      <ThemedText type="title" style={styles.stepTitle}>Preview Plan</ThemedText>
      
      <View 
        style={[styles.previewCard, { backgroundColor: cardBackground }]}
        className={Platform.OS === 'web' ? 'plan-form-preview-card' : undefined}
      >
        <ThemedText type="title" style={styles.previewName}>{formData.name}</ThemedText>
        <ThemedText style={styles.previewDescription}>{formData.description}</ThemedText>
        
        <View style={styles.previewPrice}>
          <ThemedText type="title" style={styles.priceText}>
            {formData.currency} {parseFloat(formData.price || '0').toFixed(2)}
          </ThemedText>
          <ThemedText style={styles.intervalText}>per {formData.interval}</ThemedText>
        </View>

        {parseInt(formData.trialDays) > 0 && (
          <ThemedText style={styles.trialText}>
            {formData.trialDays} day{parseInt(formData.trialDays) !== 1 ? 's' : ''} free trial
          </ThemedText>
        )}

        <View style={styles.previewFeatures}>
          <ThemedText style={styles.featuresTitle}>Included Features:</ThemedText>
          {Object.entries(formData.featureFlags)
            .filter(([_, enabled]) => enabled)
            .map(([featureId, _]) => {
              const feature = FEATURES.find(f => f.id === featureId);
              return (
                <View key={featureId} style={styles.previewFeature}>
                  <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                  <ThemedText style={styles.previewFeatureText}>{feature?.name}</ThemedText>
                </View>
              );
            })}
        </View>

        <View style={styles.previewLimits}>
          <ThemedText style={styles.limitsTitle}>Limits:</ThemedText>
          <ThemedText style={styles.limitText}>• Max Users: {formData.maxUsers}</ThemedText>
          <ThemedText style={styles.limitText}>• Max Storage: {formData.maxStorage} GB</ThemedText>
        </View>
      </View>
    </View>
  );

  const renderStepContent = () => {
    switch (currentStep) {
      case 'basic':
        return renderBasicStep();
      case 'pricing':
        return renderPricingStep();
      case 'features':
        return renderFeaturesStep();
      case 'advanced':
        return renderAdvancedStep();
      case 'preview':
        return renderPreviewStep();
      default:
        return null;
    }
  };

  if (!isVisible) return null;

  return (
    <View 
      style={[styles.container, { backgroundColor: webBackgroundColor }]}
      className={Platform.OS === 'web' ? 'modal-container' : undefined}
    >
      <View style={styles.header}>
        <ThemedText type="title" style={styles.title}>
          {plan ? 'Edit Plan' : 'Create New Plan'}
        </ThemedText>
        <TouchableOpacity 
          onPress={onCancel} 
          style={styles.closeButton}
          className={Platform.OS === 'web' ? 'plan-form-close-button' : undefined}
        >
          <Ionicons name="close" size={24} color={webTextColor} />
        </TouchableOpacity>
      </View>

      {renderStepIndicator()}

      <ScrollView style={styles.content}>
        {renderStepContent()}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.buttonGroup}>
          {currentStep !== 'basic' && (
            <TouchableOpacity
              style={[styles.button, styles.secondaryButton, { borderColor }]}
              onPress={handlePrevious}
              disabled={isLoading}
              className={Platform.OS === 'web' ? 'plan-form-button' : undefined}
            >
              <ThemedText style={styles.buttonText}>Previous</ThemedText>
            </TouchableOpacity>
          )}

          {currentStep !== 'preview' ? (
            <TouchableOpacity
              style={[styles.button, styles.primaryButton, { backgroundColor: accentColor }]}
              onPress={handleNext}
              disabled={isLoading}
              className={Platform.OS === 'web' ? 'plan-form-button' : undefined}
            >
              <ThemedText style={[styles.buttonText, { color: 'white' }]}>Next</ThemedText>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.button, styles.primaryButton, { backgroundColor: accentColor }]}
              onPress={handleSave}
              disabled={isLoading}
              className={Platform.OS === 'web' ? 'plan-form-button' : undefined}
            >
              <ThemedText style={[styles.buttonText, { color: 'white' }]}>
                {isLoading ? 'Saving...' : plan ? 'Update Plan' : 'Create Plan'}
              </ThemedText>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: Platform.OS === 'web' ? 32 : 20,
    maxWidth: Platform.OS === 'web' ? 800 : undefined,
    alignSelf: Platform.OS === 'web' ? 'center' : undefined,
    width: Platform.OS === 'web' ? '100%' : undefined,
    // keep RN-compatible only
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Platform.OS === 'web' ? 32 : 20,
    paddingBottom: Platform.OS === 'web' ? 16 : 0,
    borderBottomWidth: Platform.OS === 'web' ? 1 : 0,
    borderBottomColor: Platform.OS === 'web' ? '#e0e0e0' : undefined,
  },
  title: {
    fontSize: Platform.OS === 'web' ? 28 : 24,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: Platform.OS === 'web' ? 12 : 8,
    borderRadius: Platform.OS === 'web' ? 8 : 0,
    ...(Platform.OS === 'web' && {
      cursor: 'pointer',
      transition: 'background-color 0.2s ease',
    }),
  },
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Platform.OS === 'web' ? 40 : 30,
    paddingHorizontal: Platform.OS === 'web' ? 20 : 10,
  },
  stepItem: {
    alignItems: 'center',
    flex: 1,
    ...(Platform.OS === 'web' && {
      cursor: 'pointer',
      transition: 'transform 0.2s ease',
    }),
  },
  stepCircle: {
    width: Platform.OS === 'web' ? 40 : 32,
    height: Platform.OS === 'web' ? 40 : 32,
    borderRadius: Platform.OS === 'web' ? 20 : 16,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Platform.OS === 'web' ? 12 : 8,
    ...(Platform.OS === 'web' && {
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    }),
  },
  stepNumber: {
    fontSize: Platform.OS === 'web' ? 16 : 14,
    fontWeight: 'bold',
    color: 'white',
  },
  stepLabel: {
    fontSize: Platform.OS === 'web' ? 14 : 12,
    textAlign: 'center',
    fontWeight: Platform.OS === 'web' ? '500' : 'normal',
  },
  content: {
    flex: 1,
    ...(Platform.OS === 'web' && {
      paddingHorizontal: 8,
    }),
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: Platform.OS === 'web' ? 24 : 20,
    fontWeight: 'bold',
    marginBottom: Platform.OS === 'web' ? 32 : 20,
  },
  inputGroup: {
    marginBottom: Platform.OS === 'web' ? 28 : 20,
  },
  label: {
    fontSize: Platform.OS === 'web' ? 18 : 16,
    fontWeight: '600',
    marginBottom: Platform.OS === 'web' ? 12 : 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: Platform.OS === 'web' ? 12 : 8,
    padding: Platform.OS === 'web' ? 16 : 12,
    fontSize: Platform.OS === 'web' ? 18 : 16,
    // keep RN-compatible only
  },
  textArea: {
    borderWidth: 1,
    borderRadius: Platform.OS === 'web' ? 12 : 8,
    padding: Platform.OS === 'web' ? 16 : 12,
    fontSize: Platform.OS === 'web' ? 18 : 16,
    minHeight: Platform.OS === 'web' ? 120 : 80,
    textAlignVertical: 'top',
    // keep RN-compatible only
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Platform.OS === 'web' ? 16 : 10,
  },
  priceInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: Platform.OS === 'web' ? 12 : 8,
    padding: Platform.OS === 'web' ? 16 : 12,
    fontSize: Platform.OS === 'web' ? 18 : 16,
    // keep RN-compatible only
  },
  currencySelect: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: Platform.OS === 'web' ? 12 : 8,
    overflow: 'hidden',
  },
  currencyOption: {
    paddingHorizontal: Platform.OS === 'web' ? 16 : 12,
    paddingVertical: Platform.OS === 'web' ? 16 : 12,
    ...(Platform.OS === 'web' && {
      cursor: 'pointer',
      transition: 'all 0.2s ease',
    }),
  },
  currencyOptionText: {
    fontSize: Platform.OS === 'web' ? 16 : 14,
    fontWeight: '600',
  },
  selectContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Platform.OS === 'web' ? 16 : 10,
  },
  selectOption: {
    paddingHorizontal: Platform.OS === 'web' ? 20 : 16,
    paddingVertical: Platform.OS === 'web' ? 14 : 10,
    borderRadius: Platform.OS === 'web' ? 12 : 8,
    borderWidth: 1,
    minWidth: Platform.OS === 'web' ? 120 : 100,
    alignItems: 'center',
    ...(Platform.OS === 'web' && {
      cursor: 'pointer',
      transition: 'all 0.2s ease',
    }),
  },
  selectOptionText: {
    fontSize: Platform.OS === 'web' ? 16 : 14,
    fontWeight: '600',
  },
  featuresList: {
    maxHeight: Platform.OS === 'web' ? 500 : 400,
  },
  featureItem: {
    padding: Platform.OS === 'web' ? 24 : 16,
    borderRadius: Platform.OS === 'web' ? 16 : 8,
    marginBottom: Platform.OS === 'web' ? 16 : 12,
    ...(Platform.OS === 'web' && {
      transition: 'all 0.2s ease',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
    }),
  },
  featureHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureToggle: {
    marginRight: Platform.OS === 'web' ? 16 : 12,
    ...(Platform.OS === 'web' && {
      cursor: 'pointer',
      transition: 'transform 0.2s ease',
    }),
  },
  featureInfo: {
    flex: 1,
  },
  featureName: {
    fontSize: Platform.OS === 'web' ? 18 : 16,
    fontWeight: '600',
    marginBottom: Platform.OS === 'web' ? 6 : 4,
  },
  featureDescription: {
    fontSize: Platform.OS === 'web' ? 16 : 14,
    opacity: 0.7,
  },
  featureLimits: {
    marginTop: Platform.OS === 'web' ? 16 : 12,
    paddingTop: Platform.OS === 'web' ? 16 : 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  limitLabel: {
    fontSize: Platform.OS === 'web' ? 16 : 14,
    fontWeight: '600',
    marginBottom: Platform.OS === 'web' ? 12 : 8,
  },
  limitInputs: {
    flexDirection: 'row',
    gap: Platform.OS === 'web' ? 16 : 10,
  },
  limitInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: Platform.OS === 'web' ? 10 : 6,
    padding: Platform.OS === 'web' ? 12 : 8,
    fontSize: Platform.OS === 'web' ? 16 : 14,
    // keep RN-compatible only
  },
  limitTypeSelect: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: Platform.OS === 'web' ? 10 : 6,
    overflow: 'hidden',
  },
  limitTypeOption: {
    paddingHorizontal: Platform.OS === 'web' ? 16 : 12,
    paddingVertical: Platform.OS === 'web' ? 12 : 8,
    ...(Platform.OS === 'web' && {
      cursor: 'pointer',
      transition: 'all 0.2s ease',
    }),
  },
  limitTypeText: {
    fontSize: Platform.OS === 'web' ? 14 : 12,
    fontWeight: '600',
  },
  switchGroup: {
    marginTop: Platform.OS === 'web' ? 32 : 20,
  },
  switchItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Platform.OS === 'web' ? 20 : 16,
  },
  switchLabel: {
    fontSize: Platform.OS === 'web' ? 18 : 16,
    fontWeight: '600',
  },
  switch: {
    width: Platform.OS === 'web' ? 52 : 44,
    height: Platform.OS === 'web' ? 28 : 24,
    borderRadius: Platform.OS === 'web' ? 14 : 12,
    padding: Platform.OS === 'web' ? 3 : 2,
    ...(Platform.OS === 'web' && {
      cursor: 'pointer',
      transition: 'all 0.2s ease',
    }),
  },
  switchThumb: {
    width: Platform.OS === 'web' ? 22 : 20,
    height: Platform.OS === 'web' ? 22 : 20,
    borderRadius: Platform.OS === 'web' ? 11 : 10,
    backgroundColor: 'white',
    ...(Platform.OS === 'web' && {
      transition: 'transform 0.2s ease',
    }),
  },
  previewCard: {
    padding: Platform.OS === 'web' ? 32 : 20,
    borderRadius: Platform.OS === 'web' ? 20 : 12,
    marginBottom: Platform.OS === 'web' ? 32 : 20,
    ...(Platform.OS === 'web' && {
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
      transition: 'all 0.2s ease',
    }),
  },
  previewName: {
    fontSize: Platform.OS === 'web' ? 28 : 24,
    fontWeight: 'bold',
    marginBottom: Platform.OS === 'web' ? 12 : 8,
  },
  previewDescription: {
    fontSize: Platform.OS === 'web' ? 18 : 16,
    opacity: 0.7,
    marginBottom: Platform.OS === 'web' ? 24 : 16,
  },
  previewPrice: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: Platform.OS === 'web' ? 16 : 12,
  },
  priceText: {
    fontSize: Platform.OS === 'web' ? 32 : 28,
    fontWeight: 'bold',
    marginRight: Platform.OS === 'web' ? 12 : 8,
  },
  intervalText: {
    fontSize: Platform.OS === 'web' ? 18 : 16,
    opacity: 0.7,
  },
  trialText: {
    fontSize: Platform.OS === 'web' ? 16 : 14,
    color: '#4CAF50',
    fontWeight: '600',
    marginBottom: Platform.OS === 'web' ? 24 : 16,
  },
  previewFeatures: {
    marginBottom: Platform.OS === 'web' ? 24 : 16,
  },
  featuresTitle: {
    fontSize: Platform.OS === 'web' ? 18 : 16,
    fontWeight: '600',
    marginBottom: Platform.OS === 'web' ? 12 : 8,
  },
  previewFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Platform.OS === 'web' ? 6 : 4,
  },
  previewFeatureText: {
    fontSize: Platform.OS === 'web' ? 16 : 14,
    marginLeft: Platform.OS === 'web' ? 12 : 8,
  },
  previewLimits: {
    marginTop: Platform.OS === 'web' ? 20 : 16,
    paddingTop: Platform.OS === 'web' ? 20 : 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  limitsTitle: {
    fontSize: Platform.OS === 'web' ? 18 : 16,
    fontWeight: '600',
    marginBottom: Platform.OS === 'web' ? 12 : 8,
  },
  limitText: {
    fontSize: Platform.OS === 'web' ? 16 : 14,
    marginBottom: Platform.OS === 'web' ? 6 : 4,
  },
  footer: {
    paddingTop: Platform.OS === 'web' ? 32 : 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  buttonGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Platform.OS === 'web' ? 20 : 12,
  },
  button: {
    flex: 1,
    paddingVertical: Platform.OS === 'web' ? 16 : 12,
    paddingHorizontal: Platform.OS === 'web' ? 32 : 24,
    borderRadius: Platform.OS === 'web' ? 12 : 8,
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web' && {
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      fontWeight: '600',
    }),
  },
  primaryButton: {
    // backgroundColor set dynamically
  },
  secondaryButton: {
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  buttonText: {
    fontSize: Platform.OS === 'web' ? 18 : 16,
    fontWeight: '600',
  },
  errorText: {
    color: '#ff4444',
    fontSize: Platform.OS === 'web' ? 16 : 14,
    marginTop: Platform.OS === 'web' ? 8 : 4,
  },
});
