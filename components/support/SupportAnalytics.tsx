import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useThemeColor } from '../../hooks/useThemeColor';

interface SupportAnalyticsProps {
  timeRange?: '24h' | '7d' | '30d' | '90d';
}

interface AnalyticsData {
  totalTickets: number;
  resolvedTickets: number;
  averageResponseTime: number;
  averageResolutionTime: number;
  customerSatisfaction: number;
  topIssues: Array<{
    issue: string;
    count: number;
    percentage: number;
  }>;
  agentPerformance: Array<{
    agentId: string;
    agentName: string;
    ticketsResolved: number;
    averageResolutionTime: number;
    customerSatisfaction: number;
  }>;
  featureUsageTrends: Array<{
    feature: string;
    usageCount: number;
    change: number; // percentage change
  }>;
}

export default function SupportAnalytics({ timeRange = '7d' }: SupportAnalyticsProps) {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTimeRange, setSelectedTimeRange] = useState(timeRange);

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

  // Load analytics data
  const loadAnalyticsData = useCallback(async () => {
    try {
      setLoading(true);
      
      // In a real implementation, you'd fetch analytics from the database
      // For now, we'll create mock data
      const mockData: AnalyticsData = {
        totalTickets: 156,
        resolvedTickets: 142,
        averageResponseTime: 2.3, // hours
        averageResolutionTime: 8.7, // hours
        customerSatisfaction: 4.6, // out of 5
        topIssues: [
          { issue: 'Feature Limit Reached', count: 45, percentage: 28.8 },
          { issue: 'Payment Processing', count: 32, percentage: 20.5 },
          { issue: 'Account Access', count: 28, percentage: 17.9 },
          { issue: 'Feature Not Working', count: 23, percentage: 14.7 },
          { issue: 'Billing Questions', count: 18, percentage: 11.5 },
        ],
        agentPerformance: [
          {
            agentId: 'agent1',
            agentName: 'Sarah Johnson',
            ticketsResolved: 38,
            averageResolutionTime: 6.2,
            customerSatisfaction: 4.8,
          },
          {
            agentId: 'agent2',
            agentName: 'Mike Chen',
            ticketsResolved: 35,
            averageResolutionTime: 7.1,
            customerSatisfaction: 4.6,
          },
          {
            agentId: 'agent3',
            agentName: 'Emily Rodriguez',
            ticketsResolved: 32,
            averageResolutionTime: 8.9,
            customerSatisfaction: 4.4,
          },
          {
            agentId: 'agent4',
            agentName: 'David Kim',
            ticketsResolved: 29,
            averageResolutionTime: 9.5,
            customerSatisfaction: 4.3,
          },
        ],
        featureUsageTrends: [
          { feature: 'AI Chat', usageCount: 1250, change: 12.5 },
          { feature: 'Document Editor', usageCount: 890, change: 8.2 },
          { feature: 'File Storage', usageCount: 650, change: -2.1 },
          { feature: 'Team Collaboration', usageCount: 420, change: 15.8 },
          { feature: 'Analytics Dashboard', usageCount: 310, change: 5.3 },
        ],
      };

      setAnalyticsData(mockData);
    } catch (error) {
      console.error('SupportAnalytics: Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadAnalyticsData();
  }, [loadAnalyticsData]);

  // Get time range label
  const getTimeRangeLabel = (range: string) => {
    switch (range) {
      case '24h':
        return 'Last 24 Hours';
      case '7d':
        return 'Last 7 Days';
      case '30d':
        return 'Last 30 Days';
      case '90d':
        return 'Last 90 Days';
      default:
        return 'Last 7 Days';
    }
  };

  // Get satisfaction color
  const getSatisfactionColor = (score: number) => {
    if (score >= 4.5) return accentSuccess;
    if (score >= 4.0) return accentWarning;
    return accentDanger;
  };

  // Get satisfaction icon
  const getSatisfactionIcon = (score: number) => {
    if (score >= 4.5) return 'happy-outline';
    if (score >= 4.0) return 'remove-outline';
    return 'sad-outline';
  };

  // Get change color
  const getChangeColor = (change: number) => {
    if (change > 0) return accentSuccess;
    if (change < 0) return accentDanger;
    return textSecondary;
  };

  // Get change icon
  const getChangeIcon = (change: number) => {
    if (change > 0) return 'trending-up';
    if (change < 0) return 'trending-down';
    return 'remove';
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor }]}>
        <ActivityIndicator size="large" color={accentPrimary} />
        <Text style={[styles.loadingText, { color: textSecondary }]}>Loading analytics...</Text>
      </View>
    );
  }

  if (!analyticsData) {
    return (
      <View style={[styles.errorContainer, { backgroundColor }]}>
        <Ionicons name="alert-circle" size={48} color={accentDanger} />
        <Text style={[styles.errorText, { color: accentDanger }]}>Failed to load analytics data</Text>
      </View>
    );
  }

  const resolutionRate = (analyticsData.resolvedTickets / analyticsData.totalTickets) * 100;

  return (
    <ScrollView style={[styles.container, { backgroundColor }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: backgroundSecondary, borderBottomColor: borderColor }]}>
        <View style={styles.headerLeft}>
          <Text style={[styles.title, { color: textColor }]}>Support Analytics</Text>
          <Text style={[styles.subtitle, { color: textSecondary }]}>
            {getTimeRangeLabel(selectedTimeRange)}
          </Text>
        </View>
        
        <View style={styles.timeRangeSelector}>
          {(['24h', '7d', '30d', '90d'] as const).map(range => (
            <TouchableOpacity
              key={range}
              style={[
                styles.timeRangeButton,
                { backgroundColor: selectedTimeRange === range ? accentPrimary : borderColor }
              ]}
              onPress={() => setSelectedTimeRange(range)}
            >
              <Text style={[
                styles.timeRangeButtonText,
                { color: selectedTimeRange === range ? 'white' : textColor }
              ]}>
                {range}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Key Metrics */}
      <View style={styles.metricsContainer}>
        <View style={[styles.metricCard, { backgroundColor: backgroundSecondary, borderColor: borderColor }]}>
          <View style={styles.metricHeader}>
            <Ionicons name="ticket" size={24} color={accentPrimary} />
            <Text style={[styles.metricLabel, { color: textSecondary }]}>Total Tickets</Text>
          </View>
          <Text style={[styles.metricValue, { color: textColor }]}>{analyticsData.totalTickets}</Text>
          <Text style={[styles.metricSubtext, { color: textSecondary }]}>
            {analyticsData.resolvedTickets} resolved
          </Text>
        </View>

        <View style={[styles.metricCard, { backgroundColor: backgroundSecondary, borderColor: borderColor }]}>
          <View style={styles.metricHeader}>
            <Ionicons name="checkmark-circle" size={24} color={accentSuccess} />
            <Text style={[styles.metricLabel, { color: textSecondary }]}>Resolution Rate</Text>
          </View>
          <Text style={[styles.metricValue, { color: textColor }]}>{resolutionRate.toFixed(1)}%</Text>
          <Text style={[styles.metricSubtext, { color: textSecondary }]}>
            {analyticsData.resolvedTickets}/{analyticsData.totalTickets}
          </Text>
        </View>

        <View style={[styles.metricCard, { backgroundColor: backgroundSecondary, borderColor: borderColor }]}>
          <View style={styles.metricHeader}>
            <Ionicons name="time" size={24} color={accentWarning} />
            <Text style={[styles.metricLabel, { color: textSecondary }]}>Avg Response</Text>
          </View>
          <Text style={[styles.metricValue, { color: textColor }]}>{analyticsData.averageResponseTime}h</Text>
          <Text style={[styles.metricSubtext, { color: textSecondary }]}>Response time</Text>
        </View>

        <View style={[styles.metricCard, { backgroundColor: backgroundSecondary, borderColor: borderColor }]}>
          <View style={styles.metricHeader}>
            <Ionicons name="stopwatch" size={24} color={accentDanger} />
            <Text style={[styles.metricLabel, { color: textSecondary }]}>Avg Resolution</Text>
          </View>
          <Text style={[styles.metricValue, { color: textColor }]}>{analyticsData.averageResolutionTime}h</Text>
          <Text style={[styles.metricSubtext, { color: textSecondary }]}>Resolution time</Text>
        </View>
      </View>

      {/* Customer Satisfaction */}
      <View style={[styles.section, { backgroundColor: backgroundSecondary, borderColor: borderColor }]}>
        <Text style={[styles.sectionTitle, { color: textColor }]}>Customer Satisfaction</Text>
        <View style={styles.satisfactionContainer}>
          <View style={styles.satisfactionScore}>
            <Text style={[styles.satisfactionNumber, { color: textColor }]}>
              {analyticsData.customerSatisfaction}
            </Text>
            <Text style={[styles.satisfactionOutOf, { color: textSecondary }]}>/ 5.0</Text>
          </View>
          <View style={styles.satisfactionDetails}>
            <View style={styles.satisfactionIcon}>
              <Ionicons
                name={getSatisfactionIcon(analyticsData.customerSatisfaction)}
                size={32}
                color={getSatisfactionColor(analyticsData.customerSatisfaction)}
              />
            </View>
            <Text style={[styles.satisfactionLabel, { color: textColor }]}>
              {analyticsData.customerSatisfaction >= 4.5 ? 'Excellent' :
               analyticsData.customerSatisfaction >= 4.0 ? 'Good' : 'Needs Improvement'}
            </Text>
          </View>
        </View>
      </View>

      {/* Top Issues */}
      <View style={[styles.section, { backgroundColor: backgroundSecondary, borderColor: borderColor }]}>
        <Text style={[styles.sectionTitle, { color: textColor }]}>Top Support Issues</Text>
        <View style={styles.issuesList}>
          {analyticsData.topIssues.map((issue, index) => (
            <View key={index} style={[styles.issueItem, { borderBottomColor: borderColor }]}>
              <View style={styles.issueRank}>
                <Text style={[styles.issueRankText, { color: textSecondary }]}>#{index + 1}</Text>
              </View>
              <View style={styles.issueInfo}>
                <Text style={[styles.issueName, { color: textColor }]}>{issue.issue}</Text>
                <Text style={[styles.issueCount, { color: textSecondary }]}>{issue.count} tickets</Text>
              </View>
              <View style={styles.issuePercentage}>
                <Text style={[styles.issuePercentageText, { color: accentPrimary }]}>{issue.percentage}%</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Agent Performance */}
      <View style={[styles.section, { backgroundColor: backgroundSecondary, borderColor: borderColor }]}>
        <Text style={[styles.sectionTitle, { color: textColor }]}>Agent Performance</Text>
        <View style={styles.agentsList}>
          {analyticsData.agentPerformance.map((agent, index) => (
            <View key={agent.agentId} style={[styles.agentItem, { backgroundColor }]}>
              <View style={styles.agentHeader}>
                <View style={styles.agentRank}>
                  <Text style={[styles.agentRankText, { color: textSecondary }]}>#{index + 1}</Text>
                </View>
                <Text style={[styles.agentName, { color: textColor }]}>{agent.agentName}</Text>
              </View>
              
              <View style={styles.agentStats}>
                <View style={styles.agentStat}>
                  <Text style={[styles.agentStatLabel, { color: textSecondary }]}>Tickets</Text>
                  <Text style={[styles.agentStatValue, { color: textColor }]}>{agent.ticketsResolved}</Text>
                </View>
                
                <View style={styles.agentStat}>
                  <Text style={[styles.agentStatLabel, { color: textSecondary }]}>Avg Time</Text>
                  <Text style={[styles.agentStatValue, { color: textColor }]}>{agent.averageResolutionTime}h</Text>
                </View>
                
                <View style={styles.agentStat}>
                  <Text style={[styles.agentStatLabel, { color: textSecondary }]}>Satisfaction</Text>
                  <View style={styles.agentSatisfaction}>
                    <Ionicons
                      name={getSatisfactionIcon(agent.customerSatisfaction)}
                      size={16}
                      color={getSatisfactionColor(agent.customerSatisfaction)}
                    />
                    <Text style={[styles.agentSatisfactionText, { color: textColor }]}>
                      {agent.customerSatisfaction}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Feature Usage Trends */}
      <View style={[styles.section, { backgroundColor: backgroundSecondary, borderColor: borderColor }]}>
        <Text style={[styles.sectionTitle, { color: textColor }]}>Feature Usage Trends</Text>
        <View style={styles.trendsList}>
          {analyticsData.featureUsageTrends.map((trend, index) => (
            <View key={index} style={[styles.trendItem, { borderBottomColor: borderColor }]}>
              <View style={styles.trendInfo}>
                <Text style={[styles.trendFeature, { color: textColor }]}>{trend.feature}</Text>
                <Text style={[styles.trendUsage, { color: textSecondary }]}>{trend.usageCount.toLocaleString()} uses</Text>
              </View>
              
              <View style={styles.trendChange}>
                <Ionicons
                  name={getChangeIcon(trend.change)}
                  size={16}
                  color={getChangeColor(trend.change)}
                />
                <Text style={[
                  styles.trendChangeText,
                  { color: getChangeColor(trend.change) }
                ]}>
                  {trend.change > 0 ? '+' : ''}{trend.change}%
                </Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Export Button */}
      <View style={styles.exportContainer}>
        <TouchableOpacity style={[styles.exportButton, { backgroundColor: accentPrimary }]}>
          <Ionicons name="download" size={20} color="white" />
          <Text style={styles.exportButtonText}>Export Report</Text>
        </TouchableOpacity>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
  },
  headerLeft: {
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  timeRangeSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  timeRangeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    minWidth: 40,
    alignItems: 'center',
  },
  timeRangeButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  metricsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 20,
    gap: 12,
  },
  metricCard: {
    width: (Dimensions.get('window').width - 64) / 2,
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
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  metricValue: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  metricSubtext: {
    fontSize: 12,
    marginTop: 4,
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  satisfactionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  satisfactionScore: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  satisfactionNumber: {
    fontSize: 48,
    fontWeight: 'bold',
  },
  satisfactionOutOf: {
    fontSize: 20,
    marginLeft: 4,
  },
  satisfactionDetails: {
    alignItems: 'center',
  },
  satisfactionIcon: {
    marginBottom: 8,
  },
  satisfactionLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  issuesList: {
    gap: 12,
  },
  issueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  issueRank: {
    width: 40,
    alignItems: 'center',
  },
  issueRankText: {
    fontSize: 14,
    fontWeight: '600',
  },
  issueInfo: {
    flex: 1,
    marginLeft: 12,
  },
  issueName: {
    fontSize: 14,
    fontWeight: '500',
  },
  issueCount: {
    fontSize: 12,
    marginTop: 2,
  },
  issuePercentage: {
    alignItems: 'flex-end',
  },
  issuePercentageText: {
    fontSize: 14,
    fontWeight: '600',
  },
  agentsList: {
    gap: 16,
  },
  agentItem: {
    padding: 16,
    borderRadius: 8,
  },
  agentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  agentRank: {
    width: 32,
    alignItems: 'center',
    marginRight: 12,
  },
  agentRankText: {
    fontSize: 14,
    fontWeight: '600',
  },
  agentName: {
    fontSize: 16,
    fontWeight: '600',
  },
  agentStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  agentStat: {
    alignItems: 'center',
  },
  agentStatLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  agentStatValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  agentSatisfaction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  agentSatisfactionText: {
    fontSize: 16,
    fontWeight: '600',
  },
  trendsList: {
    gap: 12,
  },
  trendItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  trendInfo: {
    flex: 1,
  },
  trendFeature: {
    fontSize: 14,
    fontWeight: '500',
  },
  trendUsage: {
    fontSize: 12,
    marginTop: 2,
  },
  trendChange: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trendChangeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  exportContainer: {
    padding: 20,
    alignItems: 'center',
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  exportButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
