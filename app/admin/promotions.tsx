/**
 * Admin Promotions Management Screen
 * 
 * Comprehensive interface for creating, editing, and managing
 * premium promotions with Stripe integration and analytics.
 */

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, Switch, Platform } from 'react-native';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { ApiConfig } from '../../constants/ApiConfig';
import type { Promotion, CreatePromotionRequest, PromotionAnalytics } from '../../types/Promotion';
import { PromotionService } from '../../services/PromotionService';
import { useAuth } from '../../hooks/useAuth';
import { useThemeColor } from '../../hooks/useThemeColor';
import { ThemedView } from '../../components/ThemedView';
import { ThemedText } from '../../components/ThemedText';

// Import web components
import { AdminSidebar } from '../../components/web/AdminSidebar';
import { WebLayout } from '../../components/web/WebLayout';

// Cross-platform alert helper
const showAlert = (title: string, message?: string) => {
  if (Platform.OS === 'web') {
    if (message) {
      alert(`${title}\n\n${message}`);
    } else {
      alert(title);
    }
  } else {
    Alert.alert(title, message);
  }
};

const showConfirm = (title: string, message: string, onConfirm: () => void) => {
  if (Platform.OS === 'web') {
    if (confirm(`${title}\n\n${message}`)) {
      onConfirm();
    }
  } else {
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: onConfirm }
    ]);
  }
};

// Simple date display/input for web (admin is web-only)
const DateInput = ({ value, onChange, label }: { value: string; onChange: (date: string) => void; label: string }) => {
  if (Platform.OS === 'web') {
    // Convert ISO string to local datetime-local format
    const formatDateForInput = (isoString: string) => {
      if (!isoString) return '';
      try {
        const date = new Date(isoString);
        // Format as YYYY-MM-DDTHH:mm for datetime-local input
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
      } catch (e) {
        return '';
      }
    };

    // Convert datetime-local format to ISO string
    const handleDateChange = (localDateString: string) => {
      if (!localDateString) {
        onChange('');
        return;
      }
      try {
        // datetime-local gives us "YYYY-MM-DDTHH:mm"
        // Create a date object from it
        const date = new Date(localDateString);
        onChange(date.toISOString());
      } catch (e) {
        onChange('');
      }
    };

    return (
      <input
        type="datetime-local"
        value={formatDateForInput(value)}
        onChange={(e) => handleDateChange(e.target.value)}
        style={{ 
          padding: 12, 
          borderRadius: 8, 
          border: '1px solid #ddd',
          fontSize: 16,
          width: '100%',
          marginBottom: 16
        }}
      />
    );
  }
  
  // For mobile (though admin is typically web-only)
  return (
    <TextInput
      style={styles.dateText}
      value={new Date(value || '').toLocaleString()}
      editable={false}
    />
  );
};

export default function AdminPromotionsScreen() {
  const { user } = useAuth();
  
  // Theme colors
  const backgroundColor = useThemeColor({}, 'background');
  const backgroundSecondary = useThemeColor({}, 'backgroundSecondary');
  const backgroundTertiary = useThemeColor({}, 'backgroundTertiary');
  const textColor = useThemeColor({}, 'text');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const textMuted = useThemeColor({}, 'textMuted');
  const accentPrimary = useThemeColor({}, 'accentPrimary');
  const accentSuccess = useThemeColor({}, 'accentSuccess');
  const accentDanger = useThemeColor({}, 'accentDanger');
  const accentWarning = useThemeColor({}, 'accentWarning');
  const borderColor = useThemeColor({}, 'border');
  
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
  const [creatingCoupon, setCreatingCoupon] = useState(false);

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
      showAlert('Error', 'Failed to load promotions');
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
        showAlert('Validation Error', 'Please fill in all required fields');
        return;
      }

      if (formData.discountType === 'percentage' && (formData.discountValue < 1 || formData.discountValue > 100)) {
        showAlert('Validation Error', 'Percentage must be between 1 and 100');
        return;
      }

      setLoading(true);

      if (editingPromotion) {
        // Update existing promotion
        await PromotionService.updatePromotion(editingPromotion.id, {
          ...formData,
          id: editingPromotion.id
        });
        showAlert('Success', 'Promotion updated successfully');
      } else {
        // Create new promotion
        await PromotionService.createPromotion(formData as CreatePromotionRequest, user.id);
        showAlert('Success', 'Promotion created successfully');
      }

      // Reset form
      setShowForm(false);
      setEditingPromotion(null);
      resetForm();
      loadPromotions();
    } catch (error) {
      console.error('Error saving promotion:', error);
      showAlert('Error', 'Failed to save promotion');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (promotionId: string) => {
    showConfirm(
      'Confirm Delete',
      'Are you sure you want to delete this promotion? This cannot be undone.',
      async () => {
        try {
          await PromotionService.deletePromotion(promotionId);
          showAlert('Success', 'Promotion deleted');
          loadPromotions();
        } catch (error) {
          showAlert('Error', 'Failed to delete promotion');
        }
      }
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
      showAlert('Error', 'Failed to toggle promotion status');
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

  const handleCreateStripeCoupon = async () => {
    try {
      // Validation
      if (!formData.name || !formData.discountValue) {
        showAlert('Validation Error', 'Please fill in the promotion name and discount value before creating a Stripe coupon');
        return;
      }

      if (formData.discountType === 'percentage' && (formData.discountValue < 1 || formData.discountValue > 100)) {
        showAlert('Validation Error', 'Percentage must be between 1 and 100');
        return;
      }

      setCreatingCoupon(true);

      const requestData = {
        name: formData.name,
        discountType: formData.discountType,
        discountValue: formData.discountValue,
        duration: 'once',
        endDate: formData.endDate,
        maxRedemptions: formData.maxRedemptions,
        currency: 'usd'
      };

      console.log('Creating Stripe coupon with data:', requestData);
      console.log('API endpoint:', ApiConfig.STRIPE.CREATE_COUPON);

      // Call the Stripe coupon creation endpoint
      const response = await fetch(ApiConfig.STRIPE.CREATE_COUPON, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      let result;
      
      if (contentType && contentType.includes('application/json')) {
        result = await response.json();
      } else {
        // Response is not JSON (probably HTML error page)
        const text = await response.text();
        console.error('Non-JSON response:', text.substring(0, 500));
        throw new Error(`Server returned non-JSON response (${response.status}). Check Stripe Guardian server logs.`);
      }

      if (!response.ok || !result.success) {
        const errorMsg = result.details || result.error || 'Failed to create Stripe coupon';
        const errorCode = result.code ? ` (${result.code})` : '';
        const errorType = result.type ? ` [${result.type}]` : '';
        throw new Error(`${errorMsg}${errorCode}${errorType}`);
      }

      console.log('Stripe coupon created successfully:', result.couponId);

      // Update form with the coupon ID
      setFormData({
        ...formData,
        stripeCouponId: result.couponId
      });

      showAlert(
        'Success',
        `Stripe coupon "${result.couponId}" created successfully!\n\n` +
        `Discount: ${result.coupon.percentOff ? `${result.coupon.percentOff}%` : `$${result.coupon.amountOff / 100}`}\n` +
        `Duration: ${result.coupon.duration}`
      );
    } catch (error) {
      console.error('Error creating Stripe coupon:', error);
      showAlert(
        'Error',
        `Failed to create Stripe coupon: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    } finally {
      setCreatingCoupon(false);
    }
  };

  const renderMetricsCards = () => (
    <View style={styles.metricsContainer}>
      <ThemedView style={styles.metricCard}>
        <ThemedText style={[styles.metricValue, { color: accentPrimary }]}>{metrics.totalActive}</ThemedText>
        <ThemedText style={[styles.metricLabel, { color: textMuted }]}>Active Promotions</ThemedText>
      </ThemedView>
      <ThemedView style={styles.metricCard}>
        <ThemedText style={[styles.metricValue, { color: accentPrimary }]}>{metrics.totalRedemptions}</ThemedText>
        <ThemedText style={[styles.metricLabel, { color: textMuted }]}>Total Redemptions</ThemedText>
      </ThemedView>
      <ThemedView style={styles.metricCard}>
        <ThemedText style={[styles.metricValue, { color: accentPrimary }]}>{metrics.averageConversion.toFixed(1)}%</ThemedText>
        <ThemedText style={[styles.metricLabel, { color: textMuted }]}>Avg Conversion</ThemedText>
      </ThemedView>
    </View>
  );

  const renderFilters = () => (
    <View style={styles.filtersContainer}>
      {(['all', 'active', 'scheduled', 'expired'] as const).map(filter => (
        <TouchableOpacity
          key={filter}
          style={[
            styles.filterButton,
            { 
              backgroundColor: activeFilter === filter ? accentPrimary : backgroundSecondary,
              borderColor: activeFilter === filter ? accentPrimary : borderColor
            }
          ]}
          onPress={() => setActiveFilter(filter)}
        >
          <ThemedText style={[
            styles.filterButtonText,
            { color: activeFilter === filter ? '#FFFFFF' : textColor }
          ]}>
            {filter.charAt(0).toUpperCase() + filter.slice(1)}
          </ThemedText>
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

    let statusColor = textMuted;
    let statusText = 'Inactive';
    if (isActive) {
      statusColor = accentSuccess;
      statusText = 'Active';
    } else if (isScheduled) {
      statusColor = accentWarning;
      statusText = 'Scheduled';
    } else if (isExpired) {
      statusColor = accentDanger;
      statusText = 'Expired';
    }

    return (
      <ThemedView key={promotion.id} style={styles.promotionCard}>
        <View style={styles.promotionHeader}>
          <View style={styles.promotionTitleContainer}>
            <ThemedText style={[styles.promotionName, { color: textColor }]}>{promotion.name}</ThemedText>
            <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
              <ThemedText style={[styles.statusText, { color: '#FFFFFF' }]}>{statusText}</ThemedText>
            </View>
          </View>
          <View style={styles.promotionActions}>
            <Switch
              value={promotion.isActive}
              onValueChange={() => handleToggleActive(promotion)}
              trackColor={{ false: backgroundTertiary, true: accentPrimary }}
              thumbColor={promotion.isActive ? '#FFFFFF' : '#f4f3f4'}
            />
          </View>
        </View>

        <ThemedText style={[styles.promotionDescription, { color: textSecondary }]}>{promotion.description}</ThemedText>

        <View style={styles.promotionDetails}>
          <View style={styles.detailRow}>
            <ThemedText style={[styles.detailLabel, { color: textSecondary }]}>Discount:</ThemedText>
            <ThemedText style={[styles.detailValue, { color: textColor }]}>
              {promotion.discountType === 'percentage' 
                ? `${promotion.discountValue}% off`
                : `$${promotion.discountValue} off`}
            </ThemedText>
          </View>
          <View style={styles.detailRow}>
            <ThemedText style={[styles.detailLabel, { color: textSecondary }]}>Redemptions:</ThemedText>
            <ThemedText style={[styles.detailValue, { color: textColor }]}>
              {promotion.currentRedemptions}
              {promotion.maxRedemptions ? ` / ${promotion.maxRedemptions}` : ' (unlimited)'}
            </ThemedText>
          </View>
          <View style={styles.detailRow}>
            <ThemedText style={[styles.detailLabel, { color: textSecondary }]}>Period:</ThemedText>
            <ThemedText style={[styles.detailValue, { color: textColor }]}>
              {new Date(promotion.startDate).toLocaleDateString()} - {new Date(promotion.endDate).toLocaleDateString()}
            </ThemedText>
          </View>
          <View style={styles.detailRow}>
            <ThemedText style={[styles.detailLabel, { color: textSecondary }]}>Segments:</ThemedText>
            <ThemedText style={[styles.detailValue, { color: textColor }]}>{promotion.targetSegments.join(', ')}</ThemedText>
          </View>
        </View>

        <View style={[styles.cardActions, { borderTopColor: borderColor }]}>
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: backgroundSecondary }]} 
            onPress={() => handleEdit(promotion)}
          >
            <ThemedText style={[styles.actionButtonText, { color: accentPrimary }]}>Edit</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: backgroundSecondary }]} 
            onPress={() => handleDuplicate(promotion)}
          >
            <ThemedText style={[styles.actionButtonText, { color: accentPrimary }]}>Duplicate</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: '#ffebee' }]} 
            onPress={() => handleDelete(promotion.id)}
          >
            <ThemedText style={[styles.actionButtonText, { color: accentDanger }]}>Delete</ThemedText>
          </TouchableOpacity>
        </View>
      </ThemedView>
    );
  };

  const renderForm = () => (
    <ScrollView style={styles.formContainer}>
      <ThemedText style={[styles.formTitle, { color: textColor }]}>
        {editingPromotion ? 'Edit Promotion' : 'Create New Promotion'}
      </ThemedText>

      {/* Basic Info */}
      <View style={styles.formSection}>
        <ThemedText style={[styles.sectionTitle, { color: textColor }]}>Basic Information</ThemedText>
        
        <ThemedText style={[styles.inputLabel, { color: textColor }]}>Name *</ThemedText>
        <TextInput
          style={[styles.input, { backgroundColor: backgroundSecondary, borderColor, color: textColor }]}
          value={formData.name}
          onChangeText={(text) => setFormData({ ...formData, name: text })}
          placeholder="e.g., Summer Sale 2024"
          placeholderTextColor={textMuted}
        />

        <ThemedText style={[styles.inputLabel, { color: textColor }]}>Description *</ThemedText>
        <TextInput
          style={[styles.input, styles.textArea, { backgroundColor: backgroundSecondary, borderColor, color: textColor }]}
          value={formData.description}
          onChangeText={(text) => setFormData({ ...formData, description: text })}
          placeholder="Describe the promotion..."
          placeholderTextColor={textMuted}
          multiline
          numberOfLines={3}
        />
      </View>

      {/* Discount Configuration */}
      <View style={styles.formSection}>
        <ThemedText style={[styles.sectionTitle, { color: textColor }]}>Discount</ThemedText>
        
        <ThemedText style={[styles.inputLabel, { color: textColor }]}>Discount Type</ThemedText>
        <View style={styles.radioGroup}>
          {(['percentage', 'fixed_amount'] as const).map(type => (
            <TouchableOpacity
              key={type}
              style={styles.radioButton}
              onPress={() => setFormData({ ...formData, discountType: type })}
            >
              <View style={[
                styles.radio, 
                { borderColor },
                formData.discountType === type && { borderColor: accentPrimary, backgroundColor: accentPrimary }
              ]} />
              <ThemedText style={[styles.radioLabel, { color: textColor }]}>
                {type === 'percentage' ? 'Percentage (%)' : 'Fixed Amount ($)'}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </View>

        <ThemedText style={[styles.inputLabel, { color: textColor }]}>Discount Value *</ThemedText>
        <TextInput
          style={[styles.input, { backgroundColor: backgroundSecondary, borderColor, color: textColor }]}
          value={formData.discountValue?.toString()}
          onChangeText={(text) => setFormData({ ...formData, discountValue: parseFloat(text) || 0 })}
          placeholder={formData.discountType === 'percentage' ? 'e.g., 30' : 'e.g., 5.99'}
          placeholderTextColor={textMuted}
          keyboardType="numeric"
        />

        {/* Stripe Coupon Integration */}
        <View style={[styles.stripeCouponSection, { backgroundColor: backgroundTertiary, borderColor }]}>
          <View style={styles.stripeCouponHeader}>
            <Ionicons name="card-outline" size={20} color={accentPrimary} />
            <ThemedText style={[styles.stripeCouponTitle, { color: textColor }]}>
              Stripe Coupon
            </ThemedText>
          </View>
          
          {formData.stripeCouponId ? (
            <View style={styles.couponIdContainer}>
              <View style={styles.couponIdBadge}>
                <Ionicons name="checkmark-circle" size={16} color={accentSuccess} />
                <ThemedText style={[styles.couponIdText, { color: textColor }]}>
                  {formData.stripeCouponId}
                </ThemedText>
              </View>
              <TouchableOpacity
                onPress={() => setFormData({ ...formData, stripeCouponId: undefined })}
                style={styles.removeCouponButton}
              >
                <Ionicons name="close-circle" size={20} color={accentDanger} />
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <ThemedText style={[styles.stripeCouponDescription, { color: textSecondary }]}>
                Create a Stripe coupon to apply this discount during checkout
              </ThemedText>
              <TouchableOpacity
                style={[
                  styles.createCouponButton,
                  { backgroundColor: accentPrimary },
                  creatingCoupon && { opacity: 0.6 }
                ]}
                onPress={handleCreateStripeCoupon}
                disabled={creatingCoupon}
              >
                {creatingCoupon ? (
                  <>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <ThemedText style={[styles.createCouponButtonText, { color: '#FFFFFF' }]}>
                      Creating...
                    </ThemedText>
                  </>
                ) : (
                  <>
                    <Ionicons name="add-circle-outline" size={20} color="#FFFFFF" />
                    <ThemedText style={[styles.createCouponButtonText, { color: '#FFFFFF' }]}>
                      Create Stripe Coupon
                    </ThemedText>
                  </>
                )}
              </TouchableOpacity>
            </>
          )}
          
          {/* Manual entry option */}
          <View style={styles.manualEntrySection}>
            <ThemedText style={[styles.orText, { color: textMuted }]}>Or enter manually:</ThemedText>
            <TextInput
              style={[styles.input, styles.couponInput, { backgroundColor: backgroundSecondary, borderColor, color: textColor }]}
              value={formData.stripeCouponId || ''}
              onChangeText={(text) => setFormData({ ...formData, stripeCouponId: text || undefined })}
              placeholder="Enter Stripe Coupon ID"
              placeholderTextColor={textMuted}
            />
          </View>
        </View>
      </View>

      {/* Schedule */}
      <View style={styles.formSection}>
        <ThemedText style={[styles.sectionTitle, { color: textColor }]}>Schedule</ThemedText>
        
        <ThemedText style={[styles.inputLabel, { color: textColor }]}>Start Date *</ThemedText>
        <DateInput
          label="Start Date"
          value={formData.startDate || ''}
          onChange={(date: string) => setFormData({ ...formData, startDate: date })}
        />

        <ThemedText style={[styles.inputLabel, { color: textColor }]}>End Date *</ThemedText>
        <DateInput
          label="End Date"
          value={formData.endDate || ''}
          onChange={(date: string) => setFormData({ ...formData, endDate: date })}
        />
      </View>

      {/* Targeting */}
      <View style={styles.formSection}>
        <ThemedText style={[styles.sectionTitle, { color: textColor }]}>Target Segments</ThemedText>
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
            <View style={[
              styles.checkbox,
              { borderColor },
              formData.targetSegments?.includes(segment) && { borderColor: accentPrimary, backgroundColor: accentPrimary }
            ]} />
            <ThemedText style={[styles.checkboxLabel, { color: textColor }]}>{segment.replace('_', ' ')}</ThemedText>
          </TouchableOpacity>
        ))}
      </View>

      {/* Limits */}
      <View style={styles.formSection}>
        <ThemedText style={[styles.sectionTitle, { color: textColor }]}>Usage Limits</ThemedText>
        
        <ThemedText style={[styles.inputLabel, { color: textColor }]}>Max Redemptions (leave empty for unlimited)</ThemedText>
        <TextInput
          style={[styles.input, { backgroundColor: backgroundSecondary, borderColor, color: textColor }]}
          value={formData.maxRedemptions?.toString()}
          onChangeText={(text) => setFormData({ ...formData, maxRedemptions: text ? parseInt(text) : undefined })}
          placeholder="e.g., 100"
          placeholderTextColor={textMuted}
          keyboardType="numeric"
        />

        <ThemedText style={[styles.inputLabel, { color: textColor }]}>Max Per User</ThemedText>
        <TextInput
          style={[styles.input, { backgroundColor: backgroundSecondary, borderColor, color: textColor }]}
          value={formData.maxPerUser?.toString()}
          onChangeText={(text) => setFormData({ ...formData, maxPerUser: parseInt(text) || 1 })}
          placeholder="e.g., 1"
          placeholderTextColor={textMuted}
          keyboardType="numeric"
        />

        <ThemedText style={[styles.inputLabel, { color: textColor }]}>Priority (higher = shown first)</ThemedText>
        <TextInput
          style={[styles.input, { backgroundColor: backgroundSecondary, borderColor, color: textColor }]}
          value={formData.priority?.toString()}
          onChangeText={(text) => setFormData({ ...formData, priority: parseInt(text) || 0 })}
          placeholder="e.g., 100"
          placeholderTextColor={textMuted}
          keyboardType="numeric"
        />
      </View>

      {/* Action Buttons */}
      <View style={styles.formActions}>
        <TouchableOpacity 
          style={[styles.button, { backgroundColor: backgroundSecondary }]} 
          onPress={() => {
            setShowForm(false);
            setEditingPromotion(null);
            resetForm();
          }}
        >
          <ThemedText style={[styles.cancelButtonText, { color: textSecondary }]}>Cancel</ThemedText>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.button, { backgroundColor: accentPrimary }]} 
          onPress={handleCreateOrUpdate}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <ThemedText style={[styles.saveButtonText, { color: '#FFFFFF' }]}>
              {editingPromotion ? 'Update' : 'Create'} Promotion
            </ThemedText>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  // Web layout with sidebar
  if (Platform.OS === 'web') {
    return (
      <WebLayout
        title="Promotions Management"
        subtitle="Create and manage premium promotional campaigns"
        sidebar={
          <AdminSidebar
            activePage="promotions"
          />
        }
      >
        <ScrollView style={styles.scrollView}>
          {!showForm ? (
            <>
              {renderMetricsCards()}
              
              <View style={styles.header}>
                <ThemedText style={[styles.title, { color: textColor }]}>Promotions</ThemedText>
                <TouchableOpacity 
                  style={[styles.createButton, { backgroundColor: accentPrimary }]} 
                  onPress={() => setShowForm(true)}
                >
                  <ThemedText style={[styles.createButtonText, { color: '#FFFFFF' }]}>+ Create Promotion</ThemedText>
                </TouchableOpacity>
              </View>

              {renderFilters()}

              {loading ? (
                <ActivityIndicator size="large" color={accentPrimary} style={styles.loader} />
              ) : filteredPromotions.length === 0 ? (
                <View style={styles.emptyState}>
                  <ThemedText style={[styles.emptyText, { color: textSecondary }]}>No promotions found</ThemedText>
                  <ThemedText style={[styles.emptySubtext, { color: textMuted }]}>Create your first promotion to get started</ThemedText>
                </View>
              ) : (
                filteredPromotions.map(renderPromotionCard)
              )}
            </>
          ) : (
            renderForm()
          )}
        </ScrollView>
      </WebLayout>
    );
  }

  // Mobile layout (fallback)
  return (
    <ThemedView style={styles.container}>
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
              <ThemedText style={[styles.title, { color: textColor }]}>Promotions</ThemedText>
              <TouchableOpacity 
                style={[styles.createButton, { backgroundColor: accentPrimary }]} 
                onPress={() => setShowForm(true)}
              >
                <ThemedText style={[styles.createButtonText, { color: '#FFFFFF' }]}>+ Create Promotion</ThemedText>
              </TouchableOpacity>
            </View>

            {renderFilters()}

            {loading ? (
              <ActivityIndicator size="large" color={accentPrimary} style={styles.loader} />
            ) : filteredPromotions.length === 0 ? (
              <View style={styles.emptyState}>
                <ThemedText style={[styles.emptyText, { color: textSecondary }]}>No promotions found</ThemedText>
                <ThemedText style={[styles.emptySubtext, { color: textMuted }]}>Create your first promotion to get started</ThemedText>
              </View>
            ) : (
              filteredPromotions.map(renderPromotionCard)
            )}
          </>
        ) : (
          renderForm()
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
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
    fontWeight: 'bold'
  },
  metricLabel: {
    fontSize: 12,
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
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8
  },
  createButtonText: {
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
    borderWidth: 1
  },
  filterButtonText: {
    fontWeight: '500'
  },
  promotionCard: {
    margin: 16,
    marginTop: 0,
    padding: 16,
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
    fontSize: 11,
    fontWeight: '600'
  },
  promotionActions: {
    flexDirection: 'row',
    gap: 8
  },
  promotionDescription: {
    fontSize: 14,
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
    fontSize: 14
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500'
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
    borderTopWidth: 1,
    paddingTop: 12
  },
  actionButton: {
    flex: 1,
    padding: 8,
    borderRadius: 6,
    alignItems: 'center'
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '500'
  },
  emptyState: {
    padding: 40,
    alignItems: 'center'
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8
  },
  emptySubtext: {
    fontSize: 14
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
    marginBottom: 8
  },
  input: {
    borderWidth: 1,
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
    borderWidth: 2
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
    borderWidth: 2
  },
  checkboxLabel: {
    fontSize: 16,
    textTransform: 'capitalize'
  },
  dateText: {
    borderWidth: 1,
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
  cancelButtonText: {
    fontWeight: '600',
    fontSize: 16
  },
  saveButtonText: {
    fontWeight: '600',
    fontSize: 16
  },
  stripeCouponSection: {
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1
  },
  stripeCouponHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12
  },
  stripeCouponTitle: {
    fontSize: 16,
    fontWeight: '600'
  },
  stripeCouponDescription: {
    fontSize: 14,
    marginBottom: 12,
    lineHeight: 20
  },
  createCouponButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 12
  },
  createCouponButtonText: {
    fontSize: 15,
    fontWeight: '600'
  },
  couponIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12
  },
  couponIdBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    flex: 1
  },
  couponIdText: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace'
  },
  removeCouponButton: {
    padding: 4,
    marginLeft: 8
  },
  manualEntrySection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)'
  },
  orText: {
    fontSize: 12,
    marginBottom: 8,
    textAlign: 'center'
  },
  couponInput: {
    marginBottom: 0
  }
});

