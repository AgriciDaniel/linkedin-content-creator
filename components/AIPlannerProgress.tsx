import React from 'react';
import LoadingSpinner from './LoadingSpinner';

interface AIPlannerProgressProps {
  current: number;
  total: number;
  currentTopic?: string;
  isPaused: boolean;
  error?: string;
  onPause: () => void;
  onResume: () => void;
  onBackground: () => void;
  onRetry?: () => void;
  onSkip?: () => void;
  onCancel: () => void;
  onStop?: () => void;
  isBackground: boolean;
}

const AIPlannerProgress: React.FC<AIPlannerProgressProps> = ({
  current,
  total,
  currentTopic,
  isPaused,
  error,
  onPause,
  onResume,
  onBackground,
  onRetry,
  onSkip,
  onCancel,
  onStop,
  isBackground,
}) => {
  const progress = total > 0 ? Math.round((current / total) * 100) : 0;
  const remaining = total - current;

  return (
    <div className="space-y-4">
      {/* Header with status */}
      <div className="text-center py-2">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 ${
          error ? 'bg-red-500/10' : isPaused ? 'bg-amber-500/10' : 'bg-[#0A66C2]/10'
        }`}>
          {!isPaused && !error && (
            <LoadingSpinner className="h-6 w-6 text-[#0A66C2]" />
          )}
          {isPaused && !error && (
            <svg className="w-6 h-6 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          )}
          {error && (
            <svg className="w-6 h-6 text-red-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          )}
        </div>
        <h3 className="text-sm font-medium text-gray-900 dark:text-white">
          {error ? 'Generation Error' : isPaused ? 'Generation Paused' : 'Generating Content...'}
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {current} of {total} posts • {remaining} remaining
        </p>
      </div>

      {/* Progress bar */}
      <div className="space-y-2">
        <div className="h-2.5 bg-gray-200 dark:bg-[#3E4042] rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              error ? 'bg-red-500' : isPaused ? 'bg-amber-500' : 'bg-[#0A66C2]'
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-gray-400 dark:text-gray-500">
          <span>{progress}% complete</span>
          {isBackground && <span className="text-[#0A66C2]">Running in background</span>}
        </div>
      </div>

      {/* Current topic being generated */}
      {currentTopic && !error && (
        <div className="p-3 bg-gray-50 dark:bg-black/20 rounded-lg border border-gray-200 dark:border-[#3E4042]">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-[#0A66C2] animate-pulse" />
            <span className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider font-medium">
              Currently generating
            </span>
          </div>
          <p className="text-xs text-gray-700 dark:text-gray-300 line-clamp-2">
            {currentTopic}
          </p>
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-lg">
          <p className="text-xs text-red-600 dark:text-red-400 mb-3">
            {error}
          </p>
          <div className="grid grid-cols-2 gap-2">
            {onSkip && (
              <button
                onClick={onSkip}
                className="flex items-center justify-center gap-1.5 py-2 bg-[#0A66C2] text-white text-xs font-medium rounded-lg hover:bg-[#004182] transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 1.414L10.586 9H7a1 1 0 100 2h3.586l-1.293 1.293a1 1 0 101.414 1.414l3-3a1 1 0 000-1.414z" clipRule="evenodd" />
                </svg>
                Skip & Continue
              </button>
            )}
            {onStop && (
              <button
                onClick={onStop}
                className="flex items-center justify-center gap-1.5 py-2 text-red-500 text-xs font-medium rounded-lg border border-red-200 dark:border-red-800/50 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
                </svg>
                Stop
              </button>
            )}
          </div>
        </div>
      )}

      {/* Action buttons */}
      {!error && (
        <div className="space-y-2">
          {!isPaused ? (
            <>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={onPause}
                  className="flex items-center justify-center gap-1.5 py-2.5 bg-[#0A66C2] text-white text-xs font-medium rounded-lg hover:bg-[#004182] transition-colors"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  Pause
                </button>
                {!isBackground ? (
                  <button
                    onClick={onBackground}
                    className="flex items-center justify-center gap-1.5 py-2.5 text-gray-700 dark:text-gray-300 text-xs font-medium rounded-lg border border-gray-200 dark:border-[#3E4042] hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    Run in Background
                  </button>
                ) : (
                  <button
                    onClick={onStop}
                    className="flex items-center justify-center gap-1.5 py-2.5 text-red-500 text-xs font-medium rounded-lg border border-red-200 dark:border-red-800/50 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
                    </svg>
                    Stop
                  </button>
                )}
              </div>
              {onStop && !isBackground && (
                <button
                  onClick={onStop}
                  className="w-full flex items-center justify-center gap-1.5 py-2 text-red-500 text-xs font-medium rounded-lg border border-red-200 dark:border-red-800/50 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
                  </svg>
                  Stop Generation
                </button>
              )}
            </>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={onResume}
                className="flex items-center justify-center gap-1.5 py-2.5 bg-[#0A66C2] text-white text-xs font-medium rounded-lg hover:bg-[#004182] transition-colors"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                </svg>
                Resume
              </button>
              <button
                onClick={onStop || onCancel}
                className="flex items-center justify-center gap-1.5 py-2.5 text-red-500 text-xs font-medium rounded-lg border border-red-200 dark:border-red-800/50 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
                </svg>
                Stop & Keep Progress
              </button>
            </div>
          )}
        </div>
      )}

      {/* Background mode indicator */}
      {isBackground && (
        <div className="flex items-center gap-2 p-2.5 bg-[#0A66C2]/10 rounded-lg">
          <svg className="w-4 h-4 text-[#0A66C2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-xs text-[#0A66C2] font-medium">
            You can close this window - generation continues in background
          </span>
        </div>
      )}
    </div>
  );
};

export default AIPlannerProgress;
