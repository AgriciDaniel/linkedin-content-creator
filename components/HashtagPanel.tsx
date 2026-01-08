import React, { useState, useEffect } from 'react';
import {
  HashtagSuggestion,
  suggestHashtags,
  extractHashtags,
  getHashtagInfo,
  getHashtagRecommendation,
  formatHashtagsForPost,
} from '../services/hashtagService';
import LoadingSpinner from './LoadingSpinner';

interface HashtagPanelProps {
  topic: string;
  post: string;
  onAddHashtags: (hashtags: string) => void;
}

export const HashtagPanel: React.FC<HashtagPanelProps> = ({
  topic,
  post,
  onAddHashtags,
}) => {
  const [suggestions, setSuggestions] = useState<HashtagSuggestion[]>([]);
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existingTags, setExistingTags] = useState<string[]>([]);

  // Load suggestions when topic/post changes
  useEffect(() => {
    const loadSuggestions = async () => {
      if (!topic && !post) return;

      setIsLoading(true);
      setError(null);

      try {
        const results = await suggestHashtags(topic, post, 8);
        setSuggestions(results);

        // Extract existing hashtags from post
        const existing = extractHashtags(post);
        setExistingTags(existing);
      } catch (err) {
        setError('Failed to load suggestions');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    loadSuggestions();
  }, [topic, post]);

  // Toggle hashtag selection
  const toggleTag = (tag: string) => {
    const newSelected = new Set(selectedTags);
    if (newSelected.has(tag)) {
      newSelected.delete(tag);
    } else {
      newSelected.add(tag);
    }
    setSelectedTags(newSelected);
  };

  // Add selected hashtags to post
  const handleAddToPost = () => {
    if (selectedTags.size === 0) return;
    const formatted = formatHashtagsForPost(Array.from(selectedTags));
    onAddHashtags(formatted);
    setSelectedTags(new Set());
  };

  // Get category icon
  const getCategoryIcon = (category: HashtagSuggestion['category']) => {
    switch (category) {
      case 'industry':
        return (
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-2a1 1 0 00-1-1H9a1 1 0 00-1 1v2a1 1 0 01-1 1H4a1 1 0 110-2V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z" clipRule="evenodd" />
          </svg>
        );
      case 'topic':
        return (
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a3 3 0 013-3h5c.256 0 .512.098.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
          </svg>
        );
      case 'trending':
        return (
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd" />
          </svg>
        );
      case 'niche':
        return (
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
          </svg>
        );
    }
  };

  // Get category color
  const getCategoryColor = (category: HashtagSuggestion['category']) => {
    switch (category) {
      case 'industry':
        return 'text-blue-500 bg-blue-100 dark:bg-blue-900/30';
      case 'topic':
        return 'text-purple-500 bg-purple-100 dark:bg-purple-900/30';
      case 'trending':
        return 'text-orange-500 bg-orange-100 dark:bg-orange-900/30';
      case 'niche':
        return 'text-green-500 bg-green-100 dark:bg-green-900/30';
    }
  };

  const totalTags = existingTags.length + selectedTags.size;
  const recommendation = getHashtagRecommendation(totalTags);

  return (
    <div className="bg-white dark:bg-[#1D2226] rounded-2xl border border-gray-200 dark:border-[#3E4042] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-[#3E4042]">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-[#0A66C2] flex items-center justify-center">
            <span className="text-white text-sm font-bold">#</span>
          </div>
          <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">Hashtag Suggestions</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-0.5 rounded-full ${
            totalTags >= 3 && totalTags <= 5
              ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
              : totalTags > 5
                ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
          }`}>
            {totalTags} / 5 recommended
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Existing hashtags in post */}
        {existingTags.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
              Already in your post:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {existingTags.map((tag) => {
                const info = getHashtagInfo(tag);
                return (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-[#0A66C2]/10 text-[#0A66C2] rounded-full"
                  >
                    #{tag}
                    {info && (
                      <span className="text-[10px] text-gray-500">({info.followers})</span>
                    )}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <LoadingSpinner className="w-5 h-5 text-[#0A66C2]" />
            <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">Finding relevant hashtags...</span>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="text-center py-4 text-sm text-red-500">
            {error}
          </div>
        )}

        {/* Suggestions */}
        {!isLoading && suggestions.length > 0 && (
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
              Suggested hashtags:
            </p>
            <div className="space-y-2">
              {suggestions.map((suggestion) => {
                const isSelected = selectedTags.has(suggestion.tag);
                const info = getHashtagInfo(suggestion.tag);

                return (
                  <button
                    key={suggestion.tag}
                    onClick={() => toggleTag(suggestion.tag)}
                    className={`w-full flex items-center justify-between p-2.5 rounded-lg border transition-all ${
                      isSelected
                        ? 'border-[#0A66C2] bg-[#0A66C2]/5 dark:bg-[#0A66C2]/10'
                        : 'border-gray-200 dark:border-[#3E4042] hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {/* Checkbox */}
                      <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                        isSelected
                          ? 'bg-[#0A66C2] border-[#0A66C2]'
                          : 'border-gray-300 dark:border-gray-600'
                      }`}>
                        {isSelected && (
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>

                      {/* Tag info */}
                      <div className="text-left">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-sm font-medium ${
                            isSelected ? 'text-[#0A66C2]' : 'text-gray-800 dark:text-gray-200'
                          }`}>
                            #{suggestion.tag}
                          </span>
                          <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] rounded-full ${getCategoryColor(suggestion.category)}`}>
                            {getCategoryIcon(suggestion.category)}
                            {suggestion.category}
                          </span>
                        </div>
                        {suggestion.description && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">
                            {suggestion.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Relevance & followers */}
                    <div className="text-right">
                      <div className="flex items-center gap-1">
                        <div className="w-12 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#0A66C2] rounded-full"
                            style={{ width: `${suggestion.relevance}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-gray-500 w-7">{suggestion.relevance}%</span>
                      </div>
                      {info && (
                        <span className="text-[10px] text-gray-400">{info.followers} followers</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && suggestions.length === 0 && !error && (
          <div className="text-center py-8 text-sm text-gray-500 dark:text-gray-400">
            Generate content to see hashtag suggestions
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between p-3 border-t border-gray-200 dark:border-[#3E4042] bg-gray-50 dark:bg-black/20">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {recommendation}
        </p>
        <button
          onClick={handleAddToPost}
          disabled={selectedTags.size === 0}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-[#0A66C2] rounded-lg hover:bg-[#004182] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Add to Post ({selectedTags.size})
        </button>
      </div>
    </div>
  );
};

export default HashtagPanel;
