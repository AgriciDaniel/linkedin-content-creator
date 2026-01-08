import React, { useState, useCallback, useEffect, useRef } from 'react';
import { generateLinkedInContent, generateCarouselContent, isGeminiConfigured, BatchGenerationResult, GenerationProgressCallback, CarouselProgressCallback } from './services/geminiService';
import { GenerationResult, CarouselGenerationResult, ContentType } from './types';
import { ResultDisplay } from './components/ResultDisplay';
import LoadingSpinner from './components/LoadingSpinner';
import Settings from './components/Settings';
import ContentTypeSelector from './components/ContentTypeSelector';
import TemplateSelector from './components/TemplateSelector';
import { CarouselTemplate } from './types/carouselTemplate';
import { defaultTemplate } from './templates/carouselTemplates';
import PastPosts from './components/PastPosts';
import Profile from './components/Profile';
import AIMemory from './components/AIMemory';
import { isTokenValid, getStoredUser } from './services/linkedinAuth';
import { handleOAuthCallback } from './services/linkedinOAuth';
import { savePostToHistory, SavedPost } from './services/postHistoryService';
import { getProfile, getProfileStyleReference, markTopicAsUsed, UserProfile } from './services/profileService';
import { startAutoPilot, stopAutoPilot, getAutoPilotStats } from './services/autoPilotService';
import { addToMemory } from './services/memoryService';
import { type TopicSuggestion, autoGenerateTopics } from './services/topicSuggestionService';
import CinematicSwitch from './components/ui/cinematic-glow-toggle';
import { ToastContainer } from './components/Toast';
import { useToast, setGlobalToast } from './hooks/useToast';
import { useAppShortcuts, getShortcutDisplay } from './hooks/useKeyboardShortcuts';
import GenerationProgress, { GenerationStage } from './components/GenerationProgress';
import ContentCalendar from './components/ContentCalendar';
import BatchGenerator from './components/BatchGenerator';
import BatchResults from './components/BatchResults';
import ActivityDashboard from './components/ActivityDashboard';
import { logPostCreated } from './services/activityService';
import OnboardingFlow from './components/OnboardingFlow';
import { shouldShowOnboarding } from './services/onboardingService';

const App: React.FC = () => {
  const [topic, setTopic] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isRegenerating, setIsRegenerating] = useState<boolean>(false);
  const [generationStage, setGenerationStage] = useState<GenerationStage>('idle');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [carouselResult, setCarouselResult] = useState<CarouselGenerationResult | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isPastPostsOpen, setIsPastPostsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isAIMemoryOpen, setIsAIMemoryOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isActivityDashboardOpen, setIsActivityDashboardOpen] = useState(false);
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [batchResults, setBatchResults] = useState<BatchGenerationResult[]>([]);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(() => shouldShowOnboarding());
  const [isConnected, setIsConnected] = useState(false);
  const [profileStyleReference, setProfileStyleReference] = useState<string | null>(null);
  const [contentType, setContentType] = useState<ContentType>('carousel'); // Default to carousel (best performing)
  const [selectedTemplate, setSelectedTemplate] = useState<CarouselTemplate>(defaultTemplate);
  const [autoPilotStats, setAutoPilotStats] = useState(getAutoPilotStats());
  const [autoPilotEnabled, setAutoPilotEnabled] = useState(false);
  const [topicSuggestionsPool, setTopicSuggestionsPool] = useState<TopicSuggestion[]>([]); // Full pool
  const [visibleTopics, setVisibleTopics] = useState<TopicSuggestion[]>([]); // Currently visible (3 at a time)
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [scheduledForDate, setScheduledForDate] = useState<Date | null>(null);

  // Toast notifications
  const { toasts, showToast, dismissToast } = useToast();

  // Initialize global toast for use in other components
  useEffect(() => {
    setGlobalToast(showToast);
  }, [showToast]);

  // Check if any modal is open
  const anyModalOpen = isSettingsOpen || isPastPostsOpen || isProfileOpen || isAIMemoryOpen || isCalendarOpen || isActivityDashboardOpen || isBatchMode || batchResults.length > 0;

  // Close any open modal
  const closeAllModals = useCallback(() => {
    setIsSettingsOpen(false);
    setIsPastPostsOpen(false);
    setIsProfileOpen(false);
    setIsAIMemoryOpen(false);
    setIsCalendarOpen(false);
    setIsActivityDashboardOpen(false);
    setIsBatchMode(false);
    setBatchResults([]);
  }, []);

  // Style reference image for AI generation
  const [styleReferenceImage, setStyleReferenceImage] = useState<string | null>(null);
  const [styleReferencePreview, setStyleReferencePreview] = useState<string | null>(null);
  const styleReferenceInputRef = useRef<HTMLInputElement>(null);

  // Abort controller for canceling generation
  const abortControllerRef = useRef<AbortController | null>(null);
  const [isCancelled, setIsCancelled] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialTheme = savedTheme ? savedTheme === 'dark' : prefersDark;
    setIsDarkMode(initialTheme);
  }, []);

  useEffect(() => {
    // Check initial LinkedIn connection status
    setIsConnected(isTokenValid());

    // Load Auto-Pilot enabled state
    const savedAutoPilot = localStorage.getItem('autopilot_enabled');
    setAutoPilotEnabled(savedAutoPilot === 'true');
  }, []);

  useEffect(() => {
    // Handle OAuth callback on app initialization
    const processOAuthCallback = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      const state = params.get('state');

      // Only process if there are OAuth callback parameters
      if (code && state) {
        // Check if we've already processed this callback (prevents React StrictMode double execution)
        const callbackProcessed = sessionStorage.getItem('oauth_callback_processed');
        if (callbackProcessed) {
          console.log('OAuth callback already processed, skipping...');
          window.history.replaceState({}, '', window.location.pathname);
          return;
        }

        // Mark as being processed immediately to prevent duplicate calls
        sessionStorage.setItem('oauth_callback_processed', 'true');

        try {
          const result = await handleOAuthCallback();

          if (result?.success) {
            setIsConnected(true);
            console.log('✓ LinkedIn OAuth login successful!');
          } else if (result?.error) {
            console.error('OAuth login failed:', result.error);
            alert(`LinkedIn login failed: ${result.error}`);
            // Clear the flag so user can retry
            sessionStorage.removeItem('oauth_callback_processed');
          }
        } catch (error) {
          console.error('OAuth callback error:', error);
          alert('Failed to complete LinkedIn login');
          // Clear the flag so user can retry
          sessionStorage.removeItem('oauth_callback_processed');
        }

        // Clean URL (remove query params) after processing
        window.history.replaceState({}, '', window.location.pathname);
      }
    };

    processOAuthCallback();
  }, []);

  useEffect(() => {
    // Load profile style reference on mount
    const profileRef = getProfileStyleReference();
    setProfileStyleReference(profileRef);
  }, []);

  useEffect(() => {
    // Start Auto-Pilot if enabled
    startAutoPilot();

    // Update Auto-Pilot stats every 60 seconds
    const statsInterval = setInterval(() => {
      setAutoPilotStats(getAutoPilotStats());
    }, 60000);

    // Cleanup on unmount
    return () => {
      clearInterval(statsInterval);
      stopAutoPilot();
    };
  }, []);

  // Load topic suggestions from localStorage or generate new ones
  const loadOrGenerateTopicPool = async () => {
    const profile = getProfile();

    if (profile.autoSuggestTopics !== false && profile.industry && profile.targetAudience) {
      // Try to load from localStorage first
      const cached = localStorage.getItem('topic_suggestions_pool');
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          console.log('📦 Loaded topic pool from cache:', parsed.length, 'topics');
          setTopicSuggestionsPool(parsed);
          setVisibleTopics(parsed.slice(0, 3));
          return; // Don't generate if we have cached topics
        } catch (error) {
          console.error('Failed to parse cached topics:', error);
        }
      }

      // Generate fresh pool only if no cache
      console.log('🚀 Generating fresh topic suggestions pool...');
      setIsLoadingSuggestions(true);
      try {
        const result = await autoGenerateTopics(6); // Generate pool of 6 topics
        console.log('✅ Topic pool generated:', result.topics.length, 'topics');
        setTopicSuggestionsPool(result.topics);
        setVisibleTopics(result.topics.slice(0, 3)); // Show first 3
        // Save to localStorage
        localStorage.setItem('topic_suggestions_pool', JSON.stringify(result.topics));
      } catch (error) {
        console.error('❌ Failed to generate topic pool:', error);
        setError(error instanceof Error ? error.message : 'Failed to generate topics. Please check your Gemini API key in Settings.');
      } finally {
        setIsLoadingSuggestions(false);
      }
    }
  };

  // Explicitly regenerate topic pool (user action)
  const generateTopicPool = async () => {
    const profile = getProfile();

    if (profile.autoSuggestTopics !== false && profile.industry && profile.targetAudience) {
      console.log('🔄 Regenerating topic suggestions pool...');
      setIsLoadingSuggestions(true);
      try {
        const result = await autoGenerateTopics(6); // Generate pool of 6 topics
        console.log('✅ Topic pool regenerated:', result.topics.length, 'topics');
        setTopicSuggestionsPool(result.topics);
        setVisibleTopics(result.topics.slice(0, 3)); // Show first 3
        // Save to localStorage
        localStorage.setItem('topic_suggestions_pool', JSON.stringify(result.topics));
      } catch (error) {
        console.error('❌ Failed to regenerate topic pool:', error);
        setError(error instanceof Error ? error.message : 'Failed to regenerate topics. Please check your Gemini API key in Settings.');
      } finally {
        setIsLoadingSuggestions(false);
      }
    }
  };

  useEffect(() => {
    // Load topic pool on mount (from cache or generate)
    loadOrGenerateTopicPool();
  }, []); // Run once on mount

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  // Handle batch generation results
  const handleBatchGenerated = useCallback((results: BatchGenerationResult[]) => {
    setBatchResults(results);
    setIsBatchMode(false);
    // Log activity for each generated post
    results.forEach(r => logPostCreated(r.topic, r.post, r.contentType === 'carousel' ? 'carousel' : r.contentType === 'image' ? 'single-image' : 'text-only'));
  }, []);

  // Handle selecting a batch result to edit
  const handleSelectBatchResult = useCallback((batchResult: BatchGenerationResult) => {
    // Convert batch result to regular result format
    const resultData: GenerationResult = {
      post: batchResult.post,
      imagePrompt: batchResult.imagePrompt,
      sources: batchResult.sources,
    };
    setResult(resultData);
    setCarouselResult(null);
    setTopic(batchResult.topic);
    setContentType(batchResult.contentType === 'carousel' ? 'carousel' : batchResult.contentType === 'image' ? 'single-image' : 'text-only');
    setBatchResults([]); // Close batch results
    showToast('Post loaded for editing', 'success');
  }, [showToast]);

  // Stop/cancel generation
  const handleStopGeneration = useCallback(() => {
    setIsCancelled(true);
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsLoading(false);
    setIsRegenerating(false);
    setGenerationStage('idle');
    showToast('Generation cancelled', 'info');
  }, [showToast]);

  const handleGenerate = useCallback(async (isRegen: boolean = false, overrideTopic?: string, overrideContentType?: ContentType) => {
    const topicToUse = overrideTopic || topic;
    const typeToUse = overrideContentType || contentType;

    if (!topicToUse.trim()) {
      setError('Please enter a topic to generate content.');
      return;
    }

    if (!isGeminiConfigured()) {
      setError('Please configure your Gemini API key in Settings first.');
      return;
    }

    // Create new abort controller for this generation
    abortControllerRef.current = new AbortController();
    setIsCancelled(false);

    if (isRegen) {
      setIsRegenerating(true);
    } else {
      setIsLoading(true);
      setResult(null);
      setCarouselResult(null);
    }
    setError(null);
    setGenerationStage('researching');

    try {
      // Progress callback for real-time updates
      const handleProgress: GenerationProgressCallback = (stage, partialResult) => {
        // Check if cancelled
        if (abortControllerRef.current?.signal.aborted) return;

        setGenerationStage(stage as GenerationStage);

        // Show post immediately when available (during 'polishing' stage)
        if (partialResult?.post) {
          setResult({
            post: partialResult.post,
            imagePrompt: partialResult.imagePrompt || '',
            sources: partialResult.sources || [],
          });
        }
      };

      if (typeToUse === 'carousel') {
        // Carousel progress callback for real-time updates
        const handleCarouselProgress: CarouselProgressCallback = (stage, partialResult) => {
          // Check if cancelled
          if (abortControllerRef.current?.signal.aborted) return;

          setGenerationStage(stage as GenerationStage);

          // Show post immediately when available (during 'polishing' stage)
          if (partialResult?.post) {
            // Set regular result for immediate display
            setResult({
              post: partialResult.post,
              imagePrompt: '',
              sources: partialResult.sources || [],
            });

            // If we have slides, also set carousel result
            if (partialResult.slides && partialResult.slides.length > 0) {
              setCarouselResult({
                post: partialResult.post,
                slides: partialResult.slides,
                sources: partialResult.sources || [],
              });
            }
          }
        };

        const data = await generateCarouselContent(topicToUse, handleCarouselProgress);

        // Check if cancelled before setting results
        if (abortControllerRef.current?.signal.aborted) return;

        setGenerationStage('complete');

        setCarouselResult(data);
        // Also set regular result for compatibility
        const resultData: GenerationResult = {
          post: data.post,
          imagePrompt: data.slides[0]?.imagePrompt || '',
          sources: data.sources,
        };
        setResult(resultData);

        // Save to history
        savePostToHistory({
          topic: topicToUse,
          post: data.post,
          contentType: 'carousel',
          carouselSlides: data.slides,
          postedToLinkedIn: false,
        });

        // Log to activity dashboard
        logPostCreated(topicToUse, data.post, 'carousel');

        // Add to AI memory
        addToMemory(topicToUse, data.post, 'carousel', false);
      } else {
        // Use real progress callback for non-carousel content
        const data = await generateLinkedInContent(topicToUse, handleProgress);

        // Check if cancelled before setting results
        if (abortControllerRef.current?.signal.aborted) return;

        setGenerationStage('complete');

        // Final result (with hashtags added)
        setResult(data);

        // Save to history
        savePostToHistory({
          topic: topicToUse,
          post: data.post,
          imagePrompt: data.imagePrompt,
          contentType: typeToUse,
          postedToLinkedIn: false,
        });

        // Log to activity dashboard
        const activityType = typeToUse === 'image' ? 'single-image' : typeToUse === 'text' ? 'text-only' : typeToUse;
        logPostCreated(topicToUse, data.post, activityType as ContentType);

        // Add to AI memory
        addToMemory(topicToUse, data.post, typeToUse, false);
      }
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "An unknown error occurred.";
      setError(`Failed to generate content: ${errorMessage}`);
    } finally {
      setIsLoading(false);
      setIsRegenerating(false);
      // Reset stage after a brief delay to show completion
      setTimeout(() => setGenerationStage('idle'), 500);
    }
  }, [topic, contentType]);

  // Handle style reference image upload
  const handleStyleReferenceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        setStyleReferencePreview(dataUrl);
        const base64 = dataUrl.split(',')[1];
        setStyleReferenceImage(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleClearStyleReference = () => {
    setStyleReferenceImage(null);
    setStyleReferencePreview(null);
    if (styleReferenceInputRef.current) {
      styleReferenceInputRef.current.value = '';
    }
  };

  // Handle profile changes
  const handleProfileChange = async (profile: UserProfile) => {
    setProfileStyleReference(profile.styleReferenceImage);

    // Clear cache and regenerate topic pool if profile has required fields
    if (profile.autoSuggestTopics !== false && profile.industry && profile.targetAudience) {
      console.log('🎯 Profile changed, clearing cache and regenerating topics');
      localStorage.removeItem('topic_suggestions_pool'); // Clear old suggestions
      await generateTopicPool();
    }
  };

  // Load post from history
  const handleLoadPost = (savedPost: SavedPost) => {
    setTopic(savedPost.topic);
    setContentType(savedPost.contentType);
    setResult({
      post: savedPost.post,
      imagePrompt: savedPost.imagePrompt || '',
      sources: [],
    });
    if (savedPost.carouselSlides) {
      setCarouselResult({
        post: savedPost.post,
        slides: savedPost.carouselSlides,
        sources: [],
      });
    } else {
      setCarouselResult(null);
    }
    setIsPastPostsOpen(false);
  };

  // Handle Auto-Pilot toggle
  const handleAutoPilotToggle = (enabled: boolean) => {
    // Check prerequisites
    if (enabled) {
      if (!isTokenValid()) {
        alert('Please connect to LinkedIn first before enabling Auto-Pilot');
        return;
      }
      if (!isGeminiConfigured()) {
        alert('Please configure Gemini API key first before enabling Auto-Pilot');
        return;
      }
    }

    setAutoPilotEnabled(enabled);
    localStorage.setItem('autopilot_enabled', enabled.toString());

    // If disabling, stop the Auto-Pilot
    if (!enabled) {
      stopAutoPilot();
    }
  };

  // Handle topic selection from AI suggestion
  const handleTopicSelected = async (topic: TopicSuggestion) => {
    // Mark as used to prevent repetition
    markTopicAsUsed(topic.title);

    // Keep the user's current content type selection (don't override with topic.format)

    // Auto-fill topic with the title
    setTopic(topic.title);

    // Remove selected topic from pool to prevent duplicates
    const updatedPool = topicSuggestionsPool.filter(t => t.title !== topic.title);
    setTopicSuggestionsPool(updatedPool);

    // Remove from visible and pull next from remaining pool
    const remainingVisible = visibleTopics.filter(t => t.title !== topic.title);
    const nextTopic = updatedPool.find(t => !remainingVisible.some(vt => vt.title === t.title));

    let newVisible = remainingVisible;
    if (nextTopic) {
      // Add next topic from pool
      newVisible = [...remainingVisible, nextTopic];
    }

    setVisibleTopics(newVisible);

    // Update cache with updated pool (topic removed)
    localStorage.setItem('topic_suggestions_pool', JSON.stringify(updatedPool));

    // Auto-generate content with the selected topic using the CURRENT content type (not topic.format)
    setTimeout(() => {
      handleGenerate(false, topic.title, contentType);
    }, 100);
  };

  // Remove a topic suggestion without selecting it
  const handleRemoveTopic = (topic: TopicSuggestion) => {
    // Remove dismissed topic from pool to prevent duplicates
    const updatedPool = topicSuggestionsPool.filter(t => t.title !== topic.title);
    setTopicSuggestionsPool(updatedPool);

    // Remove from visible and pull next from remaining pool
    const remainingVisible = visibleTopics.filter(t => t.title !== topic.title);
    const nextTopic = updatedPool.find(t => !remainingVisible.some(vt => vt.title === t.title));

    if (nextTopic) {
      // Add next topic from pool
      setVisibleTopics([...remainingVisible, nextTopic]);
    } else {
      // No more topics in pool, just show remaining
      setVisibleTopics(remainingVisible);
    }

    // Update cache with updated pool (topic removed)
    localStorage.setItem('topic_suggestions_pool', JSON.stringify(updatedPool));
  };

  // Handle calendar date selection for scheduling
  const handleScheduleForDate = (date: Date) => {
    setScheduledForDate(date);
    showToast(`Scheduling for ${date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} at ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`, 'info');
  };

  // Clear scheduled date
  const handleClearScheduledDate = () => {
    setScheduledForDate(null);
  };

  // Start a new session (reset all content)
  const handleNewSession = () => {
    // Don't reset if currently loading
    if (isLoading || isRegenerating) return;

    // Reset all content-related state
    setTopic('');
    setResult(null);
    setCarouselResult(null);
    setError(null);
    setGenerationStage('idle');
    setScheduledForDate(null);
    setStyleReferenceImage(null);
    setStyleReferencePreview(null);

    // Close any open modals
    closeAllModals();

    showToast('Ready for a new post', 'info');
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleGenerate();
    }
  };

  // Keyboard shortcuts
  useAppShortcuts({
    onGenerate: () => handleGenerate(),
    onCloseModal: closeAllModals,
    isGenerating: isLoading || isRegenerating,
    hasResult: !!result,
    modalOpen: anyModalOpen,
  });

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-black' : 'bg-[#F3F2EF]'} transition-colors duration-300`}>
      <header className="fixed top-0 left-0 right-0 z-50 bg-white dark:bg-[#1D2226] border-b border-gray-100 dark:border-[#2D2D2D] h-16 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between">
          <a 
            href="https://www.skool.com/ai-marketing-hub-pro" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex-shrink-0"
          >
            <img 
              src={isDarkMode 
                ? "https://pub-6c18de93037f44df9146bef79e7b3f68.r2.dev/logo%20hub%20pro%20white.png"
                : "https://pub-6c18de93037f44df9146bef79e7b3f68.r2.dev/AI%20Marketing%20Hub%20Pro%20Logo%20Transparent%20normal.png"
              }
              alt="AI Marketing Hub Pro"
              className="h-10 w-auto"
            />
          </a>

          <div className="flex items-center gap-1 sm:gap-2">
            {/* Scheduler Status Indicator */}
            {autoPilotEnabled && (
              <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium bg-[#0A66C2]/10 text-[#0A66C2]">
                <div className="w-1.5 h-1.5 rounded-full bg-[#0A66C2] animate-pulse" />
                Scheduler On
              </div>
            )}

            {/* Connection Status Indicator */}
            <div className={`flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium ${
              isConnected
                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
            }`}>
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-gray-400'}`} />
              <span className="hidden sm:inline">{isConnected ? 'Connected' : 'Not connected'}</span>
              <span className="sm:hidden">{isConnected ? '✓' : '✗'}</span>
            </div>

            {/* Scheduler Toggle */}
            <div className="flex items-center gap-1.5 px-1.5 sm:px-2 py-1">
              <span className="hidden sm:inline text-xs font-medium text-gray-600 dark:text-gray-400">
                Scheduler
              </span>
              <CinematicSwitch
                checked={autoPilotEnabled}
                onChange={handleAutoPilotToggle}
                disabled={!isConnected || !isGeminiConfigured()}
              />
            </div>

            {/* Calendar Button */}
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsCalendarOpen(true);
              }}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-[#3E4042] transition-colors"
              aria-label="Content Calendar"
              title="Content Calendar"
            >
              <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </button>

            {/* Activity Dashboard Button */}
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsActivityDashboardOpen(true);
              }}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-[#3E4042] transition-colors"
              aria-label="Activity Dashboard"
              title="Activity Dashboard"
            >
              <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </button>

            {/* AI Memory Button */}
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsAIMemoryOpen(true);
              }}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-[#3E4042] transition-colors"
              aria-label="AI Memory"
              title="AI Memory"
            >
              <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
              </svg>
            </button>

            {/* Past Posts Button */}
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsPastPostsOpen(true);
              }}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-[#3E4042] transition-colors"
              aria-label="Past Posts"
              title="Past Posts"
            >
              <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>

            {/* Profile Button */}
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsProfileOpen(true);
              }}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-[#3E4042] transition-colors"
              aria-label="Profile"
              title="Profile"
            >
              <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </button>

            {/* Settings Button */}
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsSettingsOpen(true);
              }}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-[#3E4042] transition-colors"
              aria-label="Settings"
            >
              <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>

            {/* Theme Toggle */}
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDarkMode(!isDarkMode);
              }}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-[#3E4042] transition-colors"
              aria-label="Toggle theme"
            >
              {isDarkMode ? (
                <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" fillRule="evenodd" clipRule="evenodd"></path>
                </svg>
              ) : (
                <svg className="w-5 h-5 text-gray-700" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"></path>
                </svg>
              )}
            </button>
          </div>
        </div>
      </header>
      
      <main className="pt-[72px] pb-4 px-4 sm:px-6 lg:px-8">
        <div className="max-w-[680px] mx-auto">
          {/* Compact Header - Click to start new session */}
          <div className="flex items-center justify-center gap-3 mb-5 py-2">
            <button
              onClick={handleNewSession}
              disabled={isLoading || isRegenerating}
              className="flex items-center gap-2 group cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 transition-all hover:scale-[1.02] active:scale-[0.98]"
              title="Start new post"
            >
              <div className="w-9 h-9 rounded-xl bg-[#0A66C2] flex items-center justify-center shadow-md group-hover:shadow-lg group-hover:bg-[#004182] transition-all">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 bg-clip-text text-transparent group-hover:from-[#0A66C2] group-hover:to-[#004182] dark:group-hover:from-[#0A66C2] dark:group-hover:to-[#70B5F9] transition-all">
                Content Creator
              </h1>
            </button>
          </div>

          <div className="bg-white dark:bg-[#1D2226] p-4 sm:p-6 rounded-2xl border border-gray-200 dark:border-[#3E4042] shadow-xl dark:shadow-2xl dark:shadow-black/20 transition-colors duration-300">
            {/* Content Type Selector */}
            <div className="mb-4">
              <ContentTypeSelector
                selectedType={contentType}
                onTypeChange={setContentType}
                disabled={isLoading || isRegenerating}
              />
            </div>

            {/* Scheduled Date Indicator */}
            {scheduledForDate && (
              <div className="mb-4 flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 rounded-xl">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-blue-500 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                    Scheduling for {scheduledForDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} at {scheduledForDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                  </span>
                </div>
                <button
                  onClick={handleClearScheduledDate}
                  className="p-1 text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-800/30 rounded-lg transition-colors"
                  title="Clear scheduled date"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}

            {/* Template Selector - Only for Carousel */}
            {contentType === 'carousel' && (
              <div className="mb-4">
                <TemplateSelector
                  selectedTemplate={selectedTemplate}
                  onTemplateChange={setSelectedTemplate}
                  disabled={isLoading || isRegenerating}
                />
              </div>
            )}

            <label htmlFor="topic-input" className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
                <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" />
              </svg>
              What's your topic?
            </label>

            <input
              id="topic-input"
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="e.g., AI automation for marketers, LinkedIn growth strategies..."
              className="w-full px-4 py-3 mb-3 bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-[#3E4042] rounded-xl focus:ring-2 focus:ring-[#0A66C2] focus:border-[#0A66C2] focus:bg-white dark:focus:bg-black outline-none transition-all text-black dark:text-white placeholder-gray-400 text-sm"
              disabled={isLoading || isRegenerating}
            />

            {/* AI-Suggested Topics */}
            {isLoadingSuggestions && (
              <div className="mb-4 p-4 bg-gradient-to-br from-gray-50 to-gray-100/50 dark:from-black/40 dark:to-black/20 rounded-xl border border-gray-200 dark:border-[#3E4042]">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center">
                    <svg className="w-4 h-4 text-white animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Finding Quick Ideas</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Researching trending topics for you...</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full animate-pulse" style={{ width: '60%' }} />
                  </div>
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}

            {!isLoadingSuggestions && visibleTopics.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" />
                    </svg>
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Quick Ideas</span>
                  </div>
                  <button
                    onClick={generateTopicPool}
                    className="text-xs text-gray-400 hover:text-[#0A66C2] dark:hover:text-[#4A9EFF] flex items-center gap-1 transition-colors"
                    title="Get new ideas"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Refresh
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {visibleTopics.map((topic, index) => (
                    <button
                      key={index}
                      onClick={() => handleTopicSelected(topic)}
                      className="group inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 rounded-full border border-gray-200 dark:border-white/10 hover:bg-[#0A66C2] hover:text-white hover:border-[#0A66C2] dark:hover:bg-[#0A66C2] dark:hover:border-[#0A66C2] transition-all duration-200 cursor-pointer"
                    >
                      <span className="line-clamp-1">{topic.title}</span>
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveTopic(topic);
                        }}
                        className="w-3.5 h-3.5 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors"
                      >
                        <svg className="w-2.5 h-2.5 opacity-50 group-hover:opacity-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </span>
                    </button>
                  ))}
                  {/* Load More button - shows if there are more topics in the pool */}
                  {topicSuggestionsPool.length > visibleTopics.length && (
                    <button
                      onClick={() => setVisibleTopics(topicSuggestionsPool)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-[#0A66C2] dark:hover:text-[#4A9EFF] rounded-full border border-dashed border-gray-300 dark:border-gray-600 hover:border-[#0A66C2] dark:hover:border-[#4A9EFF] transition-all duration-200 cursor-pointer"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      {topicSuggestionsPool.length - visibleTopics.length} more
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Style Reference Image - Only for Image content type */}
            {contentType === 'image' && (
            <details className="mb-4 group">
              <summary className="cursor-pointer list-none">
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-black/30 rounded-lg border border-gray-200 dark:border-[#3E4042] hover:bg-gray-100 dark:hover:bg-black/50 transition-colors">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Style Reference</span>
                    <span className="text-xs px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded-full flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Image
                    </span>
                    {(styleReferencePreview || profileStyleReference) && (
                      <span className="text-xs px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full">
                        Active
                      </span>
                    )}
                  </div>
                  <svg className="w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </summary>

              <div className="mt-2 p-3 bg-gray-50 dark:bg-black/30 rounded-lg border border-gray-200 dark:border-[#3E4042]">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Upload an image to style AI-generated images
                  </p>
                  {styleReferencePreview && (
                    <button
                      onClick={handleClearStyleReference}
                      className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Remove
                    </button>
                  )}
                </div>

                <input
                  type="file"
                  accept="image/*"
                  ref={styleReferenceInputRef}
                  onChange={handleStyleReferenceChange}
                  className="hidden"
                />

                {styleReferencePreview ? (
                  <div className="flex items-center gap-2">
                    <img
                      src={styleReferencePreview}
                      alt="Style reference"
                      className="w-12 h-12 object-cover rounded-lg border border-gray-300 dark:border-[#3E4042]"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        Style reference loaded
                      </p>
                    </div>
                  </div>
                ) : profileStyleReference ? (
                  <div className="flex items-center gap-2">
                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg border border-blue-300 dark:border-blue-700 flex items-center justify-center flex-shrink-0">
                      <svg className="w-6 h-6 text-blue-500 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-blue-600 dark:text-blue-400">Using profile default</p>
                    </div>
                    <button
                      onClick={() => styleReferenceInputRef.current?.click()}
                      disabled={isLoading || isRegenerating}
                      className="text-xs text-[#0A66C2] hover:text-[#004182] font-medium disabled:opacity-50 whitespace-nowrap"
                    >
                      Override
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => styleReferenceInputRef.current?.click()}
                    disabled={isLoading || isRegenerating}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm bg-white dark:bg-black text-gray-600 dark:text-gray-300 rounded-lg border border-dashed border-gray-300 dark:border-[#3E4042] hover:border-[#0A66C2] hover:text-[#0A66C2] transition-colors disabled:opacity-50"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    Upload Style Reference
                  </button>
                )}
              </div>
            </details>
            )}

            <div className="flex gap-2">
              {isLoading ? (
                <>
                  <div className="flex-1 flex items-center justify-center gap-2.5 px-6 py-3.5 bg-gradient-to-r from-[#0A66C2] to-[#004182] text-white font-semibold rounded-xl opacity-90">
                    <LoadingSpinner className="h-5 w-5" />
                    <span>Creating your content...</span>
                  </div>
                  <button
                    onClick={handleStopGeneration}
                    className="flex items-center justify-center gap-2 px-4 py-3.5 bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold rounded-xl hover:from-red-600 hover:to-red-700 transition-all duration-200 shadow-lg shadow-red-500/25"
                    title="Stop generation"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    <span className="hidden sm:inline">Stop</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={() => handleGenerate()}
                  disabled={!topic.trim() || isRegenerating}
                  className="flex-1 flex items-center justify-center gap-2.5 px-6 py-3.5 bg-gradient-to-r from-[#0A66C2] to-[#004182] text-white font-semibold rounded-xl hover:from-[#004182] hover:to-[#003366] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-[1.01] active:scale-[0.99] shadow-lg hover:shadow-xl shadow-[#0A66C2]/25"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span>Generate</span>
                  <span className="hidden sm:inline-flex items-center ml-2 px-1.5 py-0.5 bg-white/20 rounded text-[10px] font-mono">
                    {getShortcutDisplay({ ctrlKey: true, key: 'Enter' })}
                  </span>
                </button>
              )}
              <button
                onClick={() => setIsBatchMode(true)}
                disabled={isLoading || isRegenerating}
                className="flex items-center justify-center gap-2 px-4 py-3.5 bg-gradient-to-r from-[#004182] to-[#00264d] text-white font-semibold rounded-xl hover:from-[#003366] hover:to-[#001a33] disabled:from-gray-400 disabled:to-gray-500 dark:disabled:from-gray-700 dark:disabled:to-gray-800 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-[#004182]/25"
                title="Generate multiple posts at once"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <span className="hidden sm:inline">Batch</span>
              </button>
            </div>
            
            {error && (
              <div className="mt-4 flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-xl">
                <svg className="w-4 h-4 text-red-500 dark:text-red-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}
          </div>

          {/* Show progress indicator while loading */}
          {isLoading && (
            <div className="mt-6">
              <GenerationProgress stage={generationStage} contentType={contentType} />
            </div>
          )}

          {/* Show result - including during loading when post is available early */}
          {result && (
            <ResultDisplay
              result={result}
              carouselResult={carouselResult}
              contentType={contentType}
              onRegenerate={() => handleGenerate(true)}
              isRegenerating={isRegenerating}
              isConnected={isConnected}
              styleReferenceImage={styleReferenceImage || profileStyleReference}
              selectedTemplate={selectedTemplate}
              preSelectedDate={scheduledForDate}
              onScheduled={handleClearScheduledDate}
            />
          )}
        </div>
      </main>

      {/* Settings Panel */}
      <Settings
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        isConnected={isConnected}
        onConnectionChange={setIsConnected}
      />

      {/* Past Posts Panel */}
      <PastPosts
        isOpen={isPastPostsOpen}
        onClose={() => setIsPastPostsOpen(false)}
        onLoadPost={handleLoadPost}
      />

      {/* Profile Panel */}
      <Profile
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        onProfileChange={handleProfileChange}
      />

      {/* AI Memory Panel */}
      <AIMemory
        isOpen={isAIMemoryOpen}
        onClose={() => setIsAIMemoryOpen(false)}
      />

      {/* Content Calendar */}
      <ContentCalendar
        isOpen={isCalendarOpen}
        onClose={() => setIsCalendarOpen(false)}
        onScheduleForDate={handleScheduleForDate}
      />

      {/* Activity Dashboard */}
      <ActivityDashboard
        isOpen={isActivityDashboardOpen}
        onClose={() => setIsActivityDashboardOpen(false)}
      />

      {/* Batch Generator Modal */}
      {isBatchMode && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="max-w-xl w-full">
            <BatchGenerator
              onBatchGenerated={handleBatchGenerated}
              onCancel={() => setIsBatchMode(false)}
            />
          </div>
        </div>
      )}

      {/* Batch Results Modal */}
      {batchResults.length > 0 && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="max-w-4xl w-full max-h-[90vh]">
            <BatchResults
              results={batchResults}
              onClose={() => setBatchResults([])}
              onSelectPost={handleSelectBatchResult}
            />
          </div>
        </div>
      )}

      {/* Onboarding Flow */}
      <OnboardingFlow
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
        onOpenSettings={() => {
          setIsOnboardingOpen(false);
          setIsSettingsOpen(true);
        }}
        onOpenProfile={() => {
          setIsOnboardingOpen(false);
          setIsProfileOpen(true);
        }}
        onStartGeneration={() => {
          setIsOnboardingOpen(false);
          // Focus on topic input if available
          const input = document.querySelector('input[placeholder*="topic"]') as HTMLInputElement;
          if (input) input.focus();
        }}
      />

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
};

export default App;
