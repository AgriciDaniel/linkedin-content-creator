import React, { useState } from 'react';
import { generateBatch, BatchOptions, BatchGenerationResult } from '../services/geminiService';
import LoadingSpinner from './LoadingSpinner';

interface BatchGeneratorProps {
  onBatchGenerated: (results: BatchGenerationResult[]) => void;
  onCancel: () => void;
}

export const BatchGenerator: React.FC<BatchGeneratorProps> = ({
  onBatchGenerated,
  onCancel,
}) => {
  const [topic, setTopic] = useState('');
  const [postCount, setPostCount] = useState(5);
  const [variationStyle, setVariationStyle] = useState<BatchOptions['variationStyle']>('angles');
  const [contentTypes, setContentTypes] = useState<Set<'carousel' | 'image' | 'text'>>(
    new Set(['carousel', 'image'])
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);

  const toggleContentType = (type: 'carousel' | 'image' | 'text') => {
    const newTypes = new Set(contentTypes);
    if (newTypes.has(type)) {
      if (newTypes.size > 1) {
        newTypes.delete(type);
      }
    } else {
      newTypes.add(type);
    }
    setContentTypes(newTypes);
  };

  const handleGenerate = async () => {
    if (!topic.trim()) {
      setError('Please enter a topic');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setProgress({ current: 0, total: postCount });

    try {
      const results = await generateBatch(
        topic,
        postCount,
        {
          variationStyle,
          contentTypes: Array.from(contentTypes),
        },
        (current, total) => setProgress({ current, total })
      );

      if (results.length === 0) {
        setError('No posts were generated. Please try again.');
      } else {
        onBatchGenerated(results);
      }
    } catch (err) {
      console.error('Batch generation failed:', err);
      setError('Failed to generate posts. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const getContentTypeColor = (type: string) => {
    switch (type) {
      case 'carousel': return 'bg-[#0A66C2]';
      case 'image': return 'bg-purple-500';
      default: return 'bg-gray-400';
    }
  };

  return (
    <div className="bg-white dark:bg-[#1D2226] rounded-2xl border border-gray-200 dark:border-[#3E4042] overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-[#3E4042]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#0A66C2]/10 flex items-center justify-center">
            <svg className="w-4 h-4 text-[#0A66C2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Batch Generate</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">Create multiple posts at once</p>
          </div>
        </div>
        <button onClick={onCancel} className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors">
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Topic Input */}
        <div>
          <label className="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider">Topic</label>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g., Leadership lessons for remote teams"
            className="w-full px-3 py-2 bg-white dark:bg-black border border-gray-200 dark:border-[#3E4042] rounded-lg focus:ring-1 focus:ring-[#0A66C2] outline-none transition-all text-sm text-gray-900 dark:text-white placeholder-gray-400"
            disabled={isGenerating}
          />
        </div>

        {/* Number of Posts */}
        <div>
          <label className="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider">Number of posts</label>
          <div className="flex gap-1.5">
            {[3, 5, 7, 10].map((num) => (
              <button
                key={num}
                onClick={() => setPostCount(num)}
                disabled={isGenerating}
                className={`flex-1 py-1.5 text-xs font-medium rounded-lg border transition-all ${
                  postCount === num
                    ? 'bg-[#0A66C2] text-white border-[#0A66C2]'
                    : 'bg-white dark:bg-black border-gray-200 dark:border-[#3E4042] text-gray-600 dark:text-gray-400 hover:border-[#0A66C2]'
                } disabled:opacity-50`}
              >
                {num}
              </button>
            ))}
          </div>
        </div>

        {/* Content Types */}
        <div>
          <label className="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider">Content types</label>
          <div className="flex gap-1.5">
            {[
              { type: 'carousel' as const, label: 'Carousel' },
              { type: 'image' as const, label: 'Image' },
              { type: 'text' as const, label: 'Text' },
            ].map(({ type, label }) => (
              <button
                key={type}
                onClick={() => toggleContentType(type)}
                disabled={isGenerating}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all ${
                  contentTypes.has(type)
                    ? 'bg-[#0A66C2]/10 border-[#0A66C2] text-[#0A66C2]'
                    : 'bg-white dark:bg-black border-gray-200 dark:border-[#3E4042] text-gray-500 dark:text-gray-400 hover:border-gray-300'
                } disabled:opacity-50`}
              >
                <span className={`w-2 h-2 rounded-full ${getContentTypeColor(type)}`} />
                <span className="text-xs font-medium">{label}</span>
                {contentTypes.has(type) && (
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Variation Style */}
        <div>
          <label className="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider">Variation style</label>
          <div className="space-y-1.5">
            {[
              { value: 'angles' as const, title: 'Different angles', description: 'Unique perspective per post' },
              { value: 'series' as const, title: 'Series (Part 1, 2...)', description: 'Connected posts' },
              { value: 'mixed' as const, title: 'Mixed formats', description: 'Educational, promotional, personal' },
            ].map(({ value, title, description }) => (
              <button
                key={value}
                onClick={() => setVariationStyle(value)}
                disabled={isGenerating}
                className={`w-full flex items-center gap-2.5 p-2.5 rounded-lg border text-left transition-all ${
                  variationStyle === value
                    ? 'bg-[#0A66C2]/5 border-[#0A66C2]'
                    : 'bg-white dark:bg-black border-gray-200 dark:border-[#3E4042] hover:border-gray-300'
                } disabled:opacity-50`}
              >
                <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                  variationStyle === value ? 'border-[#0A66C2]' : 'border-gray-300 dark:border-gray-600'
                }`}>
                  {variationStyle === value && <div className="w-1.5 h-1.5 rounded-full bg-[#0A66C2]" />}
                </div>
                <div className="min-w-0">
                  <p className={`text-xs font-medium ${variationStyle === value ? 'text-[#0A66C2]' : 'text-gray-700 dark:text-gray-300'}`}>{title}</p>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400">{description}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="flex items-center gap-2 p-2.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <svg className="w-4 h-4 text-red-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Progress */}
        {isGenerating && (
          <div className="space-y-2 p-3 bg-gray-50 dark:bg-black/20 rounded-lg">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-600 dark:text-gray-400">
                Generating post {progress.current} of {progress.total}...
              </span>
              <span className="font-medium text-[#0A66C2]">
                {Math.round((progress.current / progress.total) * 100)}%
              </span>
            </div>
            <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#0A66C2] rounded-full transition-all duration-300"
                style={{ width: `${(progress.current / progress.total) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex gap-2 p-4 border-t border-gray-200 dark:border-[#3E4042]">
        <button
          onClick={onCancel}
          disabled={isGenerating}
          className="flex-1 px-3 py-2 text-xs text-gray-600 dark:text-gray-400 font-medium rounded-lg border border-gray-200 dark:border-[#3E4042] hover:bg-gray-50 dark:hover:bg-white/5 transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          onClick={handleGenerate}
          disabled={isGenerating || !topic.trim()}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-[#0A66C2] text-white text-xs font-medium rounded-lg hover:bg-[#004182] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isGenerating ? (
            <>
              <LoadingSpinner className="w-3 h-3" />
              Generating...
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Generate {postCount} Posts
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default BatchGenerator;
