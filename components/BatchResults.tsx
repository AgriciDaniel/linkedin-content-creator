import React, { useState } from 'react';
import { BatchGenerationResult } from '../services/geminiService';
import { schedulePost } from '../services/schedulerService';
import { toast } from '../hooks/useToast';
import { getSuggestedPostingTimes } from '../services/calendarStorage';
import DatePicker from './DatePicker';
import TimePicker from './TimePicker';

interface BatchResultsProps {
  results: BatchGenerationResult[];
  onClose: () => void;
  onSelectPost: (result: BatchGenerationResult) => void;
}

export const BatchResults: React.FC<BatchResultsProps> = ({
  results,
  onClose,
  onSelectPost,
}) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleStartDate, setScheduleStartDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  });
  const [scheduleTime, setScheduleTime] = useState('09:00');
  const [scheduleInterval, setScheduleInterval] = useState(1);

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const selectAll = () => {
    if (selectedIds.size === results.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(results.map(r => r.id)));
    }
  };

  const handleBulkSchedule = () => {
    const selectedResults = results.filter(r => selectedIds.has(r.id));
    if (selectedResults.length === 0) return;

    const startDate = new Date(scheduleStartDate);
    const [hours, minutes] = scheduleTime.split(':').map(Number);
    startDate.setHours(hours, minutes, 0, 0);

    selectedResults.forEach((result, index) => {
      const scheduledDate = new Date(startDate);
      scheduledDate.setDate(scheduledDate.getDate() + (index * scheduleInterval));

      schedulePost({
        scheduledAt: scheduledDate,
        contentType: result.contentType === 'carousel' ? 'carousel' :
                     result.contentType === 'image' ? 'single-image' : 'text-only',
        topic: result.topic,
        post: result.post,
        imagePrompt: result.imagePrompt || undefined,
      });
    });

    toast.success(`Scheduled ${selectedResults.length} posts`);
    setShowScheduleModal(false);
    setSelectedIds(new Set());
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
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
            <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">{results.length} Posts Generated</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {selectedIds.size > 0 ? `${selectedIds.size} selected` : 'Select posts to schedule'}
            </p>
          </div>
        </div>
        <button onClick={onClose} className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors">
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Bulk Actions */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 dark:bg-black/20 border-b border-gray-200 dark:border-[#3E4042]">
        <button
          onClick={selectAll}
          className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-colors ${
            selectedIds.size === results.length
              ? 'bg-[#0A66C2] border-[#0A66C2]'
              : 'border-gray-300 dark:border-gray-600'
          }`}>
            {selectedIds.size === results.length && (
              <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
          </div>
          Select all
        </button>

        {selectedIds.size > 0 && (
          <button
            onClick={() => setShowScheduleModal(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-[#0A66C2] text-white text-xs font-medium rounded-lg hover:bg-[#004182] transition-colors"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Schedule ({selectedIds.size})
          </button>
        )}
      </div>

      {/* Results Grid */}
      <div className="p-3 max-h-[55vh] overflow-y-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {results.map((result) => (
            <div
              key={result.id}
              className={`relative border rounded-lg p-3 transition-all cursor-pointer ${
                selectedIds.has(result.id)
                  ? 'border-[#0A66C2] bg-[#0A66C2]/5 dark:bg-[#0A66C2]/10'
                  : 'border-gray-200 dark:border-[#3E4042] hover:border-gray-300 dark:hover:border-gray-600'
              }`}
              onClick={() => toggleSelect(result.id)}
            >
              {/* Selection checkbox */}
              <div className="absolute top-2.5 right-2.5">
                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                  selectedIds.has(result.id)
                    ? 'bg-[#0A66C2] border-[#0A66C2]'
                    : 'border-gray-300 dark:border-gray-600'
                }`}>
                  {selectedIds.has(result.id) && (
                    <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
              </div>

              {/* Header */}
              <div className="flex items-center gap-2 mb-2">
                <span className={`w-1.5 h-5 rounded-full ${getContentTypeColor(result.contentType)}`} />
                <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase">
                  {result.contentType}
                </span>
                {result.angle && (
                  <span className="text-[10px] text-gray-400 dark:text-gray-500 truncate">
                    · {result.angle}
                  </span>
                )}
              </div>

              {/* Post Preview */}
              <p className="text-xs text-gray-700 dark:text-gray-300 line-clamp-3 mb-2.5 pr-6">
                {result.post}
              </p>

              {/* Actions */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectPost(result);
                  }}
                  className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-[#0A66C2] bg-[#0A66C2]/10 rounded hover:bg-[#0A66C2]/20 transition-colors"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                  Edit
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigator.clipboard.writeText(result.post);
                    toast.success('Copied');
                  }}
                  className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-white/5 rounded hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Schedule Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white dark:bg-[#1D2226] rounded-xl shadow-2xl max-w-sm w-full border border-gray-200 dark:border-[#3E4042]">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-[#3E4042]">
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Schedule {selectedIds.size} Posts</h3>
                <p className="text-[10px] text-gray-500 dark:text-gray-400">Set timing for bulk schedule</p>
              </div>
              <button onClick={() => setShowScheduleModal(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-white/10 rounded transition-colors">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4 space-y-3">
              <div>
                <label className="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-1 uppercase">Start date</label>
                <DatePicker
                  value={scheduleStartDate}
                  onChange={setScheduleStartDate}
                  minDate={new Date().toISOString().split('T')[0]}
                />
              </div>

              <div>
                <label className="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-1 uppercase">Time</label>
                <TimePicker
                  value={scheduleTime}
                  onChange={setScheduleTime}
                  suggestedTimes={getSuggestedPostingTimes()}
                />
              </div>

              <div>
                <label className="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-1 uppercase">Days between posts</label>
                <div className="flex gap-1.5">
                  {[1, 2, 3, 7].map((days) => (
                    <button
                      key={days}
                      onClick={() => setScheduleInterval(days)}
                      className={`flex-1 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                        scheduleInterval === days
                          ? 'bg-[#0A66C2] text-white border-[#0A66C2]'
                          : 'bg-white dark:bg-black border-gray-200 dark:border-[#3E4042] text-gray-600 dark:text-gray-400 hover:border-[#0A66C2]'
                      }`}
                    >
                      {days === 1 ? 'Daily' : days === 7 ? 'Weekly' : `${days}d`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Preview */}
              <div className="p-2.5 bg-gray-50 dark:bg-black/20 rounded-lg">
                <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-1.5 uppercase">Preview</p>
                <div className="space-y-0.5">
                  {Array.from(selectedIds).slice(0, 3).map((id, index) => {
                    const date = new Date(scheduleStartDate);
                    const [hours, minutes] = scheduleTime.split(':').map(Number);
                    date.setHours(hours, minutes);
                    date.setDate(date.getDate() + (index * scheduleInterval));
                    return (
                      <p key={id} className="text-xs text-gray-600 dark:text-gray-400">
                        Post {index + 1}: {date.toLocaleDateString()} at {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    );
                  })}
                  {selectedIds.size > 3 && (
                    <p className="text-[10px] text-gray-400">+{selectedIds.size - 3} more...</p>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex gap-2 p-3 border-t border-gray-200 dark:border-[#3E4042]">
              <button
                onClick={() => setShowScheduleModal(false)}
                className="flex-1 px-3 py-2 text-xs text-gray-600 dark:text-gray-400 font-medium rounded-lg border border-gray-200 dark:border-[#3E4042] hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkSchedule}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-[#0A66C2] text-white text-xs font-medium rounded-lg hover:bg-[#004182] transition-colors"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Schedule All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BatchResults;
