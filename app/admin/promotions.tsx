/**
 * Admin Promotions Management Screen
 * 
 * Comprehensive interface for creating, editing, and managing
 * premium promotions with Stripe integration and analytics.
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, Switch, Platform } from 'react-native';
import { Stack, router } from 'expo-router';
import { supabase } from '../../lib/supabase';
import type { Promotion, CreatePromotionRequest, PromotionAnalytics } from '../../types/Promotion';
import { PromotionService } from '../../services/PromotionService';
import { useAuth } from '../../contexts/AuthContext';

// Platform-specific DatePicker
const DateTimePicker = Platform.OS === 'web' 
  ? ({ value, onChange }: any) => (
      <input
        type="datetime-local"
        value={value ? new Date(value).toISOString().slice(0, 16) : ''}
        onChange={(e) => onChange(e.target.value ? new Date(e.target.value).toISOString() : '')}
        style={{ padding: 8, borderRadius: 4, border: '1px solid #ddd' }}
      />
    )
  : require('@react-native-community/datetimepicker').default;

export default function AdminPromotionsScreen() {
  const { user } = useAuth();
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'scheduled' | 'expired'>('all');
  
  // Metrics state
  const [metrics, setMetrics] = useState({
    totalActive: 0,
    totalRedemptions: 0,
    averageConversion: 0
  });

  // Form state
  const [formData, setFormData] = useState<Partial<CreatePromotionRequest>>({
    name: '',
    description: '',
    discountType: 'percentage',
    discountValue: 0,
    startDate: new Date().toISOString(),
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    displayMethods: ['modal', 'banner', 'inline'],
    targetSegments: ['all'],
    maxPerUser: 1,
    priority: 0,
    modalConfig: {},
    bannerConfig: {},
    inlineConfig: {},
    targetConditions: {}
  });

  useEffect(() => {
    loadPromotions();
    subscribeToPromotions();
  }, []);

  useEffect(() => {
    calculateMetrics();
  }, [promotions]);

  const loadPromotions = async () => {
    try {
      setLoading(true);
      const allPromotions = await PromotionService.getPromotions({
        includeExpired: true,
        orderBy: 'priority',
        orderDirection: 'desc'
      });
      setPromotions(allPromotions);
    } catch (error) {
      console.error('Error loading promotions:', error);
      Alert.alert('Error', 'Failed to load promotions');
    } finally {
      setLoading(false);
    }
  };

  const subscribeToPromotions = () => {
    const channel = supabase
      .channel('admin-promotions')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'promotions'
        },
        () => {
          loadPromotions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const calculateMetrics = async () => {
    const now = new Date();
    const active = promotions.filter(
      p => p.isActive && new Date(p.startDate) <= now && new Date(p.endDate) >= now
    );
    
    const totalRedemptions = promotions.reduce((sum, p) => sum + p.currentRedemptions, 0);
    
    // Calculate average conversion rate from all promotions
    const conversions = await Promise.all(
      promotions.map(p => PromotionService.getPromotionAnalytics(p.id))
    );
    const validConversions = conversions.filter(c => c !== null) as PromotionAnalytics[];
    const averageConversion = validConversions.length > 0
      ? validConversions.reduce((sum, c) => sum + c.conversionRate, 0) / validConversions.length
      : 0;

    setMetrics({
      totalActive: active.length,
      totalRedemptions,
      averageConversion
    });
  };

  const filteredPromotions = promotions.filter(promo => {
    const now = new Date();
    const start = new Date(promo.startDate);
    const end = new Date(promo.endDate);

    switch (activeFilter) {
      case 'active':
        return promo.isActive && start <= now && end >= now;
      case 'scheduled':
        return promo.isActive && start > now;
      case 'expired':
        return end < now;
      default:
        return true;
    }
  });

  const handleCreateOrUpdate = async () => {
    try {
      if (!user) return;

      // Validation
      if (!formData.name || !formData.description || !formData.discountValue) {
        Alert.alert('Validation Error', 'Please fill in all required fields');
        return;
      }

      if (formData.discountType === 'percentage' && (formData.discountValue < 1 || formData.discountValue > 100)) {
        Alert.alert('Validation Error', 'Percentage must be between 1 and 100');
        return;
      }

      setLoading(true);

      if (editingPromotion) {
        // Update existing promotion
        await PromotionService.updatePromotion(editingPromotion.id, {
          ...formData,
          id: editingPromotion.id
        });
        Alert.alert('Success', 'Promotion updated successfully');
      } else {
        // Create new promotion
        await PromotionService.createPromotion(formData as CreatePromotionRequest, user.id);
        Alert.alert('Success', 'Promotion created successfully');
      }

      // Reset form
      setShowForm(false);
      setEditingPromotion(null);
      resetForm();
      loadPromotions();
    } catch (error) {
      console.error('Error saving promotion:', error);
      Alert.alert('Error', 'Failed to save promotion');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (promotionId: string) => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this promotion? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await PromotionService.deletePromotion(promotionId);
              Alert.alert('Success', 'Promotion deleted');
              loadPromotions();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete promotion');
            }
          }
        }
      ]
    );
  };

  const handleToggleActive = async (promotion: Promotion) => {
    try {
      await PromotionService.updatePromotion(promotion.id, {
        id: promotion.id,
        isActive: !promotion.isActive
      });
      loadPromotions();
    } catch (error) {
      Alert.alert('Error', 'Failed to toggle promotion status');
    }
  };

  const handleEdit = (promotion: Promotion) => {
    setEditingPromotion(promotion);
    setFormData({
      name: promotion.name,
      description: promotion.description,
      discountType: promotion.discountType,
      discountValue: promotion.discountValue,
      startDate: promotion.startDate,
      endDate: promotion.endDate,
      displayMethods: promotion.displayMethods,
      targetSegments: promotion.targetSegments,
      maxRedemptions: promotion.maxRedemptions || undefined,
      maxPerUser: promotion.maxPerUser,
      priority: promotion.priority,
      stripeCouponId: promotion.stripeCouponId,
      stripePriceId: promotion.stripePriceId,
      modalConfig: promotion.modalConfig,
      bannerConfig: promotion.bannerConfig,
      inlineConfig: promotion.inlineConfig,
      targetConditions: promotion.targetConditions
    });
    setShowForm(true);
  };

  const handleDuplicate = (promotion: Promotion) => {
    setFormData({
      name: `${promotion.name} (Copy)`,
      description: promotion.description,
      discountType: promotion.discountType,
      discountValue: promotion.discountValue,
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      displayMethods: promotion.displayMethods,
      targetSegments: promotion.targetSegments,
      maxRedemptions: promotion.maxRedemptions || undefined,
      maxPerUser: promotion.maxPerUser,
      priority: promotion.priority,
      modalConfig: promotion.modalConfig,
      bannerConfig: promotion.bannerConfig,
      inlineConfig: promotion.inlineConfig,
      targetConditions: promotion.targetConditions
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      discountType: 'percentage',
      discountValue: 0,
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      displayMethods: ['modal', 'banner', 'inline'],
      targetSegments: ['all'],
      maxPerUser: 1,
      priority: 0,
      modalConfig: {},
      bannerConfig: {},
      inlineConfig: {},
      targetConditions: {}
    });
  };

  const renderMetricsCards = () => (
    <View style={styles.metricsContainer}>
      <View style={styles.metricCard}>
        <Text style={styles.metricValue}>{metrics.totalActive}</Text>
        <Text style={styles.metricLabel}>Active Promotions</Text>
      </View>
      <View style={styles.metricCard}>
        <Text style={styles.metricValue}>{metrics.totalRedemptions}</Text>
        <Text style={styles.metricLabel}>Total Redemptions</Text>
      </View>
      <View style={styles.metricCard}>
        <Text style={styles.metricValue}>{metrics.averageConversion.toFixed(1)}%</Text>
        <Text style={styles.metricLabel}>Avg Conversion</Text>
      </View>
    </View>
  );

  const renderFilters = () => (
    <View style={styles.filtersContainer}>
      {(['all', 'active', 'scheduled', 'expired'] as const).map(filter => (
        <TouchableOpacity
          key={filter}
          style={[styles.filterButton, activeFilter === filter && styles.filterButtonActive]}
          onPress={() => setActiveFilter(filter)}
        >
          <Text style={[styles.filterButtonText, activeFilter === filter && styles.filterButtonTextActive]}>
            {filter.charAt(0).toUpperCase() + filter.slice(1)}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderPromotionCard = (promotion: Promotion) => {
    const now = new Date();
    const start = new Date(promotion.startDate);
    const end = new Date(promotion.endDate);
    const isActive = promotion.isActive && start <= now && end >= now;
    const isScheduled = promotion.isActive && start > now;
    const isExpired = end < now;

    let statusColor = '#666';
    let statusText = 'Inactive';
    if (isActive) {
      statusColor = '#4CAF50';
      statusText = 'Active';
    } else if (isScheduled) {
      statusColor = '#FF9800';
      statusText = 'Scheduled';
    } else if (isExpired) {
      statusColor = '#F44336';
      statusText = 'Expired';
    }

    return (
      <View key={promotion.id} style={styles.promotionCard}>
        <View style={styles.promotionHeader}>
          <View style={styles.promotionTitleContainer}>
            <Text style={styles.promotionName}>{promotion.name}</Text>
            <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
              <Text style={styles.statusText}>{statusText}</Text>
            </View>
          </View>
          <View style={styles.promotionActions}>
            <Switch
              value={promotion.isActive}
              onValueChange={() => handleToggleActive(promotion)}
            />
          </View>
        </View>

        <Text style={styles.promotionDescription}>{promotion.description}</Text>

        <View style={styles.promotionDetails}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Discount:</Text>
            <Text style={styles.detailValue}>
              {promotion.discountType === 'percentage' 
                ? `${promotion.discountValue}% off`
                : `$${promotion.discountValue} off`}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Redemptions:</Text>
            <Text style={styles.detailValue}>
              {promotion.currentRedemptions}
              {promotion.maxRedemptions ? ` / ${promotion.maxRedemptions}` : ' (unlimited)'}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Period:</Text>
            <Text style={styles.detailValue}>
              {new Date(promotion.startDate).toLocaleDateString()} - {new Date(promotion.endDate).toLocaleDateString()}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Segments:</Text>
            <Text style={styles.detailValue}>{promotion.targetSegments.join(', ')}</Text>
          </View>
        </View>

        <View style={styles.cardActions}>
          <TouchableOpacity style={styles.actionButton} onPress={() => handleEdit(promotion)}>
            <Text style={styles.actionButtonText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => handleDuplicate(promotion)}>
            <Text style={styles.actionButtonText}>Duplicate</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionButton, styles.deleteButton]} 
            onPress={() => handleDelete(promotion.id)}
          >
            <Text style={[styles.actionButtonText, styles.deleteButtonText]}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderForm = () => (
    <ScrollView style={styles.formContainer}>
      <Text style={styles.formTitle}>{editingPromotion ? 'Edit Promotion' : 'Create New Promotion'}</Text>

      {/* Basic Info */}
      <View style={styles.formSection}>
        <Text style={styles.sectionTitle}>Basic Information</Text>
        
        <Text style={styles.inputLabel}>Name *</Text>
        <TextInput
          style={styles.input}
          value={formData.name}
          onChangeText={(text) => setFormData({ ...formData, name: text })}
          placeholder="e.g., Summer Sale 2024"
        />

        <Text style={styles.inputLabel}>Description *</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={formData.description}
          onChangeText={(text) => setFormData({ ...formData, description: text })}
          placeholder="Describe the promotion..."
          multiline
          numberOfLines={3}
        />
      </View>

      {/* Discount Configuration */}
      <View style={styles.formSection}>
        <Text style={styles.sectionTitle}>Discount</Text>
        
        <Text style={styles.inputLabel}>Discount Type</Text>
        <View style={styles.radioGroup}>
          {(['percentage', 'fixed_amount'] as const).map(type => (
            <TouchableOpacity
              key={type}
              style={styles.radioButton}
              onPress={() => setFormData({ ...formData, discountType: type })}
            >
              <View style={[styles.radio, formData.discountType === type && styles.radioSelected]} />
              <Text style={styles.radioLabel}>
                {type === 'percentage' ? 'Percentage (%)' : 'Fixed Amount ($)'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.inputLabel}>Discount Value *</Text>
        <TextInput
          style={styles.input}
          value={formData.discountValue?.toString()}
          onChangeText={(text) => setFormData({ ...formData, discountValue: parseFloat(text) || 0 })}
          placeholder={formData.discountType === 'percentage' ? 'e.g., 30' : 'e.g., 5.99'}
          keyboardType="numeric"
        />
      </View>

      {/* Schedule */}
      <View style={styles.formSection}>
        <Text style={styles.sectionTitle}>Schedule</Text>
        
        <Text style={styles.inputLabel}>Start Date *</Text>
        {Platform.OS === 'web' ? (
          <DateTimePicker
            value={formData.startDate}
            onChange={(date: string) => setFormData({ ...formData, startDate: date })}
          />
        ) : (
          <Text style={styles.dateText}>{new Date(formData.startDate || '').toLocaleString()}</Text>
        )}

        <Text style={styles.inputLabel}>End Date *</Text>
        {Platform.OS === 'web' ? (
          <DateTimePicker
            value={formData.endDate}
            onChange={(date: string) => setFormData({ ...formData, endDate: date })}
          />
        ) : (
          <Text style={styles.dateText}>{new Date(formData.endDate || '').toLocaleString()}</Text>
        )}
      </View>

      {/* Targeting */}
      <View style={styles.formSection}>
        <Text style={styles.sectionTitle}>Target Segments</Text>
        {(['all', 'new_users', 'free_users', 'near_limit', 'inactive', 'churned'] as const).map(segment => (
          <TouchableOpacity
            key={segment}
            style={styles.checkboxButton}
            onPress={() => {
              const segments = formData.targetSegments || [];
              if (segments.includes(segment)) {
                setFormData({ ...formData, targetSegments: segments.filter(s => s !== segment) });
              } else {
                setFormData({ ...formData, targetSegments: [...segments, segment] });
              }
            }}
          >
            <View style={[styles.checkbox, formData.targetSegments?.includes(segment) && styles.checkboxSelected]} />
            <Text style={styles.checkboxLabel}>{segment.replace('_', ' ')}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Limits */}
      <View style={styles.formSection}>
        <Text style={styles.sectionTitle}>Usage Limits</Text>
        
        <Text style={styles.inputLabel}>Max Redemptions (leave empty for unlimited)</Text>
        <TextInput
          style={styles.input}
          value={formData.maxRedemptions?.toString()}
          onChangeText={(text) => setFormData({ ...formData, maxRedemptions: text ? parseInt(text) : undefined })}
          placeholder="e.g., 100"
          keyboardType="numeric"
        />

        <Text style={styles.inputLabel}>Max Per User</Text>
        <TextInput
          style={styles.input}
          value={formData.maxPerUser?.toString()}
          onChangeText={(text) => setFormData({ ...formData, maxPerUser: parseInt(text) || 1 })}
          placeholder="e.g., 1"
          keyboardType="numeric"
        />

        <Text style={styles.inputLabel}>Priority (higher = shown first)</Text>
        <TextInput
          style={styles.input}
          value={formData.priority?.toString()}
          onChangeText={(text) => setFormData({ ...formData, priority: parseInt(text) || 0 })}
          placeholder="e.g., 100"
          keyboardType="numeric"
        />
      </View>

      {/* Action Buttons */}
      <View style={styles.formActions}>
        <TouchableOpacity 
          style={[styles.button, styles.cancelButton]} 
          onPress={() => {
            setShowForm(false);
            setEditingPromotion(null);
            resetForm();
          }}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.button, styles.saveButton]} 
          onPress={handleCreateOrUpdate}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>
              {editingPromotion ? 'Update' : 'Create'} Promotion
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{
          title: 'Promotions Management',
          headerShown: true
        }}
      />

      <ScrollView style={styles.scrollView}>
        {!showForm ? (
          <>
            {renderMetricsCards()}
            
            <View style={styles.header}>
              <Text style={styles.title}>Promotions</Text>
              <TouchableOpacity style={styles.createButton} onPress={() => setShowForm(true)}>
                <Text style={styles.createButtonText}>+ Create Promotion</Text>
              </TouchableOpacity>
            </View>

            {renderFilters()}

            {loading ? (
              <ActivityIndicator size="large" color="#007AFF" style={styles.loader} />
            ) : filteredPromotions.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No promotions found</Text>
                <Text style={styles.emptySubtext}>Create your first promotion to get started</Text>
              </View>
            ) : (
              filteredPromotions.map(renderPromotionCard)
            )}
          </>
        ) : (
          renderForm()
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  scrollView: {
    flex: 1
  },
  loader: {
    marginTop: 40
  },
  metricsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4
      },
      android: {
        elevation: 2
      },
      web: {
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }
    })
  },
  metricValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#007AFF'
  },
  metricLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold'
  },
  createButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8
  },
  createButtonText: {
    color: '#fff',
    fontWeight: '600'
  },
  filtersContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 8
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd'
  },
  filterButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF'
  },
  filterButtonText: {
    color: '#666',
    fontWeight: '500'
  },
  filterButtonTextActive: {
    color: '#fff'
  },
  promotionCard: {
    margin: 16,
    marginTop: 0,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4
      },
      android: {
        elevation: 2
      },
      web: {
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }
    })
  },
  promotionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12
  },
  promotionTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  promotionName: {
    fontSize: 18,
    fontWeight: 'bold'
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12
  },
  statusText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600'
  },
  promotionActions: {
    flexDirection: 'row',
    gap: 8
  },
  promotionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12
  },
  promotionDetails: {
    gap: 8,
    marginBottom: 16
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  detailLabel: {
    fontSize: 14,
    color: '#666'
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500'
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 12
  },
  actionButton: {
    flex: 1,
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#f0f0f0',
    alignItems: 'center'
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#007AFF'
  },
  deleteButton: {
    backgroundColor: '#ffebee'
  },
  deleteButtonText: {
    color: '#f44336'
  },
  emptyState: {
    padding: 40,
    alignItems: 'center'
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999'
  },
  formContainer: {
    flex: 1,
    padding: 16
  },
  formTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24
  },
  formSection: {
    marginBottom: 24
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
    color: '#333'
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top'
  },
  radioGroup: {
    gap: 12,
    marginBottom: 16
  },
  radioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#ddd'
  },
  radioSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#007AFF'
  },
  radioLabel: {
    fontSize: 16
  },
  checkboxButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#ddd'
  },
  checkboxSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#007AFF'
  },
  checkboxLabel: {
    fontSize: 16,
    textTransform: 'capitalize'
  },
  dateText: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16
  },
  formActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    marginBottom: 40
  },
  button: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center'
  },
  cancelButton: {
    backgroundColor: '#f0f0f0'
  },
  cancelButtonText: {
    color: '#666',
    fontWeight: '600',
    fontSize: 16
  },
  saveButton: {
    backgroundColor: '#007AFF'
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16
  }
});

