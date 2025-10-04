import { supabase } from '@/lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

export class RealTimeFeatureService {
  private channels: Map<string, RealtimeChannel> = new Map();
  private listeners: Map<string, Set<() => void>> = new Map();

  /**
   * Subscribe to feature flag changes
   */
  async subscribeToFeatureChanges(onUpdate: () => void): Promise<void> {
    const channel = supabase
      .channel('feature-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'feature_flags'
      }, (payload) => {
        console.log('RealTimeFeatureService: Feature flag change detected:', payload);
        onUpdate();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'feature_limits'
      }, (payload) => {
        console.log('RealTimeFeatureService: Feature limit change detected:', payload);
        onUpdate();
      })
      .subscribe();

    this.channels.set('feature-changes', channel);
  }

  /**
   * Subscribe to specific feature flag changes
   */
  async subscribeToFeatureFlag(flagId: string, onUpdate: (payload: any) => void): Promise<void> {
    const channel = supabase
      .channel(`feature-flag-${flagId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'feature_flags',
        filter: `id=eq.${flagId}`
      }, (payload) => {
        console.log(`RealTimeFeatureService: Feature flag ${flagId} change:`, payload);
        onUpdate(payload);
      })
      .subscribe();

    this.channels.set(`feature-flag-${flagId}`, channel);
  }

  /**
   * Subscribe to specific feature limit changes
   */
  async subscribeToFeatureLimit(limitId: string, onUpdate: (payload: any) => void): Promise<void> {
    const channel = supabase
      .channel(`feature-limit-${limitId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'feature_limits',
        filter: `feature_id=eq.${limitId}`
      }, (payload) => {
        console.log(`RealTimeFeatureService: Feature limit ${limitId} change:`, payload);
        onUpdate(payload);
      })
      .subscribe();

    this.channels.set(`feature-limit-${limitId}`, channel);
  }

  /**
   * Subscribe to user feature usage changes
   */
  async subscribeToUserFeatureUsage(userId: string, onUpdate: (payload: any) => void): Promise<void> {
    const channel = supabase
      .channel(`user-feature-usage-${userId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'user_feature_usage',
        filter: `user_id=eq.${userId}`
      }, (payload) => {
        console.log(`RealTimeFeatureService: User ${userId} feature usage change:`, payload);
        onUpdate(payload);
      })
      .subscribe();

    this.channels.set(`user-feature-usage-${userId}`, channel);
  }

  /**
   * Subscribe to feature usage history changes
   */


  /**
   * Add a listener for a specific event type
   */
  addListener(eventType: string, callback: () => void): void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(callback);
  }

  /**
   * Remove a listener for a specific event type
   */
  removeListener(eventType: string, callback: () => void): void {
    const listeners = this.listeners.get(eventType);
    if (listeners) {
      listeners.delete(callback);
      if (listeners.size === 0) {
        this.listeners.delete(eventType);
      }
    }
  }

  /**
   * Notify all listeners for a specific event type
   */
  private notifyListeners(eventType: string): void {
    const listeners = this.listeners.get(eventType);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback();
        } catch (error) {
          console.error('RealTimeFeatureService: Error in listener callback:', error);
        }
      });
    }
  }

  /**
   * Unsubscribe from all channels
   */
  async unsubscribe(): Promise<void> {
    console.log('RealTimeFeatureService: Unsubscribing from all channels...');
    
    for (const [key, channel] of this.channels) {
      try {
        await supabase.removeChannel(channel);
        console.log(`RealTimeFeatureService: Unsubscribed from ${key}`);
      } catch (error) {
        console.error(`RealTimeFeatureService: Error unsubscribing from ${key}:`, error);
      }
    }
    
    this.channels.clear();
    this.listeners.clear();
  }

  /**
   * Unsubscribe from a specific channel
   */
  async unsubscribeFromChannel(channelKey: string): Promise<void> {
    const channel = this.channels.get(channelKey);
    if (channel) {
      try {
        await supabase.removeChannel(channel);
        this.channels.delete(channelKey);
        console.log(`RealTimeFeatureService: Unsubscribed from ${channelKey}`);
      } catch (error) {
        console.error(`RealTimeFeatureService: Error unsubscribing from ${channelKey}:`, error);
      }
    }
  }

  /**
   * Get all active channel keys
   */
  getActiveChannels(): string[] {
    return Array.from(this.channels.keys());
  }

  /**
   * Check if a channel is active
   */
  isChannelActive(channelKey: string): boolean {
    return this.channels.has(channelKey);
  }

  /**
   * Get channel status
   */
  getChannelStatus(): { active: number; total: number } {
    return {
      active: this.channels.size,
      total: this.channels.size,
    };
  }
}

// Export singleton instance
export const realTimeFeatureService = new RealTimeFeatureService(); 