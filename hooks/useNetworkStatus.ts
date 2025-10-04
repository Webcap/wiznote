import NetInfo from '@react-native-community/netinfo';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { saveManagerService } from '../services/SaveManagerService';

export interface NetworkStatus {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  type: string | null;
  isOnline: boolean;
}

export const useNetworkStatus = () => {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
    isConnected: true,
    isInternetReachable: true,
    type: null,
    isOnline: true,
  });

  useEffect(() => {
    // Get initial network status
    const getInitialStatus = async () => {
      try {
        const state = await NetInfo.fetch();
        const newStatus: NetworkStatus = {
          isConnected: state.isConnected ?? true,
          isInternetReachable: state.isInternetReachable,
          type: state.type,
          isOnline: (state.isConnected && state.isInternetReachable) ?? true,
        };
        
        setNetworkStatus(newStatus);
        saveManagerService.setOnlineStatus(newStatus.isOnline);
      } catch (error) {
        console.error('Error getting initial network status:', error);
      }
    };

    getInitialStatus();

    // Subscribe to network status changes
    const unsubscribe = NetInfo.addEventListener((state) => {
      const newStatus: NetworkStatus = {
        isConnected: state.isConnected ?? true,
        isInternetReachable: state.isInternetReachable,
        type: state.type,
        isOnline: (state.isConnected && state.isInternetReachable) ?? true,
      };

      setNetworkStatus(newStatus);
      saveManagerService.setOnlineStatus(newStatus.isOnline);

      console.log('Network status changed:', {
        isConnected: newStatus.isConnected,
        isInternetReachable: newStatus.isInternetReachable,
        isOnline: newStatus.isOnline,
        type: newStatus.type,
      });
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // For web, also monitor online/offline events
  useEffect(() => {
    if (Platform.OS === 'web') {
      const handleOnline = () => {
        setNetworkStatus(prev => ({ ...prev, isOnline: true }));
        saveManagerService.setOnlineStatus(true);
      };

      const handleOffline = () => {
        setNetworkStatus(prev => ({ ...prev, isOnline: false }));
        saveManagerService.setOnlineStatus(false);
      };

      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
  }, []);

  return networkStatus;
}; 