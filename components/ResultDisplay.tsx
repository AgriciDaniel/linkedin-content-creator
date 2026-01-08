import React, { useState, useEffect, useRef } from 'react';
import { GenerationResult, CarouselGenerationResult, ContentType, PostResult } from '../types';
import { SlideData } from '../types/slideLayouts';
import LoadingSpinner from './LoadingSpinner';
import CarouselPreview from './CarouselPreview';
import SlideEditor from './SlideEditor';
import { regenerateSingleSlide } from '../services/geminiService';
import { generateImageFromPrompt, generateImageVariations, editImageWithReference } from '../services/geminiService';
import {
  createTextPost,
  postWithImage,
  postCarousel,
  postVideo,
  createArticlePost,
} from '../services/linkedinService';
import { generateCarouselPDF } from '../services/carouselPdfService';
import { generateTemplatedPDF, generateSlideThumbnails } from '../services/templateRenderer';
import { CarouselTemplate } from '../types/carouselTemplate';
import { defaultTemplate } from '../templates/carouselTemplates';
import { toast } from '../hooks/useToast';
import { schedulePost, SchedulePostInput } from '../services/schedulerService';
import { getSuggestedPostingTimes, createDateWithTime } from '../services/calendarStorage';
import LinkedInPreview from './LinkedInPreview';
import { exportPost, ExportFormat } from '../services/exportService';
import { logPostPublished, logPostScheduled } from '../services/activityService';
import DatePicker from './DatePicker';
import TimePicker from './TimePicker';

interface ResultDisplayProps {
  result: GenerationResult;
  carouselResult?: CarouselGenerationResult | null;
  contentType: ContentType;
  onRegenerate: () => void;
  isRegenerating: boolean;
  isConnected: boolean;
  styleReferenceImage?: string | null;
  selectedTemplate?: CarouselTemplate;
  preSelectedDate?: Date | null;
  onScheduled?: () => void;
}

type PostStatus = 'idle' | 'sending' | 'success' | 'error';

const RegenerateButton: React.FC<{
  onClick: () => void;
  disabled: boolean;
  loading: boolean;
  children: React.ReactNode;
}> = ({ onClick, disabled, loading, children }) => (
  <button
    onClick={onClick}
    disabled={disabled || loading}
    className="flex items-center justify-center gap-2 px-3 py-1 text-sm bg-white dark:bg-[#2D3748] text-gray-700 dark:text-gray-300 font-semibold rounded-full border border-gray-300 dark:border-[#3E4042] hover:bg-gray-50 dark:hover:bg-[#3E4042] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
  >
    {loading ? (
      <>
        <LoadingSpinner className="h-4 w-4" />
        Regenerating...
      </>
    ) : (
      <>
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 110 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
        </svg>
        {children}
      </>
    )}
  </button>
);


export const ResultDisplay: React.FC<ResultDisplayProps> = ({
  result,
  carouselResult,
  contentType,
  onRegenerate,
  isRegenerating,
  isConnected,
  styleReferenceImage,
  selectedTemplate = defaultTemplate,
  preSelectedDate,
  onScheduled,
}) => {
  const [post, setPost] = useState(result.post);
  const [imagePrompt, setImagePrompt] = useState(result.imagePrompt);
  const [postStatus, setPostStatus] = useState<PostStatus>('idle');
  const [postMessage, setPostMessage] = useState('');
  const [isSourcesOpen, setIsSourcesOpen] = useState(false);

  const [isGeneratingImage, setIsGeneratingImage] = useState<boolean>(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [linkedinPostUrl, setLinkedinPostUrl] = useState<string | null>(null);

  // For video upload
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // For article link
  const [articleUrl, setArticleUrl] = useState('');
  const [articleTitle, setArticleTitle] = useState('');

  // For carousel PDF
  const [carouselPdf, setCarouselPdf] = useState<File | null>(null);
  const [carouselThumbnails, setCarouselThumbnails] = useState<string[]>([]);
  const [isGeneratingThumbnails, setIsGeneratingThumbnails] = useState(false);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  // For reference image
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [referenceImagePreview, setReferenceImagePreview] = useState<string | null>(null);
  const referenceImageInputRef = useRef<HTMLInputElement>(null);

  // For image variations
  const [imageVariations, setImageVariations] = useState<string[]>([]);
  const [isGeneratingVariations, setIsGeneratingVariations] = useState(false);
  const [selectedVariationIndex, setSelectedVariationIndex] = useState(0);

  // For image editing
  const [editPrompt, setEditPrompt] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editReferenceImage, setEditReferenceImage] = useState<string | null>(null);
  const [editReferencePreview, setEditReferencePreview] = useState<string | null>(null);
  const editReferenceInputRef = useRef<HTMLInputElement>(null);

  // For custom image upload
  const [customImageUrl, setCustomImageUrl] = useState<string | null>(null);
  const customImageInputRef = useRef<HTMLInputElement>(null);

  // For confirmation modals
  const [showVariationsConfirm, setShowVariationsConfirm] = useState(false);
  const [showUploadConfirm, setShowUploadConfirm] = useState(false);
  const [showEditImageModal, setShowEditImageModal] = useState(false);
  const [pendingUploadFile, setPendingUploadFile] = useState<File | null>(null);

  // Load "don't show again" preferences from localStorage
  const getSkipVariationsConfirm = () => localStorage.getItem('skip_variations_confirm') === 'true';
  const getSkipUploadConfirm = () => localStorage.getItem('skip_upload_confirm') === 'true';

  // For carousel slide editing
  const [editableSlides, setEditableSlides] = useState<SlideData[]>([]);
  const [editingSlideIndex, setEditingSlideIndex] = useState<number | null>(null);
  const [isRegeneratingSlide, setIsRegeneratingSlide] = useState(false);

  // For scheduling
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [scheduleDate, setScheduleDate] = useState<string>(() => {
    if (preSelectedDate) {
      return preSelectedDate.toISOString().split('T')[0];
    }
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  });
  const [scheduleTime, setScheduleTime] = useState<string>(() => {
    if (preSelectedDate) {
      const hours = preSelectedDate.getHours().toString().padStart(2, '0');
      const minutes = preSelectedDate.getMinutes().toString().padStart(2, '0');
      return `${hours}:${minutes}`;
    }
    return '09:00';
  });

  // Update schedule date and time when preSelectedDate changes
  useEffect(() => {
    if (preSelectedDate) {
      setScheduleDate(preSelectedDate.toISOString().split('T')[0]);
      const hours = preSelectedDate.getHours().toString().padStart(2, '0');
      const minutes = preSelectedDate.getMinutes().toString().padStart(2, '0');
      setScheduleTime(`${hours}:${minutes}`);
    }
  }, [preSelectedDate]);

  // For preview/edit toggle and export
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit');
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPost(result.post);
    setImagePrompt(result.imagePrompt);
    setPostStatus('idle');
    setPostMessage('');
    setGeneratedImageUrl(null);
    setImageError(null);
    setIsSourcesOpen(false);
    setLinkedinPostUrl(null);
    setVideoFile(null);
    setVideoPreviewUrl(null);
    setArticleUrl('');
    setArticleTitle('');
    setCarouselPdf(null);
    setCarouselThumbnails([]);
    setIsGeneratingThumbnails(false);
    setReferenceImage(null);
    setReferenceImagePreview(null);
    setImageVariations([]);
    setSelectedVariationIndex(0);
    setEditPrompt('');
    setEditableSlides([]);
    setEditingSlideIndex(null);
    setIsScheduleModalOpen(false);
    setViewMode('edit');
    setShowExportMenu(false);
  }, [result]);

  // Close export menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setShowExportMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Initialize editable slides from carousel result
  useEffect(() => {
    if (carouselResult?.slides && carouselResult.slides.length > 0) {
      setEditableSlides(carouselResult.slides as SlideData[]);
    }
  }, [carouselResult]);

  // Auto-generate thumbnails and PDF in parallel when editable slides change
  useEffect(() => {
    const generateCarouselAssets = async () => {
      if (editableSlides && editableSlides.length > 0) {
        setIsGeneratingThumbnails(true);

        // Generate thumbnails and PDF in parallel for faster loading
        const thumbnailPromise = generateSlideThumbnails(editableSlides, selectedTemplate, 400)
          .then(thumbs => {
            setCarouselThumbnails(thumbs);
            setIsGeneratingThumbnails(false);
            console.log('✅ Thumbnails generated');
            return thumbs;
          })
          .catch(error => {
            console.error('Failed to generate thumbnails:', error);
            setIsGeneratingThumbnails(false);
            return [];
          });

        const pdfPromise = generateTemplatedPDF(editableSlides, selectedTemplate)
          .then(pdfFile => {
            setCarouselPdf(pdfFile);
            console.log('✅ PDF generated successfully');
            return pdfFile;
          })
          .catch(async (error) => {
            console.error('Failed to generate carousel PDF:', error);
            // Fallback to basic PDF generation
            try {
              console.log('⚠️ Falling back to basic PDF generation...');
              const pdfFile = await generateCarouselPDF(editableSlides);
              setCarouselPdf(pdfFile);
              return pdfFile;
            } catch (fallbackError) {
              console.error('Fallback PDF generation also failed:', fallbackError);
              setImageError('Failed to generate carousel PDF. Please try again.');
              return null;
            }
          });

        // Wait for both to complete
        await Promise.all([thumbnailPromise, pdfPromise]);
        console.log('⚡ All carousel assets generated');
      }
    };

    generateCarouselAssets();
  }, [editableSlides, selectedTemplate]);

  const handlePostToLinkedIn = async () => {
    if (!isConnected) {
      setPostStatus('error');
      setPostMessage('Please connect your LinkedIn account in Settings first.');
      return;
    }

    // LinkedIn character limit validation (3,000 characters for all post types)
    const LINKEDIN_CHAR_LIMIT = 3000;
    if (post.length > LINKEDIN_CHAR_LIMIT) {
      setPostStatus('error');
      setPostMessage(`Post exceeds LinkedIn's ${LINKEDIN_CHAR_LIMIT.toLocaleString()} character limit by ${(post.length - LINKEDIN_CHAR_LIMIT).toLocaleString()} characters. Please shorten your post.`);
      return;
    }

    setPostStatus('sending');
    setPostMessage('');
    setLinkedinPostUrl(null);

    let postResult: PostResult;

    try {
      switch (contentType) {
        case 'text':
          postResult = await createTextPost(post);
          break;

        case 'image':
          if (!generatedImageUrl) {
            setPostStatus('error');
            setPostMessage('Please generate an image first.');
            return;
          }
          const base64Data = generatedImageUrl.split(',')[1];
          if (!base64Data) {
            throw new Error('Invalid image data');
          }
          postResult = await postWithImage(post, base64Data);
          break;

        case 'carousel':
          if (!carouselPdf) {
            setPostStatus('error');
            setPostMessage('Please upload a PDF for your carousel.');
            return;
          }
          postResult = await postCarousel(post, carouselPdf, 'Carousel');
          break;

        case 'video':
          if (!videoFile) {
            setPostStatus('error');
            setPostMessage('Please upload a video file.');
            return;
          }
          postResult = await postVideo(post, videoFile, 'Video');
          break;

        case 'article':
          if (!articleUrl.trim()) {
            setPostStatus('error');
            setPostMessage('Please enter an article URL.');
            return;
          }
          postResult = await createArticlePost(post, articleUrl, articleTitle || undefined);
          break;

        default:
          throw new Error(`Unsupported content type: ${contentType}`);
      }

      if (postResult.success) {
        setPostStatus('success');
        setPostMessage('Posted successfully on LinkedIn!');
        if (postResult.postUrl) {
          setLinkedinPostUrl(postResult.postUrl);
        }

        // Log to activity dashboard
        const activityContentType = contentType === 'image' ? 'single-image' : contentType === 'text' ? 'text-only' : contentType;
        logPostPublished(undefined, post.substring(0, 100), activityContentType as ContentType);
      } else {
        throw new Error(postResult.error || 'Failed to post');
      }
    } catch (err) {
      setPostStatus('error');
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setPostMessage(`Failed to post: ${errorMessage}`);
      console.error(err);
    }
  };

  // Get the effective reference image (local override or global style reference)
  const getEffectiveReferenceImage = (): string | undefined => {
    if (referenceImage) return referenceImage;
    if (styleReferenceImage) return styleReferenceImage;
    return undefined;
  };

  const handleGenerateImage = async () => {
    setIsGeneratingImage(true);
    setGeneratedImageUrl(null);
    setImageError(null);
    setImageVariations([]);
    try {
      const base64Data = await generateImageFromPrompt(imagePrompt, getEffectiveReferenceImage());
      if (base64Data) {
        setGeneratedImageUrl(`data:image/png;base64,${base64Data}`);
      } else {
        throw new Error("Received empty image data from the API.");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
      setImageError(errorMessage);
    } finally {
      setIsGeneratingImage(false);
    }
  };

  // Request variations with confirmation
  const requestGenerateVariations = () => {
    if (getSkipVariationsConfirm()) {
      doGenerateVariations();
    } else {
      setShowVariationsConfirm(true);
    }
  };

  // Actually generate variations
  const doGenerateVariations = async () => {
    setShowVariationsConfirm(false);
    setIsGeneratingVariations(true);
    setImageVariations([]);
    setImageError(null);
    try {
      const variations = await generateImageVariations(imagePrompt, 3, getEffectiveReferenceImage());
      setImageVariations(variations);
      setSelectedVariationIndex(0);
      // Set the first variation as the main image
      if (variations.length > 0) {
        setGeneratedImageUrl(`data:image/png;base64,${variations[0]}`);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
      setImageError(errorMessage);
    } finally {
      setIsGeneratingVariations(false);
    }
  };

  // Handle "remember choice" for variations
  const handleVariationsConfirm = (rememberChoice: boolean) => {
    if (rememberChoice) {
      localStorage.setItem('skip_variations_confirm', 'true');
    }
    doGenerateVariations();
  };

  // Select a variation
  const handleSelectVariation = (index: number) => {
    setSelectedVariationIndex(index);
    setGeneratedImageUrl(`data:image/png;base64,${imageVariations[index]}`);
  };

  // Handle reference image upload
  const handleReferenceImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        setReferenceImagePreview(dataUrl);
        // Extract base64 without the data URL prefix
        const base64 = dataUrl.split(',')[1];
        setReferenceImage(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  // Clear reference image
  const handleClearReferenceImage = () => {
    setReferenceImage(null);
    setReferenceImagePreview(null);
    if (referenceImageInputRef.current) {
      referenceImageInputRef.current.value = '';
    }
  };

  // Auto-generate image when content type is 'image' and prompt is available
  useEffect(() => {
    if (contentType === 'image' && imagePrompt && !generatedImageUrl && !isGeneratingImage && !customImageUrl) {
      handleGenerateImage();
    }
  }, [contentType, imagePrompt]);

  // Edit existing image
  const handleEditImage = async () => {
    if (!generatedImageUrl || !editPrompt.trim()) return;

    setIsEditing(true);
    setImageError(null);
    try {
      const currentImageBase64 = generatedImageUrl.split(',')[1];
      // Use edit reference if provided, otherwise use style reference
      const referenceForEdit = editReferenceImage || getEffectiveReferenceImage();
      const editedBase64 = await editImageWithReference(currentImageBase64, editPrompt, referenceForEdit);
      setGeneratedImageUrl(`data:image/png;base64,${editedBase64}`);
      setEditPrompt('');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
      setImageError(errorMessage);
    } finally {
      setIsEditing(false);
    }
  };

  // Handle custom image upload with confirmation
  const handleCustomImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // If there's already an image and user hasn't opted out, show confirmation
      if (generatedImageUrl && !getSkipUploadConfirm()) {
        setPendingUploadFile(file);
        setShowUploadConfirm(true);
      } else {
        doUploadCustomImage(file);
      }
    }
  };

  // Actually upload the custom image
  const doUploadCustomImage = (file: File) => {
    setShowUploadConfirm(false);
    setPendingUploadFile(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setCustomImageUrl(dataUrl);
      setGeneratedImageUrl(dataUrl);
      setImageVariations([]); // Clear variations when uploading custom
    };
    reader.readAsDataURL(file);
  };

  // Handle upload confirmation
  const handleUploadConfirm = (dontRemind: boolean) => {
    if (dontRemind) {
      localStorage.setItem('skip_upload_confirm', 'true');
    }
    if (pendingUploadFile) {
      doUploadCustomImage(pendingUploadFile);
    }
  };

  // Cancel upload
  const handleUploadCancel = () => {
    setShowUploadConfirm(false);
    setPendingUploadFile(null);
    if (customImageInputRef.current) {
      customImageInputRef.current.value = '';
    }
  };

  // Clear custom image
  const handleClearCustomImage = () => {
    setCustomImageUrl(null);
    setGeneratedImageUrl(null);
    if (customImageInputRef.current) {
      customImageInputRef.current.value = '';
    }
  };

  // Handle edit reference image upload
  const handleEditReferenceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        setEditReferencePreview(dataUrl);
        const base64 = dataUrl.split(',')[1];
        setEditReferenceImage(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  // Clear edit reference
  const handleClearEditReference = () => {
    setEditReferenceImage(null);
    setEditReferencePreview(null);
    if (editReferenceInputRef.current) {
      editReferenceInputRef.current.value = '';
    }
  };

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setVideoFile(file);
      setVideoPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handlePdfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setCarouselPdf(file);
    }
  };

  // Slide action handlers
  const handleSlideEdit = (index: number) => {
    setEditingSlideIndex(index);
  };

  const handleSlideEditSave = (updatedSlide: SlideData) => {
    if (editingSlideIndex !== null) {
      const newSlides = [...editableSlides];
      newSlides[editingSlideIndex] = updatedSlide;
      setEditableSlides(newSlides);
      setEditingSlideIndex(null);
    }
  };

  const handleSlideEditCancel = () => {
    setEditingSlideIndex(null);
  };

  const handleSlideDelete = (index: number) => {
    if (editableSlides.length <= 4) {
      return; // Minimum 4 slides required
    }
    const newSlides = editableSlides.filter((_, i) => i !== index);
    setEditableSlides(newSlides);
  };

  const handleSlideRegenerate = async (index: number) => {
    setIsRegeneratingSlide(true);
    try {
      const currentSlide = editableSlides[index];
      const context = {
        topic: result.post.substring(0, 200), // Use first part of post as context
        slideIndex: index,
        totalSlides: editableSlides.length,
        currentLayout: currentSlide.layout,
      };

      const newSlide = await regenerateSingleSlide(currentSlide, context);
      const newSlides = [...editableSlides];
      newSlides[index] = newSlide;
      setEditableSlides(newSlides);
    } catch (error) {
      console.error('Failed to regenerate slide:', error);
      setImageError('Failed to regenerate slide. Please try again.');
    } finally {
      setIsRegeneratingSlide(false);
    }
  };

  // Handle scheduling a post
  const handleSchedulePost = () => {
    const scheduledDateTime = createDateWithTime(new Date(scheduleDate), scheduleTime);

    // Validate date is in the future
    if (scheduledDateTime <= new Date()) {
      toast.error('Please select a future date and time');
      return;
    }

    const scheduleInput: SchedulePostInput = {
      scheduledAt: scheduledDateTime,
      contentType,
      topic: result.post.substring(0, 100), // First 100 chars as topic
      post,
      carouselSlides: editableSlides.length > 0 ? editableSlides : undefined,
      imageUrl: generatedImageUrl || undefined,
      imagePrompt: imagePrompt || undefined,
    };

    try {
      schedulePost(scheduleInput);
      toast.success(`Post scheduled for ${scheduledDateTime.toLocaleDateString()} at ${scheduledDateTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`);

      // Log to activity dashboard
      const activityContentType = contentType === 'image' ? 'single-image' : contentType === 'text' ? 'text-only' : contentType;
      logPostScheduled(undefined, post.substring(0, 100), activityContentType as ContentType);

      setIsScheduleModalOpen(false);
      // Clear the pre-selected date after scheduling
      if (onScheduled) {
        onScheduled();
      }
    } catch (error) {
      console.error('Failed to schedule post:', error);
      toast.error('Failed to schedule post. Please try again.');
    }
  };

  // Handle export
  const handleExport = async (format: ExportFormat) => {
    setShowExportMenu(false);
    const topic = result.post.substring(0, 100);

    try {
      await exportPost(format, post, {
        topic,
        result,
        contentType,
        carouselSlides: editableSlides.length > 0 ? editableSlides : undefined,
      });
      toast.success(`Exported as .${format}`);
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Failed to export. Please try again.');
    }
  };

  const getStatusColor = () => {
    switch (postStatus) {
      case 'success': return 'text-green-600 dark:text-green-400';
      case 'error': return 'text-red-600 dark:text-red-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  const canPost = () => {
    if (!isConnected) return false;
    // LinkedIn character limit check (3,000 characters for all post types)
    if (post.length > 3000) return false;

    switch (contentType) {
      case 'text':
        return post.trim().length > 0;
      case 'image':
        return post.trim().length > 0 && generatedImageUrl !== null;
      case 'carousel':
        return post.trim().length > 0 && carouselPdf !== null;
      case 'video':
        return post.trim().length > 0 && videoFile !== null;
      case 'article':
        return post.trim().length > 0 && articleUrl.trim().length > 0;
      default:
        return false;
    }
  };

  return (
    <div className="space-y-4 mt-6 animate-fade-in">
      {/* Research Sources - At top */}
      <div className="bg-white dark:bg-[#1D2226] p-4 rounded-2xl border border-gray-200 dark:border-[#3E4042] shadow-md">
        <button
          onClick={() => setIsSourcesOpen(!isSourcesOpen)}
          className="w-full flex items-center justify-between text-left"
          aria-expanded={isSourcesOpen}
          aria-controls="sources-list"
        >
          <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            Research Sources
            <span className="text-xs px-1.5 py-0.5 bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 rounded">
              {result.sources.length}
            </span>
          </h3>
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isSourcesOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        <div
          id="sources-list"
          className={`transition-all duration-300 ease-in-out overflow-hidden ${isSourcesOpen ? 'max-h-[1000px] mt-3' : 'max-h-0'}`}
        >
          <ul className="space-y-1 pt-3 border-t border-gray-100 dark:border-[#3E4042]">
            {result.sources.length > 0 ? result.sources.map((source, index) => (
              <li key={index}>
                <a
                  href={source.uri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-2 p-2 hover:bg-gray-50 dark:hover:bg-white/5 rounded-lg transition-colors group"
                >
                  <svg className="h-3.5 w-3.5 text-gray-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  <span className="text-xs text-gray-600 dark:text-gray-400 group-hover:text-[#0A66C2] break-all transition-colors">
                    {source.title}
                  </span>
                </a>
              </li>
            )) : (
              <li className="p-2 text-xs text-gray-400 dark:text-gray-500">No sources found.</li>
            )}
          </ul>
        </div>
      </div>

      {/* Post Content */}
      <div className="bg-white dark:bg-[#1D2226] p-5 rounded-2xl border border-gray-200 dark:border-[#3E4042] shadow-lg dark:shadow-xl dark:shadow-black/10">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#0A66C2] flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
              </svg>
            </div>
            {/* Edit/Preview Toggle */}
            <div className="flex items-center gap-0.5 bg-gray-100 dark:bg-black/30 rounded-lg p-0.5">
              <button
                onClick={() => setViewMode('edit')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                  viewMode === 'edit'
                    ? 'bg-white dark:bg-[#1D2226] text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                Edit
              </button>
              <button
                onClick={() => setViewMode('preview')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                  viewMode === 'preview'
                    ? 'bg-white dark:bg-[#1D2226] text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                Preview
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Export Dropdown */}
            <div className="relative" ref={exportMenuRef}>
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 rounded-lg transition-colors"
                title="Export options"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Export
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {showExportMenu && (
                <div className="absolute right-0 mt-1 w-36 bg-white dark:bg-[#1D2226] border border-gray-200 dark:border-[#3E4042] rounded-lg shadow-lg z-10 py-1">
                  <button
                    onClick={() => handleExport('txt')}
                    className="w-full px-3 py-1.5 text-left text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 flex items-center gap-2"
                  >
                    <span className="w-5 text-center text-gray-400">.txt</span>
                    Plain Text
                  </button>
                  <button
                    onClick={() => handleExport('docx')}
                    className="w-full px-3 py-1.5 text-left text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 flex items-center gap-2"
                  >
                    <span className="w-5 text-center text-gray-400">.docx</span>
                    Word Doc
                  </button>
                  <button
                    onClick={() => handleExport('md')}
                    className="w-full px-3 py-1.5 text-left text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 flex items-center gap-2"
                  >
                    <span className="w-5 text-center text-gray-400">.md</span>
                    Markdown
                  </button>
                  <button
                    onClick={() => handleExport('json')}
                    className="w-full px-3 py-1.5 text-left text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 flex items-center gap-2"
                  >
                    <span className="w-5 text-center text-gray-400">.json</span>
                    JSON
                  </button>
                </div>
              )}
            </div>
            {/* Copy Button */}
            <button
              onClick={() => {
                navigator.clipboard.writeText(post);
                toast.success('Post copied to clipboard!');
              }}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 rounded-lg transition-colors"
              title="Copy to clipboard"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copy
            </button>
            <RegenerateButton onClick={onRegenerate} disabled={isRegenerating} loading={isRegenerating}>
              Regenerate
            </RegenerateButton>
          </div>
        </div>

        {/* Edit Mode: Textarea */}
        {viewMode === 'edit' && (
          <>
            <textarea
              id="linkedin-post"
              value={post}
              onChange={(e) => setPost(e.target.value)}
              className="w-full h-44 sm:h-52 p-4 bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-[#3E4042] rounded-xl focus:ring-2 focus:ring-[#0A66C2] focus:border-[#0A66C2] focus:bg-white dark:focus:bg-black outline-none transition-all resize-y text-black dark:text-white leading-relaxed text-sm"
              placeholder="Your generated post will appear here..."
            />
            {/* Character Count with Progress Bar */}
            <div className="mt-2 space-y-1.5">
              {/* Progress Bar */}
              <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    post.length > 3000 ? 'bg-red-500' :
                    post.length > 2500 ? 'bg-amber-500' :
                    post.length > 2000 ? 'bg-yellow-500' :
                    'bg-[#0A66C2]'
                  }`}
                  style={{ width: `${Math.min((post.length / 3000) * 100, 100)}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className={`font-medium ${
                  post.length > 3000 ? 'text-red-500' :
                  post.length > 2500 ? 'text-amber-500' :
                  post.length > 2000 ? 'text-yellow-500' :
                  'text-gray-500 dark:text-gray-400'
                }`}>
                  {post.length.toLocaleString()} / 3,000 characters
                  {post.length > 3000 && ` (+${(post.length - 3000).toLocaleString()} over)`}
                </span>
                {post.length > 2500 && post.length <= 3000 && (
                  <span className="text-amber-500 flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    Long post - will show "...see more"
                  </span>
                )}
                {post.length > 3000 && (
                  <span className="text-red-500 flex items-center gap-1 font-medium">
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    Cannot post - exceeds limit!
                  </span>
                )}
              </div>
            </div>
          </>
        )}

        {/* Preview Mode: LinkedIn Preview */}
        {viewMode === 'preview' && (
          <LinkedInPreview
            post={post}
            contentType={contentType}
            imageUrl={generatedImageUrl}
            carouselThumbnails={carouselThumbnails}
          />
        )}
      </div>

      {/* Carousel Preview & Upload */}
      {contentType === 'carousel' && carouselResult && (
        <div className="bg-white dark:bg-[#1D2226] p-5 rounded-2xl border border-gray-200 dark:border-[#3E4042] shadow-lg dark:shadow-xl dark:shadow-black/10">
          {/* Visual Carousel Preview */}
          <CarouselPreview
            slides={editableSlides.length > 0 ? editableSlides : carouselResult.slides}
            thumbnails={carouselThumbnails}
            isGenerating={isGeneratingThumbnails || isRegeneratingSlide}
            onSlideEdit={handleSlideEdit}
            onSlideDelete={handleSlideDelete}
            onSlideRegenerate={handleSlideRegenerate}
          />

          {/* Slide Editor Modal */}
          {editingSlideIndex !== null && editableSlides[editingSlideIndex] && (
            <SlideEditor
              slide={editableSlides[editingSlideIndex]}
              slideIndex={editingSlideIndex}
              onSave={handleSlideEditSave}
              onCancel={handleSlideEditCancel}
            />
          )}

          {/* PDF Status Section */}
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-[#3E4042]">
            <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Carousel PDF:
            </h4>

            {carouselPdf && (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <p className="text-sm font-medium text-green-800 dark:text-green-300">
                        PDF Ready
                      </p>
                      <p className="text-xs text-green-600 dark:text-green-400">
                        {carouselPdf.name}
                      </p>
                    </div>
                  </div>
                  <a
                    href={URL.createObjectURL(carouselPdf)}
                    download={carouselPdf.name}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm bg-white dark:bg-black text-green-600 dark:text-green-400 font-medium rounded-lg border border-green-600 dark:border-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download
                  </a>
                </div>

                <details className="text-xs text-gray-500 dark:text-gray-400">
                  <summary className="cursor-pointer hover:text-gray-700 dark:hover:text-gray-300">
                    Want to use a custom design?
                  </summary>
                  <div className="mt-2 p-3 bg-gray-50 dark:bg-black/30 rounded-lg border border-gray-200 dark:border-[#3E4042]">
                    <p className="mb-2">
                      You can upload your own professionally designed carousel PDF to replace the auto-generated one.
                    </p>
                    <input
                      type="file"
                      accept="application/pdf"
                      ref={pdfInputRef}
                      onChange={handlePdfChange}
                      className="hidden"
                    />
                    <button
                      onClick={() => pdfInputRef.current?.click()}
                      className="flex items-center gap-2 px-3 py-1.5 text-sm bg-white dark:bg-black text-gray-600 dark:text-gray-300 rounded-lg border border-gray-300 dark:border-[#3E4042] hover:border-[#0A66C2] hover:text-[#0A66C2] transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                      Upload Custom PDF
                    </button>
                  </div>
                </details>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Image Generation (for image type) */}
      {contentType === 'image' && (
        <div className="bg-white dark:bg-[#1D2226] p-5 rounded-2xl border border-gray-200 dark:border-[#3E4042] shadow-lg dark:shadow-xl dark:shadow-black/10 space-y-4">
          {/* Hidden file inputs */}
          <input
            type="file"
            accept="image/*"
            ref={referenceImageInputRef}
            onChange={handleReferenceImageChange}
            className="hidden"
          />
          <input
            type="file"
            accept="image/*"
            ref={customImageInputRef}
            onChange={handleCustomImageUpload}
            className="hidden"
          />
          <input
            type="file"
            accept="image/*"
            ref={editReferenceInputRef}
            onChange={handleEditReferenceUpload}
            className="hidden"
          />

          {/* Loading State - Full screen overlay style */}
          {(isGeneratingImage || isGeneratingVariations) && !generatedImageUrl && (
            <div className="flex flex-col justify-center items-center p-12 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-black/50 dark:to-black/30 rounded-xl border border-gray-200 dark:border-[#3E4042]">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-[#0A66C2]/20 border-t-[#0A66C2] rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg className="w-6 h-6 text-[#0A66C2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
              <p className="mt-4 text-gray-600 dark:text-gray-400 font-medium">
                {isGeneratingVariations ? 'Creating 3 variations...' : 'Generating your image...'}
              </p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">
                {styleReferenceImage ? 'Using your profile style reference' : 'This may take a moment'}
              </p>
            </div>
          )}

          {/* Error State */}
          {imageError && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 p-4 rounded-lg">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <div className="flex-1">
                  <p className="font-semibold">Image Generation Failed</p>
                  <p className="mt-1 text-sm">{imageError}</p>
                </div>
                <button
                  onClick={handleGenerateImage}
                  disabled={isGeneratingImage}
                  className="px-3 py-1.5 text-sm bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 rounded-lg transition-colors"
                >
                  Retry
                </button>
              </div>
            </div>
          )}

          {/* Generated/Custom Image Preview with Overlay Actions */}
          {generatedImageUrl && !isGeneratingImage && (
            <div className="animate-fade-in">
              {/* Image Container with Overlay */}
              <div className="relative group rounded-xl overflow-hidden border border-gray-200 dark:border-[#3E4042]">
                <img
                  src={generatedImageUrl}
                  alt="Image for LinkedIn post"
                  className="w-full h-auto object-cover"
                />

                {/* Overlay with action buttons */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  {/* Top right actions */}
                  <div className="absolute top-3 right-3 flex items-center gap-2">
                    {/* Regenerate */}
                    <button
                      onClick={handleGenerateImage}
                      disabled={isGeneratingImage || customImageUrl !== null}
                      className="p-2 bg-white/90 hover:bg-white rounded-lg text-gray-700 hover:text-[#0A66C2] transition-colors shadow-lg disabled:opacity-50"
                      title="Regenerate image"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </button>
                    {/* Generate Variations */}
                    <button
                      onClick={requestGenerateVariations}
                      disabled={isGeneratingVariations || customImageUrl !== null}
                      className="p-2 bg-white/90 hover:bg-white rounded-lg text-gray-700 hover:text-[#0A66C2] transition-colors shadow-lg disabled:opacity-50"
                      title="Generate 3 variations"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                      </svg>
                    </button>
                    {/* Edit Image */}
                    <button
                      onClick={() => setShowEditImageModal(true)}
                      disabled={customImageUrl !== null}
                      className="p-2 bg-white/90 hover:bg-white rounded-lg text-gray-700 hover:text-[#0A66C2] transition-colors shadow-lg disabled:opacity-50"
                      title="Edit image with AI"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    {/* Upload Custom */}
                    <button
                      onClick={() => customImageInputRef.current?.click()}
                      className="p-2 bg-white/90 hover:bg-white rounded-lg text-gray-700 hover:text-[#0A66C2] transition-colors shadow-lg"
                      title="Upload your own image (will replace current)"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                    </button>
                    {/* Download Image */}
                    <a
                      href={generatedImageUrl}
                      download="linkedin-post-image.png"
                      className="p-2 bg-white/90 hover:bg-white rounded-lg text-gray-700 hover:text-green-600 transition-colors shadow-lg"
                      title="Download image"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                    </a>
                  </div>

                  {/* Bottom label */}
                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                    <span className="px-2.5 py-1 bg-black/60 text-white text-xs font-medium rounded-lg">
                      {customImageUrl ? 'Custom Image' : imageVariations.length > 1 ? 'AI Generated (Variation)' : 'AI Generated'}
                    </span>
                    {customImageUrl && (
                      <button
                        onClick={handleClearCustomImage}
                        className="px-2.5 py-1 bg-red-500/80 hover:bg-red-500 text-white text-xs font-medium rounded-lg transition-colors"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>

                {/* Loading overlay during regeneration */}
                {(isGeneratingImage || isGeneratingVariations) && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <div className="flex flex-col items-center">
                      <LoadingSpinner className="h-8 w-8 text-white" />
                      <p className="mt-2 text-white text-sm">{isGeneratingVariations ? 'Creating variations...' : 'Regenerating...'}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Image Variations Selector */}
              {imageVariations.length > 1 && (
                <div className="mt-3">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Choose a variation:</p>
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {imageVariations.map((variation, index) => (
                      <button
                        key={index}
                        onClick={() => handleSelectVariation(index)}
                        className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                          selectedVariationIndex === index
                            ? 'border-[#0A66C2] ring-2 ring-[#0A66C2]/30'
                            : 'border-gray-200 dark:border-[#3E4042] hover:border-gray-400'
                        }`}
                      >
                        <img
                          src={`data:image/png;base64,${variation}`}
                          alt={`Variation ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Style Reference Indicator - Compact row */}
          <div className="flex items-center justify-end gap-2">
            {(styleReferenceImage || referenceImage) ? (
              <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                <span>Style:</span>
                {referenceImagePreview ? (
                  <div className="relative group">
                    <img
                      src={referenceImagePreview}
                      alt="Style ref"
                      className="w-6 h-6 object-cover rounded border-2 border-green-500 cursor-pointer"
                      title="Custom style reference active"
                    />
                    <button
                      onClick={handleClearReferenceImage}
                      className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Remove reference"
                    >
                      <svg className="w-2 h-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <div
                    className="w-6 h-6 rounded bg-blue-100 dark:bg-blue-900/30 border border-blue-500 flex items-center justify-center cursor-pointer"
                    title="Using profile style reference - click to override"
                    onClick={() => referenceImageInputRef.current?.click()}
                  >
                    <svg className="w-3 h-3 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                )}
                <svg className="w-3 h-3 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
            ) : (
              <button
                onClick={() => referenceImageInputRef.current?.click()}
                className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-[#0A66C2] transition-colors"
                title="Add style reference"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>+ Style ref</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Video Upload (for video type) */}
      {contentType === 'video' && (
        <div className="bg-white dark:bg-[#1D2226] p-6 rounded-xl border border-gray-200 dark:border-[#3E4042] shadow-sm">
          <h3 className="flex items-center gap-2 text-base font-semibold text-[#0A66C2] mb-4">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            Video Upload
          </h3>

          <input
            type="file"
            accept="video/mp4,video/quicktime,video/x-msvideo"
            ref={videoInputRef}
            onChange={handleVideoChange}
            className="hidden"
          />

          <button
            onClick={() => videoInputRef.current?.click()}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-white dark:bg-black text-[#0A66C2] font-medium rounded-lg border-2 border-[#0A66C2] hover:bg-[#0A66C2] hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            {videoFile ? 'Change Video' : 'Upload Video'}
          </button>

          {videoFile && (
            <div className="mt-4">
              <p className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1 mb-2">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                {videoFile.name}
              </p>
              {videoPreviewUrl && (
                <video
                  src={videoPreviewUrl}
                  controls
                  className="w-full max-h-64 rounded-lg border border-gray-300 dark:border-[#3E4042]"
                />
              )}
            </div>
          )}

          <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
            Supported formats: MP4, MOV, AVI. Videos under 90 seconds perform best on LinkedIn.
          </p>
        </div>
      )}

      {/* Article Link (for article type) */}
      {contentType === 'article' && (
        <div className="bg-white dark:bg-[#1D2226] p-6 rounded-xl border border-gray-200 dark:border-[#3E4042] shadow-sm">
          <h3 className="flex items-center gap-2 text-base font-semibold text-[#0A66C2] mb-4">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            Article Link
          </h3>

          <div className="space-y-4">
            <div>
              <label htmlFor="article-url" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Article URL
              </label>
              <input
                id="article-url"
                type="url"
                value={articleUrl}
                onChange={(e) => setArticleUrl(e.target.value)}
                placeholder="https://example.com/your-article"
                className="w-full px-4 py-2 bg-white dark:bg-black border border-gray-300 dark:border-[#3E4042] rounded-lg focus:ring-2 focus:ring-[#0A66C2] focus:border-transparent outline-none transition-all text-black dark:text-white"
              />
            </div>

            <div>
              <label htmlFor="article-title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Custom Title (optional)
              </label>
              <input
                id="article-title"
                type="text"
                value={articleTitle}
                onChange={(e) => setArticleTitle(e.target.value)}
                placeholder="Leave empty to use the article's original title"
                className="w-full px-4 py-2 bg-white dark:bg-black border border-gray-300 dark:border-[#3E4042] rounded-lg focus:ring-2 focus:ring-[#0A66C2] focus:border-transparent outline-none transition-all text-black dark:text-white"
              />
            </div>
          </div>

          <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
            Note: External links may receive lower reach than native content on LinkedIn.
          </p>
        </div>
      )}

      {/* Post Buttons */}
      <div className="pt-2 flex flex-col items-center gap-3">
        {linkedinPostUrl ? (
          <a
            href={linkedinPostUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2.5 px-6 py-3.5 bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold rounded-xl hover:from-green-600 hover:to-green-700 transition-all duration-200 shadow-lg shadow-green-500/25"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            View Post on LinkedIn
          </a>
        ) : (
          <div className="w-full flex flex-col sm:flex-row gap-2">
            {/* Post Now Button */}
            <button
              onClick={handlePostToLinkedIn}
              disabled={postStatus === 'sending' || !canPost()}
              title={!isConnected ? "Connect LinkedIn in Settings first" : post.length > 3000 ? `Post exceeds 3,000 character limit (${post.length.toLocaleString()} chars)` : !canPost() ? `Complete all required fields for ${contentType} post` : "Post on LinkedIn"}
              className="flex-1 flex items-center justify-center gap-2.5 px-6 py-3.5 bg-gradient-to-r from-[#0A66C2] to-[#004182] text-white font-semibold rounded-xl hover:from-[#004182] hover:to-[#003366] disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-[#0A66C2]/25"
            >
              {postStatus === 'sending' ? (
                <>
                  <LoadingSpinner className="h-5 w-5 text-white" />
                  <span>Posting...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                  <span>Post Now</span>
                </>
              )}
            </button>

            {/* Schedule Button */}
            <button
              onClick={() => setIsScheduleModalOpen(true)}
              disabled={!post.trim() || post.length > 3000}
              className="flex items-center justify-center gap-2 px-4 py-3.5 bg-white dark:bg-[#1D2226] text-[#0A66C2] font-semibold rounded-xl border-2 border-[#0A66C2] hover:bg-[#0A66C2] hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              title={post.length > 3000 ? `Post exceeds 3,000 character limit` : "Schedule for later"}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="hidden sm:inline">Schedule</span>
            </button>
          </div>
        )}

        {!isConnected && (
          <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            Connect LinkedIn in Settings to post
          </p>
        )}

        {postMessage && (
          <p className={`text-sm font-medium text-center ${getStatusColor()}`}>{postMessage}</p>
        )}
      </div>

      {/* Schedule Modal */}
      {isScheduleModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#1D2226] rounded-2xl shadow-2xl max-w-md w-full border border-gray-200 dark:border-[#3E4042] animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-[#3E4042]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#0A66C2] flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Schedule Post</h3>
              </div>
              <button
                onClick={() => setIsScheduleModalOpen(false)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
              {/* Post Preview */}
              <div className="p-3 bg-gray-50 dark:bg-black/30 rounded-lg border border-gray-200 dark:border-[#3E4042]">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Post preview:</p>
                <p className="text-sm text-gray-800 dark:text-gray-200 line-clamp-3">{post}</p>
              </div>

              {/* Pre-selected date indicator */}
              {preSelectedDate && (
                <div className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 rounded-lg">
                  <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="text-xs text-blue-700 dark:text-blue-300">
                    Pre-selected from calendar: {preSelectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at {preSelectedDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                  </span>
                </div>
              )}

              {/* Date Picker with Calendar */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Date
                </label>
                <DatePicker
                  value={scheduleDate}
                  onChange={setScheduleDate}
                  minDate={new Date().toISOString().split('T')[0]}
                />
              </div>

              {/* Time Picker with Hour/Minute Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Time
                </label>
                <TimePicker
                  value={scheduleTime}
                  onChange={setScheduleTime}
                  suggestedTimes={getSuggestedPostingTimes()}
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-3 p-4 border-t border-gray-200 dark:border-[#3E4042]">
              <button
                onClick={() => setIsScheduleModalOpen(false)}
                className="flex-1 px-4 py-2.5 text-gray-700 dark:text-gray-300 font-medium rounded-lg border border-gray-300 dark:border-[#3E4042] hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSchedulePost}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#0A66C2] text-white font-medium rounded-lg hover:bg-[#004182] transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Schedule
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Variations Confirmation Modal */}
      {showVariationsConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1D2226] rounded-xl shadow-2xl max-w-sm w-full border border-gray-200 dark:border-[#3E4042] animate-fade-in">
            <div className="p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Generate Variations?</h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-5">
                This will generate 3 different variations of the image based on the same prompt. Continue?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowVariationsConfirm(false)}
                  className="flex-1 px-4 py-2.5 text-gray-700 dark:text-gray-300 font-medium rounded-lg border border-gray-300 dark:border-[#3E4042] hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleVariationsConfirm(false)}
                  className="flex-1 px-4 py-2.5 bg-[#0A66C2] text-white font-medium rounded-lg hover:bg-[#004182] transition-colors"
                >
                  Generate
                </button>
              </div>
              <button
                onClick={() => handleVariationsConfirm(true)}
                className="w-full mt-3 text-xs text-gray-500 dark:text-gray-400 hover:text-[#0A66C2] transition-colors"
              >
                Generate & don't ask again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Confirmation Modal */}
      {showUploadConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1D2226] rounded-xl shadow-2xl max-w-sm w-full border border-gray-200 dark:border-[#3E4042] animate-fade-in">
            <div className="p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                  <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Replace Image?</h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-5">
                Uploading your own image will replace the current AI-generated image. Continue?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleUploadCancel}
                  className="flex-1 px-4 py-2.5 text-gray-700 dark:text-gray-300 font-medium rounded-lg border border-gray-300 dark:border-[#3E4042] hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleUploadConfirm(false)}
                  className="flex-1 px-4 py-2.5 bg-[#0A66C2] text-white font-medium rounded-lg hover:bg-[#004182] transition-colors"
                >
                  Replace
                </button>
              </div>
              <button
                onClick={() => handleUploadConfirm(true)}
                className="w-full mt-3 text-xs text-gray-500 dark:text-gray-400 hover:text-[#0A66C2] transition-colors"
              >
                Replace & don't ask again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Image Modal */}
      {showEditImageModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1D2226] rounded-xl shadow-2xl max-w-md w-full border border-gray-200 dark:border-[#3E4042] animate-fade-in">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-[#3E4042]">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <svg className="w-5 h-5 text-[#0A66C2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit Image with AI
              </h3>
              <button
                onClick={() => {
                  setShowEditImageModal(false);
                  setEditPrompt('');
                }}
                className="p-1 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  What changes do you want?
                </label>
                <input
                  type="text"
                  value={editPrompt}
                  onChange={(e) => setEditPrompt(e.target.value)}
                  placeholder="e.g., Make the background darker, add more contrast..."
                  className="w-full px-3 py-2.5 text-sm bg-white dark:bg-black border border-gray-300 dark:border-[#3E4042] rounded-lg focus:ring-2 focus:ring-[#0A66C2] focus:border-transparent outline-none text-black dark:text-white"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && editPrompt.trim()) {
                      handleEditImage();
                      setShowEditImageModal(false);
                    }
                  }}
                  autoFocus
                />
              </div>

              {/* Edit Reference Image Option */}
              <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-black/30 rounded-lg">
                <span className="text-xs text-gray-500 dark:text-gray-400">Style reference:</span>
                {editReferencePreview ? (
                  <div className="flex items-center gap-2">
                    <img src={editReferencePreview} alt="Edit ref" className="w-8 h-8 object-cover rounded border" />
                    <button
                      onClick={handleClearEditReference}
                      className="text-xs text-red-500 hover:text-red-700"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => editReferenceInputRef.current?.click()}
                    className="text-xs text-[#0A66C2] hover:underline"
                  >
                    + Add reference
                  </button>
                )}
              </div>
            </div>
            <div className="flex gap-3 p-4 border-t border-gray-200 dark:border-[#3E4042]">
              <button
                onClick={() => {
                  setShowEditImageModal(false);
                  setEditPrompt('');
                }}
                className="flex-1 px-4 py-2.5 text-gray-700 dark:text-gray-300 font-medium rounded-lg border border-gray-300 dark:border-[#3E4042] hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  handleEditImage();
                  setShowEditImageModal(false);
                }}
                disabled={isEditing || !editPrompt.trim()}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#0A66C2] text-white font-medium rounded-lg hover:bg-[#004182] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isEditing ? <LoadingSpinner className="h-4 w-4" /> : 'Apply Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
