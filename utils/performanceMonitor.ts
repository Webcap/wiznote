/**
 * Performance Monitoring Utility
 * 
 * Tracks load times, API response times, and user interactions
 */

import { Platform } from 'react-native';

interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

interface APIMetric {
  endpoint: string;
  method: string;
  duration: number;
  statusCode?: number;
  error?: boolean;
  timestamp: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private apiMetrics: APIMetric[] = [];
  private readonly MAX_METRICS = 100; // Keep last 100 metrics
  private readonly MAX_API_METRICS = 100; // Keep last 100 API metrics

  /**
   * Start a performance measurement
   */
  startMeasure(name: string): () => void {
    const startTime = performance.now();
    
    return () => {
      const duration = performance.now() - startTime;
      this.recordMetric(name, duration);
    };
  }

  /**
   * Record a performance metric
   */
  recordMetric(name: string, duration: number, metadata?: Record<string, any>): void {
    const metric: PerformanceMetric = {
      name,
      duration,
      timestamp: Date.now(),
      metadata,
    };

    this.metrics.push(metric);
    
    // Keep only last N metrics
    if (this.metrics.length > this.MAX_METRICS) {
      this.metrics.shift();
    }

    // Log in development
    if (__DEV__) {
      console.log(`[Performance] ${name}: ${duration.toFixed(2)}ms`, metadata || '');
    }
  }

  /**
   * Record an API call metric
   */
  recordAPICall(
    endpoint: string,
    method: string,
    duration: number,
    statusCode?: number,
    error?: boolean
  ): void {
    const metric: APIMetric = {
      endpoint,
      method,
      duration,
      statusCode,
      error: error || false,
      timestamp: Date.now(),
    };

    this.apiMetrics.push(metric);
    
    // Keep only last N metrics
    if (this.apiMetrics.length > this.MAX_API_METRICS) {
      this.apiMetrics.shift();
    }

    // Log in development
    if (__DEV__) {
      const status = error ? 'ERROR' : statusCode || 'UNKNOWN';
      console.log(`[API] ${method} ${endpoint}: ${duration.toFixed(2)}ms [${status}]`);
    }
  }

  /**
   * Measure async function execution time
   */
  async measureAsync<T>(
    name: string,
    fn: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    const startTime = performance.now();
    try {
      const result = await fn();
      const duration = performance.now() - startTime;
      this.recordMetric(name, duration, { ...metadata, success: true });
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      this.recordMetric(name, duration, { ...metadata, success: false, error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  /**
   * Get performance statistics
   */
  getStats(name?: string): {
    count: number;
    average: number;
    min: number;
    max: number;
    p95: number;
    p99: number;
  } | null {
    const metrics = name 
      ? this.metrics.filter(m => m.name === name)
      : this.metrics;

    if (metrics.length === 0) {
      return null;
    }

    const durations = metrics.map(m => m.duration).sort((a, b) => a - b);
    const sum = durations.reduce((a, b) => a + b, 0);
    const average = sum / durations.length;
    const min = durations[0];
    const max = durations[durations.length - 1];
    const p95Index = Math.floor(durations.length * 0.95);
    const p99Index = Math.floor(durations.length * 0.99);
    const p95 = durations[p95Index] || 0;
    const p99 = durations[p99Index] || 0;

    return {
      count: metrics.length,
      average: Math.round(average * 100) / 100,
      min: Math.round(min * 100) / 100,
      max: Math.round(max * 100) / 100,
      p95: Math.round(p95 * 100) / 100,
      p99: Math.round(p99 * 100) / 100,
    };
  }

  /**
   * Get API performance statistics
   */
  getAPIStats(endpoint?: string): {
    count: number;
    average: number;
    errorRate: number;
    p95: number;
  } | null {
    const metrics = endpoint
      ? this.apiMetrics.filter(m => m.endpoint === endpoint)
      : this.apiMetrics;

    if (metrics.length === 0) {
      return null;
    }

    const durations = metrics.map(m => m.duration).sort((a, b) => a - b);
    const sum = durations.reduce((a, b) => a + b, 0);
    const average = sum / durations.length;
    const errorCount = metrics.filter(m => m.error).length;
    const errorRate = (errorCount / metrics.length) * 100;
    const p95Index = Math.floor(durations.length * 0.95);
    const p95 = durations[p95Index] || 0;

    return {
      count: metrics.length,
      average: Math.round(average * 100) / 100,
      errorRate: Math.round(errorRate * 100) / 100,
      p95: Math.round(p95 * 100) / 100,
    };
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics = [];
    this.apiMetrics = [];
  }

  /**
   * Get all metrics (for debugging)
   */
  getAllMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  /**
   * Get all API metrics (for debugging)
   */
  getAllAPIMetrics(): APIMetric[] {
    return [...this.apiMetrics];
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Helper function to measure component render time
export function measureRender<T>(
  componentName: string,
  renderFn: () => T
): T {
  if (__DEV__) {
    const endMeasure = performanceMonitor.startMeasure(`render_${componentName}`);
    const result = renderFn();
    endMeasure();
    return result;
  }
  return renderFn();
}

// Helper function to wrap API calls with performance monitoring
export async function measureAPI<T>(
  endpoint: string,
  method: string,
  apiCall: () => Promise<Response>
): Promise<T> {
  const startTime = performance.now();
  try {
    const response = await apiCall();
    const duration = performance.now() - startTime;
    performanceMonitor.recordAPICall(
      endpoint,
      method,
      duration,
      response.status,
      !response.ok
    );
    return await response.json() as T;
  } catch (error) {
    const duration = performance.now() - startTime;
    performanceMonitor.recordAPICall(
      endpoint,
      method,
      duration,
      undefined,
      true
    );
    throw error;
  }
}

