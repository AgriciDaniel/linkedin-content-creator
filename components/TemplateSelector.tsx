import React, { useState } from 'react';
import { CarouselTemplate, rgbToCSS } from '../types/carouselTemplate';
import { carouselTemplates } from '../templates/carouselTemplates';

interface TemplateSelectorProps {
  selectedTemplate: CarouselTemplate;
  onTemplateChange: (template: CarouselTemplate) => void;
  disabled?: boolean;
}

const TemplateSelector: React.FC<TemplateSelectorProps> = ({
  selectedTemplate,
  onTemplateChange,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const getTemplatePreviewStyle = (template: CarouselTemplate): React.CSSProperties => {
    const bg = template.background;

    if (bg.type === 'gradient' && bg.gradient) {
      return {
        background: `linear-gradient(${bg.gradient.angle}deg, ${rgbToCSS(bg.gradient.from)}, ${rgbToCSS(bg.gradient.to)})`,
      };
    }

    if (bg.type === 'solid' && bg.color) {
      return {
        backgroundColor: rgbToCSS(bg.color),
      };
    }

    return { backgroundColor: '#1a1a1a' };
  };

  const getAccentColor = (template: CarouselTemplate): string => {
    return rgbToCSS(template.typography.accentColor);
  };

  const handleSelect = (template: CarouselTemplate) => {
    onTemplateChange(template);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      {/* Collapsed View - Shows selected template */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full flex items-center justify-between p-3 rounded-lg border-2 transition-all ${
          isOpen
            ? 'border-[#0A66C2] bg-[#0A66C2]/5 dark:bg-[#0A66C2]/10'
            : 'border-gray-200 dark:border-[#3E4042] hover:border-gray-300 dark:hover:border-gray-500 bg-white dark:bg-black/20'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <div className="flex items-center gap-3">
          {/* Template preview swatch with Aa styling */}
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center shadow-sm border border-white/20"
            style={getTemplatePreviewStyle(selectedTemplate)}
          >
            <div className="text-center">
              <div
                className="text-[10px] font-bold"
                style={{ color: rgbToCSS(selectedTemplate.typography.titleColor) }}
              >
                Aa
              </div>
              <div
                className="w-5 h-0.5 mx-auto mt-0.5 rounded-full"
                style={{ backgroundColor: getAccentColor(selectedTemplate) }}
              />
            </div>
          </div>

          <div className="text-left">
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
              {selectedTemplate.name}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Click to change template
            </p>
          </div>
        </div>

        <svg
          className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expanded View - Template grid */}
      {isOpen && (
        <div className="absolute z-20 top-full left-0 right-0 mt-2 p-2 bg-white dark:bg-[#1D2226] rounded-xl border border-gray-200 dark:border-[#3E4042] shadow-xl animate-fade-in">
          <div className="grid grid-cols-3 gap-1.5">
            {carouselTemplates.map((template) => (
              <button
                key={template.id}
                onClick={() => handleSelect(template)}
                disabled={disabled}
                className={`group relative p-1.5 rounded-lg border-2 transition-all duration-150 ${
                  selectedTemplate.id === template.id
                    ? 'border-[#0A66C2] bg-[#0A66C2]/10 dark:bg-[#0A66C2]/20'
                    : 'border-transparent hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-black/30'
                }`}
              >
                {/* Template preview - smaller */}
                <div
                  className="w-full h-14 rounded-md mb-1 flex items-center justify-center shadow-sm"
                  style={getTemplatePreviewStyle(template)}
                >
                  <div className="text-center">
                    <div
                      className="text-[10px] font-bold"
                      style={{ color: rgbToCSS(template.typography.titleColor) }}
                    >
                      Aa
                    </div>
                    <div
                      className="w-5 h-0.5 mx-auto mt-0.5 rounded-full"
                      style={{ backgroundColor: getAccentColor(template) }}
                    />
                  </div>
                </div>

                {/* Template name - bigger */}
                <p className="text-xs font-medium text-gray-700 dark:text-gray-300 text-center truncate">
                  {template.name}
                </p>

                {/* Selected checkmark */}
                {selectedTemplate.id === template.id && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-[#0A66C2] rounded-full flex items-center justify-center shadow-sm">
                    <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Backdrop to close */}
      {isOpen && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

export default TemplateSelector;
