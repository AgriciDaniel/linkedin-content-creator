import { GoogleGenAI } from '@google/genai';
import { getTopicPreferences, isTopicUsed } from './profileService';

export interface TopicPreferences {
  industry: string;
  targetAudience: string;
  brandPersonality: 'professional' | 'thought-leader' | 'casual' | 'data-driven';
  contentFormats?: string[]; // carousel, text, image
  keywords?: string[];
}

export interface TopicSuggestion {
  title: string;
  description: string;
  format: 'carousel' | 'text' | 'image';
  hook: string; // Attention-grabbing first line
  keywords: string[];
  estimatedEngagement: 'high' | 'medium' | 'low';
  reasoning: string; // Why this topic is good
}

export interface TopicSuggestionResult {
  topics: TopicSuggestion[];
  trendingHashtags: string[];
  sources: string[];
}

/**
 * Generates AI-powered topic suggestions for LinkedIn posts
 * Based on user preferences, industry, and current trends
 */
export async function generateTopicSuggestions(
  preferences: TopicPreferences,
  count: number = 5
): Promise<TopicSuggestionResult> {
  const apiKey = localStorage.getItem('gemini_api_key');

  if (!apiKey) {
    throw new Error('Gemini API key not configured. Please add it in Settings.');
  }

  const ai = new GoogleGenAI({ apiKey });

  // Build context-aware prompt
  const prompt = buildTopicSuggestionPrompt(preferences, count);

  try {
    const result = await ai.models.generateContent({
      model: 'gemini-2.0-flash-exp',
      contents: prompt,
      config: {
        temperature: 0.9, // Higher temperature for creative topic ideas
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 8192,
        responseMimeType: 'application/json',
      }
    });
    const response = result.text;

    // Parse JSON response
    const parsed = JSON.parse(response);

    return {
      topics: parsed.topics || [],
      trendingHashtags: parsed.trendingHashtags || [],
      sources: parsed.sources || [],
    };
  } catch (error) {
    console.error('Topic suggestion generation failed:', error);
    throw new Error('Failed to generate topic suggestions. Please try again.');
  }
}

/**
 * Builds an optimized prompt for LinkedIn topic generation
 */
function buildTopicSuggestionPrompt(preferences: TopicPreferences, count: number): string {
  const { industry, targetAudience, brandPersonality, contentFormats, keywords } = preferences;

  // Get learned preferences if available
  const learnedPreferences = getLearnedPreferences();
  const learningContext = learnedPreferences
    ? `\n\nLEARNED USER PREFERENCES (from ${learnedPreferences.selectionCount} previous selections):
- Preferred formats: ${learnedPreferences.preferredFormats.join(', ')}
- Successful keywords: ${learnedPreferences.successfulKeywords.join(', ')}
- Content angles: ${learnedPreferences.contentAngles.join(', ')}
- Topics to avoid: ${learnedPreferences.avoidedTopics.join(', ')}`
    : '';

  return `You are a LinkedIn content strategist helping create engaging, high-performing post topics.

CONTEXT:
- Industry: ${industry}
- Target Audience: ${targetAudience}
- Brand Voice: ${brandPersonality}
- Preferred Formats: ${contentFormats?.join(', ') || 'all formats'}
- Focus Keywords: ${keywords?.join(', ') || 'none specified'}${learningContext}

TASK:
Generate ${count} LinkedIn post topic ideas that will:
1. Resonate with the target audience
2. Match the brand personality
3. Drive engagement (likes, comments, shares)
4. Establish thought leadership
5. Be timely and relevant to ${new Date().getFullYear()} trends

TOPIC CRITERIA:
- Answer-first format (hook readers immediately)
- Clear value proposition
- Specific and actionable (not generic advice)
- Backed by data, examples, or stories
- Optimized for LinkedIn algorithm (2-3 min read time)

FORMAT GUIDELINES:
- **Carousel**: Educational, step-by-step, list-based (5-10 slides)
- **Text Post**: Quick insights, hot takes, personal stories (1300 chars)
- **Image Post**: Single image with caption, data visualization, infographic

OUTPUT FORMAT (valid JSON):
{
  "topics": [
    {
      "title": "Clear, benefit-driven title (8-12 words)",
      "description": "2-sentence summary of the content",
      "format": "carousel | text | image",
      "hook": "Attention-grabbing opening line that stops the scroll",
      "keywords": ["keyword1", "keyword2", "keyword3"],
      "estimatedEngagement": "high | medium | low",
      "reasoning": "Why this topic will perform well (reference data/trends)"
    }
  ],
  "trendingHashtags": ["#hashtag1", "#hashtag2", "#hashtag3"],
  "sources": ["Trend source 1", "Trend source 2"]
}

IMPORTANT:
- Make topics SPECIFIC, not generic ("5 AI tools that tripled my productivity" > "How to be more productive")
- Include surprising facts, contrarian views, or unique angles
- Ensure diversity in formats (mix carousels, text, articles)
- Reference current ${new Date().getFullYear()} trends when relevant
- Prioritize topics that spark conversation (controversial but professional)

Generate the topics now:`;
}

/**
 * Gets learned preferences from previous topic selections
 */
function getLearnedPreferences(): {
  selectionCount: number;
  preferredFormats: string[];
  successfulKeywords: string[];
  contentAngles: string[];
  avoidedTopics: string[];
} | null {
  const analytics = localStorage.getItem('topic_analytics');
  if (!analytics) return null;

  try {
    const data = JSON.parse(analytics);

    if (!data.selections || data.selections.length < 5) {
      return null; // Need at least 5 selections to learn patterns
    }

    // Analyze patterns
    const formats = data.selections.map((s: any) => s.format);
    const keywords = data.selections.flatMap((s: any) => s.keywords || []);

    // Count frequencies
    const formatCounts = formats.reduce((acc: any, f: string) => {
      acc[f] = (acc[f] || 0) + 1;
      return acc;
    }, {});

    const keywordCounts = keywords.reduce((acc: any, k: string) => {
      acc[k] = (acc[k] || 0) + 1;
      return acc;
    }, {});

    // Get top preferences
    const preferredFormats = Object.entries(formatCounts)
      .sort(([, a]: any, [, b]: any) => b - a)
      .slice(0, 3)
      .map(([format]) => format);

    const successfulKeywords = Object.entries(keywordCounts)
      .sort(([, a]: any, [, b]: any) => b - a)
      .slice(0, 10)
      .map(([keyword]) => keyword);

    return {
      selectionCount: data.selections.length,
      preferredFormats: preferredFormats as string[],
      successfulKeywords: successfulKeywords as string[],
      contentAngles: data.contentAngles || [],
      avoidedTopics: data.avoidedTopics || [],
    };
  } catch (error) {
    console.error('Failed to parse topic analytics:', error);
    return null;
  }
}

/**
 * Tracks which topic the user selected (for learning)
 */
export function trackTopicSelection(topic: TopicSuggestion): void {
  const analytics = localStorage.getItem('topic_analytics');
  const data = analytics ? JSON.parse(analytics) : { selections: [], contentAngles: [], avoidedTopics: [] };

  // Add selection with timestamp
  data.selections.push({
    ...topic,
    selectedAt: new Date().toISOString(),
  });

  // Keep only last 50 selections to avoid bloat
  if (data.selections.length > 50) {
    data.selections = data.selections.slice(-50);
  }

  localStorage.setItem('topic_analytics', JSON.stringify(data));
}

/**
 * Refreshes topic suggestions with different variations
 */
export async function regenerateTopics(
  preferences: TopicPreferences,
  count: number = 5
): Promise<TopicSuggestionResult> {
  // Same as generateTopicSuggestions but with higher temperature for more variety
  return generateTopicSuggestions(preferences, count);
}

/**
 * Auto-generate topics based on user profile
 * Filters out already-used topics
 */
export async function autoGenerateTopics(count: number = 5): Promise<TopicSuggestionResult> {
  const preferences = getTopicPreferences();

  if (!preferences) {
    throw new Error('Profile not configured. Please set up your industry and target audience first.');
  }

  // Generate more than needed to filter out used ones
  const result = await generateTopicSuggestions(preferences, count * 2);

  // Filter out used topics
  const unusedTopics = result.topics.filter(topic => !isTopicUsed(topic.title));

  // Return requested count
  return {
    topics: unusedTopics.slice(0, count),
    trendingHashtags: result.trendingHashtags,
    sources: result.sources,
  };
}
