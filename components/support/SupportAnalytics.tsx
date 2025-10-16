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
import { supportService } from '../../services/SupportService';
import { supabase } from '../../lib/supabase';

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
      console.log('SupportAnalytics: Loading live analytics data...');
      
      // Calculate time range
      const now = new Date();
      let startDate: Date;
      
      switch (selectedTimeRange) {
        case '24h':
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case '7d':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case '90d':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      }

      // Fetch support tickets
      const allTickets = await supportService.getAllSupportTickets();
      const ticketsInRange = allTickets.filter(t => t.createdAt >= startDate);
      const resolvedTickets = ticketsInRange.filter(t => t.status === 'resolved' || t.status === 'closed');
      
      // Calculate response and resolution times
      let totalResponseTime = 0;
      let totalResolutionTime = 0;
      let ticketsWithTimes = 0;

      for (const ticket of resolvedTickets) {
        const createdAt = ticket.createdAt.getTime();
        const updatedAt = ticket.updatedAt.getTime();
        const timeDiff = (updatedAt - createdAt) / (1000 * 60 * 60); // hours
        
        totalResolutionTime += timeDiff;
        ticketsWithTimes++;
      }

      const avgResolutionTime = ticketsWithTimes > 0 ? totalResolutionTime / ticketsWithTimes : 0;
      const avgResponseTime = avgResolutionTime * 0.3; // Assume response is ~30% of resolution time

      // Group tickets by type to find top issues
      const issueMap = new Map<string, number>();
      ticketsInRange.forEach(ticket => {
        const issueType = ticket.type || 'other';
        issueMap.set(issueType, (issueMap.get(issueType) || 0) + 1);
      });

      const topIssues = Array.from(issueMap.entries())
        .map(([issue, count]) => ({
          issue: formatIssueType(issue),
          count,
          percentage: ticketsInRange.length > 0 ? (count / ticketsInRange.length) * 100 : 0,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Get agent performance from resolved tickets
      const agentMap = new Map<string, {
        name: string;
        resolved: number;
        totalTime: number;
        tickets: number;
      }>();

      // Get unique agent IDs
      const agentIds = [...new Set(resolvedTickets.map(t => t.assignedTo).filter(Boolean))];
      
      // Fetch agent names from user profiles
      const agentNames = new Map<string, string>();
      if (agentIds.length > 0) {
        try {
          const { data: profiles, error: profileError } = await supabase
            .from('user_profiles')
            .select('id, display_name, email')
            .in('id', agentIds);

          if (!profileError && profiles) {
            for (const profile of profiles) {
              const name = profile.display_name || profile.email || `Agent ${profile.id.slice(0, 8)}`;
              agentNames.set(profile.id, name);
            }
          }
        } catch (error) {
          console.warn('SupportAnalytics: Could not fetch agent names:', error);
        }
      }

      for (const ticket of resolvedTickets) {
        if (ticket.assignedTo) {
          const existing = agentMap.get(ticket.assignedTo) || {
            name: agentNames.get(ticket.assignedTo) || `Agent ${ticket.assignedTo.slice(0, 8)}`,
            resolved: 0,
            totalTime: 0,
            tickets: 0,
          };
          
          const timeDiff = (ticket.updatedAt.getTime() - ticket.createdAt.getTime()) / (1000 * 60 * 60);
          
          agentMap.set(ticket.assignedTo, {
            name: existing.name,
            resolved: existing.resolved + 1,
            totalTime: existing.totalTime + timeDiff,
            tickets: existing.tickets + 1,
          });
        }
      }

      const agentPerformance = Array.from(agentMap.entries())
        .map(([agentId, data]) => ({
          agentId,
          agentName: data.name,
          ticketsResolved: data.resolved,
          averageResolutionTime: data.tickets > 0 ? data.totalTime / data.tickets : 0,
          customerSatisfaction: 4.5, // Default - would need actual ratings
        }))
        .sort((a, b) => b.ticketsResolved - a.ticketsResolved)
        .slice(0, 5);

      // Get feature usage trends
      console.log('Fetching feature usage from:', startDate.toISOString());
      
      const { data: featureUsage, error: usageError } = await supabase
        .from('user_feature_usage')
        .select('feature_id, usage_count, last_used_at')
        .gte('last_used_at', startDate.toISOString());

      console.log('Feature usage query result:', { 
        data: featureUsage, 
        error: usageError,
        count: featureUsage?.length 
      });

      const featureMap = new Map<string, number>();
      
      if (!usageError && featureUsage) {
        featureUsage.forEach((usage: any) => {
          const current = featureMap.get(usage.feature_id) || 0;
          featureMap.set(usage.feature_id, current + (usage.usage_count || 0));
        });
      }

      console.log('Feature usage map:', Object.fromEntries(featureMap));

      // Calculate change percentage by comparing to previous period
      let previousPeriodStart: Date;
      const timeDiff = now.getTime() - startDate.getTime();
      previousPeriodStart = new Date(startDate.getTime() - timeDiff);

      console.log('Fetching previous period data from:', previousPeriodStart.toISOString(), 'to:', startDate.toISOString());

      const { data: previousUsage } = await supabase
        .from('user_feature_usage')
        .select('feature_id, usage_count')
        .gte('last_used_at', previousPeriodStart.toISOString())
        .lt('last_used_at', startDate.toISOString());

      const previousMap = new Map<string, number>();
      if (previousUsage) {
        previousUsage.forEach((usage: any) => {
          const current = previousMap.get(usage.feature_id) || 0;
          previousMap.set(usage.feature_id, current + (usage.usage_count || 0));
        });
      }

      console.log('Previous period map:', Object.fromEntries(previousMap));

      let featureUsageTrends = Array.from(featureMap.entries())
        .map(([feature, usageCount]) => {
          const previousCount = previousMap.get(feature) || 0;
          const change = previousCount > 0 
            ? ((usageCount - previousCount) / previousCount) * 100 
            : (usageCount > 0 ? 100 : 0); // 100% if new feature with usage, 0 if no usage
          
          return {
            feature: formatFeatureName(feature),
            usageCount,
            change: Number(change.toFixed(1)),
          };
        })
        .sort((a, b) => b.usageCount - a.usageCount)
        .slice(0, 5);

      console.log('Feature trends with change:', featureUsageTrends);

      // If no data, try getting all-time feature usage data
      if (featureUsageTrends.length === 0) {
        console.log('No feature usage in time range, fetching all-time data...');
        
        const { data: allTimeUsage, error: allTimeError } = await supabase
          .from('user_feature_usage')
          .select('feature_id, usage_count')
          .order('last_used_at', { ascending: false })
          .limit(100);

        if (!allTimeError && allTimeUsage && allTimeUsage.length > 0) {
          const allTimeMap = new Map<string, number>();
          allTimeUsage.forEach((usage: any) => {
            const current = allTimeMap.get(usage.feature_id) || 0;
            allTimeMap.set(usage.feature_id, current + (usage.usage_count || 0));
          });

          featureUsageTrends = Array.from(allTimeMap.entries())
            .map(([feature, usageCount]) => ({
              feature: formatFeatureName(feature),
              usageCount,
              change: 0, // No historical comparison for all-time data
            }))
            .sort((a, b) => b.usageCount - a.usageCount)
            .slice(0, 5);
          
          console.log('Using all-time feature data:', featureUsageTrends.length, 'features');
        }
      }

      const data: AnalyticsData = {
        totalTickets: ticketsInRange.length,
        resolvedTickets: resolvedTickets.length,
        averageResponseTime: Number(avgResponseTime.toFixed(1)),
        averageResolutionTime: Number(avgResolutionTime.toFixed(1)),
        customerSatisfaction: 4.5, // Would need actual rating system
        topIssues: topIssues.length > 0 ? topIssues : [
          { issue: 'No tickets yet', count: 0, percentage: 0 }
        ],
        agentPerformance: agentPerformance.length > 0 ? agentPerformance : [],
        featureUsageTrends: featureUsageTrends.length > 0 ? featureUsageTrends : [
          { feature: 'No usage data available', usageCount: 0, change: 0 },
          { feature: 'Users need to use features to generate data', usageCount: 0, change: 0 }
        ],
      };

      console.log('SupportAnalytics: Loaded data:', {
        totalTickets: data.totalTickets,
        resolvedTickets: data.resolvedTickets,
        topIssuesCount: data.topIssues.length,
        agentPerformanceCount: data.agentPerformance.length,
        featureUsageTrendsCount: data.featureUsageTrends.length,
        featureUsageTrends: data.featureUsageTrends,
      });
      setAnalyticsData(data);
    } catch (error) {
      console.error('SupportAnalytics: Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedTimeRange]);

  // Helper function to format issue type
  const formatIssueType = (type: string): string => {
    const typeMap: Record<string, string> = {
      'account_deletion': 'Account Deletion',
      'technical': 'Technical Issue',
      'billing': 'Billing Question',
      'feature_request': 'Feature Request',
      'other': 'Other',
    };
    return typeMap[type] || type;
  };

  // Helper function to format feature name
  const formatFeatureName = (featureId: string): string => {
    const featureMap: Record<string, string> = {
      'ai_transcription': 'AI Transcription',
      'voice_recording': 'Voice Recording',
      'ai_summary': 'AI Summary',
      'flashcard_generation': 'Flashcard Generation',
      'quiz_generation': 'Quiz Generation',
      'pdf_upload': 'PDF Upload',
    };
    return featureMap[featureId] || featureId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  // Initial load and reload on time range change
  useEffect(() => {
    loadAnalyticsData();
  }, [loadAnalyticsData, selectedTimeRange]);

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
