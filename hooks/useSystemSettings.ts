import { useState, useEffect, useCallback } from 'react';
import { SystemSettings, SystemSettingsService } from '../services/SystemSettingsService';

export function useSystemSettings() {
  if (__DEV__) console.log('useSystemSettings: Hook called');
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = useCallback(async (forceRefresh = false) => {
    try {
      setLoading(true);
      const systemSettingsService = SystemSettingsService.getInstance();
      const data = await systemSettingsService.getSettings(forceRefresh);
      setSettings(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch system settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);
  
  useEffect(() => {
    const service = SystemSettingsService.getInstance();
    const listener = () => {
      fetchSettings();
    };
    
    service.addListener(listener);
    return () => service.removeListener(listener);
  }, [fetchSettings]);

  const refresh = () => fetchSettings(true);

  return { settings, loading, error, refresh };
}
