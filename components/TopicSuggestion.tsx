import { useState } from 'react';
import {
  generateTopicSuggestions,
  trackTopicSelection,
  type TopicPreferences,
  type TopicSuggestion,
} from '../services/topicSuggestionService';
import LoadingSpinner from './LoadingSpinner';

interface TopicSuggestionProps {
  isOpen: boolean;
  onClose: () => void;
  onTopicSelected: (topic: TopicSuggestion) => void;
}

const TopicSuggestionPanel = ({ isOpen, onClose, onTopicSelected }: TopicSuggestionProps) => {
  const [preferences, setPreferences] = useState<TopicPreferences>({
    industry: '',
    targetAudience: '',
    brandPersonality: 'professional',
    contentFormats: ['carousel', 'text'],
    keywords: [],
  });

  const [keywordInput, setKeywordInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [suggestions, setSuggestions] = useState<TopicSuggestion[]>([]);
  const [trendingHashtags, setTrendingHashtags] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateTopics = async () => {
    if (!preferences.industry.trim() || !preferences.targetAudience.trim()) {
      setError('Please fill in industry and target audience');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setSuggestions([]);

    try {
      const result = await generateTopicSuggestions(preferences, 5);
      setSuggestions(result.topics);
      setTrendingHashtags(result.trendingHashtags);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate topics');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSelectTopic = (topic: TopicSuggestion) => {
    trackTopicSelection(topic);
    onTopicSelected(topic);
    onClose();
  };

  const addKeyword = () => {
    if (keywordInput.trim() && !preferences.keywords?.includes(keywordInput.trim())) {
      setPreferences({
        ...preferences,
        keywords: [...(preferences.keywords || []), keywordInput.trim()],
      });
      setKeywordInput('');
    }
  };

  const removeKeyword = (keyword: string) => {
    setPreferences({
      ...preferences,
      keywords: preferences.keywords?.filter((k) => k !== keyword),
    });
  };

  const toggleFormat = (format: string) => {
    const formats = preferences.contentFormats || [];
    if (formats.includes(format)) {
      setPreferences({
        ...preferences,
        contentFormats: formats.filter((f) => f !== format),
      });
    } else {
      setPreferences({
        ...preferences,
        contentFormats: [...formats, format],
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 bottom-0 w-full sm:w-[600px] bg-white dark:bg-[#1D2226] shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-[#3E4042]">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Topic Suggestions
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              AI-powered content ideas for LinkedIn
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-[#2C3034] rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {/* Preferences Form */}
          <div className="space-y-4">
            {/* Industry */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Industry / Niche <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={preferences.industry}
                onChange={(e) => setPreferences({ ...preferences, industry: e.target.value })}
                placeholder="e.g., SaaS, Marketing, AI, Finance"
                className="w-full px-3 py-2 bg-white dark:bg-black border border-gray-300 dark:border-[#3E4042] rounded-lg focus:ring-2 focus:ring-[#0A66C2] focus:border-transparent outline-none transition-all text-black dark:text-white"
              />
            </div>

            {/* Target Audience */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Target Audience <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={preferences.targetAudience}
                onChange={(e) => setPreferences({ ...preferences, targetAudience: e.target.value })}
                placeholder="e.g., B2B founders, Marketing managers, Developers"
                className="w-full px-3 py-2 bg-white dark:bg-black border border-gray-300 dark:border-[#3E4042] rounded-lg focus:ring-2 focus:ring-[#0A66C2] focus:border-transparent outline-none transition-all text-black dark:text-white"
              />
            </div>

            {/* Brand Personality */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Brand Voice
              </label>
              <div className="grid grid-cols-2 gap-2">
                {['professional', 'thought-leader', 'casual', 'data-driven'].map((personality) => (
                  <button
                    key={personality}
                    onClick={() => setPreferences({ ...preferences, brandPersonality: personality as any })}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      preferences.brandPersonality === personality
                        ? 'bg-[#0A66C2] text-white'
                        : 'bg-gray-100 dark:bg-[#2C3034] text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#3E4042]'
                    }`}
                  >
                    {personality.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                  </button>
                ))}
              </div>
            </div>

            {/* Content Formats */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Preferred Formats
              </label>
              <div className="flex flex-wrap gap-2">
                {['carousel', 'text', 'article', 'poll'].map((format) => (
                  <button
                    key={format}
                    onClick={() => toggleFormat(format)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                      preferences.contentFormats?.includes(format)
                        ? 'bg-[#0A66C2] text-white'
                        : 'bg-gray-100 dark:bg-[#2C3034] text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {format.charAt(0).toUpperCase() + format.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Keywords */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Focus Keywords (optional)
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addKeyword()}
                  placeholder="e.g., AI, productivity, growth"
                  className="flex-1 px-3 py-2 bg-white dark:bg-black border border-gray-300 dark:border-[#3E4042] rounded-lg focus:ring-2 focus:ring-[#0A66C2] focus:border-transparent outline-none transition-all text-black dark:text-white text-sm"
                />
                <button
                  onClick={addKeyword}
                  className="px-4 py-2 bg-[#0A66C2] text-white rounded-lg hover:bg-[#004182] transition-colors text-sm font-medium"
                >
                  Add
                </button>
              </div>
              {preferences.keywords && preferences.keywords.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {preferences.keywords.map((keyword) => (
                    <span
                      key={keyword}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-full text-sm"
                    >
                      {keyword}
                      <button
                        onClick={() => removeKeyword(keyword)}
                        className="hover:bg-blue-200 dark:hover:bg-blue-800 rounded-full p-0.5"
                      >
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGenerateTopics}
            disabled={isGenerating || !preferences.industry.trim() || !preferences.targetAudience.trim()}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-[#0A66C2] text-white font-semibold rounded-lg hover:bg-[#004182] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isGenerating ? (
              <>
                <LoadingSpinner className="h-5 w-5" />
                Generating Topics...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Generate Topic Ideas
              </>
            )}
          </button>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Topic Suggestions */}
          {suggestions.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                {suggestions.length} Topic Ideas Generated
              </h3>

              {suggestions.map((topic, index) => (
                <div
                  key={index}
                  className="p-4 bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-[#3E4042] rounded-lg hover:border-[#0A66C2] transition-all cursor-pointer"
                  onClick={() => handleSelectTopic(topic)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="text-base font-semibold text-gray-900 dark:text-white flex-1">
                      {topic.title}
                    </h4>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      topic.format === 'carousel' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400' :
                      topic.format === 'text' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' :
                      topic.format === 'article' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                      'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400'
                    }`}>
                      {topic.format}
                    </span>
                  </div>

                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    {topic.description}
                  </p>

                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      topic.estimatedEngagement === 'high' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                      topic.estimatedEngagement === 'medium' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' :
                      'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400'
                    }`}>
                      {topic.estimatedEngagement} engagement
                    </span>
                  </div>

                  <details className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    <summary className="cursor-pointer hover:text-gray-700 dark:hover:text-gray-300">
                      Why this topic?
                    </summary>
                    <p className="mt-2 p-2 bg-white dark:bg-black rounded border border-gray-200 dark:border-[#3E4042]">
                      {topic.reasoning}
                    </p>
                  </details>
                </div>
              ))}

              {/* Trending Hashtags */}
              {trendingHashtags.length > 0 && (
                <div className="pt-4 border-t border-gray-200 dark:border-[#3E4042]">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Trending Hashtags
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {trendingHashtags.map((tag, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full text-xs font-medium"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TopicSuggestionPanel;
