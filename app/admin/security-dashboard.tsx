import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View, RefreshControl, Platform } from 'react-native';
import { ThemedText } from '../../components/ThemedText';
import { ThemedView } from '../../components/ThemedView';
import { useThemeColor } from '../../hooks/useThemeColor';
import { useAuth } from '../../hooks/useAuth';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { AdminSidebar } from '../../components/web/AdminSidebar';
import { WebLayout } from '../../components/web/WebLayout';
import { LoadingSpinner } from '../../components/LoadingSpinner';

/**
 * Security Dashboard - Admin Only
 * Real-time security monitoring and threat detection
 */
export default function SecurityDashboardScreen() {
  const { user, isLoading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timeWindow, setTimeWindow] = useState(24); // hours

  // Security metrics
  const [metrics, setMetrics] = useState({
    totalEvents: 0,
    failedLogins: 0,
    activeLockouts: 0,
    activeSessions: 0,
    replayAttempts: 0,
    suspiciousActivities: 0,
  });

  // Recent events
  const [recentEvents, setRecentEvents] = useState<any[]>([]);
  const [failedLogins, setFailedLogins] = useState<any[]>([]);
  const [activeLockouts, setActiveLockouts] = useState<any[]>([]);
  const [activeSessions, setActiveSessions] = useState<any[]>([]);

  // Theme colors
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const textSecondaryColor = useThemeColor({}, 'textSecondary');
  const accentPrimary = useThemeColor({}, 'accentPrimary');
  const backgroundSecondary = useThemeColor({}, 'backgroundSecondary');
  const backgroundTertiary = useThemeColor({}, 'backgroundTertiary');

  useEffect(() => {
    // Don't redirect while auth is loading
    if (authLoading) {
      return;
    }

    // Check if user is admin
    if (!user || user.role !== 'admin') {
      console.log('[SecurityDashboard] User not admin, redirecting...', { role: user?.role });
      router.replace('/(tabs)');
      return;
    }

    // Load dashboard data
    loadDashboardData();
  }, [user, authLoading, timeWindow]);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);

      // Load security event summary
      const { data: eventSummary, error: eventError } = await supabase
        .rpc('get_security_event_summary', { p_time_window_hours: timeWindow });

      if (!eventError && eventSummary) {
        const failedLoginCount = eventSummary.find((e: any) => e.event_type === 'auth.login.failure')?.event_count || 0;
        const totalEvents = eventSummary.reduce((sum: number, e: any) => sum + parseInt(e.event_count || 0), 0);
        
        setMetrics(prev => ({
          ...prev,
          totalEvents,
          failedLogins: failedLoginCount,
        }));
      }

      // Load recent security events (last 20)
      const { data: events, error: eventsError } = await supabase
        .from('security_audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (!eventsError && events) {
        setRecentEvents(events);
      }

      // Load failed logins
      const { data: failedLoginEvents, error: failedError } = await supabase
        .from('security_audit_log')
        .select('*')
        .eq('event_type', 'auth.login.failure')
        .gte('created_at', new Date(Date.now() - timeWindow * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(10);

      if (!failedError && failedLoginEvents) {
        setFailedLogins(failedLoginEvents);
      }

      // Load active lockouts
      const { data: lockouts, error: lockoutsError } = await supabase
        .from('account_lockouts')
        .select('*')
        .eq('is_locked', true)
        .gt('locked_until', new Date().toISOString())
        .order('locked_at', { ascending: false });

      if (!lockoutsError && lockouts) {
        setActiveLockouts(lockouts);
        setMetrics(prev => ({ ...prev, activeLockouts: lockouts.length }));
      }

      // Load active sessions count
      const { data: sessionsData, error: sessionsError } = await supabase
        .rpc('get_session_stats', { p_time_window_hours: timeWindow });

      if (!sessionsError && sessionsData && sessionsData.length > 0) {
        setMetrics(prev => ({
          ...prev,
          activeSessions: parseInt(sessionsData[0].active_sessions) || 0,
        }));
      }

      // Load request signing stats (if available)
      const { data: signingStats, error: signingError } = await supabase
        .rpc('get_request_signing_stats', { p_time_window_hours: timeWindow });

      if (!signingError && signingStats && signingStats.length > 0) {
        setMetrics(prev => ({
          ...prev,
          replayAttempts: parseInt(signingStats[0].replay_attempts) || 0,
        }));
      }

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  const formatTimeAgo = (timestamp: string) => {
    const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return '#EF4444';
      case 'error': return '#F97316';
      case 'warning': return '#F59E0B';
      default: return textSecondaryColor;
    }
  };

  const getEventIcon = (eventType: string) => {
    if (eventType.includes('login')) return 'log-in';
    if (eventType.includes('logout')) return 'log-out';
    if (eventType.includes('lockout')) return 'lock-closed';
    if (eventType.includes('admin')) return 'shield';
    if (eventType.includes('suspicious')) return 'warning';
    if (eventType.includes('data')) return 'document';
    return 'information-circle';
  };

  // Show loading state while auth is loading
  if (authLoading) {
    return (
      <ThemedView style={[styles.container, { backgroundColor }]}>
        <View style={styles.loadingContainer}>
          <LoadingSpinner size={48} />
          <ThemedText style={[styles.loadingText, { color: textColor }]}>
            Loading Security Dashboard...
          </ThemedText>
        </View>
      </ThemedView>
    );
  }

  // Content component (shared between web and mobile)
  const DashboardContent = () => (
    <ScrollView
      style={styles.scrollView}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
        {/* Time Window Selector */}
        <View style={styles.timeWindowContainer}>
          <ThemedText style={[styles.sectionLabel, { color: textSecondaryColor }]}>
            Time Window:
          </ThemedText>
          <View style={styles.timeWindowButtons}>
            {[1, 6, 24, 168].map((hours) => (
              <TouchableOpacity
                key={hours}
                style={[
                  styles.timeWindowButton,
                  {
                    backgroundColor: timeWindow === hours ? accentPrimary : backgroundSecondary,
                  },
                ]}
                onPress={() => setTimeWindow(hours)}
              >
                <ThemedText
                  style={[
                    styles.timeWindowButtonText,
                    { color: timeWindow === hours ? '#FFFFFF' : textColor },
                  ]}
                >
                  {hours < 24 ? `${hours}h` : hours === 24 ? '24h' : '7d'}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Metrics Grid */}
        <View style={styles.metricsGrid}>
          <MetricCard
            icon="pulse"
            label="Total Events"
            value={metrics.totalEvents}
            color="#3B82F6"
            backgroundColor={backgroundSecondary}
            textColor={textColor}
            textSecondaryColor={textSecondaryColor}
          />
          <MetricCard
            icon="close-circle"
            label="Failed Logins"
            value={metrics.failedLogins}
            color="#F59E0B"
            backgroundColor={backgroundSecondary}
            textColor={textColor}
            textSecondaryColor={textSecondaryColor}
          />
          <MetricCard
            icon="lock-closed"
            label="Active Lockouts"
            value={metrics.activeLockouts}
            color="#EF4444"
            backgroundColor={backgroundSecondary}
            textColor={textColor}
            textSecondaryColor={textSecondaryColor}
          />
          <MetricCard
            icon="phone-portrait"
            label="Active Sessions"
            value={metrics.activeSessions}
            color="#10B981"
            backgroundColor={backgroundSecondary}
            textColor={textColor}
            textSecondaryColor={textSecondaryColor}
          />
        </View>

        {/* Active Lockouts Section */}
        {activeLockouts.length > 0 && (
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>
              🔒 Active Account Lockouts
            </ThemedText>
            {activeLockouts.map((lockout) => (
              <View
                key={lockout.id}
                style={[styles.eventCard, { backgroundColor: backgroundSecondary }]}
              >
                <View style={styles.eventHeader}>
                  <ThemedText style={[styles.eventTitle, { color: textColor }]}>
                    {lockout.user_email}
                  </ThemedText>
                  <View style={[styles.severityBadge, { backgroundColor: '#EF4444' }]}>
                    <ThemedText style={styles.severityText}>LOCKED</ThemedText>
                  </View>
                </View>
                <ThemedText style={[styles.eventDetail, { color: textSecondaryColor }]}>
                  Locked: {formatTimeAgo(lockout.locked_at)}
                </ThemedText>
                <ThemedText style={[styles.eventDetail, { color: textSecondaryColor }]}>
                  Until: {new Date(lockout.locked_until).toLocaleString()}
                </ThemedText>
                <ThemedText style={[styles.eventDetail, { color: textSecondaryColor }]}>
                  Failed Attempts: {lockout.failed_attempt_count}
                </ThemedText>
              </View>
            ))}
          </View>
        )}

        {/* Recent Failed Logins */}
        {failedLogins.length > 0 && (
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>
              ⚠️ Recent Failed Login Attempts
            </ThemedText>
            {failedLogins.slice(0, 5).map((event) => (
              <View
                key={event.id}
                style={[styles.eventCard, { backgroundColor: backgroundSecondary }]}
              >
                <View style={styles.eventHeader}>
                  <ThemedText style={[styles.eventTitle, { color: textColor }]}>
                    {event.user_email || 'Unknown'}
                  </ThemedText>
                  <ThemedText style={[styles.eventTime, { color: textSecondaryColor }]}>
                    {formatTimeAgo(event.created_at)}
                  </ThemedText>
                </View>
                {event.error_message && (
                  <ThemedText style={[styles.eventDetail, { color: textSecondaryColor }]}>
                    Error: {event.error_message}
                  </ThemedText>
                )}
                {event.ip_address && (
                  <ThemedText style={[styles.eventDetail, { color: textSecondaryColor }]}>
                    IP: {event.ip_address}
                  </ThemedText>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Recent Security Events */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>
            📋 Recent Security Events
          </ThemedText>
          {recentEvents.slice(0, 15).map((event) => (
            <View
              key={event.id}
              style={[styles.eventCard, { backgroundColor: backgroundSecondary }]}
            >
              <View style={styles.eventHeader}>
                <View style={styles.eventTitleRow}>
                  <Ionicons
                    name={getEventIcon(event.event_type) as any}
                    size={16}
                    color={getSeverityColor(event.severity)}
                  />
                  <ThemedText style={[styles.eventType, { color: textColor }]}>
                    {event.event_type.replace(/_/g, ' ').replace(/\./g, ' › ')}
                  </ThemedText>
                </View>
                <ThemedText style={[styles.eventTime, { color: textSecondaryColor }]}>
                  {formatTimeAgo(event.created_at)}
                </ThemedText>
              </View>

              {event.user_email && (
                <ThemedText style={[styles.eventDetail, { color: textSecondaryColor }]}>
                  User: {event.user_email}
                </ThemedText>
              )}

              {event.error_message && (
                <ThemedText style={[styles.eventDetail, { color: textSecondaryColor }]}>
                  {event.error_message}
                </ThemedText>
              )}

              <View style={styles.eventFooter}>
                <View style={[styles.severityBadge, { backgroundColor: getSeverityColor(event.severity) }]}>
                  <ThemedText style={styles.severityText}>
                    {event.severity.toUpperCase()}
                  </ThemedText>
                </View>
                {event.success !== null && (
                  <View style={[
                    styles.successBadge,
                    { backgroundColor: event.success ? '#10B981' : '#EF4444' }
                  ]}>
                    <ThemedText style={styles.successText}>
                      {event.success ? 'SUCCESS' : 'FAILED'}
                    </ThemedText>
                  </View>
                )}
              </View>
            </View>
          ))}
        </View>

        {/* Empty State */}
        {!isLoading && recentEvents.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="shield-checkmark" size={64} color={textSecondaryColor} />
            <ThemedText style={[styles.emptyText, { color: textSecondaryColor }]}>
              No security events in the last {timeWindow} hours
            </ThemedText>
            <ThemedText style={[styles.emptySubtext, { color: textSecondaryColor }]}>
              Your application is secure!
            </ThemedText>
          </View>
        )}
    </ScrollView>
  );

  // Web layout with sidebar
  if (Platform.OS === 'web') {
    return (
      <WebLayout
        title="Security Dashboard"
        subtitle="Real-time Security Monitoring"
        sidebar={<AdminSidebar activePage="security-dashboard" />}
      >
        <DashboardContent />
      </WebLayout>
    );
  }

  // Mobile layout
  return (
    <ThemedView style={[styles.container, { backgroundColor }]}>
      {/* Mobile Header */}
      <View style={[styles.header, { borderBottomColor: backgroundTertiary }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={textColor} />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Security Dashboard</ThemedText>
        <TouchableOpacity onPress={loadDashboardData} style={styles.refreshButton}>
          <Ionicons name="refresh" size={24} color={accentPrimary} />
        </TouchableOpacity>
      </View>
      
      <DashboardContent />
    </ThemedView>
  );
}

/**
 * Metric Card Component
 */
function MetricCard({
  icon,
  label,
  value,
  color,
  backgroundColor,
  textColor,
  textSecondaryColor,
}: {
  icon: string;
  label: string;
  value: number;
  color: string;
  backgroundColor: string;
  textColor: string;
  textSecondaryColor: string;
}) {
  return (
    <View style={[styles.metricCard, { backgroundColor }]}>
      <View style={[styles.metricIconContainer, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon as any} size={24} color={color} />
      </View>
      <ThemedText style={[styles.metricValue, { color: textColor }]}>
        {value.toLocaleString()}
      </ThemedText>
      <ThemedText style={[styles.metricLabel, { color: textSecondaryColor }]}>
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '500',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  refreshButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  timeWindowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  timeWindowButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  timeWindowButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  timeWindowButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: 12,
  },
  metricCard: {
    width: '48%',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  metricIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  eventCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  eventTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  eventTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  eventType: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  eventTime: {
    fontSize: 12,
    fontWeight: '500',
  },
  eventDetail: {
    fontSize: 13,
    marginBottom: 4,
  },
  eventFooter: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  severityText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  successBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  successText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
  },
});

