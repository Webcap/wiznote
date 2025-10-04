import { Ionicons } from '@expo/vector-icons';
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useThemeColor } from '../hooks/useThemeColor';
import { getSupabaseErrorMessage, logError, shouldShowUserError } from '../utils/supabaseErrorHandler';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showDetails?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log the error
    logError(error, 'ErrorBoundary');
    
    this.setState({
      error,
      errorInfo,
    });

    // Call the onError callback if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    });
  };

  toggleDetails = () => {
    this.setState(prev => ({
      showDetails: !prev.showDetails,
    }));
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <ErrorFallback
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          showDetails={this.state.showDetails}
          onRetry={this.handleRetry}
          onToggleDetails={this.toggleDetails}
          shouldShowDetails={this.props.showDetails}
        />
      );
    }

    return this.props.children;
  }
}

interface ErrorFallbackProps {
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
  onRetry: () => void;
  onToggleDetails: () => void;
  shouldShowDetails?: boolean;
}

const ErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  errorInfo: originalErrorInfo,
  showDetails,
  onRetry,
  onToggleDetails,
  shouldShowDetails = false,
}) => {
  const backgroundColor = useThemeColor('background');
  const textColor = useThemeColor('text');
  const borderColor = useThemeColor('border');
  const primaryColor = useThemeColor('primary');

  if (!error) {
    return null;
  }

  const errorInfo = getSupabaseErrorMessage(error);
  const shouldShow = shouldShowUserError(error);

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.iconContainer}>
          <Ionicons name="alert-circle" size={64} color="#F44336" />
        </View>

        <Text style={[styles.title, { color: textColor }]}>
          Oops! Something went wrong
        </Text>

        {shouldShow && (
          <Text style={[styles.message, { color: textColor }]}>
            {errorInfo.userMessage}
          </Text>
        )}

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: primaryColor }]}
            onPress={onRetry}
          >
            <Ionicons name="refresh" size={20} color="white" />
            <Text style={styles.buttonText}>Try Again</Text>
          </TouchableOpacity>

          {shouldShowDetails && (
            <TouchableOpacity
              style={[styles.button, styles.secondaryButton, { borderColor }]}
              onPress={onToggleDetails}
            >
              <Ionicons 
                name={showDetails ? "chevron-up" : "chevron-down"} 
                size={20} 
                color={textColor} 
              />
              <Text style={[styles.buttonText, { color: textColor }]}>
                {showDetails ? 'Hide Details' : 'Show Details'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {showDetails && errorInfo && (
          <View style={[styles.detailsContainer, { borderColor }]}>
            <Text style={[styles.detailsTitle, { color: textColor }]}>
              Error Details
            </Text>
            
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: textColor }]}>Type:</Text>
              <Text style={[styles.detailValue, { color: textColor }]}>
                {errorInfo.type}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: textColor }]}>Severity:</Text>
              <Text style={[styles.detailValue, { color: textColor }]}>
                {errorInfo.severity}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: textColor }]}>Category:</Text>
              <Text style={[styles.detailValue, { color: textColor }]}>
                {errorInfo.category}
              </Text>
            </View>

            {errorInfo.errorCode && (
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: textColor }]}>Code:</Text>
                <Text style={[styles.detailValue, { color: textColor }]}>
                  {errorInfo.errorCode}
                </Text>
              </View>
            )}

            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: textColor }]}>Message:</Text>
              <Text style={[styles.detailValue, { color: textColor }]}>
                {error.message}
              </Text>
            </View>

            {errorInfo && (
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: textColor }]}>Action:</Text>
                <Text style={[styles.detailValue, { color: textColor }]}>
                  {errorInfo.userMessage}
                </Text>
              </View>
            )}

            {errorInfo && errorInfo.shouldRetry && (
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: textColor }]}>Retry:</Text>
                <Text style={[styles.detailValue, { color: textColor }]}>
                  Yes
                </Text>
              </View>
            )}
          </View>
        )}

        {showDetails && errorInfo && (
          <View style={[styles.stackContainer, { borderColor }]}>
            <Text style={[styles.detailsTitle, { color: textColor }]}>
              Stack Trace
            </Text>
            <Text style={[styles.stackTrace, { color: textColor }]}>
              {error.stack}
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  iconContainer: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  detailsContainer: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    marginTop: 20,
  },
  detailsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    width: 80,
  },
  detailValue: {
    fontSize: 14,
    flex: 1,
  },
  stackContainer: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    marginTop: 20,
  },
  stackTrace: {
    fontSize: 12,
    fontFamily: 'monospace',
    lineHeight: 16,
  },
});

// Hook for functional components to use error boundary
export const useErrorBoundary = () => {
  const [error, setError] = React.useState<Error | null>(null);

  const handleError = React.useCallback((error: Error) => {
    setError(error);
    logError(error, 'useErrorBoundary');
  }, []);

  const clearError = React.useCallback(() => {
    setError(null);
  }, []);

  return {
    error,
    handleError,
    clearError,
  };
}; 