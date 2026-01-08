import React from 'react';

interface ErrorDisplayProps {
  error: string;
  type?: 'error' | 'warning' | 'info';
  onRetry?: () => void;
  onDismiss?: () => void;
  suggestions?: string[];
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  error,
  type = 'error',
  onRetry,
  onDismiss,
  suggestions,
}) => {
  const getStyles = () => {
    switch (type) {
      case 'warning':
        return {
          bg: 'bg-amber-50 dark:bg-amber-900/20',
          border: 'border-amber-200 dark:border-amber-800/50',
          icon: 'text-amber-500',
          text: 'text-amber-700 dark:text-amber-300',
          button: 'bg-amber-500 hover:bg-amber-600',
        };
      case 'info':
        return {
          bg: 'bg-blue-50 dark:bg-blue-900/20',
          border: 'border-blue-200 dark:border-blue-800/50',
          icon: 'text-blue-500',
          text: 'text-blue-700 dark:text-blue-300',
          button: 'bg-blue-500 hover:bg-blue-600',
        };
      default:
        return {
          bg: 'bg-red-50 dark:bg-red-900/20',
          border: 'border-red-200 dark:border-red-800/50',
          icon: 'text-red-500',
          text: 'text-red-700 dark:text-red-300',
          button: 'bg-red-500 hover:bg-red-600',
        };
    }
  };

  const styles = getStyles();

  const getIcon = () => {
    switch (type) {
      case 'warning':
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        );
      case 'info':
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        );
    }
  };

  // Parse common errors and provide helpful suggestions
  const getErrorHelp = (errorMessage: string): string[] => {
    const lowerError = errorMessage.toLowerCase();

    if (lowerError.includes('api key') || lowerError.includes('unauthorized') || lowerError.includes('invalid key')) {
      return [
        'Check that your API key is correctly entered',
        'Make sure your API key has not expired',
        'Verify your API key has the necessary permissions',
      ];
    }

    if (lowerError.includes('rate limit') || lowerError.includes('quota')) {
      return [
        'Wait a few minutes before trying again',
        'Consider upgrading your API plan for higher limits',
        'Try generating shorter content',
      ];
    }

    if (lowerError.includes('network') || lowerError.includes('fetch') || lowerError.includes('connection')) {
      return [
        'Check your internet connection',
        'Try refreshing the page',
        'The service might be temporarily unavailable',
      ];
    }

    if (lowerError.includes('linkedin') || lowerError.includes('oauth') || lowerError.includes('token')) {
      return [
        'Try reconnecting your LinkedIn account',
        'Your session may have expired',
        'Check if LinkedIn is accessible',
      ];
    }

    if (lowerError.includes('timeout')) {
      return [
        'The request took too long',
        'Try with a shorter topic',
        'Check your internet connection',
      ];
    }

    return suggestions || [];
  };

  const helpSuggestions = suggestions || getErrorHelp(error);

  return (
    <div className={`${styles.bg} ${styles.border} border rounded-xl p-4`}>
      <div className="flex items-start gap-3">
        <div className={`flex-shrink-0 ${styles.icon}`}>
          {getIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium ${styles.text}`}>
            {type === 'error' ? 'Something went wrong' : type === 'warning' ? 'Warning' : 'Info'}
          </p>
          <p className={`mt-1 text-sm ${styles.text} opacity-90`}>
            {error}
          </p>

          {helpSuggestions.length > 0 && (
            <div className="mt-3">
              <p className={`text-xs font-medium ${styles.text} opacity-75 mb-1`}>
                Try these solutions:
              </p>
              <ul className={`text-xs ${styles.text} opacity-75 space-y-1`}>
                {helpSuggestions.map((suggestion, index) => (
                  <li key={index} className="flex items-start gap-1.5">
                    <span className="mt-1">•</span>
                    <span>{suggestion}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {(onRetry || onDismiss) && (
            <div className="mt-3 flex items-center gap-2">
              {onRetry && (
                <button
                  onClick={onRetry}
                  className={`px-3 py-1.5 text-xs font-medium text-white ${styles.button} rounded-lg transition-colors`}
                >
                  Try Again
                </button>
              )}
              {onDismiss && (
                <button
                  onClick={onDismiss}
                  className="px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                >
                  Dismiss
                </button>
              )}
            </div>
          )}
        </div>

        {onDismiss && !onRetry && (
          <button
            onClick={onDismiss}
            className={`flex-shrink-0 p-1 ${styles.icon} hover:opacity-70 transition-opacity`}
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};

// Simple inline error for form fields
export const InlineError: React.FC<{ message: string }> = ({ message }) => (
  <p className="mt-1 text-xs text-red-500 dark:text-red-400 flex items-center gap-1">
    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
    </svg>
    {message}
  </p>
);

export default ErrorDisplay;
