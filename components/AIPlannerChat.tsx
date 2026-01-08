import React, { useState, useEffect } from 'react';
import PlannerQuestionCard, { QuestionSuggestion } from './PlannerQuestionCard';
import AIPlannerProgress from './AIPlannerProgress';
import LoadingSpinner from './LoadingSpinner';
import TimePicker from './TimePicker';
import { getSuggestedPostingTimes } from '../services/calendarStorage';
import { getProfile } from '../services/profileService';
import { getPlannerPreferences, savePlannerPreferences } from '../services/memoryService';
import {
  startNewPlanningSession,
  generatePlannerTopics,
  startContentGeneration,
  pauseContentGeneration,
  resumeContentGeneration,
  setBackgroundGeneration,
  deletePlannerDrafts,
  getGenerationStats,
  PlannerConfig,
  PlanningSession,
} from '../services/aiPlannerService';
import {
  getActivePlanningSession,
  getPlanningSession,
  updatePlannerConfig,
  deletePlanningSession,
} from '../services/plannerStorageService';
import { getDraftPostsByPlanId } from '../services/schedulerService';
import { toast } from '../hooks/useToast';
import { getModels } from '../services/geminiService';

interface AIPlannerChatProps {
  onTopicsGenerated?: () => void;
  onPostsCreated?: () => void;
  onClose?: () => void;
}

type Step = 'duration' | 'frequency' | 'times' | 'content-mix' | 'themes' | 'research' | 'generating-topics' | 'topics-ready' | 'generating-content' | 'complete' | 'resume';

interface QuestionConfig {
  step: Step;
  question: string;
  suggestions: QuestionSuggestion[];
  multiSelect: boolean;
  allowCustom: boolean;
  configKey: keyof PlannerConfig;
}

const QUESTIONS: QuestionConfig[] = [
  {
    step: 'duration',
    question: 'How many days would you like to plan?',
    suggestions: [
      { label: '7 days', value: 7, description: 'One week' },
      { label: '14 days', value: 14, description: 'Two weeks' },
      { label: '30 days', value: 30, description: 'One month' },
    ],
    multiSelect: false,
    allowCustom: true,
    configKey: 'durationDays',
  },
  {
    step: 'frequency',
    question: 'How many posts per day?',
    suggestions: [
      { label: '1 post', value: 1, description: 'Sustainable' },
      { label: '2 posts', value: 2, description: 'Active' },
      { label: '3 posts', value: 3, description: 'Aggressive' },
    ],
    multiSelect: false,
    allowCustom: true,
    configKey: 'postsPerDay',
  },
  {
    step: 'times',
    question: 'When should posts be scheduled?',
    suggestions: [], // Will be populated from calendarStorage
    multiSelect: true,
    allowCustom: true,
    configKey: 'postingTimes',
  },
  {
    step: 'content-mix',
    question: 'What content mix do you prefer?',
    suggestions: [
      { label: 'Carousel-heavy', value: 'carousel-heavy', description: '60% carousels, best engagement' },
      { label: 'Image-heavy', value: 'image-heavy', description: '50% image posts, visual focus' },
      { label: 'Text-heavy', value: 'text-heavy', description: '50% text posts, quick to create' },
      { label: 'Balanced', value: 'balanced', description: 'Even mix of all types' },
    ],
    multiSelect: false,
    allowCustom: false,
    configKey: 'contentMix',
  },
  {
    step: 'themes',
    question: 'What themes or goals for this period?',
    suggestions: [], // Will be populated from profile
    multiSelect: true,
    allowCustom: true,
    configKey: 'themes',
  },
  {
    step: 'research',
    question: 'Include trending topic research?',
    suggestions: [
      { label: 'Yes', value: 'yes', description: 'Uses Firecrawl API for trends' },
      { label: 'No', value: 'no', description: 'Use profile & memory only' },
    ],
    multiSelect: false,
    allowCustom: false,
    configKey: 'includeResearch',
  },
];

// Times Step with text input and TimePicker dropdown on clock icon
const TimesStepWithPicker: React.FC<{
  selectedValues: string[];
  onSelect: (values: (string | number)[]) => void;
  suggestions: QuestionSuggestion[];
}> = ({ selectedValues, onSelect, suggestions }) => {
  const [timeInput, setTimeInput] = useState('');
  const [pickerTime, setPickerTime] = useState('09:00');
  const [showPicker, setShowPicker] = useState(false);

  const formatTimeDisplay = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    const isPM = h >= 12;
    const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${displayH}:${m.toString().padStart(2, '0')} ${isPM ? 'PM' : 'AM'}`;
  };

  // Parse user input like "9am", "9:30 PM", "14:00" to 24h format
  const parseTimeInput = (input: string): string | null => {
    const trimmed = input.trim().toLowerCase();
    if (!trimmed) return null;

    // Try various formats
    // Format: 9am, 9pm, 9 am, 9 pm
    const simpleMatch = trimmed.match(/^(\d{1,2})\s*(am|pm)$/i);
    if (simpleMatch) {
      let hour = parseInt(simpleMatch[1]);
      const isPM = simpleMatch[2].toLowerCase() === 'pm';
      if (hour < 1 || hour > 12) return null;
      if (isPM && hour !== 12) hour += 12;
      if (!isPM && hour === 12) hour = 0;
      return `${hour.toString().padStart(2, '0')}:00`;
    }

    // Format: 9:30am, 9:30 pm
    const withMinutesMatch = trimmed.match(/^(\d{1,2}):(\d{2})\s*(am|pm)$/i);
    if (withMinutesMatch) {
      let hour = parseInt(withMinutesMatch[1]);
      const minutes = parseInt(withMinutesMatch[2]);
      const isPM = withMinutesMatch[3].toLowerCase() === 'pm';
      if (hour < 1 || hour > 12 || minutes < 0 || minutes > 59) return null;
      if (isPM && hour !== 12) hour += 12;
      if (!isPM && hour === 12) hour = 0;
      return `${hour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }

    // Format: 14:00, 9:30 (24h)
    const militaryMatch = trimmed.match(/^(\d{1,2}):(\d{2})$/);
    if (militaryMatch) {
      const hour = parseInt(militaryMatch[1]);
      const minutes = parseInt(militaryMatch[2]);
      if (hour < 0 || hour > 23 || minutes < 0 || minutes > 59) return null;
      return `${hour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }

    return null;
  };

  const handleQuickSelect = (value: string | number) => {
    const timeStr = String(value);
    if (selectedValues.includes(timeStr)) {
      onSelect(selectedValues.filter(v => v !== timeStr));
    } else {
      onSelect([...selectedValues, timeStr]);
    }
  };

  const handleAddFromInput = () => {
    const parsed = parseTimeInput(timeInput);
    if (parsed && !selectedValues.includes(parsed)) {
      onSelect([...selectedValues, parsed]);
      setTimeInput('');
    }
  };

  const handleAddFromPicker = () => {
    if (!selectedValues.includes(pickerTime)) {
      onSelect([...selectedValues, pickerTime]);
    }
    setShowPicker(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddFromInput();
    }
  };

  const handleRemoveTime = (time: string) => {
    onSelect(selectedValues.filter(v => v !== time));
  };

  const handlePickerChange = (newTime: string) => {
    setPickerTime(newTime);
  };

  return (
    <div className="space-y-4">
      {/* Question */}
      <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
        When should posts be scheduled?
      </p>

      {/* Quick Select Buttons */}
      <div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Quick select best times:</p>
        <div className="flex flex-wrap gap-2">
          {suggestions.map((suggestion) => (
            <button
              key={String(suggestion.value)}
              onClick={() => handleQuickSelect(suggestion.value)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                selectedValues.includes(String(suggestion.value))
                  ? 'bg-[#0A66C2] text-white shadow-sm'
                  : 'bg-gray-100 dark:bg-[#2D3748] text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#3E4042] border border-gray-200 dark:border-[#3E4042]'
              }`}
              title={suggestion.description}
            >
              {suggestion.label}
            </button>
          ))}
        </div>
      </div>

      {/* Selected Times as Chips */}
      {selectedValues.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
            Selected times ({selectedValues.length}):
          </p>
          <div className="flex flex-wrap gap-2">
            {selectedValues.map((time) => (
              <span
                key={String(time)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0A66C2]/10 text-[#0A66C2] rounded-lg text-sm font-medium"
              >
                {formatTimeDisplay(String(time))}
                <button
                  onClick={() => handleRemoveTime(String(time))}
                  className="hover:text-[#004182] transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Custom Time Input with Clock Icon */}
      <div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Or add custom time:</p>
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <input
              type="text"
              value={timeInput}
              onChange={(e) => setTimeInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type time (e.g., 9am, 2:30pm, 14:00)"
              className="w-full px-3 py-2 pr-10 bg-white dark:bg-black border border-gray-300 dark:border-[#3E4042] rounded-lg text-sm text-gray-900 dark:text-white focus:ring-1 focus:ring-[#0A66C2] focus:border-[#0A66C2] outline-none"
            />
            {/* Clock icon button to open picker */}
            <button
              type="button"
              onClick={() => setShowPicker(!showPicker)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-[#0A66C2] transition-colors"
              title="Open time picker"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>

            {/* Time Picker Dropdown */}
            {showPicker && (
              <>
                {/* Backdrop */}
                <div className="fixed inset-0 z-40" onClick={() => setShowPicker(false)} />

                {/* Picker Dropdown */}
                <div className="absolute top-full left-0 mt-1 z-50 bg-white dark:bg-[#1D2226] border border-gray-200 dark:border-[#3E4042] rounded-xl shadow-2xl w-[300px] overflow-hidden">
                  <div className="p-3">
                    {/* Hour / Minute / Period Selectors */}
                    <div className="flex gap-3">
                      {/* Hours */}
                      <div className="flex-1">
                        <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-1.5 text-center uppercase">Hour</p>
                        <div className="h-32 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 space-y-0.5">
                          {[12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(hour => {
                            const [h] = pickerTime.split(':').map(Number);
                            const isPM = h >= 12;
                            const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h;
                            return (
                              <button
                                key={hour}
                                type="button"
                                onClick={() => {
                                  const [, m] = pickerTime.split(':').map(Number);
                                  const wasPM = h >= 12;
                                  let newHour = hour;
                                  if (wasPM && hour !== 12) newHour = hour + 12;
                                  else if (!wasPM && hour === 12) newHour = 0;
                                  setPickerTime(`${newHour.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
                                }}
                                className={`w-full px-2 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                                  displayH === hour
                                    ? 'bg-[#0A66C2] text-white'
                                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10'
                                }`}
                              >
                                {hour.toString().padStart(2, '0')}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Separator */}
                      <div className="flex items-center text-gray-400 dark:text-gray-500 text-xl font-bold pt-6">:</div>

                      {/* Minutes */}
                      <div className="flex-1">
                        <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-1.5 text-center uppercase">Min</p>
                        <div className="h-32 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 space-y-0.5">
                          {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map(minute => {
                            const [h, m] = pickerTime.split(':').map(Number);
                            return (
                              <button
                                key={minute}
                                type="button"
                                onClick={() => setPickerTime(`${h.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`)}
                                className={`w-full px-2 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                                  m === minute
                                    ? 'bg-[#0A66C2] text-white'
                                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10'
                                }`}
                              >
                                {minute.toString().padStart(2, '0')}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* AM/PM */}
                      <div className="w-14">
                        <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-1.5 text-center uppercase">Period</p>
                        <div className="space-y-1 pt-1">
                          {['AM', 'PM'].map(period => {
                            const [h, m] = pickerTime.split(':').map(Number);
                            const isPM = h >= 12;
                            const isActive = (period === 'PM') === isPM;
                            return (
                              <button
                                key={period}
                                type="button"
                                onClick={() => {
                                  let newH = h;
                                  if (period === 'PM' && h < 12) newH = h + 12;
                                  else if (period === 'AM' && h >= 12) newH = h - 12;
                                  setPickerTime(`${newH.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
                                }}
                                className={`w-full px-2 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                                  isActive
                                    ? 'bg-[#0A66C2] text-white'
                                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10'
                                }`}
                              >
                                {period}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Current Selection */}
                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-[#3E4042] text-center">
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">
                        {formatTimeDisplay(pickerTime)}
                      </span>
                    </div>
                  </div>

                  {/* Add Button */}
                  <div className="p-2 border-t border-gray-200 dark:border-[#3E4042]">
                    <button
                      type="button"
                      onClick={handleAddFromPicker}
                      className="w-full px-3 py-2 bg-[#0A66C2] text-white text-sm font-medium rounded-lg hover:bg-[#004182] transition-colors"
                    >
                      Add {formatTimeDisplay(pickerTime)}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
          <button
            onClick={handleAddFromInput}
            disabled={!parseTimeInput(timeInput)}
            className="px-4 py-2 bg-[#0A66C2] text-white text-sm font-medium rounded-lg hover:bg-[#004182] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Add
          </button>
        </div>
      </div>

      {/* Helper text */}
      <p className="text-xs text-gray-400 dark:text-gray-500">
        Type a time or click the clock icon to use the picker
      </p>
    </div>
  );
};

const AIPlannerChat: React.FC<AIPlannerChatProps> = ({ onTopicsGenerated, onPostsCreated, onClose }) => {
  const [currentStep, setCurrentStep] = useState<Step>('duration');
  const [answers, setAnswers] = useState<Record<string, (string | number)[]>>({});
  const [session, setSession] = useState<PlanningSession | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Generation state
  const [generationProgress, setGenerationProgress] = useState({ current: 0, total: 0 });
  const [currentTopic, setCurrentTopic] = useState<string | undefined>();
  const [isPaused, setIsPaused] = useState(false);
  const [isBackground, setIsBackground] = useState(false);
  const [generationError, setGenerationError] = useState<string | undefined>();

  // Topic editing state
  const [editingTopicId, setEditingTopicId] = useState<string | null>(null);
  const [editingTopicText, setEditingTopicText] = useState('');
  const [regeneratingTopicId, setRegeneratingTopicId] = useState<string | null>(null);

  // Load preferences and check for existing session
  useEffect(() => {
    // Check for existing session to resume
    const existingSession = getActivePlanningSession();
    if (existingSession) {
      setSession(existingSession);

      const stats = getGenerationStats(existingSession.id);
      if (stats) {
        setGenerationProgress({ current: stats.completed, total: stats.total });
      }

      if (existingSession.status === 'paused' || existingSession.status === 'generating-content') {
        // Check if generation might have completed
        if (stats && stats.pending === 0 && stats.completed > 0) {
          setCurrentStep('complete');
        } else {
          // Always show resume prompt for paused/generating-content states
          // because we can't know if generation is actually running after a page refresh
          setCurrentStep('resume');
          setIsPaused(true);
        }
      } else if (existingSession.status === 'topics-ready') {
        setCurrentStep('topics-ready');
      } else if (existingSession.status === 'complete') {
        setCurrentStep('complete');
      }
      return;
    }

    // Load preferences for defaults
    const prefs = getPlannerPreferences();
    setAnswers({
      duration: [prefs.lastDurationDays],
      frequency: [prefs.lastPostsPerDay],
      times: prefs.preferredTimes,
      'content-mix': [prefs.preferredContentMix],
      themes: prefs.commonThemes,
      research: [prefs.includeResearch ? 'yes' : 'no'],
    });
  }, []);

  // Populate dynamic suggestions
  const getQuestionWithSuggestions = (question: QuestionConfig): QuestionConfig => {
    if (question.step === 'times') {
      const times = getSuggestedPostingTimes();
      return {
        ...question,
        suggestions: times.map(t => ({
          label: t.label,
          value: t.time,
          description: t.description,
        })),
      };
    }

    if (question.step === 'themes') {
      const profile = getProfile();
      const suggestions: QuestionSuggestion[] = [];

      // Add Auto-suggest option first (based on profile and AI memory)
      suggestions.push({
        label: 'Auto-suggest',
        value: 'auto-suggest',
        description: 'Based on your profile & AI memory',
      });

      // Add generic theme options
      const themeOptions = ['Thought Leadership', 'Industry Insights', 'Career Tips', 'Product Updates'];
      themeOptions.forEach(theme => {
        suggestions.push({ label: theme, value: theme.toLowerCase() });
      });

      // Add user's focus keywords as custom tags
      if (profile.focusKeywords && profile.focusKeywords.length > 0) {
        profile.focusKeywords.forEach(kw => {
          if (!suggestions.some(s => s.value === kw.toLowerCase())) {
            suggestions.push({ label: kw, value: kw.toLowerCase() });
          }
        });
      }

      return { ...question, suggestions };
    }

    return question;
  };

  const getCurrentQuestion = (): QuestionConfig | null => {
    const question = QUESTIONS.find(q => q.step === currentStep);
    return question ? getQuestionWithSuggestions(question) : null;
  };

  const handleAnswer = (values: (string | number)[]) => {
    setAnswers(prev => ({ ...prev, [currentStep]: values }));
    setError(null);
  };

  const goToNextStep = () => {
    const stepOrder: Step[] = ['duration', 'frequency', 'times', 'content-mix', 'themes', 'research'];
    const currentIndex = stepOrder.indexOf(currentStep as Step);

    if (currentIndex < stepOrder.length - 1) {
      setCurrentStep(stepOrder[currentIndex + 1]);
    } else {
      // All questions answered, start topic generation
      handleGenerateTopics();
    }
  };

  const goToPrevStep = () => {
    const stepOrder: Step[] = ['duration', 'frequency', 'times', 'content-mix', 'themes', 'research'];
    const currentIndex = stepOrder.indexOf(currentStep as Step);

    if (currentIndex > 0) {
      setCurrentStep(stepOrder[currentIndex - 1]);
    }
  };

  const canProceed = (): boolean => {
    const currentAnswers = answers[currentStep] || [];
    return currentAnswers.length > 0;
  };

  const buildConfig = (): PlannerConfig => {
    return {
      durationDays: Number(answers.duration?.[0]) || 7,
      postsPerDay: Number(answers.frequency?.[0]) || 1,
      postingTimes: (answers.times || ['09:00']) as string[],
      contentMix: (answers['content-mix']?.[0] || 'balanced') as PlannerConfig['contentMix'],
      themes: (answers.themes || []) as string[],
      includeResearch: answers.research?.[0] === 'yes',
    };
  };

  const handleGenerateTopics = async () => {
    setIsLoading(true);
    setCurrentStep('generating-topics');
    setError(null);

    try {
      const config = buildConfig();

      // Save preferences
      savePlannerPreferences({
        lastDurationDays: config.durationDays,
        lastPostsPerDay: config.postsPerDay,
        preferredTimes: config.postingTimes,
        preferredContentMix: config.contentMix,
        includeResearch: config.includeResearch,
      });

      // Create session
      const newSession = startNewPlanningSession(config);
      setSession(newSession);

      // Generate topics
      await generatePlannerTopics(newSession.id, (message) => {
        setLoadingMessage(message);
      });

      // Refetch the updated session with generated topics
      const updatedSession = getPlanningSession(newSession.id);
      if (updatedSession) {
        setSession(updatedSession);
      }

      setCurrentStep('topics-ready');
      onTopicsGenerated?.();
      onPostsCreated?.(); // Refresh calendar to show new drafts
      toast.success('Topics generated successfully!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate topics');
      setCurrentStep('research'); // Go back to last question
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  };

  const handleStartGeneration = async () => {
    if (!session) return;

    setCurrentStep('generating-content');
    setGenerationError(undefined);
    setIsPaused(false);

    try {
      await startContentGeneration(session.id, {
        onProgress: (current, total, topic) => {
          setGenerationProgress({ current, total });
          setCurrentTopic(topic);
        },
        onPostGenerated: () => {
          // Post generated successfully - refresh calendar
          onPostsCreated?.();
        },
        onError: (postId, error) => {
          setGenerationError(error);
        },
        onComplete: () => {
          setCurrentStep('complete');
          toast.success('All content generated successfully!');
          onPostsCreated?.();
        },
        onPaused: () => {
          setIsPaused(true);
        },
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Generation failed';
      setGenerationError(errorMsg);
      setIsPaused(true);
    }
  };

  const handlePause = () => {
    pauseContentGeneration();
  };

  const handleResume = async () => {
    if (!session) return;

    setIsPaused(false);
    setGenerationError(undefined);

    try {
      await resumeContentGeneration(session.id, {
        onProgress: (current, total, topic) => {
          setGenerationProgress({ current, total });
          setCurrentTopic(topic);
        },
        onPostGenerated: () => {
          onPostsCreated?.();
        },
        onComplete: () => {
          setCurrentStep('complete');
          toast.success('All content generated successfully!');
          onPostsCreated?.();
        },
        onPaused: () => {
          setIsPaused(true);
        },
        onError: (_, error) => {
          setGenerationError(error);
        },
      });
    } catch (err) {
      setGenerationError(err instanceof Error ? err.message : 'Resume failed');
      setIsPaused(true);
    }
  };

  const handleBackground = () => {
    if (!session) return;
    setBackgroundGeneration(session.id, true);
    setIsBackground(true);
    toast.info('Generation continues in background. Check calendar for progress.');
    // Close the planner view and switch to month view
    onClose?.();
  };

  const handleCancel = () => {
    if (session) {
      deletePlannerDrafts(session.id);
      deletePlanningSession(session.id);
    }
    setSession(null);
    setCurrentStep('duration');
    setAnswers({});
    onClose?.();
  };

  const handleStop = () => {
    // Stop generation but keep progress (don't delete drafts)
    pauseContentGeneration();
    setIsPaused(true);
    setCurrentStep('complete');
    toast.success(`Generation stopped. ${generationProgress.current} posts saved.`);
    onPostsCreated?.();
  };

  const handleResumeSession = () => {
    if (!session) return;

    if (session.status === 'topics-ready') {
      setCurrentStep('topics-ready');
    } else {
      handleStartGeneration();
    }
  };

  const handleDiscardSession = () => {
    if (session) {
      deletePlannerDrafts(session.id);
      deletePlanningSession(session.id);
    }
    setSession(null);
    setCurrentStep('duration');
  };

  const currentQuestion = getCurrentQuestion();
  const totalPosts = (Number(answers.duration?.[0]) || 7) * (Number(answers.frequency?.[0]) || 1);

  // Render resume prompt
  if (currentStep === 'resume' && session) {
    const stats = getGenerationStats(session.id);
    const draftCount = getDraftPostsByPlanId(session.id).length;

    return (
      <div className="space-y-4">
        <div className="text-center py-4">
          <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-sm font-medium text-gray-900 dark:text-white">
            Unfinished Planning Session
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {stats ? `${stats.pending} posts remaining to generate` : `${draftCount} draft posts ready`}
          </p>
        </div>

        <div className="space-y-2">
          <button
            onClick={handleResumeSession}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#0A66C2] text-white text-sm font-medium rounded-lg hover:bg-[#004182] transition-colors"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
            </svg>
            Resume
          </button>
          <button
            onClick={handleDiscardSession}
            className="w-full py-2.5 text-gray-500 dark:text-gray-400 text-sm font-medium rounded-lg border border-gray-200 dark:border-[#3E4042] hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
          >
            Start Fresh
          </button>
        </div>
      </div>
    );
  }

  // Render loading state with thinking feedback
  if (currentStep === 'generating-topics') {
    const thinkingMessages = [
      'Analyzing your profile and preferences...',
      'Researching trending topics in your industry...',
      'Identifying content opportunities...',
      'Planning optimal posting schedule...',
      'Generating topic ideas...',
      'Matching topics to content types...',
      'Finalizing your content plan...',
    ];

    // Cycle through messages or use provided loading message
    const displayMessage = loadingMessage || thinkingMessages[Math.floor(Date.now() / 2000) % thinkingMessages.length];

    return (
      <div className="flex flex-col items-center justify-center py-8 space-y-4">
        <div className="relative">
          <LoadingSpinner className="h-10 w-10 text-[#0A66C2]" />
          <div className="absolute inset-0 flex items-center justify-center">
            <svg className="w-4 h-4 text-[#0A66C2]/50" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
            </svg>
          </div>
        </div>
        <div className="text-center max-w-xs">
          <p className="text-sm font-semibold text-gray-900 dark:text-white">
            Planning your content...
          </p>
          <p className="text-xs text-[#0A66C2] mt-2 animate-pulse">
            {displayMessage}
          </p>
          <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-3">
            Creating {totalPosts} topics for the next {answers.duration?.[0] || 7} days
          </p>
        </div>
      </div>
    );
  }

  // Render topics ready state
  if (currentStep === 'topics-ready' && session) {
    const topicCount = session.topicsGenerated.length;

    const formatDateTime = (dateStr: string) => {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    };

    const handleStartOver = () => {
      // Clear everything and start fresh
      if (session) {
        deletePlannerDrafts(session.id);
        deletePlanningSession(session.id);
      }
      setSession(null);
      setAnswers({});
      setCurrentStep('duration');
    };

    const handleGoBack = () => {
      // Go back to the last question step to edit
      setCurrentStep('research');
    };

    const handleRemoveTopic = (topicId: string) => {
      if (!session) return;
      const updatedTopics = session.topicsGenerated.filter(t => t.id !== topicId);
      const updatedSession = { ...session, topicsGenerated: updatedTopics };
      updatePlannerConfig(session.id, { topicsGenerated: updatedTopics } as any);
      setSession(updatedSession);
      toast.info('Topic removed');
    };

    const handleStartEditTopic = (topicId: string, currentText: string) => {
      setEditingTopicId(topicId);
      setEditingTopicText(currentText);
    };

    const handleSaveEditTopic = () => {
      if (!session || !editingTopicId || !editingTopicText.trim()) return;
      const updatedTopics = session.topicsGenerated.map(t =>
        t.id === editingTopicId ? { ...t, topic: editingTopicText.trim() } : t
      );
      const updatedSession = { ...session, topicsGenerated: updatedTopics };
      updatePlannerConfig(session.id, { topicsGenerated: updatedTopics } as any);
      setSession(updatedSession);
      setEditingTopicId(null);
      setEditingTopicText('');
      toast.success('Topic updated');
    };

    const handleCancelEditTopic = () => {
      setEditingTopicId(null);
      setEditingTopicText('');
    };

    const handleRegenerateTopic = async (topicId: string) => {
      if (!session) return;

      const topic = session.topicsGenerated.find(t => t.id === topicId);
      if (!topic) return;

      setRegeneratingTopicId(topicId);

      try {
        const profile = getProfile();
        const themes = session.config.themes.join(', ') || 'general professional content';

        const prompt = `Generate a single new LinkedIn post topic idea.

Context:
- Content type: ${topic.contentType}
- User's industry/focus: ${profile.industry || 'Professional'}
- Themes: ${themes}
- Target audience: ${profile.targetAudience || 'LinkedIn professionals'}

The topic should be:
- Fresh and engaging for LinkedIn
- Suitable for a ${topic.contentType} post
- Different from this existing topic: "${topic.topic}"

Return ONLY the topic text (one sentence, no quotes, no explanation). Example format:
How to turn customer objections into sales opportunities using the LAPS framework`;

        const response = await getModels().generateContent({
          model: 'gemini-2.0-flash',
          contents: prompt,
        });

        const newTopicText = response.text?.trim();
        if (!newTopicText) throw new Error('No topic generated');

        const updatedTopics = session.topicsGenerated.map(t =>
          t.id === topicId ? { ...t, topic: newTopicText } : t
        );
        const updatedSession = { ...session, topicsGenerated: updatedTopics };
        updatePlannerConfig(session.id, { topicsGenerated: updatedTopics } as any);
        setSession(updatedSession);
        toast.success('Topic regenerated');
      } catch (err) {
        toast.error('Failed to regenerate topic');
        console.error('Regenerate topic error:', err);
      } finally {
        setRegeneratingTopicId(null);
      }
    };

    return (
      <div className="space-y-4">
        {/* Header with count */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <svg className="w-4 h-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                {topicCount} Topics Ready
              </h3>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                Review and edit before generating
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleGoBack}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-[#0A66C2] dark:hover:text-[#0A66C2] rounded-lg border border-gray-200 dark:border-[#3E4042] hover:border-[#0A66C2] transition-colors"
              title="Edit previous answers"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Go Back
            </button>
            <button
              onClick={handleStartOver}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-500 hover:text-red-600 rounded-lg border border-red-200 dark:border-red-800/50 hover:border-red-400 transition-colors"
              title="Clear everything and start fresh"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Start Over
            </button>
          </div>
        </div>

        {/* Topics list - scrollable with better readability */}
        <div className="max-h-[280px] overflow-y-auto space-y-2 pr-1">
          {session.topicsGenerated.map((topic, index) => (
            <div
              key={topic.id}
              className="p-3 bg-gray-50 dark:bg-black/20 rounded-lg border border-gray-100 dark:border-[#3E4042]/50 hover:border-[#0A66C2]/30 transition-colors group"
            >
              {editingTopicId === topic.id ? (
                // Edit mode
                <div className="space-y-2">
                  <textarea
                    value={editingTopicText}
                    onChange={(e) => setEditingTopicText(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-black border border-gray-300 dark:border-[#3E4042] rounded-lg text-sm text-gray-900 dark:text-white focus:ring-1 focus:ring-[#0A66C2] focus:border-[#0A66C2] outline-none resize-none"
                    rows={2}
                    autoFocus
                  />
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={handleCancelEditTopic}
                      className="px-3 py-1 text-xs font-medium text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveEditTopic}
                      disabled={!editingTopicText.trim()}
                      className="px-3 py-1 bg-[#0A66C2] text-white text-xs font-medium rounded-lg hover:bg-[#004182] disabled:opacity-50 transition-colors"
                    >
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                // Display mode
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#0A66C2]/10 text-[#0A66C2] text-xs font-bold flex items-center justify-center">
                    {index + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200 leading-snug">
                      {topic.topic}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${
                        topic.contentType === 'carousel' ? 'bg-[#0A66C2]/10 text-[#0A66C2]' :
                        topic.contentType === 'image' ? 'bg-purple-500/10 text-purple-500' :
                        'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                      }`}>
                        {topic.contentType === 'carousel' ? 'Carousel' :
                         topic.contentType === 'image' ? 'Image' : 'Text'}
                      </span>
                      <span className="text-[10px] text-gray-400 dark:text-gray-500">
                        {formatDateTime(topic.scheduledAt)}
                      </span>
                    </div>
                  </div>
                  {/* Topic actions - visible on hover */}
                  <div className={`flex items-center gap-1 transition-opacity ${regeneratingTopicId === topic.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                    {regeneratingTopicId === topic.id ? (
                      <div className="p-1.5">
                        <svg className="w-3.5 h-3.5 text-[#0A66C2] animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={() => handleStartEditTopic(topic.id, topic.topic)}
                          className="p-1.5 text-gray-400 hover:text-[#0A66C2] hover:bg-[#0A66C2]/10 rounded-lg transition-colors"
                          title="Edit topic"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleRegenerateTopic(topic.id)}
                          className="p-1.5 text-gray-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors"
                          title="Regenerate topic"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleRemoveTopic(topic.id)}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title="Remove topic"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Action buttons */}
        <div className="space-y-2 pt-1">
          <button
            onClick={handleStartGeneration}
            disabled={topicCount === 0}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#0A66C2] text-white text-sm font-semibold rounded-lg hover:bg-[#004182] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Generate All {topicCount} Posts
          </button>
          <button
            onClick={onClose}
            className="w-full py-2 text-gray-500 dark:text-gray-400 text-xs font-medium hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
          >
            Close (Drafts Saved to Calendar)
          </button>
        </div>
      </div>
    );
  }

  // Render generation progress
  if (currentStep === 'generating-content') {
    return (
      <AIPlannerProgress
        current={generationProgress.current}
        total={generationProgress.total}
        currentTopic={currentTopic}
        isPaused={isPaused}
        error={generationError}
        onPause={handlePause}
        onResume={handleResume}
        onBackground={handleBackground}
        onRetry={handleResume}
        onSkip={() => {
          // Skip current and continue
          setGenerationError(undefined);
          handleResume();
        }}
        onCancel={handleCancel}
        onStop={handleStop}
        isBackground={isBackground}
      />
    );
  }

  // Render complete state
  if (currentStep === 'complete') {
    return (
      <div className="text-center py-8 space-y-4">
        <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto">
          <svg className="w-8 h-8 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        </div>
        <div>
          <h3 className="text-base font-medium text-gray-900 dark:text-white">
            All Done!
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {generationProgress.total} posts have been scheduled to your calendar
          </p>
        </div>
        <button
          onClick={onClose}
          className="px-6 py-2 bg-[#0A66C2] text-white text-sm font-medium rounded-lg hover:bg-[#004182] transition-colors"
        >
          View Calendar
        </button>
      </div>
    );
  }

  // Render Q&A flow
  return (
    <div className="space-y-5">
      {/* Progress indicator - improved height and visibility */}
      <div className="flex items-center gap-1.5">
        {QUESTIONS.map((q, index) => {
          const isActive = q.step === currentStep;
          const isCompleted = QUESTIONS.findIndex(x => x.step === currentStep) > index;

          return (
            <div
              key={q.step}
              className={`flex-1 h-2 rounded-full transition-colors ${
                isActive ? 'bg-[#0A66C2]' : isCompleted ? 'bg-[#0A66C2]/60' : 'bg-gray-200 dark:bg-gray-700'
              }`}
            />
          );
        })}
      </div>

      {/* Step info - improved readability */}
      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 py-1">
        <span className="font-medium">Step {QUESTIONS.findIndex(q => q.step === currentStep) + 1} of {QUESTIONS.length}</span>
        <span className="bg-gray-100 dark:bg-[#2D3748] px-2 py-0.5 rounded-md font-medium">{totalPosts} posts</span>
      </div>

      {/* Question */}
      {currentQuestion && currentStep === 'times' ? (
        // Time selection using TimePicker component
        <TimesStepWithPicker
          selectedValues={(answers.times || []) as string[]}
          onSelect={(values) => handleAnswer(values)}
          suggestions={currentQuestion.suggestions}
        />
      ) : currentQuestion && (
        <div>
          <PlannerQuestionCard
            question={currentQuestion.question}
            suggestions={currentQuestion.suggestions}
            allowCustom={currentQuestion.allowCustom}
            multiSelect={currentQuestion.multiSelect}
            selectedValues={answers[currentStep] || []}
            onSelect={handleAnswer}
            customPlaceholder={
              currentStep === 'themes' ? 'Enter a theme or goal...' :
              currentStep === 'duration' ? 'Number of days...' :
              'Enter custom value...'
            }
          />
          {/* Clear All button for multi-select steps */}
          {currentQuestion.multiSelect && (answers[currentStep] || []).length > 0 && (
            <button
              onClick={() => handleAnswer([])}
              className="mt-3 text-xs text-red-500 hover:text-red-600 font-medium flex items-center gap-1.5 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Clear All Selected
            </button>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Navigation - improved button sizes */}
      <div className="flex gap-3 pt-3">
        {QUESTIONS.findIndex(q => q.step === currentStep) > 0 && (
          <button
            onClick={goToPrevStep}
            className="px-5 py-2.5 text-gray-600 dark:text-gray-300 text-sm font-medium rounded-lg border border-gray-300 dark:border-[#3E4042] hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
          >
            Back
          </button>
        )}
        <button
          onClick={goToNextStep}
          disabled={!canProceed() || isLoading}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#0A66C2] text-white text-sm font-semibold rounded-lg hover:bg-[#004182] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {QUESTIONS.findIndex(q => q.step === currentStep) === QUESTIONS.length - 1 ? (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Generate {totalPosts} Topics
            </>
          ) : (
            'Continue'
          )}
        </button>
      </div>
    </div>
  );
};

export default AIPlannerChat;
