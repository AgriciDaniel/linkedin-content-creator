import React from 'react';

export type GenerationStage =
  | 'idle'
  | 'researching'
  | 'generating'
  | 'polishing'
  | 'creating-visuals'
  | 'complete';

interface GenerationProgressProps {
  stage: GenerationStage;
  contentType?: 'carousel' | 'image' | 'text' | 'video' | 'article';
}

const stageConfig: Record<GenerationStage, { label: string; description: string }> = {
  idle: { label: 'Ready', description: 'Waiting to start' },
  researching: { label: 'Researching topic', description: 'Finding relevant insights and data' },
  generating: { label: 'Generating content', description: 'Crafting your LinkedIn post' },
  polishing: { label: 'Polishing post', description: 'Refining tone and structure' },
  'creating-visuals': { label: 'Creating visuals', description: 'Generating carousel slides' },
  complete: { label: 'Complete', description: 'Your content is ready!' },
};

const stageOrder: GenerationStage[] = ['researching', 'generating', 'polishing', 'creating-visuals'];

export const GenerationProgress: React.FC<GenerationProgressProps> = ({
  stage,
  contentType = 'carousel',
}) => {
  // Filter stages based on content type
  const relevantStages = stageOrder.filter(s => {
    if (s === 'creating-visuals') {
      return contentType === 'carousel' || contentType === 'image';
    }
    return true;
  });

  const currentIndex = relevantStages.indexOf(stage);

  return (
    <div className="bg-white dark:bg-[#1D2226] p-5 rounded-2xl border border-gray-200 dark:border-[#3E4042] shadow-lg">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#0A66C2] to-[#004182] flex items-center justify-center">
          <svg className="w-4 h-4 text-white animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
            Creating your content
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {stageConfig[stage]?.description || 'Processing...'}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {relevantStages.map((s, index) => {
          const isComplete = currentIndex > index || stage === 'complete';
          const isCurrent = currentIndex === index && stage !== 'complete';
          const isPending = currentIndex < index && stage !== 'complete';

          return (
            <div
              key={s}
              className={`flex items-center gap-3 transition-all duration-300 ${
                isPending ? 'opacity-40' : 'opacity-100'
              }`}
            >
              {/* Status Icon */}
              {isCurrent ? (
                /* Spinning loader for current stage */
                <div className="flex-shrink-0 w-6 h-6 rounded-full border-2 border-[#0A66C2]/30 border-t-[#0A66C2] animate-spin" />
              ) : (
                <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300 ${
                  isComplete
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
                }`}>
                  {isComplete ? (
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <div className="w-2 h-2 bg-current rounded-full" />
                  )}
                </div>
              )}

              {/* Label */}
              <span className={`text-sm font-medium ${
                isComplete
                  ? 'text-green-600 dark:text-green-400'
                  : isCurrent
                    ? 'text-[#0A66C2]'
                    : 'text-gray-500 dark:text-gray-400'
              }`}>
                {stageConfig[s].label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Progress bar */}
      <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
        <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#0A66C2] to-[#004182] rounded-full transition-all duration-500 ease-out"
            style={{
              width: stage === 'complete'
                ? '100%'
                : `${((currentIndex + 1) / relevantStages.length) * 100}%`
            }}
          />
        </div>
        <p className="mt-2 text-[10px] text-gray-400 dark:text-gray-500 text-center">
          {stage === 'complete'
            ? 'All done!'
            : `Step ${currentIndex + 1} of ${relevantStages.length}`}
        </p>
      </div>
    </div>
  );
};

export default GenerationProgress;
