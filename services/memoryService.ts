/**
 * AI Memory Service
 * Tracks post history, patterns, and performance to improve content generation
 */

const MEMORY_STORAGE_KEY = 'linkedin_ai_memory';
const MAX_MEMORY_ENTRIES = 100; // Keep last 100 posts in memory

export interface PostMemoryEntry {
  id: string;
  topic: string;
  generatedAt: number;
  contentType: 'carousel' | 'single-image' | 'text-only';
  keywords: string[];
  hashtags: string[];
  sentiment: 'professional' | 'casual' | 'educational' | 'inspirational';
  posted: boolean;
  postPreview?: string; // First 200 chars of the post for context
  wordCount?: number;
}

export interface AIMemory {
  posts: PostMemoryEntry[];
  topics: Set<string>;
  commonKeywords: Map<string, number>;
  lastGeneratedAt: number;
  totalPosts: number;
}

/**
 * Get AI memory from localStorage
 */
export const getMemory = (): AIMemory => {
  try {
    const stored = localStorage.getItem(MEMORY_STORAGE_KEY);
    if (!stored) {
      return {
        posts: [],
        topics: new Set(),
        commonKeywords: new Map(),
        lastGeneratedAt: 0,
        totalPosts: 0,
      };
    }

    const parsed = JSON.parse(stored);
    return {
      ...parsed,
      topics: new Set(parsed.topics || []),
      commonKeywords: new Map(Object.entries(parsed.commonKeywords || {})),
    };
  } catch (error) {
    console.error('Failed to load AI memory:', error);
    return {
      posts: [],
      topics: new Set(),
      commonKeywords: new Map(),
      lastGeneratedAt: 0,
      totalPosts: 0,
    };
  }
};

/**
 * Save AI memory to localStorage
 */
const saveMemory = (memory: AIMemory): void => {
  try {
    const toStore = {
      ...memory,
      topics: Array.from(memory.topics),
      commonKeywords: Object.fromEntries(memory.commonKeywords),
    };
    localStorage.setItem(MEMORY_STORAGE_KEY, JSON.stringify(toStore));
  } catch (error) {
    console.error('Failed to save AI memory:', error);
  }
};

/**
 * Extract keywords from topic and content
 */
const extractKeywords = (topic: string, content?: string): string[] => {
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
    'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does',
    'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'shall', 'can',
    'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'my',
    'your', 'his', 'her', 'its', 'our', 'their', 'what', 'which', 'who', 'whom', 'when',
    'where', 'why', 'how', 'all', 'each', 'every', 'both', 'few', 'more', 'most', 'other',
    'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very',
    'just', 'also', 'now', 'here', 'there', 'about', 'into', 'through', 'during', 'before',
    'after', 'above', 'below', 'from', 'up', 'down', 'out', 'off', 'over', 'under', 'again',
    'further', 'then', 'once', 'dont', 'ive', 'youre', 'thats', 'its', 'im', 'weve', 'theyre'
  ]);

  // Combine topic and content for better keyword extraction
  const text = content ? `${topic} ${content}` : topic;

  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 3 && !stopWords.has(word));

  // Count word frequency
  const wordCount = new Map<string, number>();
  words.forEach(word => {
    wordCount.set(word, (wordCount.get(word) || 0) + 1);
  });

  // Return top keywords by frequency
  return Array.from(wordCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([word]) => word);
};

/**
 * Extract hashtags from post content
 */
const extractHashtags = (content: string): string[] => {
  const hashtagRegex = /#[\w]+/g;
  const matches = content.match(hashtagRegex) || [];
  return matches.map((tag: string) => tag.toLowerCase());
};

/**
 * Determine sentiment of content (basic analysis)
 */
const determineSentiment = (content: string): PostMemoryEntry['sentiment'] => {
  const lower = content.toLowerCase();

  if (lower.includes('tip') || lower.includes('how to') || lower.includes('learn')) {
    return 'educational';
  }
  if (lower.includes('inspire') || lower.includes('motivate') || lower.includes('achieve')) {
    return 'inspirational';
  }
  if (lower.includes('excited') || lower.includes('happy') || lower.includes('love')) {
    return 'casual';
  }
  return 'professional';
};

/**
 * Add a new post to memory
 */
export const addToMemory = (
  topic: string,
  content: string,
  contentType: PostMemoryEntry['contentType'],
  posted: boolean = false
): void => {
  const memory = getMemory();

  // Calculate word count (excluding hashtags)
  const contentWithoutHashtags = content.replace(/#[\w]+/g, '').trim();
  const wordCount = contentWithoutHashtags.split(/\s+/).filter(w => w.length > 0).length;

  // Create preview (first 200 chars, clean)
  const postPreview = contentWithoutHashtags
    .replace(/\n+/g, ' ')
    .substring(0, 200)
    .trim();

  const entry: PostMemoryEntry = {
    id: `post_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
    topic,
    generatedAt: Date.now(),
    contentType,
    keywords: extractKeywords(topic, content), // Now extracts from both topic AND content
    hashtags: extractHashtags(content),
    sentiment: determineSentiment(content),
    posted,
    postPreview,
    wordCount,
  };

  // Add to posts (keep only last MAX_MEMORY_ENTRIES)
  memory.posts.unshift(entry);
  if (memory.posts.length > MAX_MEMORY_ENTRIES) {
    memory.posts = memory.posts.slice(0, MAX_MEMORY_ENTRIES);
  }

  // Update topics
  memory.topics.add(topic.toLowerCase());

  // Update common keywords
  entry.keywords.forEach(keyword => {
    const count = memory.commonKeywords.get(keyword) || 0;
    memory.commonKeywords.set(keyword, count + 1);
  });

  memory.lastGeneratedAt = Date.now();
  memory.totalPosts++;

  saveMemory(memory);
};

/**
 * Check if topic was recently covered (within last N posts)
 */
export const wasRecentlyCovered = (topic: string, withinLastN: number = 10): boolean => {
  const memory = getMemory();
  const recentPosts = memory.posts.slice(0, withinLastN);
  const keywords = extractKeywords(topic);

  return recentPosts.some(post => {
    // Check if any keyword matches
    return keywords.some(keyword => post.keywords.includes(keyword));
  });
};

/**
 * Get memory context for AI generation
 */
export const getMemoryContext = (): string => {
  const memory = getMemory();

  if (memory.posts.length === 0) {
    return "This is the first post being generated. Create unique, engaging content.";
  }

  const recentPosts = memory.posts.slice(0, 10);
  const recentTopics = recentPosts.map(p => p.topic).join(', ');
  const topKeywords = Array.from(memory.commonKeywords.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([keyword]) => keyword)
    .join(', ');

  // Get recent hashtags used
  const recentHashtags = [...new Set(recentPosts.flatMap(p => p.hashtags))].slice(0, 10).join(', ');

  // Content type distribution
  const contentTypeCounts = recentPosts.reduce((acc, post) => {
    acc[post.contentType] = (acc[post.contentType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const sentimentDistribution = recentPosts.reduce((acc, post) => {
    acc[post.sentiment] = (acc[post.sentiment] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const dominantSentiment = Object.entries(sentimentDistribution)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || 'professional';

  // Get sample of recent post previews for style reference
  const recentPreviews = recentPosts
    .slice(0, 3)
    .filter(p => p.postPreview)
    .map(p => `"${p.postPreview}..."`)
    .join('\n  ');

  // Average word count
  const avgWordCount = Math.round(
    recentPosts.reduce((sum, p) => sum + (p.wordCount || 150), 0) / recentPosts.length
  );

  return `
PREVIOUS CONTENT ANALYSIS:
- Total posts generated: ${memory.totalPosts}
- Recent topics covered: ${recentTopics}
- Commonly used keywords: ${topKeywords}
- Recent hashtags: ${recentHashtags || 'none'}
- Recent content style: ${dominantSentiment}
- Content types: ${Object.entries(contentTypeCounts).map(([t, c]) => `${t}: ${c}`).join(', ')}
- Average post length: ~${avgWordCount} words

RECENT POST SAMPLES:
  ${recentPreviews || 'No previews available'}

INSTRUCTIONS FOR THIS POST:
- Avoid repeating these exact topics: ${recentTopics}
- Bring a fresh perspective or angle
- Use different keywords and hashtags when possible
- Vary the tone and structure from recent posts
- Aim for similar length (~${avgWordCount} words) unless specified otherwise
- Make this post unique and engaging
`.trim();
};

/**
 * Get statistics about posting patterns
 */
export const getMemoryStats = () => {
  const memory = getMemory();

  const contentTypeCount = memory.posts.reduce((acc, post) => {
    acc[post.contentType] = (acc[post.contentType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const sentimentCount = memory.posts.reduce((acc, post) => {
    acc[post.sentiment] = (acc[post.sentiment] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const postsPosted = memory.posts.filter(p => p.posted).length;

  return {
    totalPosts: memory.totalPosts,
    postsInMemory: memory.posts.length,
    postsPosted,
    contentTypes: contentTypeCount,
    sentiments: sentimentCount,
    uniqueTopics: memory.topics.size,
    topKeywords: Array.from(memory.commonKeywords.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10),
  };
};

/**
 * Clear all memory (use with caution)
 */
export const clearMemory = (): void => {
  localStorage.removeItem(MEMORY_STORAGE_KEY);
};

/**
 * Mark a post as posted to LinkedIn
 */
export const markAsPosted = (postId: string): void => {
  const memory = getMemory();
  const post = memory.posts.find(p => p.id === postId);
  if (post) {
    post.posted = true;
    saveMemory(memory);
  }
};

// ============================================
// AI PLANNER PREFERENCES
// ============================================

const PLANNER_PREFERENCES_KEY = 'linkedin_planner_preferences';

export type ContentMixStrategy = 'carousel-heavy' | 'balanced' | 'text-heavy';

export interface PlannerPreferences {
  lastDurationDays: number;
  lastPostsPerDay: number;
  preferredTimes: string[];
  preferredContentMix: ContentMixStrategy;
  commonThemes: string[];
  includeResearch: boolean;
  updatedAt: number;
}

const DEFAULT_PLANNER_PREFERENCES: PlannerPreferences = {
  lastDurationDays: 7,
  lastPostsPerDay: 1,
  preferredTimes: ['09:00'],
  preferredContentMix: 'balanced',
  commonThemes: [],
  includeResearch: false,
  updatedAt: 0,
};

/**
 * Get planner preferences from localStorage
 */
export const getPlannerPreferences = (): PlannerPreferences => {
  try {
    const stored = localStorage.getItem(PLANNER_PREFERENCES_KEY);
    if (!stored) return DEFAULT_PLANNER_PREFERENCES;
    return JSON.parse(stored) as PlannerPreferences;
  } catch (error) {
    console.error('Failed to load planner preferences:', error);
    return DEFAULT_PLANNER_PREFERENCES;
  }
};

/**
 * Save planner preferences to localStorage
 */
export const savePlannerPreferences = (prefs: Partial<PlannerPreferences>): PlannerPreferences => {
  try {
    const current = getPlannerPreferences();
    const updated: PlannerPreferences = {
      ...current,
      ...prefs,
      updatedAt: Date.now(),
    };
    localStorage.setItem(PLANNER_PREFERENCES_KEY, JSON.stringify(updated));
    return updated;
  } catch (error) {
    console.error('Failed to save planner preferences:', error);
    throw new Error('Failed to save planner preferences');
  }
};

/**
 * Add a theme to common themes (for future suggestions)
 */
export const addCommonTheme = (theme: string): void => {
  const prefs = getPlannerPreferences();
  const normalizedTheme = theme.toLowerCase().trim();

  if (!prefs.commonThemes.includes(normalizedTheme)) {
    // Keep last 20 themes
    const updatedThemes = [normalizedTheme, ...prefs.commonThemes].slice(0, 20);
    savePlannerPreferences({ commonThemes: updatedThemes });
  }
};

/**
 * Add multiple themes at once
 */
export const addCommonThemes = (themes: string[]): void => {
  const prefs = getPlannerPreferences();
  const existingSet = new Set(prefs.commonThemes);

  themes.forEach(theme => {
    const normalized = theme.toLowerCase().trim();
    if (normalized && !existingSet.has(normalized)) {
      existingSet.add(normalized);
    }
  });

  const updatedThemes = Array.from(existingSet).slice(0, 20);
  savePlannerPreferences({ commonThemes: updatedThemes });
};

/**
 * Get recent topics to avoid in planning (from memory)
 */
export const getRecentTopicsForPlanning = (limit: number = 30): string[] => {
  const memory = getMemory();
  return memory.posts
    .slice(0, limit)
    .map(p => p.topic);
};

/**
 * Get topics context for AI planning (to help avoid repetition)
 */
export const getTopicsContextForPlanning = (): string => {
  const memory = getMemory();

  if (memory.posts.length === 0) {
    return 'No previous posts. Feel free to explore any relevant topics.';
  }

  const recentTopics = memory.posts.slice(0, 20).map(p => p.topic);
  const topKeywords = Array.from(memory.commonKeywords.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([keyword]) => keyword);

  return `
CONTENT HISTORY FOR PLANNING:
- Recent topics (avoid exact repeats): ${recentTopics.join(', ')}
- Frequently used keywords: ${topKeywords.join(', ')}
- Total posts generated: ${memory.totalPosts}

PLANNING GUIDELINES:
- Create diverse topics that don't overlap with recent content
- Mix different angles: how-to, stories, data insights, opinions, trends
- Consider varying the depth: some quick tips, some deep dives
- Build a cohesive narrative across the planning period
`.trim();
};

/**
 * Add a planned topic to memory (when content is generated)
 */
export const addPlannedTopicToMemory = (
  topic: string,
  content: string,
  contentType: PostMemoryEntry['contentType'],
  themes?: string[]
): void => {
  // Add to regular memory
  addToMemory(topic, content, contentType, false);

  // Also track themes if provided
  if (themes && themes.length > 0) {
    addCommonThemes(themes);
  }
};

/**
 * Clear planner preferences
 */
export const clearPlannerPreferences = (): void => {
  localStorage.removeItem(PLANNER_PREFERENCES_KEY);
};
