import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useThemeColor } from '../../hooks/useThemeColor';
import { supportService } from '../../services/SupportService';

interface RealTimeMonitoringProps {
  onUserSelect?: (userId: string) => void;
}

export default function RealTimeMonitoring({ onUserSelect }: RealTimeMonitoringProps) {
  const [realTimeData, setRealTimeData] = useState<any>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Theme colors
  const backgroundColor = useThemeColor({}, 'background');
  const backgroundSecondary = useThemeColor({}, 'backgroundSecondary');
  const textColor = useThemeColor({}, 'text');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const accentPrimary = useThemeColor({}, 'accentPrimary');
  const accentSuccess = useThemeColor({}, 'accentSuccess');
  const accentWarning = useThemeColor({}, 'accentWarning');
  const accentDanger = useThemeColor({}, 'accentDanger');
  const borderColor = useThemeColor({}, 'border');

  // Load real-time data
  const loadRealTimeData = useCallback(async () => {
    try {
      setLoading(true);
      const [usageData, alertsData] = await Promise.all([
        supportService.getRealTimeUsageData(),
        supportService.getUsageAlerts(),
      ]);
      
      setRealTimeData(usageData);
      setAlerts(alertsData);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('RealTimeMonitoring: Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Refresh data
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadRealTimeData();
    setRefreshing(false);
  }, [loadRealTimeData]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      loadRealTimeData();
    }, 30000);

    return () => clearInterval(interval);
  }, [autoRefresh, loadRealTimeData]);

  // Initial load
  useEffect(() => {
    loadRealTimeData();
  }, [loadRealTimeData]);

  // Get severity color
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return accentDanger;
      case 'medium':
        return accentWarning;
      case 'low':
        return accentSuccess;
      default:
        return textSecondary;
    }
  };

  // Get severity icon
  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'warning';
      case 'medium':
        return 'information-circle';
      case 'low':
        return 'checkmark-circle';
      default:
        return 'ellipse';
    }
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor }]}>
        <ActivityIndicator size="large" color={accentPrimary} />
        <Text style={[styles.loadingText, { color: textSecondary }]}>Loading real-time data...</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor }]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <View style={[styles.header, { backgroundColor: backgroundSecondary, borderBottomColor: borderColor }]}>
        <View style={styles.headerLeft}>
          <Text style={[styles.title, { color: textColor }]}>Real-Time Monitoring</Text>
          <Text style={[styles.subtitle, { color: textSecondary }]}>
            Last updated: {lastUpdate.toLocaleTimeString()}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.autoRefreshButton, { backgroundColor: autoRefresh ? accentSuccess : textSecondary }]}
          onPress={() => setAutoRefresh(!autoRefresh)}
        >
          <Ionicons 
            name={autoRefresh ? 'refresh' : 'refresh-outline'} 
            size={20} 
            color="white" 
          />
        </TouchableOpacity>
      </View>

      {/* Overview Stats */}
      <View style={styles.statsContainer}>
        <View style={[styles.statCard, { backgroundColor: backgroundSecondary, borderColor: borderColor }]}>
          <Text style={[styles.statNumber, { color: textColor }]}>{realTimeData?.activeUsers || 0}</Text>
          <Text style={[styles.statLabel, { color: textSecondary }]}>Active Users (24h)</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: backgroundSecondary, borderColor: borderColor }]}>
          <Text style={[styles.statNumber, { color: textColor }]}>{alerts.length}</Text>
          <Text style={[styles.statLabel, { color: textSecondary }]}>Active Alerts</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: backgroundSecondary, borderColor: borderColor }]}>
          <Text style={[styles.statNumber, { color: textColor }]}>
            {Object.keys(realTimeData?.totalUsage || {}).length}
          </Text>
          <Text style={[styles.statLabel, { color: textSecondary }]}>Features Used</Text>
        </View>
      </View>

      {/* Alerts Section */}
      <View style={[styles.section, { backgroundColor: backgroundSecondary, borderColor: borderColor }]}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>Live Alerts</Text>
          <Text style={[styles.alertCount, { backgroundColor: backgroundSecondary, color: textSecondary }]}>{alerts.length} alerts</Text>
        </View>
        
        {alerts.length === 0 ? (
          <View style={styles.noAlerts}>
            <Ionicons name="checkmark-circle" size={48} color={accentSuccess} />
            <Text style={[styles.noAlertsText, { color: textColor }]}>No active alerts</Text>
            <Text style={[styles.noAlertsSubtext, { color: textSecondary }]}>All systems are running smoothly</Text>
          </View>
        ) : (
          <View style={styles.alertsList}>
            {alerts.map((alert, index) => (
              <View key={alert.id || index} style={[styles.alertItem, { backgroundColor, borderLeftColor: getSeverityColor(alert.severity) }]}>
                <View style={styles.alertHeader}>
                  <View style={styles.alertType}>
                    <Ionicons 
                      name={getSeverityIcon(alert.severity)} 
                      size={16} 
                      color={getSeverityColor(alert.severity)} 
                    />
                    <Text style={[styles.alertSeverity, { color: getSeverityColor(alert.severity) }]}>
                      {alert.severity.toUpperCase()}
                    </Text>
                  </View>
                  <Text style={[styles.alertTime, { color: textSecondary }]}>
                    {new Date(alert.timestamp).toLocaleTimeString()}
                  </Text>
                </View>
                
                <Text style={[styles.alertMessage, { color: textColor }]}>{alert.message}</Text>
                
                <View style={styles.alertDetails}>
                  <Text style={[styles.alertUser, { color: textSecondary }]}>User: {alert.userEmail}</Text>
                  <Text style={[styles.alertFeature, { color: textSecondary }]}>Feature: {alert.featureId}</Text>
                </View>

                {onUserSelect && (
                  <TouchableOpacity
                    style={[styles.viewUserButton, { backgroundColor: accentPrimary }]}
                    onPress={() => onUserSelect(alert.userId)}
                  >
                    <Text style={styles.viewUserButtonText}>View User</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Recent Activity */}
      <View style={[styles.section, { backgroundColor: backgroundSecondary, borderColor: borderColor }]}>
        <Text style={[styles.sectionTitle, { color: textColor }]}>Recent Activity (Last Hour)</Text>
        
        {realTimeData?.recentActivity?.length === 0 ? (
          <View style={styles.noActivity}>
            <Ionicons name="time-outline" size={48} color={textSecondary} />
            <Text style={[styles.noActivityText, { color: textSecondary }]}>No recent activity</Text>
          </View>
        ) : (
          <View style={styles.activityList}>
            {realTimeData?.recentActivity?.slice(0, 10).map((activity: any, index: number) => (
              <View key={index} style={[styles.activityItem, { backgroundColor }]}>
                <View style={styles.activityHeader}>
                  <Text style={[styles.activityUser, { color: textColor }]}>{activity.userEmail}</Text>
                  <Text style={[styles.activityTime, { color: textSecondary }]}>
                    {new Date(activity.timestamp).toLocaleTimeString()}
                  </Text>
                </View>
                
                <View style={styles.activityDetails}>
                  <Text style={[styles.activityFeature, { color: textSecondary }]}>{activity.featureId}</Text>
                  <Text style={[styles.activityAction, { color: textSecondary }]}>{activity.action}</Text>
                  <Text style={[styles.activityUsage, { color: textSecondary }]}>Usage: {activity.usageCount}</Text>
                </View>

                {onUserSelect && (
                  <TouchableOpacity
                    style={[styles.viewUserButton, { backgroundColor: accentPrimary }]}
                    onPress={() => onUserSelect(activity.userId)}
                  >
                    <Text style={styles.viewUserButtonText}>View User</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Usage Summary */}
      <View style={[styles.section, { backgroundColor: backgroundSecondary, borderColor: borderColor }]}>
        <Text style={[styles.sectionTitle, { color: textColor }]}>Feature Usage Summary</Text>
        
        {Object.keys(realTimeData?.totalUsage || {}).length === 0 ? (
          <Text style={[styles.noDataText, { color: textSecondary }]}>No usage data available</Text>
        ) : (
          <View style={styles.usageList}>
            {Object.entries(realTimeData?.totalUsage || {}).map(([featureId, usage]) => (
              <View key={featureId} style={[styles.usageItem, { borderBottomColor: borderColor }]}>
                <Text style={[styles.usageFeature, { color: textColor }]}>{featureId}</Text>
                <Text style={[styles.usageCount, { color: accentPrimary }]}>{usage as number} uses</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
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
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  autoRefreshButton: {
    padding: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  section: {
    margin: 20,
    marginTop: 0,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  alertCount: {
    fontSize: 14,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  noAlerts: {
    alignItems: 'center',
    padding: 32,
  },
  noAlertsText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
  },
  noAlertsSubtext: {
    fontSize: 14,
    marginTop: 4,
  },
  alertsList: {
    gap: 16,
  },
  alertItem: {
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  alertType: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  alertSeverity: {
    fontSize: 12,
    fontWeight: '600',
  },
  alertTime: {
    fontSize: 12,
  },
  alertMessage: {
    fontSize: 14,
    marginBottom: 8,
  },
  alertDetails: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  alertUser: {
    fontSize: 12,
  },
  alertFeature: {
    fontSize: 12,
  },
  viewUserButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  viewUserButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  noActivity: {
    alignItems: 'center',
    padding: 32,
  },
  noActivityText: {
    fontSize: 16,
    marginTop: 12,
  },
  activityList: {
    gap: 12,
  },
  activityItem: {
    padding: 16,
    borderRadius: 8,
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  activityUser: {
    fontSize: 14,
    fontWeight: '600',
  },
  activityTime: {
    fontSize: 12,
  },
  activityDetails: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  activityFeature: {
    fontSize: 12,
  },
  activityAction: {
    fontSize: 12,
  },
  activityUsage: {
    fontSize: 12,
  },
  noDataText: {
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  usageList: {
    gap: 8,
  },
  usageItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  usageFeature: {
    fontSize: 14,
  },
  usageCount: {
    fontSize: 14,
    fontWeight: '600',
  },
});
