import React from 'react';

interface EmptyStateProps {
  type: 'no-posts' | 'no-schedule' | 'no-activity' | 'no-topics' | 'api-needed' | 'linkedin-needed';
  onAction?: () => void;
  actionLabel?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  type,
  onAction,
  actionLabel,
}) => {
  const getContent = () => {
    switch (type) {
      case 'no-posts':
        return {
          icon: (
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          ),
          title: 'No posts yet',
          description: 'Enter a topic above and click Generate to create your first AI-powered LinkedIn post.',
          gradient: 'from-blue-500 to-indigo-500',
          bgColor: 'bg-blue-50 dark:bg-blue-900/20',
        };

      case 'no-schedule':
        return {
          icon: (
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          ),
          title: 'No scheduled posts',
          description: 'Generate content and click "Schedule" to plan your posts ahead of time.',
          gradient: 'from-purple-500 to-pink-500',
          bgColor: 'bg-purple-50 dark:bg-purple-900/20',
        };

      case 'no-activity':
        return {
          icon: (
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          ),
          title: 'No activity yet',
          description: 'Start creating content to see your activity tracked here.',
          gradient: 'from-green-500 to-emerald-500',
          bgColor: 'bg-green-50 dark:bg-green-900/20',
        };

      case 'no-topics':
        return {
          icon: (
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          ),
          title: 'Need topic ideas?',
          description: 'Set up your profile so AI can suggest personalized topics for your industry.',
          gradient: 'from-amber-500 to-orange-500',
          bgColor: 'bg-amber-50 dark:bg-amber-900/20',
        };

      case 'api-needed':
        return {
          icon: (
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          ),
          title: 'Connect to AI',
          description: 'Add your Gemini API key in Settings to start generating content with AI.',
          gradient: 'from-red-500 to-rose-500',
          bgColor: 'bg-red-50 dark:bg-red-900/20',
        };

      case 'linkedin-needed':
        return {
          icon: (
            <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
            </svg>
          ),
          title: 'Connect LinkedIn',
          description: 'Link your LinkedIn account to post directly and enable scheduling.',
          gradient: 'from-[#0A66C2] to-[#004182]',
          bgColor: 'bg-blue-50 dark:bg-blue-900/20',
        };

      default:
        return {
          icon: null,
          title: '',
          description: '',
          gradient: 'from-gray-500 to-gray-600',
          bgColor: 'bg-gray-50 dark:bg-gray-800',
        };
    }
  };

  const content = getContent();

  return (
    <div className={`${content.bgColor} rounded-2xl p-8 text-center border border-gray-200 dark:border-[#3E4042]`}>
      <div className={`w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br ${content.gradient} flex items-center justify-center text-white`}>
        {content.icon}
      </div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        {content.title}
      </h3>
      <p className="text-sm text-gray-600 dark:text-gray-400 max-w-sm mx-auto mb-4">
        {content.description}
      </p>
      {onAction && actionLabel && (
        <button
          onClick={onAction}
          className={`px-5 py-2.5 bg-gradient-to-r ${content.gradient} text-white font-medium rounded-xl hover:opacity-90 transition-opacity shadow-lg`}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};

// Inline empty state for smaller areas
export const InlineEmptyState: React.FC<{
  message: string;
  icon?: React.ReactNode;
}> = ({ message, icon }) => (
  <div className="flex flex-col items-center justify-center py-8 text-center">
    {icon && (
      <div className="w-12 h-12 mb-3 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 dark:text-gray-500">
        {icon}
      </div>
    )}
    <p className="text-sm text-gray-500 dark:text-gray-400">{message}</p>
  </div>
);

export default EmptyState;
