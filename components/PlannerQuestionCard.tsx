import React, { useState } from 'react';

export interface QuestionSuggestion {
  label: string;
  value: string | number;
  description?: string;
}

export interface PlannerQuestionProps {
  question: string;
  suggestions: QuestionSuggestion[];
  allowCustom?: boolean;
  multiSelect?: boolean;
  selectedValues: (string | number)[];
  onSelect: (values: (string | number)[]) => void;
  customPlaceholder?: string;
}

const PlannerQuestionCard: React.FC<PlannerQuestionProps> = ({
  question,
  suggestions,
  allowCustom = true,
  multiSelect = false,
  selectedValues,
  onSelect,
  customPlaceholder = 'Enter custom value...',
}) => {
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customValue, setCustomValue] = useState('');

  const handleSuggestionClick = (value: string | number) => {
    if (multiSelect) {
      const newValues = selectedValues.includes(value)
        ? selectedValues.filter(v => v !== value)
        : [...selectedValues, value];
      onSelect(newValues);
    } else {
      onSelect([value]);
      setShowCustomInput(false);
    }
  };

  const handleCustomSubmit = () => {
    if (!customValue.trim()) return;

    const value = customValue.trim();
    if (multiSelect) {
      if (!selectedValues.includes(value)) {
        onSelect([...selectedValues, value]);
      }
    } else {
      onSelect([value]);
    }
    setCustomValue('');
    if (!multiSelect) {
      setShowCustomInput(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCustomSubmit();
    }
  };

  const isSelected = (value: string | number) => selectedValues.includes(value);

  return (
    <div className="space-y-4">
      {/* Question */}
      <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
        {question}
      </p>

      {/* Suggestions - 3 columns for better readability */}
      <div className="grid grid-cols-3 gap-2.5">
        {suggestions.map((suggestion) => (
          <button
            key={String(suggestion.value)}
            onClick={() => handleSuggestionClick(suggestion.value)}
            className={`
              px-3 py-3 rounded-lg text-sm font-medium transition-all text-center
              ${isSelected(suggestion.value)
                ? 'bg-[#0A66C2] text-white shadow-sm'
                : 'bg-gray-100 dark:bg-[#2D3748] text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#3E4042] border border-gray-200 dark:border-[#3E4042]'
              }
            `}
            title={suggestion.description}
          >
            <span className="block">{suggestion.label}</span>
            {suggestion.description && (
              <span className={`block text-[10px] mt-1 ${
                isSelected(suggestion.value) ? 'text-white/70' : 'text-gray-500 dark:text-gray-400'
              }`}>
                {suggestion.description}
              </span>
            )}
          </button>
        ))}

        {/* Custom option button */}
        {allowCustom && !showCustomInput && (
          <button
            onClick={() => setShowCustomInput(true)}
            className="px-3 py-3 rounded-lg text-sm font-medium bg-white dark:bg-black border border-dashed border-gray-300 dark:border-[#3E4042] text-gray-500 dark:text-gray-400 hover:border-[#0A66C2] hover:text-[#0A66C2] transition-colors text-center"
          >
            <span className="block">+ Custom</span>
            <span className="block text-[10px] mt-1 text-gray-400 dark:text-gray-500">Add your own</span>
          </button>
        )}
      </div>

      {/* Custom input */}
      {allowCustom && showCustomInput && (
        <div className="flex gap-2">
          <input
            type="text"
            value={customValue}
            onChange={(e) => setCustomValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={customPlaceholder}
            autoFocus
            className="flex-1 px-3 py-2 bg-white dark:bg-black border border-gray-200 dark:border-[#3E4042] rounded-lg text-sm text-gray-900 dark:text-white focus:ring-1 focus:ring-[#0A66C2] focus:border-[#0A66C2] outline-none"
          />
          <button
            onClick={handleCustomSubmit}
            disabled={!customValue.trim()}
            className="px-4 py-2 bg-[#0A66C2] text-white rounded-lg text-sm font-medium hover:bg-[#004182] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Add
          </button>
          <button
            onClick={() => {
              setShowCustomInput(false);
              setCustomValue('');
            }}
            className="px-2.5 py-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Selected custom values (for multiSelect) */}
      {multiSelect && selectedValues.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {selectedValues
            .filter(v => !suggestions.some(s => s.value === v))
            .map((value) => (
              <span
                key={String(value)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0A66C2]/10 text-[#0A66C2] rounded-lg text-sm font-medium"
              >
                {String(value)}
                <button
                  onClick={() => onSelect(selectedValues.filter(v => v !== value))}
                  className="hover:text-[#004182]"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            ))}
        </div>
      )}

      {/* Helper text for multiSelect */}
      {multiSelect && (
        <p className="text-xs text-gray-400 dark:text-gray-500">
          Select multiple options or add custom values
        </p>
      )}
    </div>
  );
};

export default PlannerQuestionCard;
