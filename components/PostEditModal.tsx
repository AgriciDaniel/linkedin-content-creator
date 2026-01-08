import React, { useState, useEffect } from 'react';
import { ScheduledPost, updateScheduledPost } from '../services/schedulerService';
import { getSuggestedPostingTimes, createDateWithTime, formatScheduledDate } from '../services/calendarStorage';
import { toast } from '../hooks/useToast';
import { SlideData } from '../types/slideLayouts';
import { generateSlideThumbnails } from '../services/templateRenderer';
import CarouselPreview from './CarouselPreview';
import SlideEditor from './SlideEditor';
import DatePicker from './DatePicker';
import TimePicker from './TimePicker';

// Helper to get slide preview info based on layout type
const getSlidePreview = (slide: SlideData): { icon: string; title: string; subtitle?: string } => {
  switch (slide.layout) {
    case 'title-hook':
      return { icon: '🎯', title: slide.headline.slice(0, 25), subtitle: 'Title' };
    case 'bullet-list':
      return { icon: '•', title: slide.title, subtitle: `${slide.bullets.length} items` };
    case 'numbered-steps':
      return { icon: '1.', title: slide.title, subtitle: `${slide.steps.length} steps` };
    case 'stat-card':
      return { icon: '📊', title: slide.stat, subtitle: slide.title };
    case 'bar-chart':
      return { icon: '📊', title: slide.title, subtitle: 'Bar chart' };
    case 'pie-chart':
      return { icon: '🥧', title: slide.title, subtitle: 'Pie chart' };
    case 'line-chart':
      return { icon: '📈', title: slide.title, subtitle: 'Line chart' };
    case 'comparison':
      return { icon: '⚖️', title: slide.title, subtitle: 'Compare' };
    case 'quote':
      return { icon: '"', title: slide.quote.slice(0, 20) + '...', subtitle: slide.attribution };
    case 'cta':
      return { icon: '🚀', title: slide.headline, subtitle: 'CTA' };
    default:
      return { icon: '📄', title: 'Slide', subtitle: '' };
  }
};

// Helper to render full slide content
const renderSlideContent = (slide: SlideData): React.ReactNode => {
  switch (slide.layout) {
    case 'title-hook':
      return (
        <div className="space-y-2">
          <p className="text-lg font-bold text-gray-900 dark:text-white">{slide.headline}</p>
          {slide.subtext && <p className="text-sm text-gray-500 dark:text-gray-400">{slide.subtext}</p>}
        </div>
      );
    case 'bullet-list':
      return (
        <div className="space-y-2">
          <p className="font-semibold text-gray-900 dark:text-white">{slide.title}</p>
          <ul className="space-y-1">
            {slide.bullets.map((bullet, i) => (
              <li key={i} className="text-sm text-gray-700 dark:text-gray-300 flex gap-2">
                <span className="text-[#0A66C2]">•</span> {bullet}
              </li>
            ))}
          </ul>
        </div>
      );
    case 'numbered-steps':
      return (
        <div className="space-y-2">
          <p className="font-semibold text-gray-900 dark:text-white">{slide.title}</p>
          <ol className="space-y-1">
            {slide.steps.map((step, i) => (
              <li key={i} className="text-sm text-gray-700 dark:text-gray-300 flex gap-2">
                <span className="text-[#0A66C2] font-medium">{i + 1}.</span> {step}
              </li>
            ))}
          </ol>
        </div>
      );
    case 'stat-card':
      return (
        <div className="text-center space-y-1">
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">{slide.title}</p>
          <p className="text-3xl font-bold text-[#0A66C2]">{slide.stat}</p>
          <p className="text-sm text-gray-600 dark:text-gray-300">{slide.description}</p>
        </div>
      );
    case 'bar-chart':
    case 'pie-chart':
    case 'line-chart':
      return (
        <div className="space-y-2">
          <p className="font-semibold text-gray-900 dark:text-white">{slide.title}</p>
          <div className="space-y-1">
            {slide.labels.map((label, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">{label}</span>
                <span className="font-medium text-gray-900 dark:text-white">{slide.values[i]}</span>
              </div>
            ))}
          </div>
          {slide.description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">{slide.description}</p>}
        </div>
      );
    case 'comparison':
      return (
        <div className="space-y-3">
          <p className="font-semibold text-gray-900 dark:text-white text-center">{slide.title}</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-lg text-center">
              <p className="text-xs text-red-600 dark:text-red-400 font-medium">{slide.before.label}</p>
              <p className="text-sm text-gray-900 dark:text-white mt-1">{slide.before.value}</p>
            </div>
            <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg text-center">
              <p className="text-xs text-green-600 dark:text-green-400 font-medium">{slide.after.label}</p>
              <p className="text-sm text-gray-900 dark:text-white mt-1">{slide.after.value}</p>
            </div>
          </div>
        </div>
      );
    case 'quote':
      return (
        <div className="space-y-2">
          <p className="text-sm italic text-gray-700 dark:text-gray-300">"{slide.quote}"</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">— {slide.attribution}</p>
        </div>
      );
    case 'cta':
      return (
        <div className="text-center space-y-2">
          <p className="text-lg font-bold text-[#0A66C2]">{slide.headline}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">{slide.subtext}</p>
        </div>
      );
    default:
      return <p className="text-sm text-gray-500">Unknown slide type</p>;
  }
};

interface PostEditModalProps {
  post: ScheduledPost | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  onDelete: (postId: string) => void;
}

const PostEditModal: React.FC<PostEditModalProps> = ({
  post,
  isOpen,
  onClose,
  onSave,
  onDelete,
}) => {
  const [editedTopic, setEditedTopic] = useState('');
  const [editedContent, setEditedContent] = useState('');
  const [editedDate, setEditedDate] = useState('');
  const [editedTime, setEditedTime] = useState('09:00');
  const [isSaving, setIsSaving] = useState(false);
  const [viewMode, setViewMode] = useState<'view' | 'edit'>('view');
  const [selectedSlideIndex, setSelectedSlideIndex] = useState<number | null>(null);
  // Carousel editing state
  const [editedSlides, setEditedSlides] = useState<SlideData[]>([]);
  const [editingSlideIndex, setEditingSlideIndex] = useState<number | null>(null);
  const [hasSlideChanges, setHasSlideChanges] = useState(false);
  // Thumbnail rendering state
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [isRenderingThumbnails, setIsRenderingThumbnails] = useState(false);

  const LINKEDIN_CHAR_LIMIT = 3000;

  // Sync state when post changes
  useEffect(() => {
    if (post) {
      setEditedTopic(post.topic || '');
      setEditedContent(post.post || '');
      const scheduledDate = new Date(post.scheduledAt);
      setEditedDate(scheduledDate.toISOString().split('T')[0]);
      const hours = scheduledDate.getHours().toString().padStart(2, '0');
      const minutes = scheduledDate.getMinutes().toString().padStart(2, '0');
      setEditedTime(`${hours}:${minutes}`);
      setViewMode('view');
      setSelectedSlideIndex(null);
      // Initialize carousel slides
      setEditedSlides(post.carouselSlides ? [...post.carouselSlides as SlideData[]] : []);
      setEditingSlideIndex(null);
      setHasSlideChanges(false);
      setThumbnails([]);
    }
  }, [post]);

  // Generate thumbnails when slides are available or change
  useEffect(() => {
    if (editedSlides.length > 0 && isOpen) {
      const generateThumbnails = async () => {
        setIsRenderingThumbnails(true);
        try {
          const generated = await generateSlideThumbnails(editedSlides);
          setThumbnails(generated);
        } catch (error) {
          console.error('Failed to generate thumbnails:', error);
        } finally {
          setIsRenderingThumbnails(false);
        }
      };
      generateThumbnails();
    }
  }, [editedSlides, isOpen]);

  if (!isOpen || !post) return null;

  const isDraft = post.status === 'draft';
  const charCount = editedContent.length;
  const isOverLimit = charCount > LINKEDIN_CHAR_LIMIT;

  const getContentTypeColor = (type: string) => {
    switch (type) {
      case 'carousel':
        return 'bg-[#0A66C2]/10 text-[#0A66C2]';
      case 'image':
      case 'single-image':
        return 'bg-purple-500/10 text-purple-600';
      case 'text':
      case 'text-only':
        return 'bg-gray-100 dark:bg-gray-800 text-gray-500';
      case 'video':
        return 'bg-pink-500/10 text-pink-600';
      case 'article':
        return 'bg-amber-500/10 text-amber-600';
      default:
        return 'bg-[#0A66C2]/10 text-[#0A66C2]';
    }
  };

  const handleSave = async () => {
    if (isOverLimit) {
      toast.error(`Content exceeds ${LINKEDIN_CHAR_LIMIT.toLocaleString()} character limit`);
      return;
    }

    if (!editedContent.trim() && !isDraft) {
      toast.error('Post content cannot be empty');
      return;
    }

    setIsSaving(true);
    try {
      const newScheduledAt = createDateWithTime(new Date(editedDate), editedTime);

      // Include carousel slides if they were modified
      const updates: Parameters<typeof updateScheduledPost>[1] = {
        topic: editedTopic,
        post: editedContent,
        scheduledAt: newScheduledAt,
      };

      if (post.contentType === 'carousel' && editedSlides.length > 0) {
        updates.carouselSlides = editedSlides;
      }

      updateScheduledPost(post.id, updates);
      setHasSlideChanges(false);

      toast.success('Post updated successfully');
      onSave();
      onClose();
    } catch (error) {
      console.error('Failed to save post:', error);
      toast.error('Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this post?')) {
      onDelete(post.id);
      onClose();
    }
  };

  // Carousel slide handlers
  const handleSlideEdit = (index: number) => {
    setEditingSlideIndex(index);
  };

  const handleSlideSave = (updatedSlide: SlideData) => {
    if (editingSlideIndex === null) return;
    const newSlides = [...editedSlides];
    newSlides[editingSlideIndex] = updatedSlide;
    setEditedSlides(newSlides);
    setEditingSlideIndex(null);
    setHasSlideChanges(true);
    toast.success(`Slide ${editingSlideIndex + 1} updated`);
  };

  const handleSlideDelete = (index: number) => {
    if (editedSlides.length <= 4) {
      toast.error('Carousel must have at least 4 slides');
      return;
    }
    if (window.confirm(`Delete slide ${index + 1}?`)) {
      const newSlides = editedSlides.filter((_, i) => i !== index);
      setEditedSlides(newSlides);
      setHasSlideChanges(true);
      toast.success('Slide deleted');
    }
  };

  const handleSaveSlideChanges = async () => {
    if (!hasSlideChanges) return;
    setIsSaving(true);
    try {
      updateScheduledPost(post.id, {
        carouselSlides: editedSlides,
      });
      setHasSlideChanges(false);
      toast.success('Carousel slides saved');
      onSave();
    } catch (error) {
      console.error('Failed to save slides:', error);
      toast.error('Failed to save carousel changes');
    } finally {
      setIsSaving(false);
    }
  };

  // Use wider modal for carousel posts
  const isCarousel = post.contentType === 'carousel' && editedSlides.length > 0;

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
      <div className={`bg-white dark:bg-[#1D2226] rounded-xl shadow-2xl w-full border border-gray-200 dark:border-[#3E4042] max-h-[85vh] overflow-hidden flex flex-col ${
        isCarousel ? 'max-w-3xl' : 'max-w-lg'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-[#3E4042]">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              {viewMode === 'view' ? 'View Post' : (isDraft ? 'Edit Draft' : 'Edit Post')}
            </h3>
            <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${getContentTypeColor(post.contentType)}`}>
              {post.contentType}
            </span>
            {isDraft && (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-200 dark:bg-amber-800 text-amber-700 dark:text-amber-300 font-medium">
                Draft
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* View/Edit Toggle */}
            <div className="flex bg-gray-100 dark:bg-black/30 rounded-lg p-0.5">
              <button
                onClick={() => setViewMode('view')}
                className={`px-2 py-1 text-[10px] font-medium rounded transition-colors ${
                  viewMode === 'view'
                    ? 'bg-white dark:bg-[#1D2226] text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                View
              </button>
              <button
                onClick={() => setViewMode('edit')}
                className={`px-2 py-1 text-[10px] font-medium rounded transition-colors ${
                  viewMode === 'edit'
                    ? 'bg-white dark:bg-[#1D2226] text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                Edit
              </button>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 dark:hover:bg-white/10 rounded transition-colors"
            >
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content - Scrollable */}
        <div className="p-4 space-y-4 overflow-y-auto flex-1">
          {viewMode === 'view' ? (
            /* VIEW MODE */
            <>
              {/* Topic & Schedule Info */}
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white">{post.topic || 'Untitled'}</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Scheduled for {formatScheduledDate(new Date(post.scheduledAt))}
                  </p>
                </div>
              </div>

              {/* Post Content */}
              {post.post && (
                <div className="bg-gray-50 dark:bg-black/20 rounded-lg p-3 border border-gray-100 dark:border-[#3E4042]">
                  <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                    {post.post}
                  </p>
                  <p className="text-[10px] text-gray-400 mt-2">{post.post.length.toLocaleString()} characters</p>
                </div>
              )}

              {/* Image Preview (if applicable) */}
              {(post.contentType === 'image' || post.contentType === 'single-image') && post.imageUrl && (
                <div>
                  <label className="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">
                    Image
                  </label>
                  <div className="relative rounded-lg overflow-hidden border border-gray-200 dark:border-[#3E4042]">
                    <img
                      src={post.imageUrl}
                      alt="Post image"
                      className="w-full h-56 object-cover"
                    />
                  </div>
                </div>
              )}

              {/* Carousel Slides (if applicable) - Full Preview with Edit capability */}
              {post.contentType === 'carousel' && editedSlides.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Carousel Slides - Hover to edit
                    </label>
                    {hasSlideChanges && (
                      <button
                        onClick={handleSaveSlideChanges}
                        disabled={isSaving}
                        className="text-[10px] px-2 py-1 bg-[#0A66C2] text-white rounded hover:bg-[#004182] transition-colors disabled:opacity-50"
                      >
                        {isSaving ? 'Saving...' : 'Save Slide Changes'}
                      </button>
                    )}
                  </div>
                  <CarouselPreview
                    slides={editedSlides}
                    thumbnails={thumbnails}
                    isGenerating={isRenderingThumbnails}
                    onSlideEdit={handleSlideEdit}
                    onSlideDelete={handleSlideDelete}
                  />
                </div>
              )}

              {/* Post info */}
              <div className="text-[10px] text-gray-400 dark:text-gray-500 space-y-0.5 pt-2 border-t border-gray-100 dark:border-[#3E4042]">
                <p>Created: {formatScheduledDate(new Date(post.createdAt))}</p>
                <p>Last updated: {formatScheduledDate(new Date(post.updatedAt))}</p>
              </div>
            </>
          ) : (
            /* EDIT MODE */
            <>
              {/* Topic */}
              <div>
                <label className="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">
                  Topic
                </label>
                <input
                  type="text"
                  value={editedTopic}
                  onChange={(e) => setEditedTopic(e.target.value)}
                  placeholder="Enter topic..."
                  className="w-full px-3 py-2 bg-white dark:bg-black border border-gray-200 dark:border-[#3E4042] rounded-lg text-sm text-gray-900 dark:text-white focus:ring-1 focus:ring-[#0A66C2] focus:border-[#0A66C2] outline-none transition-colors"
                />
              </div>

              {/* Date and Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">
                    Date
                  </label>
                  <DatePicker
                    value={editedDate}
                    onChange={setEditedDate}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">
                    Time
                  </label>
                  <TimePicker
                    value={editedTime}
                    onChange={setEditedTime}
                    suggestedTimes={getSuggestedPostingTimes()}
                  />
                </div>
              </div>

              {/* Content */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Content
                  </label>
                  <span className={`text-[10px] ${isOverLimit ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
                    {charCount.toLocaleString()} / {LINKEDIN_CHAR_LIMIT.toLocaleString()}
                  </span>
                </div>
                <textarea
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  placeholder={isDraft ? "Content will be generated..." : "Enter post content..."}
                  rows={10}
                  className={`w-full px-3 py-2 bg-white dark:bg-black border rounded-lg text-sm text-gray-900 dark:text-white focus:ring-1 focus:ring-[#0A66C2] focus:border-[#0A66C2] outline-none resize-none transition-colors ${
                    isOverLimit
                      ? 'border-red-500 dark:border-red-500'
                      : 'border-gray-200 dark:border-[#3E4042]'
                  }`}
                />
                {isOverLimit && (
                  <p className="text-[10px] text-red-500 mt-1">
                    Content exceeds LinkedIn's character limit by {(charCount - LINKEDIN_CHAR_LIMIT).toLocaleString()} characters
                  </p>
                )}
              </div>

              {/* Image Preview in Edit Mode */}
              {(post.contentType === 'image' || post.contentType === 'single-image') && post.imageUrl && (
                <div>
                  <label className="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">
                    Image Preview
                  </label>
                  <div className="relative rounded-lg overflow-hidden border border-gray-200 dark:border-[#3E4042]">
                    <img
                      src={post.imageUrl}
                      alt="Post image"
                      className="w-full h-32 object-cover"
                    />
                  </div>
                </div>
              )}

              {/* Carousel Editing in Edit Mode */}
              {post.contentType === 'carousel' && editedSlides.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Carousel Slides ({editedSlides.length}) - Hover to edit
                    </label>
                    {hasSlideChanges && (
                      <span className="text-[10px] text-amber-500 font-medium">Unsaved changes</span>
                    )}
                  </div>
                  <CarouselPreview
                    slides={editedSlides}
                    thumbnails={thumbnails}
                    isGenerating={isRenderingThumbnails}
                    onSlideEdit={handleSlideEdit}
                    onSlideDelete={handleSlideDelete}
                  />
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 px-4 py-3 border-t border-gray-200 dark:border-[#3E4042] bg-gray-50 dark:bg-black/20">
          <button
            onClick={handleDelete}
            className="px-3 py-2 text-xs font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
          >
            Delete
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs text-gray-600 dark:text-gray-400 font-medium rounded-lg border border-gray-200 dark:border-[#3E4042] hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
            >
              {viewMode === 'view' ? 'Close' : 'Cancel'}
            </button>
            {viewMode === 'edit' && (
              <button
                onClick={handleSave}
                disabled={isSaving || isOverLimit}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#0A66C2] text-white text-xs font-medium rounded-lg hover:bg-[#004182] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSaving ? (
                  <>
                    <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Saving...
                  </>
                ) : (
                  <>
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Save Changes
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Slide Editor Modal */}
      {editingSlideIndex !== null && editedSlides[editingSlideIndex] && (
        <SlideEditor
          slide={editedSlides[editingSlideIndex]}
          slideIndex={editingSlideIndex}
          onSave={handleSlideSave}
          onCancel={() => setEditingSlideIndex(null)}
        />
      )}
    </div>
  );
};

export default PostEditModal;
