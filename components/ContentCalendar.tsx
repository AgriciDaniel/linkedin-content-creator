import React, { useState, useEffect } from 'react';
import {
  ScheduledPost,
  getScheduledPosts,
  deleteScheduledPost,
  schedulePost,
  SchedulePostInput,
  getDraftPosts,
  clearDraftAndScheduledPosts,
} from '../services/schedulerService';
import { clearPostHistory } from '../services/postHistoryService';
import { clearMemory } from '../services/memoryService';
import {
  formatScheduledDate,
  getSuggestedPostingTimes,
  createDateWithTime,
} from '../services/calendarStorage';
import { toast } from '../hooks/useToast';
import { ContentType } from '../types';
import { generateLinkedInContent, generateCarouselContent } from '../services/geminiService';
import LoadingSpinner from './LoadingSpinner';
import AIPlannerChat from './AIPlannerChat';
import PostEditModal from './PostEditModal';
import TimePicker from './TimePicker';

interface ContentCalendarProps {
  isOpen: boolean;
  onClose: () => void;
  onScheduleForDate?: (date: Date) => void;
}

const ContentCalendar: React.FC<ContentCalendarProps> = ({ isOpen, onClose, onScheduleForDate }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'month' | 'agenda' | 'planner'>('month');
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [draftPosts, setDraftPosts] = useState<ScheduledPost[]>([]);
  const [selectedPost, setSelectedPost] = useState<ScheduledPost | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDayDetailOpen, setIsDayDetailOpen] = useState(false);
  const [dayDetailDate, setDayDetailDate] = useState<Date | null>(null);
  const [dayDetailPosts, setDayDetailPosts] = useState<ScheduledPost[]>([]);
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);

  // New post form state
  const [newPostTopic, setNewPostTopic] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostTime, setNewPostTime] = useState('09:00');
  const [newPostType, setNewPostType] = useState<ContentType>('carousel');
  const [isGenerating, setIsGenerating] = useState(false);

  // For quick schedule time picker
  const [isTimePickerOpen, setIsTimePickerOpen] = useState(false);
  const [quickScheduleDate, setQuickScheduleDate] = useState<Date | null>(null);
  const [quickScheduleTime, setQuickScheduleTime] = useState('09:00');

  // Load posts
  useEffect(() => {
    if (isOpen) {
      loadPosts();
    }
  }, [isOpen]);

  const loadPosts = () => {
    setPosts(getScheduledPosts());
    setDraftPosts(getDraftPosts());
  };

  // Calendar helpers
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1; // Monday start
    return { daysInMonth, startingDay, firstDay, lastDay };
  };

  const getMonthName = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const isSameDay = (date1: Date, date2: Date) => {
    return (
      date1.getDate() === date2.getDate() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getFullYear() === date2.getFullYear()
    );
  };

  const isToday = (date: Date) => isSameDay(date, new Date());

  const getPostsForDate = (date: Date) => {
    const scheduledForDate = posts.filter((post) => isSameDay(new Date(post.scheduledAt), date));
    const draftsForDate = draftPosts.filter((post) => isSameDay(new Date(post.scheduledAt), date));
    return [...scheduledForDate, ...draftsForDate];
  };

  // Check if a post is a draft
  const isDraftPost = (post: ScheduledPost) => post.status === 'draft';

  // Navigation
  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Date click handler
  const handleDateClick = (date: Date) => {
    // If callback provided, show time picker first
    if (onScheduleForDate) {
      setQuickScheduleDate(date);
      setQuickScheduleTime('09:00');
      setIsTimePickerOpen(true);
      return;
    }

    // Fallback: open create modal (if no callback)
    setSelectedDate(date);
    setSelectedPost(null);
    setIsCreateModalOpen(true);
    // Set default time
    setNewPostTime('09:00');
    setNewPostTopic('');
    setNewPostContent('');
    setNewPostType('carousel');
  };

  // Handle quick schedule confirmation (date + time selected)
  const handleQuickScheduleConfirm = () => {
    if (quickScheduleDate && onScheduleForDate) {
      // Create date with selected time
      const [hours, minutes] = quickScheduleTime.split(':').map(Number);
      const dateWithTime = new Date(quickScheduleDate);
      dateWithTime.setHours(hours, minutes, 0, 0);

      onScheduleForDate(dateWithTime);
      setIsTimePickerOpen(false);
      setQuickScheduleDate(null);
      onClose();
    }
  };

  // Post click handler - opens edit modal
  const handlePostClick = (post: ScheduledPost, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedPost(post);
    setIsEditModalOpen(true);
    setIsDayDetailOpen(false); // Close day detail if open
  };

  // Day detail click handler - opens day detail view with all posts for that date
  const handleDayPostsClick = (date: Date, postsForDay: ScheduledPost[], e: React.MouseEvent) => {
    e.stopPropagation();
    setDayDetailDate(date);
    setDayDetailPosts(postsForDay);
    setIsDayDetailOpen(true);
  };

  // Handle post save from edit modal
  const handlePostSave = () => {
    loadPosts();
    setSelectedPost(null);
  };

  // Delete post (with confirmation)
  const handleDelete = (postId: string) => {
    if (window.confirm('Delete this scheduled post?')) {
      handleDeletePost(postId);
    }
  };

  // Delete post (no confirmation - used by modal which has its own)
  const handleDeletePost = (postId: string) => {
    deleteScheduledPost(postId);
    loadPosts();
    setSelectedPost(null);
    setIsEditModalOpen(false);
    toast.success('Post deleted');
  };

  // Clear draft/scheduled posts (keep posted ones), AI Memory, and Past Posts history
  const handleClearAllPosts = () => {
    const result = clearDraftAndScheduledPosts(); // Only clears drafts/scheduled, keeps posted
    clearPostHistory(); // Clear past posts history
    clearMemory(); // Clear AI Memory
    loadPosts();
    setIsClearConfirmOpen(false);
    setIsDayDetailOpen(false);
    setDayDetailDate(null);
    setDayDetailPosts([]);
    toast.success(`Cleared ${result.clearedCount} drafts/scheduled posts, AI Memory reset`);
  };

  // Generate content with AI
  const handleGenerateContent = async () => {
    if (!newPostTopic.trim()) {
      toast.error('Please enter a topic first');
      return;
    }

    setIsGenerating(true);
    try {
      // Use carousel generator for carousel type, otherwise use standard generator
      if (newPostType === 'carousel') {
        const result = await generateCarouselContent(newPostTopic);
        if (result.post) {
          setNewPostContent(result.post);
          toast.success('Content generated!');
        }
      } else {
        const result = await generateLinkedInContent(newPostTopic);
        if (result.post) {
          setNewPostContent(result.post);
          toast.success('Content generated!');
        }
      }
    } catch (error) {
      console.error('Generation error:', error);
      toast.error('Failed to generate content. Check your API settings.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Create new post
  const handleCreatePost = () => {
    if (!selectedDate || !newPostContent.trim()) {
      toast.error('Please enter post content');
      return;
    }

    const scheduledDateTime = createDateWithTime(selectedDate, newPostTime);

    if (scheduledDateTime <= new Date()) {
      toast.error('Please select a future date and time');
      return;
    }

    const scheduleInput: SchedulePostInput = {
      scheduledAt: scheduledDateTime,
      contentType: newPostType,
      topic: newPostTopic || newPostContent.substring(0, 50),
      post: newPostContent,
    };

    schedulePost(scheduleInput);
    setPosts(getScheduledPosts());
    setIsCreateModalOpen(false);
    setSelectedDate(null);
    toast.success(`Post scheduled for ${formatScheduledDate(scheduledDateTime)}`);
  };

  // Get content type styles
  const getContentTypeColor = (type: string) => {
    switch (type) {
      case 'carousel':
        return 'bg-[#0A66C2]';
      case 'image':
      case 'single-image':
        return 'bg-purple-500';
      case 'text':
      case 'text-only':
        return 'bg-gray-400';
      case 'video':
        return 'bg-pink-500';
      case 'article':
        return 'bg-amber-500';
      default:
        return 'bg-[#0A66C2]';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'posted':
        return 'bg-green-500';
      case 'failed':
        return 'bg-red-500';
      default:
        return '';
    }
  };

  // Render calendar grid
  const renderCalendarGrid = () => {
    const { daysInMonth, startingDay } = getDaysInMonth(currentDate);
    const days = [];
    const today = new Date();

    // Previous month days
    const prevMonthLastDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0).getDate();
    for (let i = startingDay - 1; i >= 0; i--) {
      const day = prevMonthLastDay - i;
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, day);
      days.push(
        <div
          key={`prev-${day}`}
          className="h-[72px] p-1.5 border-b border-r border-gray-100 dark:border-[#3E4042]/50 bg-gray-50/50 dark:bg-black/10 cursor-pointer hover:bg-gray-100 dark:hover:bg-black/20 transition-colors"
          onClick={() => handleDateClick(date)}
        >
          <span className="text-xs text-gray-300 dark:text-gray-600">{day}</span>
        </div>
      );
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      const dayPosts = getPostsForDate(date);
      const isCurrentDay = isToday(date);
      const isPast = date < new Date(today.getFullYear(), today.getMonth(), today.getDate());

      days.push(
        <div
          key={day}
          className={`h-[72px] p-1.5 border-b border-r border-gray-100 dark:border-[#3E4042]/50 cursor-pointer transition-colors relative ${
            isCurrentDay
              ? 'bg-[#0A66C2]/5 dark:bg-[#0A66C2]/10'
              : isPast
                ? 'bg-gray-50/30 dark:bg-black/5'
                : 'bg-white dark:bg-[#1D2226] hover:bg-gray-50 dark:hover:bg-black/20'
          }`}
          onClick={() => handleDateClick(date)}
        >
          <div className="flex items-start justify-between">
            <span
              className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full ${
                isCurrentDay
                  ? 'bg-[#0A66C2] text-white'
                  : isPast
                    ? 'text-gray-300 dark:text-gray-600'
                    : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              {day}
            </span>
            {dayPosts.length > 0 && (
              <span
                className={`w-2 h-2 rounded-full mt-0.5 ${
                  isDraftPost(dayPosts[0])
                    ? 'bg-amber-500 ring-1 ring-amber-400 ring-offset-1'
                    : getContentTypeColor(dayPosts[0].contentType)
                }`}
                title={`${dayPosts.length} ${isDraftPost(dayPosts[0]) ? 'draft' : 'post'}${dayPosts.length > 1 ? 's' : ''}`}
              />
            )}
          </div>
          {dayPosts.length > 0 && (
            <div
              onClick={(e) => handleDayPostsClick(date, dayPosts, e)}
              className={`absolute bottom-1 left-1 right-1 text-[10px] px-1.5 py-0.5 rounded truncate cursor-pointer hover:opacity-80 transition-opacity ${
                isDraftPost(dayPosts[0])
                  ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-dashed border-amber-400'
                  : dayPosts[0].status === 'posted'
                    ? `${getStatusColor(dayPosts[0].status)} text-white`
                    : `${getContentTypeColor(dayPosts[0].contentType)} text-white`
              }`}
              title={`Click to view ${dayPosts.length} post${dayPosts.length > 1 ? 's' : ''}`}
            >
              {isDraftPost(dayPosts[0]) && <span className="mr-0.5">*</span>}
              {dayPosts.length > 1 ? `${dayPosts.length} posts` : dayPosts[0].topic.substring(0, 15)}
            </div>
          )}
        </div>
      );
    }

    // Only fill to complete the current row (not full 6 rows)
    const totalCells = days.length;
    const remainingInRow = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
    for (let day = 1; day <= remainingInRow; day++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, day);
      days.push(
        <div
          key={`next-${day}`}
          className="h-[72px] p-1.5 border-b border-r border-gray-100 dark:border-[#3E4042]/50 bg-gray-50/50 dark:bg-black/10 cursor-pointer hover:bg-gray-100 dark:hover:bg-black/20 transition-colors"
          onClick={() => handleDateClick(date)}
        >
          <span className="text-xs text-gray-300 dark:text-gray-600">{day}</span>
        </div>
      );
    }

    return days;
  };

  // Render agenda view - compact
  const renderAgendaView = () => {
    const scheduledPosts = posts
      .filter((p) => p.status === 'scheduled')
      .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());

    const sortedDrafts = draftPosts
      .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());

    const allPosts = [...scheduledPosts, ...sortedDrafts]
      .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());

    if (allPosts.length === 0) {
      return (
        <div className="text-center py-8">
          <svg className="w-10 h-10 mx-auto text-gray-300 dark:text-gray-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="text-xs text-gray-500 dark:text-gray-400">No scheduled posts</p>
          <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">Click on a date to schedule or use AI Planner</p>
        </div>
      );
    }

    return (
      <div className="space-y-1.5">
        {allPosts.map((post) => {
          const isDraft = isDraftPost(post);
          return (
            <div
              key={post.id}
              onClick={() => setSelectedPost(post)}
              className={`p-2 rounded-lg cursor-pointer transition-colors ${
                isDraft
                  ? `border border-dashed border-amber-400 ${selectedPost?.id === post.id ? 'bg-amber-100/50 dark:bg-amber-900/20' : 'bg-amber-50/50 dark:bg-amber-900/10 hover:bg-amber-100/50 dark:hover:bg-amber-900/20'}`
                  : `border ${selectedPost?.id === post.id ? 'border-[#0A66C2] bg-[#0A66C2]/5' : 'border-gray-200 dark:border-[#3E4042] hover:bg-gray-50 dark:hover:bg-black/20'}`
              }`}
            >
              <div className="flex items-center gap-2">
                <div className={`w-1 h-8 rounded-full flex-shrink-0 ${isDraft ? 'bg-amber-500' : getContentTypeColor(post.contentType)}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <p className="text-xs font-medium text-gray-900 dark:text-white truncate">{post.topic}</p>
                    {isDraft && (
                      <span className="text-[8px] px-1 py-0.5 rounded bg-amber-200 dark:bg-amber-800 text-amber-700 dark:text-amber-300 font-medium">
                        Draft
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400">
                    {formatScheduledDate(new Date(post.scheduledAt))}
                  </p>
                </div>
                <span className={`text-[9px] px-1.5 py-0.5 rounded ${
                  post.contentType === 'carousel' ? 'bg-[#0A66C2]/10 text-[#0A66C2]' :
                  post.contentType === 'image' || post.contentType === 'single-image' ? 'bg-purple-500/10 text-purple-600' :
                  'bg-gray-100 dark:bg-gray-800 text-gray-500'
                }`}>
                  {post.contentType}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#1D2226] rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden border border-gray-200 dark:border-[#3E4042]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-[#3E4042]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0A66C2]/10 flex items-center justify-center">
              <svg className="w-5 h-5 text-[#0A66C2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">Calendar</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {posts.filter((p) => p.status === 'scheduled').length} scheduled
                {draftPosts.length > 0 && <span className="text-amber-500"> · {draftPosts.length} drafts</span>}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* View toggles */}
            <div className="flex bg-gray-100 dark:bg-black/30 rounded-lg p-0.5">
              {(['month', 'agenda', 'planner'] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => {
                    if (v !== 'planner' && view === 'planner') {
                      // Refresh posts when leaving planner view
                      loadPosts();
                    }
                    setView(v);
                  }}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 ${
                    view === v
                      ? 'bg-white dark:bg-[#1D2226] text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  {v === 'planner' && (
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  )}
                  {v === 'planner' ? 'AI Planner' : v.charAt(0).toUpperCase() + v.slice(1)}
                </button>
              ))}
            </div>

            {/* Clear All Button */}
            {(posts.length > 0 || draftPosts.length > 0) && (
              <button
                onClick={() => setIsClearConfirmOpen(true)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                title="Clear all posts"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <span className="hidden sm:inline">Clear All</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Calendar Navigation */}
        {view === 'month' && (
          <div className="flex items-center justify-between px-5 py-3 bg-gray-50 dark:bg-black/20">
            <div className="flex items-center gap-1.5">
              <button
                onClick={goToToday}
                className="px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-black/30 rounded-lg transition-colors"
              >
                Today
              </button>
              <button
                onClick={prevMonth}
                className="p-1.5 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-black/30 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={nextMonth}
                className="p-1.5 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-black/30 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{getMonthName(currentDate)}</span>
            <div className="flex items-center gap-2 text-[10px] text-gray-400">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-[#0A66C2]" />Carousel</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-purple-500" />Image</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-green-500" />Posted</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm border border-dashed border-amber-400 bg-amber-100 dark:bg-amber-900/30" />Draft</span>
            </div>
          </div>
        )}

        {/* Calendar Content */}
        <div className="px-6 py-4">
          {view === 'month' ? (
            <div className="max-w-2xl mx-auto">
              {/* Day headers */}
              <div className="grid grid-cols-7 border-l border-t border-gray-100 dark:border-[#3E4042]/50 rounded-t-lg overflow-hidden">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => (
                  <div key={i} className="text-center text-xs font-medium text-gray-500 dark:text-gray-400 py-2 border-r border-b border-gray-100 dark:border-[#3E4042]/50 bg-gray-50 dark:bg-black/20">
                    {day}
                  </div>
                ))}
              </div>
              {/* Calendar grid */}
              <div className="grid grid-cols-7 border-l border-gray-100 dark:border-[#3E4042]/50">{renderCalendarGrid()}</div>
            </div>
          ) : view === 'agenda' ? (
            <div className="max-h-96 overflow-y-auto max-w-2xl mx-auto">{renderAgendaView()}</div>
          ) : (
            <div className="max-w-xl mx-auto">
              <AIPlannerChat onPostsCreated={loadPosts} onClose={() => setView('month')} />
            </div>
          )}
        </div>
      </div>

      {/* Quick Time Picker Modal - Compact */}
      {isTimePickerOpen && quickScheduleDate && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1D2226] rounded-xl shadow-2xl max-w-xs w-full border border-gray-200 dark:border-[#3E4042]">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-[#3E4042]">
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Schedule Post</h3>
                <p className="text-[10px] text-gray-500 dark:text-gray-400">
                  {quickScheduleDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                </p>
              </div>
              <button
                onClick={() => { setIsTimePickerOpen(false); setQuickScheduleDate(null); }}
                className="p-1 hover:bg-gray-100 dark:hover:bg-white/10 rounded transition-colors"
              >
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-3 space-y-3">
              <div>
                <label className="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-1 uppercase">Time</label>
                <TimePicker
                  value={quickScheduleTime}
                  onChange={setQuickScheduleTime}
                  suggestedTimes={getSuggestedPostingTimes()}
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex gap-2 p-3 border-t border-gray-200 dark:border-[#3E4042]">
              <button
                onClick={() => { setIsTimePickerOpen(false); setQuickScheduleDate(null); }}
                className="flex-1 px-3 py-2 text-xs text-gray-600 dark:text-gray-400 font-medium rounded-lg border border-gray-200 dark:border-[#3E4042] hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleQuickScheduleConfirm}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-[#0A66C2] text-white text-xs font-medium rounded-lg hover:bg-[#004182] transition-colors"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Post Modal - Compact */}
      {isCreateModalOpen && selectedDate && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1D2226] rounded-xl shadow-2xl max-w-md w-full border border-gray-200 dark:border-[#3E4042] max-h-[85vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-[#3E4042] sticky top-0 bg-white dark:bg-[#1D2226]">
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Schedule Post</h3>
                <p className="text-[10px] text-gray-500 dark:text-gray-400">
                  {selectedDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                </p>
              </div>
              <button
                onClick={() => { setIsCreateModalOpen(false); setSelectedDate(null); }}
                className="p-1 hover:bg-gray-100 dark:hover:bg-white/10 rounded transition-colors"
              >
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-3 space-y-3">
              {/* Topic */}
              <div>
                <label className="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-1 uppercase">Topic</label>
                <input
                  type="text"
                  value={newPostTopic}
                  onChange={(e) => setNewPostTopic(e.target.value)}
                  placeholder="e.g., Leadership tips"
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-black border border-gray-200 dark:border-[#3E4042] rounded-lg text-sm text-gray-900 dark:text-white focus:ring-1 focus:ring-[#0A66C2] outline-none"
                />
              </div>

              {/* Post Content */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase">Content *</label>
                  <button
                    onClick={handleGenerateContent}
                    disabled={isGenerating || !newPostTopic.trim()}
                    className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium bg-[#0A66C2] text-white rounded hover:bg-[#004182] disabled:opacity-50 transition-all"
                  >
                    {isGenerating ? (
                      <><LoadingSpinner className="w-3 h-3" /><span>Generating...</span></>
                    ) : (
                      <><svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z" /></svg><span>Generate</span></>
                    )}
                  </button>
                </div>
                <textarea
                  value={newPostContent}
                  onChange={(e) => setNewPostContent(e.target.value)}
                  placeholder={newPostTopic.trim() ? "Generate or write content..." : "Enter topic first..."}
                  rows={4}
                  disabled={isGenerating}
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-black border border-gray-200 dark:border-[#3E4042] rounded-lg text-sm text-gray-900 dark:text-white focus:ring-1 focus:ring-[#0A66C2] outline-none resize-none disabled:opacity-50"
                />
                <p className="text-[9px] text-gray-400 mt-0.5">{newPostContent.length} / 3,000</p>
              </div>

              {/* Content Type & Time Row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-1 uppercase">Type</label>
                  <div className="flex gap-1">
                    {[
                      { value: 'carousel', label: 'Carousel' },
                      { value: 'single-image', label: 'Image' },
                      { value: 'text-only', label: 'Text' },
                    ].map((type) => (
                      <button
                        key={type.value}
                        onClick={() => setNewPostType(type.value as ContentType)}
                        className={`flex-1 py-1.5 text-[10px] font-medium rounded border transition-colors ${
                          newPostType === type.value
                            ? 'bg-[#0A66C2]/10 border-[#0A66C2] text-[#0A66C2]'
                            : 'border-gray-200 dark:border-[#3E4042] text-gray-500 dark:text-gray-400'
                        }`}
                      >
                        {type.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-1 uppercase">Time</label>
                  <TimePicker
                    value={newPostTime}
                    onChange={setNewPostTime}
                    suggestedTimes={getSuggestedPostingTimes()}
                  />
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex gap-2 p-3 border-t border-gray-200 dark:border-[#3E4042]">
              <button
                onClick={() => { setIsCreateModalOpen(false); setSelectedDate(null); }}
                className="flex-1 px-3 py-2 text-xs text-gray-600 dark:text-gray-400 font-medium rounded-lg border border-gray-200 dark:border-[#3E4042] hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreatePost}
                disabled={!newPostContent.trim() || isGenerating}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-[#0A66C2] text-white text-xs font-medium rounded-lg hover:bg-[#004182] disabled:opacity-50 transition-colors"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Schedule
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear All Confirmation Modal */}
      {isClearConfirmOpen && (
        <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1D2226] rounded-xl shadow-2xl max-w-sm w-full border border-gray-200 dark:border-[#3E4042] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-200 dark:border-[#3E4042]">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">Clear Draft Posts & AI Memory?</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">Published posts will be kept</p>
              </div>
            </div>

            {/* Modal Content */}
            <div className="px-4 py-4">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                This will clear <span className="font-semibold text-red-500">draft/scheduled posts</span> and <span className="font-semibold text-red-500">AI Memory</span>:
              </p>
              <ul className="mt-3 space-y-1.5 text-sm text-gray-500 dark:text-gray-400">
                {posts.filter(p => p.status === 'scheduled').length > 0 && (
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#0A66C2]" />
                    {posts.filter(p => p.status === 'scheduled').length} scheduled post{posts.filter(p => p.status === 'scheduled').length !== 1 ? 's' : ''}
                  </li>
                )}
                {draftPosts.length > 0 && (
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    {draftPosts.length} draft{draftPosts.length !== 1 ? 's' : ''}
                  </li>
                )}
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-purple-500" />
                  AI Memory (content patterns & history)
                </li>
              </ul>
              {posts.filter(p => p.status === 'posted').length > 0 && (
                <p className="mt-3 text-xs text-green-600 dark:text-green-400 flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  {posts.filter(p => p.status === 'posted').length} published post{posts.filter(p => p.status === 'posted').length !== 1 ? 's' : ''} will be kept
                </p>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex gap-3 px-4 py-3 bg-gray-50 dark:bg-black/20 border-t border-gray-200 dark:border-[#3E4042]">
              <button
                onClick={() => setIsClearConfirmOpen(false)}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-[#1D2226] border border-gray-300 dark:border-[#3E4042] rounded-xl hover:bg-gray-50 dark:hover:bg-black/30 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleClearAllPosts}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-xl transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Yes, Clear Drafts
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Day Detail Modal - Shows all posts for a specific date */}
      {isDayDetailOpen && dayDetailDate && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1D2226] rounded-xl shadow-2xl max-w-md w-full border border-gray-200 dark:border-[#3E4042] max-h-[80vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-[#3E4042] bg-gray-50 dark:bg-black/20">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  isToday(dayDetailDate) ? 'bg-[#0A66C2] text-white' : 'bg-gray-100 dark:bg-black/30'
                }`}>
                  <span className={`text-lg font-bold ${isToday(dayDetailDate) ? 'text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                    {dayDetailDate.getDate()}
                  </span>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                    {dayDetailDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {dayDetailPosts.length} post{dayDetailPosts.length !== 1 ? 's' : ''} scheduled
                  </p>
                </div>
              </div>
              <button
                onClick={() => { setIsDayDetailOpen(false); setDayDetailDate(null); setDayDetailPosts([]); }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Posts List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {dayDetailPosts
                .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
                .map((post) => {
                  const isDraft = isDraftPost(post);
                  const postTime = new Date(post.scheduledAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

                  return (
                    <div
                      key={post.id}
                      onClick={(e) => handlePostClick(post, e)}
                      className={`p-3 rounded-xl cursor-pointer transition-all hover:scale-[1.01] ${
                        isDraft
                          ? 'bg-amber-50 dark:bg-amber-900/10 border border-dashed border-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/20'
                          : post.status === 'posted'
                            ? 'bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800/50 hover:bg-green-100 dark:hover:bg-green-900/20'
                            : 'bg-white dark:bg-black/20 border border-gray-200 dark:border-[#3E4042] hover:bg-gray-50 dark:hover:bg-black/30'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Time Badge */}
                        <div className={`flex-shrink-0 px-2 py-1 rounded-lg text-xs font-medium ${
                          isDraft
                            ? 'bg-amber-200 dark:bg-amber-800/50 text-amber-700 dark:text-amber-300'
                            : post.status === 'posted'
                              ? 'bg-green-200 dark:bg-green-800/50 text-green-700 dark:text-green-300'
                              : 'bg-[#0A66C2]/10 text-[#0A66C2]'
                        }`}>
                          {postTime}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                              {post.topic}
                            </h4>
                            {isDraft && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-200 dark:bg-amber-800 text-amber-700 dark:text-amber-300 font-medium flex-shrink-0">
                                Draft
                              </span>
                            )}
                            {post.status === 'posted' && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-green-200 dark:bg-green-800 text-green-700 dark:text-green-300 font-medium flex-shrink-0">
                                Posted
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                            {post.post.substring(0, 100)}...
                          </p>

                          {/* Meta info */}
                          <div className="flex items-center gap-2 mt-2">
                            <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${
                              post.contentType === 'carousel'
                                ? 'bg-[#0A66C2]/10 text-[#0A66C2]'
                                : post.contentType === 'image' || post.contentType === 'single-image'
                                  ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
                                  : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                            }`}>
                              {post.contentType === 'carousel' && '📊 '}
                              {(post.contentType === 'image' || post.contentType === 'single-image') && '🖼️ '}
                              {(post.contentType === 'text' || post.contentType === 'text-only') && '📝 '}
                              {post.contentType}
                            </span>
                            {post.carouselSlides && post.carouselSlides.length > 0 && (
                              <span className="text-[9px] text-gray-400 dark:text-gray-500">
                                {post.carouselSlides.length} slides
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Arrow icon */}
                        <svg className="w-4 h-4 text-gray-300 dark:text-gray-600 flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* Footer */}
            <div className="px-4 py-3 border-t border-gray-200 dark:border-[#3E4042] bg-gray-50 dark:bg-black/20">
              <button
                onClick={() => {
                  setIsDayDetailOpen(false);
                  handleDateClick(dayDetailDate);
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#0A66C2] text-white text-sm font-medium rounded-xl hover:bg-[#004182] transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Post for This Day
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Post Edit Modal */}
      <PostEditModal
        post={selectedPost}
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedPost(null);
        }}
        onSave={handlePostSave}
        onDelete={handleDeletePost}
      />
    </div>
  );
};

export default ContentCalendar;
