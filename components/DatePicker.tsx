import React, { useState, useEffect } from 'react';
import { getScheduledPosts, getDraftPosts, ScheduledPost } from '../services/schedulerService';

interface DatePickerProps {
  value: string; // YYYY-MM-DD format
  onChange: (date: string) => void;
  minDate?: string;
  className?: string;
}

const DatePicker: React.FC<DatePickerProps> = ({ value, onChange, minDate, className }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const date = value ? new Date(value + 'T00:00:00') : new Date();
    return new Date(date.getFullYear(), date.getMonth(), 1);
  });
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [draftPosts, setDraftPosts] = useState<ScheduledPost[]>([]);

  // Load scheduled posts
  useEffect(() => {
    setPosts(getScheduledPosts());
    setDraftPosts(getDraftPosts());
  }, [isOpen]);

  const selectedDate = value ? new Date(value + 'T00:00:00') : null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const minDateObj = minDate ? new Date(minDate + 'T00:00:00') : today;

  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const dayNames = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  const getPostsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    const scheduled = posts.filter(p => {
      const postDate = new Date(p.scheduledAt).toISOString().split('T')[0];
      return postDate === dateStr;
    });
    const drafts = draftPosts.filter(p => {
      const postDate = new Date(p.scheduledAt).toISOString().split('T')[0];
      return postDate === dateStr;
    });
    return { scheduled, drafts };
  };

  const isToday = (date: Date) => {
    const todayDate = new Date();
    return date.getDate() === todayDate.getDate() &&
           date.getMonth() === todayDate.getMonth() &&
           date.getFullYear() === todayDate.getFullYear();
  };

  const isSelected = (date: Date) => {
    if (!selectedDate) return false;
    return date.getDate() === selectedDate.getDate() &&
           date.getMonth() === selectedDate.getMonth() &&
           date.getFullYear() === selectedDate.getFullYear();
  };

  const isDisabled = (date: Date) => {
    return date < minDateObj;
  };

  const handleDateClick = (day: number) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    if (!isDisabled(date)) {
      const dateStr = date.toISOString().split('T')[0];
      onChange(dateStr);
      setIsOpen(false);
    }
  };

  const goToPrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return 'Select date';
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
  };

  // Build calendar days
  const calendarDays: (number | null)[] = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    calendarDays.push(null);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day);
  }

  return (
    <div className={`relative ${className || ''}`}>
      {/* Input display */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 bg-white dark:bg-black border border-gray-300 dark:border-[#3E4042] rounded-lg text-gray-900 dark:text-white text-left flex items-center justify-between hover:border-[#0A66C2] transition-colors"
      >
        <span>{formatDisplayDate(value)}</span>
        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </button>

      {/* Dropdown Calendar */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

          {/* Calendar */}
          <div className="absolute top-full left-0 mt-1 z-50 bg-white dark:bg-[#1D2226] border border-gray-200 dark:border-[#3E4042] rounded-xl shadow-2xl p-3 w-[300px] animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <button
                type="button"
                onClick={goToPrevMonth}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
              >
                <svg className="w-4 h-4 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
              </span>
              <button
                type="button"
                onClick={goToNextMonth}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
              >
                <svg className="w-4 h-4 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* Day names */}
            <div className="grid grid-cols-7 gap-1 mb-1">
              {dayNames.map(day => (
                <div key={day} className="text-center text-[10px] font-medium text-gray-500 dark:text-gray-400 py-1">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day, index) => {
                if (day === null) {
                  return <div key={`empty-${index}`} className="h-9" />;
                }

                const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
                const { scheduled, drafts } = getPostsForDate(date);
                const hasScheduled = scheduled.length > 0;
                const hasDrafts = drafts.length > 0;
                const disabled = isDisabled(date);
                const selected = isSelected(date);
                const todayDate = isToday(date);

                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => handleDateClick(day)}
                    disabled={disabled}
                    className={`relative h-9 rounded-lg text-sm font-medium transition-all ${
                      disabled
                        ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                        : selected
                          ? 'bg-[#0A66C2] text-white'
                          : todayDate
                            ? 'bg-[#0A66C2]/10 text-[#0A66C2] hover:bg-[#0A66C2]/20'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10'
                    }`}
                    title={hasScheduled || hasDrafts ? `${scheduled.length} scheduled, ${drafts.length} drafts` : undefined}
                  >
                    {day}
                    {/* Post indicators */}
                    {(hasScheduled || hasDrafts) && (
                      <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 flex gap-0.5">
                        {hasScheduled && (
                          <span className={`w-1.5 h-1.5 rounded-full ${selected ? 'bg-white' : 'bg-[#0A66C2]'}`} />
                        )}
                        {hasDrafts && (
                          <span className={`w-1.5 h-1.5 rounded-full ${selected ? 'bg-white/70' : 'bg-amber-500'}`} />
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-200 dark:border-[#3E4042]">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#0A66C2]" />
                <span className="text-[10px] text-gray-500 dark:text-gray-400">Scheduled</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span className="text-[10px] text-gray-500 dark:text-gray-400">Draft</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default DatePicker;
