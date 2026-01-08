import React, { useState, useEffect } from 'react';
import { getMemoryStats, clearMemory } from '../services/memoryService';

interface AIMemoryProps {
  isOpen: boolean;
  onClose: () => void;
}

const AIMemory: React.FC<AIMemoryProps> = ({ isOpen, onClose }) => {
  const [stats, setStats] = useState<ReturnType<typeof getMemoryStats> | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadStats();
    }
  }, [isOpen]);

  const loadStats = () => {
    const memoryStats = getMemoryStats();
    setStats(memoryStats);
  };

  const handleClearMemory = () => {
    clearMemory();
    loadStats();
    setShowClearConfirm(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-[#1D2226] rounded-2xl shadow-2xl max-w-lg w-full max-h-[85vh] overflow-hidden border border-gray-200 dark:border-[#3E4042]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-[#3E4042]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#0A66C2]/10 flex items-center justify-center">
              <svg className="w-4 h-4 text-[#0A66C2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">AI Memory</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">Content patterns & history</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(85vh-65px)] p-5">
          {stats ? (
            <div className="space-y-4">
              {/* Quick Stats Row */}
              <div className="grid grid-cols-4 gap-2">
                <div className="text-center p-3 bg-gray-50 dark:bg-black/20 rounded-xl">
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalPosts}</p>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">Generated</p>
                </div>
                <div className="text-center p-3 bg-gray-50 dark:bg-black/20 rounded-xl">
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.postsInMemory}</p>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">In Memory</p>
                </div>
                <div className="text-center p-3 bg-gray-50 dark:bg-black/20 rounded-xl">
                  <p className="text-2xl font-bold text-[#0A66C2]">{stats.postsPosted}</p>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">Posted</p>
                </div>
                <div className="text-center p-3 bg-gray-50 dark:bg-black/20 rounded-xl">
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.uniqueTopics}</p>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">Topics</p>
                </div>
              </div>

              {/* Content Types */}
              <div className="bg-gray-50 dark:bg-black/20 rounded-xl p-4">
                <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Content Types</h3>
                <div className="space-y-2">
                  {Object.entries(stats.contentTypes).map(([type, count]) => {
                    const percentage = stats.postsInMemory > 0 ? (count / stats.postsInMemory) * 100 : 0;
                    return (
                      <div key={type} className="flex items-center gap-3">
                        <span className="text-xs text-gray-600 dark:text-gray-300 w-16 capitalize">{type.replace('-', ' ')}</span>
                        <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#0A66C2] rounded-full transition-all"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-gray-700 dark:text-gray-300 w-6 text-right">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Tone Distribution */}
              <div className="bg-gray-50 dark:bg-black/20 rounded-xl p-4">
                <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Tone Distribution</h3>
                <div className="space-y-2">
                  {Object.entries(stats.sentiments).map(([sentiment, count]) => {
                    const percentage = stats.postsInMemory > 0 ? (count / stats.postsInMemory) * 100 : 0;
                    return (
                      <div key={sentiment} className="flex items-center gap-3">
                        <span className="text-xs text-gray-600 dark:text-gray-300 w-20 capitalize">{sentiment}</span>
                        <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gray-400 dark:bg-gray-500 rounded-full transition-all"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-gray-700 dark:text-gray-300 w-6 text-right">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Top Keywords */}
              {stats.topKeywords.length > 0 && (
                <div className="bg-gray-50 dark:bg-black/20 rounded-xl p-4">
                  <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Top Keywords</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {stats.topKeywords.slice(0, 15).map(([keyword, count]) => (
                      <span
                        key={keyword}
                        className="inline-flex items-center gap-1.5 px-2 py-1 bg-white dark:bg-[#1D2226] border border-gray-200 dark:border-[#3E4042] rounded-md text-xs"
                      >
                        <span className="text-gray-600 dark:text-gray-300">{keyword}</span>
                        <span className="text-[10px] text-gray-400">{count}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Info & Clear */}
              <div className="flex items-center justify-between pt-2">
                <p className="text-[11px] text-gray-400 dark:text-gray-500 max-w-[70%]">
                  AI Memory helps generate diverse content by tracking patterns and avoiding repetition.
                </p>
                {showClearConfirm ? (
                  <div className="flex gap-1.5">
                    <button
                      onClick={handleClearMemory}
                      className="px-2.5 py-1.5 bg-red-500 text-white rounded-lg text-xs font-medium hover:bg-red-600 transition-colors"
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() => setShowClearConfirm(false)}
                      className="px-2.5 py-1.5 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg text-xs font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowClearConfirm(true)}
                    className="px-2.5 py-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  >
                    Clear Memory
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center py-12">
              <p className="text-sm text-gray-500 dark:text-gray-400">No memory data available</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AIMemory;
