import React from 'react';
import { ContentType } from '../types';

interface ContentTypeSelectorProps {
  selectedType: ContentType;
  onTypeChange: (type: ContentType) => void;
  disabled?: boolean;
}

interface ContentTypeOption {
  type: ContentType;
  label: string;
  icon: React.ReactNode;
  badge?: string;
  badgeColor?: string;
}

const contentTypes: ContentTypeOption[] = [
  {
    type: 'carousel',
    label: 'Carousel',
    badge: '2x Reach',
    badgeColor: 'bg-emerald-500',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    ),
  },
  {
    type: 'image',
    label: 'Image',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    type: 'text',
    label: 'Text Only',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
];

const ContentTypeSelector: React.FC<ContentTypeSelectorProps> = ({
  selectedType,
  onTypeChange,
  disabled = false,
}) => {
  return (
    <div className="grid grid-cols-3 gap-2">
      {contentTypes.map((option) => {
        const isSelected = selectedType === option.type;
        return (
          <button
            key={option.type}
            onClick={() => onTypeChange(option.type)}
            disabled={disabled}
            className={`relative flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all duration-200 ${
              isSelected
                ? 'border-[#0A66C2] bg-gradient-to-br from-[#0A66C2]/10 to-[#0A66C2]/5 dark:from-[#0A66C2]/20 dark:to-[#0A66C2]/10 shadow-md'
                : 'border-gray-200 dark:border-[#3E4042] hover:border-[#0A66C2]/50 hover:bg-gray-50 dark:hover:bg-white/5'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            {/* Badge */}
            {option.badge && isSelected && (
              <span className={`absolute -top-2 -right-2 px-1.5 py-0.5 text-[9px] font-bold text-white ${option.badgeColor} rounded-full shadow-sm`}>
                {option.badge}
              </span>
            )}

            {/* Icon */}
            <div className={`${isSelected ? 'text-[#0A66C2]' : 'text-gray-500 dark:text-gray-400'}`}>
              {option.icon}
            </div>

            {/* Label */}
            <span className={`text-xs font-semibold ${
              isSelected ? 'text-[#0A66C2]' : 'text-gray-600 dark:text-gray-300'
            }`}>
              {option.label}
            </span>

            {/* Selected indicator */}
            {isSelected && (
              <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-6 h-1 bg-[#0A66C2] rounded-full" />
            )}
          </button>
        );
      })}
    </div>
  );
};

export default ContentTypeSelector;
