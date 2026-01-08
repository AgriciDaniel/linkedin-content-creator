import React, { useState, useRef, useEffect } from 'react';

interface TimePickerProps {
  value: string; // HH:mm format (24h)
  onChange: (time: string) => void;
  suggestedTimes?: { time: string; label: string; description?: string }[];
  className?: string;
}

const TimePicker: React.FC<TimePickerProps> = ({ value, onChange, suggestedTimes, className }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'picker' | 'suggested'>('picker');
  const hoursRef = useRef<HTMLDivElement>(null);
  const minutesRef = useRef<HTMLDivElement>(null);

  // Parse current value
  const [hours, minutes] = value ? value.split(':').map(Number) : [9, 0];
  const isPM = hours >= 12;
  const displayHour = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;

  // Scroll to selected time when opened
  useEffect(() => {
    if (isOpen && hoursRef.current && minutesRef.current) {
      const hourButton = hoursRef.current.querySelector(`[data-hour="${displayHour}"]`);
      const minuteButton = minutesRef.current.querySelector(`[data-minute="${minutes}"]`);
      if (hourButton) {
        hourButton.scrollIntoView({ block: 'center', behavior: 'instant' });
      }
      if (minuteButton) {
        minuteButton.scrollIntoView({ block: 'center', behavior: 'instant' });
      }
    }
  }, [isOpen, displayHour, minutes]);

  const setHour = (hour: number) => {
    let newHour = hour;
    if (isPM && hour !== 12) {
      newHour = hour + 12;
    } else if (!isPM && hour === 12) {
      newHour = 0;
    }
    const newTime = `${newHour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    onChange(newTime);
  };

  const setMinute = (minute: number) => {
    const newTime = `${hours.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    onChange(newTime);
  };

  const toggleAMPM = () => {
    let newHour = hours;
    if (isPM) {
      newHour = hours === 12 ? 0 : hours - 12;
    } else {
      newHour = hours === 0 ? 12 : hours + 12;
    }
    const newTime = `${newHour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    onChange(newTime);
  };

  const formatDisplayTime = (timeStr: string) => {
    if (!timeStr) return 'Select time';
    const [h, m] = timeStr.split(':').map(Number);
    const pm = h >= 12;
    const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${displayH.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} ${pm ? 'PM' : 'AM'}`;
  };

  const hourOptions = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  const minuteOptions = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

  return (
    <div className={`relative ${className || ''}`}>
      {/* Input display */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 bg-white dark:bg-black border border-gray-300 dark:border-[#3E4042] rounded-lg text-gray-900 dark:text-white text-left flex items-center justify-between hover:border-[#0A66C2] transition-colors"
      >
        <span>{formatDisplayTime(value)}</span>
        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

          {/* Time Picker */}
          <div className="absolute top-full left-0 mt-1 z-50 bg-white dark:bg-[#1D2226] border border-gray-200 dark:border-[#3E4042] rounded-xl shadow-2xl w-[280px] animate-fade-in overflow-hidden">
            {/* Tabs */}
            {suggestedTimes && suggestedTimes.length > 0 && (
              <div className="flex border-b border-gray-200 dark:border-[#3E4042]">
                <button
                  type="button"
                  onClick={() => setActiveTab('picker')}
                  className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
                    activeTab === 'picker'
                      ? 'text-[#0A66C2] border-b-2 border-[#0A66C2] bg-[#0A66C2]/5'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  Custom Time
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('suggested')}
                  className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
                    activeTab === 'suggested'
                      ? 'text-[#0A66C2] border-b-2 border-[#0A66C2] bg-[#0A66C2]/5'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  Best Times
                </button>
              </div>
            )}

            {/* Picker Tab */}
            {activeTab === 'picker' && (
              <div className="p-3">
                <div className="flex gap-2">
                  {/* Hours */}
                  <div className="flex-1">
                    <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-1 text-center uppercase">Hour</p>
                    <div
                      ref={hoursRef}
                      className="h-32 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600"
                    >
                      <div className="space-y-0.5">
                        {hourOptions.map(hour => (
                          <button
                            key={hour}
                            type="button"
                            data-hour={hour}
                            onClick={() => setHour(hour)}
                            className={`w-full px-2 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                              displayHour === hour
                                ? 'bg-[#0A66C2] text-white'
                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10'
                            }`}
                          >
                            {hour.toString().padStart(2, '0')}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Separator */}
                  <div className="flex items-center text-gray-400 dark:text-gray-500 text-xl font-bold pt-5">:</div>

                  {/* Minutes */}
                  <div className="flex-1">
                    <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-1 text-center uppercase">Min</p>
                    <div
                      ref={minutesRef}
                      className="h-32 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600"
                    >
                      <div className="space-y-0.5">
                        {minuteOptions.map(minute => (
                          <button
                            key={minute}
                            type="button"
                            data-minute={minute}
                            onClick={() => setMinute(minute)}
                            className={`w-full px-2 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                              minutes === minute
                                ? 'bg-[#0A66C2] text-white'
                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10'
                            }`}
                          >
                            {minute.toString().padStart(2, '0')}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* AM/PM */}
                  <div className="w-14">
                    <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-1 text-center uppercase">Period</p>
                    <div className="space-y-0.5 pt-1">
                      <button
                        type="button"
                        onClick={() => { if (isPM) toggleAMPM(); }}
                        className={`w-full px-2 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                          !isPM
                            ? 'bg-[#0A66C2] text-white'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10'
                        }`}
                      >
                        AM
                      </button>
                      <button
                        type="button"
                        onClick={() => { if (!isPM) toggleAMPM(); }}
                        className={`w-full px-2 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                          isPM
                            ? 'bg-[#0A66C2] text-white'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10'
                        }`}
                      >
                        PM
                      </button>
                    </div>
                  </div>
                </div>

                {/* Current Selection */}
                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-[#3E4042] text-center">
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    {formatDisplayTime(value)}
                  </span>
                </div>
              </div>
            )}

            {/* Suggested Times Tab */}
            {activeTab === 'suggested' && suggestedTimes && (
              <div className="p-2 max-h-48 overflow-y-auto">
                <div className="space-y-1">
                  {suggestedTimes.map(suggestion => (
                    <button
                      key={suggestion.time}
                      type="button"
                      onClick={() => {
                        onChange(suggestion.time);
                        setIsOpen(false);
                      }}
                      className={`w-full px-3 py-2 text-left rounded-lg transition-colors ${
                        value === suggestion.time
                          ? 'bg-[#0A66C2] text-white'
                          : 'hover:bg-gray-100 dark:hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-sm font-medium ${
                          value === suggestion.time ? 'text-white' : 'text-gray-900 dark:text-white'
                        }`}>
                          {suggestion.label}
                        </span>
                        {value === suggestion.time && (
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                      {suggestion.description && (
                        <p className={`text-[10px] mt-0.5 ${
                          value === suggestion.time ? 'text-white/70' : 'text-gray-500 dark:text-gray-400'
                        }`}>
                          {suggestion.description}
                        </p>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Done button */}
            <div className="p-2 border-t border-gray-200 dark:border-[#3E4042]">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-full px-3 py-2 bg-[#0A66C2] text-white text-sm font-medium rounded-lg hover:bg-[#004182] transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default TimePicker;
