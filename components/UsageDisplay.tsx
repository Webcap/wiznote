import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useThemeColor } from '../hooks/useThemeColor';
import { useUsageTracking } from '../hooks/useUsageTracking';
import { ThemedText } from './ThemedText';

interface UsageDisplayProps {
  featureId: string;
  period?: 'daily' | 'weekly' | 'monthly';
  showIcon?: boolean;
  compact?: boolean;
}

export function UsageDisplay({ 
  featureId, 
  period = 'monthly', 
  showIcon = true, 
  compact = false 
}: UsageDisplayProps) {
  const { usage, isLoading, error, checkCanUse } = useUsageTracking(featureId, period);
  const [remainingUses, setRemainingUses] = useState<number | null>(null);
  
  const textColor = useThemeColor({}, 'text');
  const mutedTextColor = useThemeColor({}, 'textSecondary');
  const accentColor = useThemeColor({}, 'accentPrimary');

  // Get remaining uses when usage data is available
  useEffect(() => {
    const getRemainingUses = async () => {
      if (usage) {
        try {
                     // Get limit information from checkCanUse but don't use it for the canUse decision
           const currentUsage = usage.currentPeriod.totalUsage || 0;
           
           try {
             const canUseResult = await checkCanUse(0); // Check for 0 to get limit info without affecting usage
             const limit = canUseResult.limit;
             
             console.log(`UsageDisplay Debug - Feature: ${featureId}, CurrentUsage: ${currentUsage}, Limit: ${limit}, Types: ${typeof currentUsage}, ${typeof limit}`);
             
             if (limit === 'unlimited') {
               setRemainingUses(-1); // -1 for unlimited
             } else if (typeof limit === 'number' && typeof currentUsage === 'number') {
               const remaining = Math.max(0, limit - currentUsage);
               console.log(`UsageDisplay Debug - Calculated remaining: ${remaining}`);
               setRemainingUses(remaining);
             } else {
               // Fallback if we can't calculate properly
               console.log(`UsageDisplay Debug - Using fallback, limit: ${limit}, currentUsage: ${currentUsage}`);
               setRemainingUses(0);
             }
           } catch (error) {
             console.error('Error getting limit info:', error);
             setRemainingUses(0);
           }
        } catch (error) {
          console.error('Error getting remaining uses:', error);
          setRemainingUses(null);
        }
      }
    };

         getRemainingUses();
   }, [usage, checkCanUse]);

  // If there's an error, don't render anything to prevent breaking the page
  if (error) {
    console.warn('UsageDisplay: Error loading usage data:', error);
    return null;
  }

  if (isLoading) {
    return (
      <View style={[styles.container, compact && styles.compactContainer]}>
        <ThemedText style={[styles.loadingText, { color: mutedTextColor }]}>
          Loading usage...
        </ThemedText>
      </View>
    );
  }

  if (!usage) {
    return null;
  }

  const formatDuration = (seconds: number) => {
    // For count-based features, treat seconds as count
    const isCountBasedFeature = featureId === 'ai_name_generating' || featureId === 'ai_summaries' || featureId === 'ai_key_details';
    if (isCountBasedFeature) {
      return `${seconds} uses`;
    }
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  const getFeatureDisplayName = (id: string) => {
    switch (id) {
      case 'voice_recording':
        return 'Voice Recording';
      case 'ai_transcription':
        return 'AI Transcription';
      case 'ai_summaries':
        return 'AI Summaries';
      case 'ai_key_details':
        return 'AI Key Details';
      case 'ai_name_generating':
        return 'AI Name Generation';
      default:
        return id.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  };

  const getPeriodDisplayName = (p: string) => {
    switch (p) {
      case 'daily':
        return 'today';
      case 'weekly':
        return 'this week';
      case 'monthly':
        return 'this month';
      default:
        return p;
    }
  };

  const totalUsage = usage.currentPeriod.totalUsage;

  return (
    <View style={[styles.container, compact && styles.compactContainer]}>
      {showIcon && (
        <Ionicons 
          name="time-outline" 
          size={compact ? 14 : 16} 
          color={mutedTextColor} 
          style={styles.icon}
        />
      )}
      <View style={styles.content}>
        <ThemedText style={[styles.featureName, { color: textColor }]}>
          {getFeatureDisplayName(featureId)}
        </ThemedText>
        <ThemedText style={[styles.usageText, { color: mutedTextColor }]}>
          {formatDuration(totalUsage)} used {getPeriodDisplayName(period)}
          {remainingUses !== null && remainingUses !== undefined && (
            <ThemedText style={[styles.remainingText, { color: accentColor }]}>
              {' • '}{remainingUses === -1 ? 'Unlimited' : remainingUses === 0 ? 'No remaining uses' : `${remainingUses} remaining`}
            </ThemedText>
          )}
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  compactContainer: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  icon: {
    marginRight: 8,
  },
  content: {
    flex: 1,
  },
  featureName: {
    fontSize: 14,
    fontWeight: '600',
  },
  usageText: {
    fontSize: 12,
    marginTop: 2,
  },
  remainingText: {
    fontSize: 12,
    fontWeight: '600',
  },
  loadingText: {
    fontSize: 12,
    fontStyle: 'italic',
  },
}); 