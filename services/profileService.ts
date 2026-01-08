// Profile Service - Stores user profile data including persistent style reference

// Style Analysis Results from image analyzer
export interface StyleAnalysis {
  colors: string[];              // Extracted color palette (hex codes)
  style: string;                 // Style description (e.g., "minimalist", "corporate", "bold")
  mood: string;                  // Mood/tone (e.g., "professional", "energetic", "calm")
  elements: string[];            // Key visual elements detected
  suggestedPrompt: string;       // AI-generated prompt for consistent image generation
}

export interface UserProfile {
  name: string;
  description: string;
  styleReferenceImage: string | null; // Base64 encoded image
  styleReferencePreview: string | null; // Data URL for preview
  updatedAt: number;

  // Topic suggestion preferences
  industry?: string;
  targetAudience?: string;
  brandPersonality?: 'professional' | 'thought-leader' | 'casual' | 'data-driven' | 'custom';
  customBrandVoice?: string;     // Text field when 'custom' is selected
  contentFormats?: string[];
  focusKeywords?: string[];

  // Content preferences
  contentGoals?: string;         // What they want to achieve (leads, authority, engagement)
  keyTopics?: string;            // Main topics/expertise to focus on
  topicsToAvoid?: string;        // Topics to stay away from
  preferredLength?: 'short' | 'medium' | 'long';  // Post length preference
  ctaStyle?: 'question' | 'action' | 'subtle' | 'none';  // Call-to-action preference
  uniqueValue?: string;          // Unique value proposition / differentiator

  // Image Analysis Results (auto-extracted from style reference)
  styleAnalysis?: StyleAnalysis;

  // Topic suggestion tracking
  topicHistory?: string[];           // Titles of used topics (last 50)
  lastTopicRefresh?: string;         // ISO timestamp
  autoSuggestTopics?: boolean;       // Enable/disable auto-suggest
}

const PROFILE_STORAGE_KEY = 'linkedin_user_profile';

const defaultProfile: UserProfile = {
  name: '',
  description: '',
  styleReferenceImage: null,
  styleReferencePreview: null,
  updatedAt: Date.now(),
};

// Get the stored profile
export const getProfile = (): UserProfile => {
  try {
    const stored = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!stored) return { ...defaultProfile };
    return JSON.parse(stored);
  } catch {
    return { ...defaultProfile };
  }
};

// Save the entire profile
export const saveProfile = (profile: Partial<UserProfile>): UserProfile => {
  const current = getProfile();
  const updated: UserProfile = {
    ...current,
    ...profile,
    updatedAt: Date.now(),
  };
  try {
    const jsonString = JSON.stringify(updated);
    console.log('💾 Saving profile to localStorage, size:', Math.round(jsonString.length / 1024), 'KB');
    localStorage.setItem(PROFILE_STORAGE_KEY, jsonString);
    console.log('✓ Profile saved successfully');
    return updated;
  } catch (error) {
    console.error('❌ Failed to save profile:', error);
    // If localStorage is full, try saving without the image
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      console.warn('⚠️ localStorage quota exceeded, trying to save without image...');
      const withoutImage: UserProfile = {
        ...updated,
        styleReferenceImage: null,
        styleReferencePreview: null,
      };
      localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(withoutImage));
      console.log('✓ Profile saved without image');
      return withoutImage;
    }
    throw error;
  }
};

// Update just the name
export const updateProfileName = (name: string): void => {
  saveProfile({ name });
};

// Update just the description
export const updateProfileDescription = (description: string): void => {
  saveProfile({ description });
};

// Update the style reference image
export const updateStyleReference = (
  styleReferenceImage: string | null,
  styleReferencePreview: string | null
): void => {
  saveProfile({ styleReferenceImage, styleReferencePreview });
};

// Clear the style reference image
export const clearStyleReference = (): void => {
  saveProfile({ styleReferenceImage: null, styleReferencePreview: null });
};

// Get just the style reference image (for use in generation)
export const getProfileStyleReference = (): string | null => {
  const profile = getProfile();
  return profile.styleReferenceImage;
};

// Check if profile has a style reference
export const hasProfileStyleReference = (): boolean => {
  const profile = getProfile();
  return profile.styleReferenceImage !== null && profile.styleReferenceImage.length > 0;
};

// Clear the entire profile
export const clearProfile = (): void => {
  localStorage.removeItem(PROFILE_STORAGE_KEY);
};

// Check if profile has any data
export const isProfileConfigured = (): boolean => {
  const profile = getProfile();
  return profile.name.trim().length > 0 || profile.description.trim().length > 0 || profile.styleReferenceImage !== null;
};

// ============ Topic Suggestion Functions ============

/**
 * Mark a topic as used to prevent repetition
 */
export const markTopicAsUsed = (topicTitle: string): void => {
  const profile = getProfile();
  const history = profile.topicHistory || [];

  // Keep last 50 topics to prevent repetition
  const updated = [...history, topicTitle].slice(-50);

  saveProfile({
    ...profile,
    topicHistory: updated,
    lastTopicRefresh: new Date().toISOString(),
  });
};

/**
 * Check if topic was already used
 */
export const isTopicUsed = (topicTitle: string): boolean => {
  const profile = getProfile();
  return (profile.topicHistory || []).includes(topicTitle);
};

/**
 * Get profile preferences formatted for topic generation
 */
export const getTopicPreferences = (): any | null => {
  const profile = getProfile();

  if (!profile.industry || !profile.targetAudience) {
    return null; // Need minimum profile setup
  }

  return {
    industry: profile.industry,
    targetAudience: profile.targetAudience,
    brandPersonality: profile.brandPersonality || 'professional',
    contentFormats: profile.contentFormats || ['carousel', 'text'],
    keywords: profile.focusKeywords || [],
  };
};
