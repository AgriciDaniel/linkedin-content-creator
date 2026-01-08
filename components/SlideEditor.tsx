import React, { useState, useEffect } from 'react';
import {
  SlideData,
  TitleHookData,
  BulletListData,
  NumberedStepsData,
  StatCardData,
  BarChartData,
  PieChartData,
  LineChartData,
  ComparisonData,
  QuoteData,
  CTAData,
} from '../types/slideLayouts';

interface SlideEditorProps {
  slide: SlideData;
  slideIndex: number;
  onSave: (updatedSlide: SlideData) => void;
  onCancel: () => void;
}

const SlideEditor: React.FC<SlideEditorProps> = ({
  slide,
  slideIndex,
  onSave,
  onCancel,
}) => {
  const [editedSlide, setEditedSlide] = useState<SlideData>(slide);

  useEffect(() => {
    setEditedSlide(slide);
  }, [slide]);

  const handleSave = () => {
    onSave(editedSlide);
  };

  const getLayoutLabel = (layout: string): string => {
    const labels: Record<string, string> = {
      'title-hook': 'Title Hook',
      'bullet-list': 'Bullet List',
      'numbered-steps': 'Numbered Steps',
      'stat-card': 'Stat Card',
      'bar-chart': 'Bar Chart',
      'pie-chart': 'Pie Chart',
      'line-chart': 'Line Chart',
      'comparison': 'Comparison',
      'quote': 'Quote',
      'cta': 'Call to Action',
    };
    return labels[layout] || layout;
  };

  const renderEditor = () => {
    switch (editedSlide.layout) {
      case 'title-hook':
        return renderTitleHookEditor(editedSlide as TitleHookData);
      case 'bullet-list':
        return renderBulletListEditor(editedSlide as BulletListData);
      case 'numbered-steps':
        return renderNumberedStepsEditor(editedSlide as NumberedStepsData);
      case 'stat-card':
        return renderStatCardEditor(editedSlide as StatCardData);
      case 'bar-chart':
      case 'pie-chart':
      case 'line-chart':
        return renderChartEditor(editedSlide as BarChartData | PieChartData | LineChartData);
      case 'comparison':
        return renderComparisonEditor(editedSlide as ComparisonData);
      case 'quote':
        return renderQuoteEditor(editedSlide as QuoteData);
      case 'cta':
        return renderCTAEditor(editedSlide as CTAData);
      default:
        return <p className="text-gray-500">Unsupported layout type</p>;
    }
  };

  const renderTitleHookEditor = (data: TitleHookData) => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Headline
        </label>
        <input
          type="text"
          value={data.headline}
          onChange={(e) =>
            setEditedSlide({ ...data, headline: e.target.value })
          }
          className="w-full px-3 py-2 bg-white dark:bg-black border border-gray-300 dark:border-[#3E4042] rounded-lg focus:ring-2 focus:ring-[#0A66C2] focus:border-transparent outline-none text-black dark:text-white"
          placeholder="Main headline (max 10 words)"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Subtext (optional)
        </label>
        <input
          type="text"
          value={data.subtext || ''}
          onChange={(e) =>
            setEditedSlide({ ...data, subtext: e.target.value || undefined })
          }
          className="w-full px-3 py-2 bg-white dark:bg-black border border-gray-300 dark:border-[#3E4042] rounded-lg focus:ring-2 focus:ring-[#0A66C2] focus:border-transparent outline-none text-black dark:text-white"
          placeholder="Optional tagline (max 15 words)"
        />
      </div>
    </div>
  );

  const renderBulletListEditor = (data: BulletListData) => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Title
        </label>
        <input
          type="text"
          value={data.title}
          onChange={(e) =>
            setEditedSlide({ ...data, title: e.target.value })
          }
          className="w-full px-3 py-2 bg-white dark:bg-black border border-gray-300 dark:border-[#3E4042] rounded-lg focus:ring-2 focus:ring-[#0A66C2] focus:border-transparent outline-none text-black dark:text-white"
          placeholder="Section title"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Bullets (2-5 items)
        </label>
        {data.bullets.map((bullet, index) => (
          <div key={index} className="flex gap-2 mb-2">
            <span className="text-gray-500 dark:text-gray-400 py-2 w-6">{index + 1}.</span>
            <input
              type="text"
              value={bullet}
              onChange={(e) => {
                const newBullets = [...data.bullets];
                newBullets[index] = e.target.value;
                setEditedSlide({ ...data, bullets: newBullets });
              }}
              className="flex-1 px-3 py-2 bg-white dark:bg-black border border-gray-300 dark:border-[#3E4042] rounded-lg focus:ring-2 focus:ring-[#0A66C2] focus:border-transparent outline-none text-black dark:text-white"
              placeholder="Bullet point"
            />
            {data.bullets.length > 2 && (
              <button
                onClick={() => {
                  const newBullets = data.bullets.filter((_, i) => i !== index);
                  setEditedSlide({ ...data, bullets: newBullets });
                }}
                className="px-2 text-red-500 hover:text-red-700"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        ))}
        {data.bullets.length < 5 && (
          <button
            onClick={() =>
              setEditedSlide({ ...data, bullets: [...data.bullets, ''] })
            }
            className="text-sm text-[#0A66C2] hover:underline flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add bullet
          </button>
        )}
      </div>
    </div>
  );

  const renderNumberedStepsEditor = (data: NumberedStepsData) => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Title
        </label>
        <input
          type="text"
          value={data.title}
          onChange={(e) =>
            setEditedSlide({ ...data, title: e.target.value })
          }
          className="w-full px-3 py-2 bg-white dark:bg-black border border-gray-300 dark:border-[#3E4042] rounded-lg focus:ring-2 focus:ring-[#0A66C2] focus:border-transparent outline-none text-black dark:text-white"
          placeholder="Section title"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Steps (3-5 items)
        </label>
        {data.steps.map((step, index) => (
          <div key={index} className="flex gap-2 mb-2">
            <span className="text-[#0A66C2] font-bold py-2 w-6">{index + 1}.</span>
            <input
              type="text"
              value={step}
              onChange={(e) => {
                const newSteps = [...data.steps];
                newSteps[index] = e.target.value;
                setEditedSlide({ ...data, steps: newSteps });
              }}
              className="flex-1 px-3 py-2 bg-white dark:bg-black border border-gray-300 dark:border-[#3E4042] rounded-lg focus:ring-2 focus:ring-[#0A66C2] focus:border-transparent outline-none text-black dark:text-white"
              placeholder="Step description"
            />
            {data.steps.length > 3 && (
              <button
                onClick={() => {
                  const newSteps = data.steps.filter((_, i) => i !== index);
                  setEditedSlide({ ...data, steps: newSteps });
                }}
                className="px-2 text-red-500 hover:text-red-700"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        ))}
        {data.steps.length < 5 && (
          <button
            onClick={() =>
              setEditedSlide({ ...data, steps: [...data.steps, ''] })
            }
            className="text-sm text-[#0A66C2] hover:underline flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add step
          </button>
        )}
      </div>
    </div>
  );

  const renderStatCardEditor = (data: StatCardData) => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Title
        </label>
        <input
          type="text"
          value={data.title}
          onChange={(e) =>
            setEditedSlide({ ...data, title: e.target.value })
          }
          className="w-full px-3 py-2 bg-white dark:bg-black border border-gray-300 dark:border-[#3E4042] rounded-lg focus:ring-2 focus:ring-[#0A66C2] focus:border-transparent outline-none text-black dark:text-white"
          placeholder="Context for the stat"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Stat (the big number)
        </label>
        <input
          type="text"
          value={data.stat}
          onChange={(e) =>
            setEditedSlide({ ...data, stat: e.target.value })
          }
          className="w-full px-3 py-2 bg-white dark:bg-black border border-gray-300 dark:border-[#3E4042] rounded-lg focus:ring-2 focus:ring-[#0A66C2] focus:border-transparent outline-none text-black dark:text-white text-xl font-bold"
          placeholder="e.g., 87%, $2.5M, 10x"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Description
        </label>
        <input
          type="text"
          value={data.description}
          onChange={(e) =>
            setEditedSlide({ ...data, description: e.target.value })
          }
          className="w-full px-3 py-2 bg-white dark:bg-black border border-gray-300 dark:border-[#3E4042] rounded-lg focus:ring-2 focus:ring-[#0A66C2] focus:border-transparent outline-none text-black dark:text-white"
          placeholder="What the stat means"
        />
      </div>
    </div>
  );

  const renderChartEditor = (data: BarChartData | PieChartData | LineChartData) => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Chart Title
        </label>
        <input
          type="text"
          value={data.title}
          onChange={(e) =>
            setEditedSlide({ ...data, title: e.target.value })
          }
          className="w-full px-3 py-2 bg-white dark:bg-black border border-gray-300 dark:border-[#3E4042] rounded-lg focus:ring-2 focus:ring-[#0A66C2] focus:border-transparent outline-none text-black dark:text-white"
          placeholder="Chart title"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Data Points (3-6 items)
        </label>
        {data.labels.map((label, index) => (
          <div key={index} className="flex gap-2 mb-2">
            <input
              type="text"
              value={label}
              onChange={(e) => {
                const newLabels = [...data.labels];
                newLabels[index] = e.target.value;
                setEditedSlide({ ...data, labels: newLabels });
              }}
              className="flex-1 px-3 py-2 bg-white dark:bg-black border border-gray-300 dark:border-[#3E4042] rounded-lg focus:ring-2 focus:ring-[#0A66C2] focus:border-transparent outline-none text-black dark:text-white"
              placeholder="Label"
            />
            <input
              type="number"
              value={data.values[index] || 0}
              onChange={(e) => {
                const newValues = [...data.values];
                newValues[index] = parseFloat(e.target.value) || 0;
                setEditedSlide({ ...data, values: newValues });
              }}
              className="w-24 px-3 py-2 bg-white dark:bg-black border border-gray-300 dark:border-[#3E4042] rounded-lg focus:ring-2 focus:ring-[#0A66C2] focus:border-transparent outline-none text-black dark:text-white"
              placeholder="Value"
            />
            {data.labels.length > 3 && (
              <button
                onClick={() => {
                  const newLabels = data.labels.filter((_, i) => i !== index);
                  const newValues = data.values.filter((_, i) => i !== index);
                  setEditedSlide({ ...data, labels: newLabels, values: newValues });
                }}
                className="px-2 text-red-500 hover:text-red-700"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        ))}
        {data.labels.length < 6 && (
          <button
            onClick={() =>
              setEditedSlide({
                ...data,
                labels: [...data.labels, ''],
                values: [...data.values, 0],
              })
            }
            className="text-sm text-[#0A66C2] hover:underline flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add data point
          </button>
        )}
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Description (optional)
        </label>
        <input
          type="text"
          value={data.description || ''}
          onChange={(e) =>
            setEditedSlide({ ...data, description: e.target.value || undefined })
          }
          className="w-full px-3 py-2 bg-white dark:bg-black border border-gray-300 dark:border-[#3E4042] rounded-lg focus:ring-2 focus:ring-[#0A66C2] focus:border-transparent outline-none text-black dark:text-white"
          placeholder="Optional insight"
        />
      </div>
    </div>
  );

  const renderComparisonEditor = (data: ComparisonData) => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Title
        </label>
        <input
          type="text"
          value={data.title}
          onChange={(e) =>
            setEditedSlide({ ...data, title: e.target.value })
          }
          className="w-full px-3 py-2 bg-white dark:bg-black border border-gray-300 dark:border-[#3E4042] rounded-lg focus:ring-2 focus:ring-[#0A66C2] focus:border-transparent outline-none text-black dark:text-white"
          placeholder="Comparison title"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="p-3 bg-gray-50 dark:bg-black/30 rounded-lg border border-gray-200 dark:border-[#3E4042]">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Before</h4>
          <input
            type="text"
            value={data.before.label}
            onChange={(e) =>
              setEditedSlide({
                ...data,
                before: { ...data.before, label: e.target.value },
              })
            }
            className="w-full px-3 py-2 mb-2 bg-white dark:bg-black border border-gray-300 dark:border-[#3E4042] rounded-lg focus:ring-2 focus:ring-[#0A66C2] focus:border-transparent outline-none text-black dark:text-white text-sm"
            placeholder="Label"
          />
          <input
            type="text"
            value={data.before.value}
            onChange={(e) =>
              setEditedSlide({
                ...data,
                before: { ...data.before, value: e.target.value },
              })
            }
            className="w-full px-3 py-2 bg-white dark:bg-black border border-gray-300 dark:border-[#3E4042] rounded-lg focus:ring-2 focus:ring-[#0A66C2] focus:border-transparent outline-none text-black dark:text-white text-sm"
            placeholder="Value"
          />
        </div>
        <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
          <h4 className="text-sm font-medium text-green-700 dark:text-green-300 mb-2">After</h4>
          <input
            type="text"
            value={data.after.label}
            onChange={(e) =>
              setEditedSlide({
                ...data,
                after: { ...data.after, label: e.target.value },
              })
            }
            className="w-full px-3 py-2 mb-2 bg-white dark:bg-black border border-gray-300 dark:border-[#3E4042] rounded-lg focus:ring-2 focus:ring-[#0A66C2] focus:border-transparent outline-none text-black dark:text-white text-sm"
            placeholder="Label"
          />
          <input
            type="text"
            value={data.after.value}
            onChange={(e) =>
              setEditedSlide({
                ...data,
                after: { ...data.after, value: e.target.value },
              })
            }
            className="w-full px-3 py-2 bg-white dark:bg-black border border-gray-300 dark:border-[#3E4042] rounded-lg focus:ring-2 focus:ring-[#0A66C2] focus:border-transparent outline-none text-black dark:text-white text-sm"
            placeholder="Value"
          />
        </div>
      </div>
    </div>
  );

  const renderQuoteEditor = (data: QuoteData) => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Quote
        </label>
        <textarea
          value={data.quote}
          onChange={(e) =>
            setEditedSlide({ ...data, quote: e.target.value })
          }
          rows={3}
          className="w-full px-3 py-2 bg-white dark:bg-black border border-gray-300 dark:border-[#3E4042] rounded-lg focus:ring-2 focus:ring-[#0A66C2] focus:border-transparent outline-none text-black dark:text-white resize-none"
          placeholder="The quote text (max 100 chars)"
        />
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {data.quote.length}/100 characters
        </p>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Attribution
        </label>
        <input
          type="text"
          value={data.attribution}
          onChange={(e) =>
            setEditedSlide({ ...data, attribution: e.target.value })
          }
          className="w-full px-3 py-2 bg-white dark:bg-black border border-gray-300 dark:border-[#3E4042] rounded-lg focus:ring-2 focus:ring-[#0A66C2] focus:border-transparent outline-none text-black dark:text-white"
          placeholder="Who said it"
        />
      </div>
    </div>
  );

  const renderCTAEditor = (data: CTAData) => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Headline
        </label>
        <input
          type="text"
          value={data.headline}
          onChange={(e) =>
            setEditedSlide({ ...data, headline: e.target.value })
          }
          className="w-full px-3 py-2 bg-white dark:bg-black border border-gray-300 dark:border-[#3E4042] rounded-lg focus:ring-2 focus:ring-[#0A66C2] focus:border-transparent outline-none text-black dark:text-white"
          placeholder="Main CTA (max 8 words)"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Subtext
        </label>
        <input
          type="text"
          value={data.subtext}
          onChange={(e) =>
            setEditedSlide({ ...data, subtext: e.target.value })
          }
          className="w-full px-3 py-2 bg-white dark:bg-black border border-gray-300 dark:border-[#3E4042] rounded-lg focus:ring-2 focus:ring-[#0A66C2] focus:border-transparent outline-none text-black dark:text-white"
          placeholder="Supporting text (max 20 words)"
        />
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-[#1D2226] rounded-xl shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-[#3E4042] flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Edit Slide {slideIndex + 1}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {getLayoutLabel(editedSlide.layout)}
            </p>
          </div>
          <button
            onClick={onCancel}
            className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-black/30"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 overflow-y-auto max-h-[60vh]">
          {renderEditor()}
        </div>

        <div className="p-4 border-t border-gray-200 dark:border-[#3E4042] flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-black border border-gray-300 dark:border-[#3E4042] rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm font-medium text-white bg-[#0A66C2] rounded-lg hover:bg-[#004182] transition-colors"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default SlideEditor;
