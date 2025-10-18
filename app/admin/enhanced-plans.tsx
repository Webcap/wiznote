// Enhanced Plans Management Admin Interface
// Phase 1: Foundation - Basic Admin Interface Structure

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, Modal, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { ThemedText } from '../../components/ThemedText';
import { ThemedView } from '../../components/ThemedView';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { useAuth } from '../../hooks/useAuth';
import { useThemeColor } from '../../hooks/useThemeColor';

// Import web components
import { AdminSidebar } from '../../components/web/AdminSidebar';
import { WebLayout } from '../../components/web/WebLayout';

// Import enhanced plan types
import { PlanForm } from '../../components/admin/PlanForm';
import { supabase } from '../../lib/supabase';
import { enhancedPlanService } from '../../services/EnhancedPlanService';
import { planManagementService } from '../../services/PlanManagementService';
import { planVersionService } from '../../services/PlanVersionService';
import { EnhancedPlan, PlanMetrics } from '../../types/EnhancedPlans';

export default function EnhancedPlansScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { showSnackbar } = useSnackbar();
  
  // State
  const [plans, setPlans] = useState<EnhancedPlan[]>([]);
  const [metrics, setMetrics] = useState<PlanMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedView, setSelectedView] = useState<'active' | 'draft' | 'archived'>('active');
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState<EnhancedPlan | null>(null);
  const [showVersionsFor, setShowVersionsFor] = useState<string | null>(null);
  const [versions, setVersions] = useState<any[]>([]);

  // Theme colors
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const mutedTextColor = useThemeColor({}, 'textSecondary');
  const cardBackground = useThemeColor({}, 'backgroundSecondary');
  const accentColor = useThemeColor({}, 'accentPrimary');
  const borderColor = useThemeColor({}, 'border');
  const dangerColor = useThemeColor({}, 'accentDanger');
  const whiteColor = useThemeColor({}, 'background');
  const successColor = useThemeColor({}, 'accentSuccess');
  const warningColor = useThemeColor({}, 'accentWarning');

  // Check admin access
  useEffect(() => {
    if (user && user.role !== 'admin') {
      Alert.alert('Access Denied', 'You need admin privileges to access this page.');
      router.back();
    }
  }, [user, router]);

  // Load plans data + realtime subscription
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  useEffect(() => {
    if (user?.role !== 'admin') return;
    loadPlansData();

    // Subscribe to realtime changes on premium_plans
    try {
      const channel = supabase
        .channel('enhanced-plans-admin')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'premium_plans' }, (_payload) => {
          loadPlansData(false);
        })
        .subscribe();
      channelRef.current = channel;
    } catch (e) {
      console.warn('Realtime subscription failed:', e);
    }

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user]);

  // Reload data when view changes
  useEffect(() => {
    loadPlansData();
  }, [selectedView]);

  const loadPlansData = async (showSpinner: boolean = true) => {
    try {
      if (showSpinner) setLoading(true);
      setError(null);
      
      // Set up filters based on current view
      let filters: any = {};
      if (selectedView === 'active') {
        filters.isActive = true;
      } else if (selectedView === 'draft') {
        filters.isActive = false;
      }
      // For 'archived' view, we'll still load all and filter client-side since it uses metadata
      
      const { plans: livePlans } = await planManagementService.listPlans({
        filters,
        sortBy: 'createdAt',
        sortOrder: 'desc',
        limit: 100,
        page: 1,
      });
      setPlans(livePlans);

      // For metrics, we need to load all plans to get accurate totals
      const { plans: allPlans } = await planManagementService.listPlans({
        filters: {}, // Load all plans for metrics
        sortBy: 'createdAt',
        sortOrder: 'desc',
        limit: 1000, // Higher limit for metrics
        page: 1,
      });

      // Compute metrics from all plans data
      const computed: PlanMetrics = {
        totalPlans: allPlans.length,
        activePlans: allPlans.filter(p => p.isActive).length,
        plansWithStripe: allPlans.filter(p => !!p.stripeProductId).length,
        plansWithFeatures: allPlans.filter(p => Object.keys(p.featureFlags || {}).length > 0).length,
        averagePrice: allPlans.length > 0 ? Number((allPlans.reduce((acc, p) => acc + (p.price || 0), 0) / allPlans.length).toFixed(2)) : 0,
        mostPopularPlan: livePlans.find(p => p.isPopular)?.id,
        lastCreatedPlan: livePlans[0]?.createdAt,
      };
      setMetrics(computed);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load plans data';
      setError(errorMessage);
      showSnackbar(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Manually trigger a Stripe sync for a specific plan via local webhook server
  const syncPlanWithStripe = async (planId: string) => {
    try {
      const { ApiConfig } = await import('../../constants/ApiConfig');
      const base = ApiConfig.WEBHOOK_BASE_URL;
      const res = await fetch(`${base}/stripe/sync-plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId }),
      });
      const payload = await res.json().catch(() => ({} as any));
      if (!res.ok) {
        const details = (payload && (payload.details || payload.error)) ? `: ${payload.details || payload.error}` : '';
        showSnackbar(`Stripe sync failed (${res.status})${details}`, 'error');
        return;
      }
      if (payload?.productId && payload?.priceId) {
        // Best-effort: also update via app-side service in case server couldn't write (RLS)
        try {
          await enhancedPlanService.updatePlan(planId, {
            stripeProductId: payload.productId,
            stripePriceId: payload.priceId,
          } as any);
        } catch {}
        showSnackbar(`Stripe sync completed (prod: ${payload.productId}, price: ${payload.priceId})`, 'success');
      } else {
        showSnackbar('Stripe sync completed', 'success');
      }
      await loadPlansData(false);
    } catch (e) {
      showSnackbar('Stripe sync error. Is the webhook server running?', 'error');
    }
  };

  const handleCreatePlan = () => {
    setEditingPlan(null);
    setShowPlanForm(true);
  };

  const handleEditPlan = (planId: string) => {
    const plan = plans.find(p => p.id === planId);
    if (plan) {
      setEditingPlan(plan);
      setShowPlanForm(true);
    }
  };

  const openVersions = async (planId: string) => {
    try {
      const list = await planVersionService.listVersions(planId, 50);
      setVersions(list);
      setShowVersionsFor(planId);
    } catch (e) {
      showSnackbar('Failed to load versions', 'error');
    }
  };

  const rollbackVersion = async (versionId: string) => {
    if (!showVersionsFor) return;
    try {
      await planVersionService.rollbackToVersion(showVersionsFor, versionId);
      showSnackbar('Plan rolled back successfully', 'success');
      await loadPlansData(false);
      const list = await planVersionService.listVersions(showVersionsFor, 50);
      setVersions(list);
    } catch (e) {
      showSnackbar('Rollback failed', 'error');
    }
  };

  const handleSavePlan = async (plan: EnhancedPlan) => {
    try {
      // Refresh plans list
      await loadPlansData();
      setShowPlanForm(false);
      setEditingPlan(null);
      showSnackbar(
        editingPlan ? 'Plan updated successfully' : 'Plan created successfully', 
        'success'
      );
    } catch (error) {
      showSnackbar('Failed to save plan', 'error');
    }
  };

  const handleCancelPlanForm = () => {
    setShowPlanForm(false);
    setEditingPlan(null);
  };

  const handleDeletePlan = (plan: EnhancedPlan) => {
    console.log('handleDeletePlan called for plan:', plan.id);

    const performDelete = async () => {
      try {
        console.log('Attempting hard delete via enhancedPlanService for plan:', plan.id);
        await enhancedPlanService.deletePlan(plan.id);
        console.log('Hard delete succeeded for plan:', plan.id);
      } catch (hardErr) {
        console.warn('Hard delete failed, falling back to soft delete for plan:', plan.id, hardErr);
        try {
          await planManagementService.deletePlan(plan.id);
          console.log('Soft delete (archive) succeeded for plan:', plan.id);
        } catch (softErr) {
          console.error('Soft delete failed for plan:', plan.id, softErr);
          showSnackbar('Failed to delete plan', 'error');
          return;
        }
      }
      await loadPlansData(false);
      showSnackbar(`Plan ${plan.name} deleted`, 'success');
    };

    if (Platform.OS === 'web') {
      const confirmFn = (globalThis as any)?.confirm;
      if (confirmFn) {
        const confirmed = confirmFn(`Delete "${plan.name}"? This action cannot be undone.`);
        if (!confirmed) return;
        performDelete();
        return;
      }
    }

    Alert.alert(
      'Delete Plan',
      `Are you sure you want to delete "${plan.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            console.log('Delete confirmed via Alert for plan:', plan.id);
            performDelete();
          }
        }
      ]
    );
  };

  const getFilteredPlans = () => {
    switch (selectedView) {
      case 'active':
        return plans.filter(plan => plan.isActive);
      case 'draft':
        return plans.filter(plan => !plan.isActive);
      case 'archived':
        return plans.filter(plan => plan.metadata?.status === 'archived');
      default:
        return plans;
    }
  };

  // Web layout
  if (Platform.OS === 'web') {
    return (
      <WebLayout
        title="Plans Management"
        subtitle="Manage subscription plans with Stripe integration"
        sidebar={
          <AdminSidebar
            activePage="enhanced-plans"
          />
        }
      >
        <ScrollView style={styles.webContent}>
          {loading ? (
            <View style={styles.webLoadingContainer}>
              <LoadingSpinner size={48} />
              <ThemedText style={[styles.webLoadingText, { color: mutedTextColor }]}>
                Loading plans data...
              </ThemedText>
            </View>
          ) : error ? (
            <View style={styles.webErrorContainer}>
              <View style={styles.webErrorIcon}>
                <Ionicons name="alert-circle" size={64} color={dangerColor} />
              </View>
              <ThemedText style={[styles.webErrorTitle, { color: textColor }]}>
                Error Loading Data
              </ThemedText>
              <ThemedText style={[styles.webErrorText, { color: mutedTextColor }]}>
                {error}
              </ThemedText>
              <TouchableOpacity 
                style={[styles.webRetryButton, { backgroundColor: accentColor }]}
                onPress={() => loadPlansData()}
              >
                <Ionicons name="refresh" size={16} color={whiteColor} />
                <ThemedText style={[styles.webRetryButtonText, { color: whiteColor }]}>Try Again</ThemedText>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {/* Header */}
              <View style={styles.webHeader}>
                <View style={styles.webHeaderLeft}>
                  <ThemedText type="title">Plans Management</ThemedText>
                  <ThemedText style={[styles.webHeaderSubtitle, { color: mutedTextColor }]}>
                    Manage subscription plans with automatic Stripe integration
                  </ThemedText>
                </View>
                <TouchableOpacity 
                  style={[styles.webCreateButton, { backgroundColor: 'rgba(255,255,255,0.1)' }]}
                  onPress={() => router.push('/admin/support')}
                >
                  <Ionicons name="headset" size={20} color={textColor} />
                  <ThemedText style={[styles.webCreateButtonText, { color: textColor }]}>Support</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.webCreateButton, { backgroundColor: accentColor }]}
                  onPress={handleCreatePlan}
                >
                  <Ionicons name="add" size={20} color={whiteColor} />
                  <ThemedText style={[styles.webCreateButtonText, { color: whiteColor }]}>Create Plan</ThemedText>
                </TouchableOpacity>
              </View>

              {/* Metrics Cards */}
              {metrics && (
                <View style={styles.webMetricsGrid}>
                  <View style={[styles.webMetricCard, { backgroundColor: cardBackground }]}>
                    <Ionicons name="layers" size={24} color={accentColor} />
                    <ThemedText style={[styles.webMetricValue, { color: textColor }]}>
                      {metrics.totalPlans}
                    </ThemedText>
                    <ThemedText style={[styles.webMetricLabel, { color: mutedTextColor }]}>
                      Total Plans
                    </ThemedText>
                  </View>
                  <View style={[styles.webMetricCard, { backgroundColor: cardBackground }]}>
                    <Ionicons name="checkmark-circle" size={24} color={successColor} />
                    <ThemedText style={[styles.webMetricValue, { color: textColor }]}>
                      {metrics.activePlans}
                    </ThemedText>
                    <ThemedText style={[styles.webMetricLabel, { color: mutedTextColor }]}>
                      Active Plans
                    </ThemedText>
                  </View>
                  <View style={[styles.webMetricCard, { backgroundColor: cardBackground }]}>
                    <Ionicons name="card" size={24} color={warningColor} />
                    <ThemedText style={[styles.webMetricValue, { color: textColor }]}>
                      {metrics.plansWithStripe}
                    </ThemedText>
                    <ThemedText style={[styles.webMetricLabel, { color: mutedTextColor }]}>
                      Stripe Connected
                    </ThemedText>
                  </View>
                  <View style={[styles.webMetricCard, { backgroundColor: cardBackground }]}>
                    <Ionicons name="pricetag" size={24} color={accentColor} />
                    <ThemedText style={[styles.webMetricValue, { color: textColor }]}>
                      ${metrics.averagePrice}
                    </ThemedText>
                    <ThemedText style={[styles.webMetricLabel, { color: mutedTextColor }]}>
                      Average Price
                    </ThemedText>
                  </View>
                </View>
              )}

              {/* View Tabs */}
              <View style={styles.webTabsContainer}>
                <TouchableOpacity 
                  style={[
                    styles.webTab, 
                    selectedView === 'active' && { backgroundColor: accentColor }
                  ]}
                  onPress={() => setSelectedView('active')}
                >
                  <ThemedText style={[
                    styles.webTabText, 
                    selectedView === 'active' && { color: whiteColor }
                  ]}>
                    Active Plans ({plans.filter(p => p.isActive).length})
                  </ThemedText>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[
                    styles.webTab, 
                    selectedView === 'draft' && { backgroundColor: accentColor }
                  ]}
                  onPress={() => setSelectedView('draft')}
                >
                  <ThemedText style={[
                    styles.webTabText, 
                    selectedView === 'draft' && { color: whiteColor }
                  ]}>
                    Draft Plans ({plans.filter(p => !p.isActive).length})
                  </ThemedText>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[
                    styles.webTab, 
                    selectedView === 'archived' && { backgroundColor: accentColor }
                  ]}
                  onPress={() => setSelectedView('archived')}
                >
                  <ThemedText style={[
                    styles.webTabText, 
                    selectedView === 'archived' && { color: whiteColor }
                  ]}>
                    Archived Plans ({plans.filter(p => p.metadata?.status === 'archived').length})
                  </ThemedText>
                </TouchableOpacity>
              </View>

              {/* Plans Grid */}
              <View style={styles.webPlansGrid}>
                {getFilteredPlans().map((plan) => (
                  <View key={plan.id} style={[styles.webPlanCard, { backgroundColor: cardBackground }]}>
                    <View style={styles.webPlanHeader}>
                      <View style={styles.webPlanInfo}>
                        <ThemedText style={[styles.webPlanName, { color: textColor }]}>
                          {plan.name}
                        </ThemedText>
                        <ThemedText style={[styles.webPlanDescription, { color: mutedTextColor }]}>
                          {plan.description}
                        </ThemedText>
                        <View style={styles.webPlanPrice}>
                          <ThemedText style={[styles.webPlanPriceValue, { color: textColor }]}>
                            ${plan.price}
                          </ThemedText>
                          <ThemedText style={[styles.webPlanPriceInterval, { color: mutedTextColor }]}>
                            /{plan.interval}
                          </ThemedText>
                        </View>
                      </View>
                      <View style={styles.webPlanBadges}>
                        {plan.isPopular && (
                          <View style={[styles.webPlanBadge, { backgroundColor: warningColor }]}>
                            <ThemedText style={[styles.webPlanBadgeText, { color: whiteColor }]}>Popular</ThemedText>
                          </View>
                        )}
                        <View style={[styles.webPlanBadge, { backgroundColor: plan.stripeProductId ? successColor : dangerColor }]}>
                          <ThemedText style={[styles.webPlanBadgeText, { color: whiteColor }]}>
                            {plan.stripeProductId ? 'Stripe Linked' : 'Not Synced'}
                          </ThemedText>
                        </View>
                        {!plan.stripeProductId && (
                          <TouchableOpacity onPress={() => syncPlanWithStripe(plan.id)}>
                            <View style={[styles.webPlanBadge, { backgroundColor: warningColor }]}>
                              <ThemedText style={[styles.webPlanBadgeText, { color: whiteColor }]}>Sync Now</ThemedText>
                            </View>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>

                    <View style={styles.webPlanFeatures}>
                      <ThemedText style={[styles.webPlanFeaturesTitle, { color: textColor }]}>
                        Features ({plan.featureCount || 0})
                      </ThemedText>
                      <View style={styles.webPlanFeaturesList}>
                        {Object.entries(plan.featureFlags || {}).slice(0, 3).map(([featureId, isEnabled]) => (
                          <View key={featureId} style={styles.webPlanFeature}>
                            <Ionicons 
                              name={isEnabled ? "checkmark-circle" : "close-circle"} 
                              size={16} 
                              color={isEnabled ? successColor : dangerColor} 
                            />
                            <ThemedText style={[styles.webPlanFeatureText, { color: mutedTextColor }]}>
                              {featureId.replace(/_/g, ' ')}
                            </ThemedText>
                          </View>
                        ))}
                        {Object.keys(plan.featureFlags || {}).length > 3 && (
                          <ThemedText style={[styles.webPlanFeatureMore, { color: mutedTextColor }]}>
                            +{Object.keys(plan.featureFlags || {}).length - 3} more
                          </ThemedText>
                        )}
                      </View>
                    </View>

                    <View style={styles.webPlanActions}>
                      <TouchableOpacity 
                        style={[styles.webPlanAction, { borderColor: accentColor }]}
                        onPress={() => handleEditPlan(plan.id)}
                      >
                        <Ionicons name="pencil" size={16} color={accentColor} />
                        <ThemedText style={[styles.webPlanActionText, { color: accentColor }]}>
                          Edit
                        </ThemedText>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={[styles.webPlanAction, { borderColor }]}
                        onPress={() => openVersions(plan.id)}
                      >
                        <Ionicons name="time" size={16} color={textColor} />
                        <ThemedText style={[styles.webPlanActionText, { color: textColor }]}>
                          Versions
                        </ThemedText>
                      </TouchableOpacity>
                        <TouchableOpacity 
                          style={[styles.webPlanAction, { borderColor: warningColor }]}
                          onPress={() => syncPlanWithStripe(plan.id)}
                        >
                          <Ionicons name="refresh" size={16} color={warningColor} />
                          <ThemedText style={[styles.webPlanActionText, { color: warningColor }]}>
                            Sync Stripe
                          </ThemedText>
                        </TouchableOpacity>
                      <TouchableOpacity 
                        style={[styles.webPlanAction, { borderColor: dangerColor }]}
                        onPress={() => handleDeletePlan(plan)}
                      >
                        <Ionicons name="trash" size={16} color={dangerColor} />
                        <ThemedText style={[styles.webPlanActionText, { color: dangerColor }]}>
                          Delete
                        </ThemedText>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>

              {getFilteredPlans().length === 0 && (
                <View style={styles.webEmptyContainer}>
                  <View style={styles.webEmptyIcon}>
                    <Ionicons name="layers-outline" size={64} color={mutedTextColor} />
                  </View>
                  <ThemedText style={[styles.webEmptyTitle, { color: textColor }]}>
                    No Plans Found
                  </ThemedText>
                  <ThemedText style={[styles.webEmptyText, { color: mutedTextColor }]}>
                    {selectedView === 'active' && 'No active plans found. Create your first plan to get started.'}
                    {selectedView === 'draft' && 'No draft plans found.'}
                    {selectedView === 'archived' && 'No archived plans found.'}
                  </ThemedText>
                  {selectedView === 'active' && (
                    <TouchableOpacity 
                      style={[styles.webEmptyButton, { backgroundColor: accentColor }]}
                      onPress={handleCreatePlan}
                    >
                      <Ionicons name="add" size={16} color={whiteColor} />
                      <ThemedText style={[styles.webEmptyButtonText, { color: whiteColor }]}>Create First Plan</ThemedText>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </>
          )}
        </ScrollView>

        {/* Plan Form Modal */}
        <Modal
          visible={showPlanForm}
          animationType="slide"
          presentationStyle={Platform.OS === 'web' ? 'overFullScreen' : 'pageSheet'}
          transparent={Platform.OS === 'web'}
        >
          <PlanForm
            plan={editingPlan}
            onSave={handleSavePlan}
            onCancel={handleCancelPlanForm}
            isVisible={showPlanForm}
          />
        </Modal>

        {/* Versions Modal */}
        <Modal
          visible={!!showVersionsFor}
          animationType="slide"
          presentationStyle={Platform.OS === 'web' ? 'overFullScreen' : 'pageSheet'}
          transparent={Platform.OS === 'web'}
        >
          <ThemedView style={{ flex: 1, padding: 24 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <ThemedText type="title">Plan Versions</ThemedText>
              <TouchableOpacity onPress={() => setShowVersionsFor(null)}>
                <Ionicons name="close" size={24} color={textColor} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {versions.length === 0 ? (
                <ThemedText>No versions found</ThemedText>
              ) : (
                versions.map(v => (
                  <View key={v.id} style={{ padding: 12, borderWidth: 1, borderColor, borderRadius: 8, marginBottom: 10 }}>
                    <ThemedText style={{ fontWeight: 'bold' }}>Version #{v.version_number}</ThemedText>
                    <ThemedText style={{ opacity: 0.7, marginTop: 4 }}>Created: {new Date(v.created_at).toLocaleString()}</ThemedText>
                    <ThemedText style={{ marginTop: 8 }}>Changes:</ThemedText>
                    <ScrollView horizontal style={{ marginTop: 6 }}>
                      <ThemedText style={{ fontFamily: 'monospace' }}>
                        {JSON.stringify(v.changes, null, 2)}
                      </ThemedText>
                    </ScrollView>
                    <View style={{ flexDirection: 'row', marginTop: 8 }}>
                      <TouchableOpacity onPress={() => rollbackVersion(v.id)} style={{ paddingVertical: 8, paddingHorizontal: 12, borderRadius: 6, borderWidth: 1, borderColor: borderColor }}>
                        <ThemedText>Rollback to this</ThemedText>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          </ThemedView>
        </Modal>
      </WebLayout>
    );
  }

  // Mobile layout (simplified for Phase 1)
  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedText type="title">Enhanced Plans</ThemedText>
        <ThemedText style={[styles.subtitle, { color: mutedTextColor }]}>
          Phase 1: Foundation - Basic interface
        </ThemedText>
      </View>

      <View style={styles.content}>
        <ThemedText style={[styles.infoText, { color: mutedTextColor }]}>
          Enhanced plans management is being implemented in phases:
        </ThemedText>
        
        <View style={styles.phaseList}>
          <View style={styles.phaseItem}>
            <ThemedText style={[styles.phaseNumber, { color: accentColor }]}>Phase 1:</ThemedText>
            <ThemedText style={[styles.phaseText, { color: textColor }]}>
              Foundation - Database schema, interfaces, basic Stripe integration
            </ThemedText>
          </View>
          <View style={styles.phaseItem}>
            <ThemedText style={[styles.phaseNumber, { color: mutedTextColor }]}>Phase 2:</ThemedText>
            <ThemedText style={[styles.phaseText, { color: mutedTextColor }]}>
              Core Services - Enhanced plan service, complete Stripe integration
            </ThemedText>
          </View>
          <View style={styles.phaseItem}>
            <ThemedText style={[styles.phaseNumber, { color: mutedTextColor }]}>Phase 3:</ThemedText>
            <ThemedText style={[styles.phaseText, { color: mutedTextColor }]}>
              Admin Interface - Plan creator, editor, real-time updates
            </ThemedText>
          </View>
          <View style={styles.phaseItem}>
            <ThemedText style={[styles.phaseNumber, { color: mutedTextColor }]}>Phase 4:</ThemedText>
            <ThemedText style={[styles.phaseText, { color: mutedTextColor }]}>
              Integration & Testing - End-to-end testing, webhooks, optimization
            </ThemedText>
          </View>
        </View>

        <TouchableOpacity 
          style={[styles.backButton, { borderColor }]}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={20} color={textColor} />
          <ThemedText style={[styles.backButtonText, { color: textColor }]}>
            Back to Admin
          </ThemedText>
        </TouchableOpacity>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    marginTop: 4,
  },
  content: {
    padding: 20,
    paddingTop: 10,
  },
  infoText: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 20,
  },
  phaseList: {
    marginBottom: 30,
  },
  phaseItem: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  phaseNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 12,
    minWidth: 80,
  },
  phaseText: {
    fontSize: 16,
    lineHeight: 24,
    flex: 1,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  // Web specific styles
  webContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  webLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  webLoadingText: {
    fontSize: 18,
    marginTop: 16,
  },
  webErrorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  webErrorIcon: {
    marginBottom: 16,
  },
  webErrorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  webErrorText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  webRetryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  webRetryButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  webHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  webHeaderLeft: {
    flex: 1,
  },
  webHeaderSubtitle: {
    fontSize: 16,
    marginTop: 4,
  },
  webCreateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  webCreateButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  webMetricsGrid: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 32,
  },
  webMetricCard: {
    flex: 1,
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  webMetricValue: {
    fontSize: 32,
    fontWeight: 'bold',
    marginTop: 8,
    marginBottom: 4,
  },
  webMetricLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  webTabsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  webTab: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  webTabText: {
    fontSize: 14,
    fontWeight: '500',
  },
  webPlansGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 24,
  },
  webPlanCard: {
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  webPlanHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  webPlanInfo: {
    flex: 1,
  },
  webPlanName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  webPlanDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  webPlanPrice: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  webPlanPriceValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  webPlanPriceInterval: {
    fontSize: 16,
    marginLeft: 4,
  },
  webPlanBadges: {
    flexDirection: 'row',
    gap: 8,
  },
  webPlanBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  webPlanBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  webPlanFeatures: {
    marginBottom: 16,
  },
  webPlanFeaturesTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  webPlanFeaturesList: {
    gap: 4,
  },
  webPlanFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  webPlanFeatureText: {
    fontSize: 14,
  },
  webPlanFeatureMore: {
    fontSize: 14,
    fontStyle: 'italic',
    marginLeft: 24,
  },
  webPlanActions: {
    flexDirection: 'row',
    gap: 12,
  },
  webPlanAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
  },
  webPlanActionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  webEmptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  webEmptyIcon: {
    marginBottom: 16,
  },
  webEmptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  webEmptyText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  webEmptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  webEmptyButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});
