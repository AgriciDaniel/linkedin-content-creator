// Hashtag Service - AI-powered hashtag suggestions for LinkedIn posts

import { GoogleGenAI } from '@google/genai';

export interface HashtagSuggestion {
  tag: string;
  relevance: number; // 0-100 score
  category: 'industry' | 'topic' | 'trending' | 'niche';
  description?: string;
}

export interface HashtagAnalysis {
  suggestions: HashtagSuggestion[];
  extracted: string[]; // Hashtags already in the post
  warnings: string[];
}

// Popular LinkedIn hashtags with estimated follower counts
const POPULAR_HASHTAGS: Record<string, { followers: string; category: string }> = {
  'leadership': { followers: '2.1M', category: 'industry' },
  'management': { followers: '1.8M', category: 'industry' },
  'innovation': { followers: '1.5M', category: 'industry' },
  'technology': { followers: '1.4M', category: 'industry' },
  'marketing': { followers: '1.3M', category: 'industry' },
  'entrepreneurship': { followers: '1.2M', category: 'industry' },
  'careers': { followers: '1.1M', category: 'topic' },
  'productivity': { followers: '980K', category: 'topic' },
  'personaldevelopment': { followers: '920K', category: 'topic' },
  'careergrowth': { followers: '890K', category: 'topic' },
  'motivation': { followers: '850K', category: 'topic' },
  'success': { followers: '800K', category: 'topic' },
  'business': { followers: '750K', category: 'industry' },
  'startup': { followers: '720K', category: 'niche' },
  'ai': { followers: '680K', category: 'trending' },
  'artificialintelligence': { followers: '650K', category: 'trending' },
  'digitalmarketing': { followers: '620K', category: 'industry' },
  'sales': { followers: '580K', category: 'industry' },
  'networking': { followers: '550K', category: 'topic' },
  'learning': { followers: '520K', category: 'topic' },
  'mindset': { followers: '480K', category: 'topic' },
  'growthmindset': { followers: '450K', category: 'topic' },
  'automation': { followers: '420K', category: 'trending' },
  'dataanalytics': { followers: '380K', category: 'industry' },
  'remotework': { followers: '350K', category: 'trending' },
  'worklifebalance': { followers: '320K', category: 'topic' },
  'contentmarketing': { followers: '300K', category: 'industry' },
  'socialmedia': { followers: '280K', category: 'industry' },
  'linkedintips': { followers: '250K', category: 'niche' },
  'personalbranding': { followers: '230K', category: 'topic' },
};

// Get API key from localStorage
function getApiKey(): string | null {
  return localStorage.getItem('gemini_api_key');
}

// Extract existing hashtags from post
export function extractHashtags(post: string): string[] {
  const hashtagRegex = /#(\w+)/g;
  const matches = post.match(hashtagRegex) || [];
  return matches.map(tag => tag.substring(1).toLowerCase());
}

// Validate hashtags
export function validateHashtags(tags: string[]): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];

  if (tags.length > 5) {
    warnings.push('Using more than 5 hashtags may reduce engagement');
  }

  if (tags.length > 10) {
    warnings.push('LinkedIn recommends using 3-5 hashtags maximum');
  }

  const tooLong = tags.filter(tag => tag.length > 30);
  if (tooLong.length > 0) {
    warnings.push(`Some hashtags are too long: ${tooLong.join(', ')}`);
  }

  const hasSpaces = tags.filter(tag => tag.includes(' '));
  if (hasSpaces.length > 0) {
    warnings.push('Hashtags cannot contain spaces');
  }

  return {
    valid: warnings.length === 0,
    warnings,
  };
}

// Get hashtag popularity info
export function getHashtagInfo(tag: string): { followers: string; category: string } | null {
  const normalized = tag.toLowerCase().replace('#', '');
  return POPULAR_HASHTAGS[normalized] || null;
}

// Generate AI-powered hashtag suggestions
export async function suggestHashtags(
  topic: string,
  content: string,
  count: number = 5
): Promise<HashtagSuggestion[]> {
  const apiKey = getApiKey();

  if (!apiKey) {
    // Fallback to basic suggestions without AI
    return getBasicSuggestions(topic, content, count);
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    const prompt = `You are a LinkedIn hashtag expert. Analyze this post and suggest ${count} highly relevant hashtags.

Topic: ${topic}

Post content:
${content.substring(0, 1000)}

Return ONLY a JSON array with this exact structure (no markdown, no code blocks):
[
  {"tag": "hashtag1", "relevance": 95, "category": "industry", "description": "Why this hashtag is relevant"},
  {"tag": "hashtag2", "relevance": 88, "category": "topic", "description": "Why this hashtag is relevant"}
]

Categories: "industry" (broad professional), "topic" (specific subject), "trending" (currently popular), "niche" (targeted audience)

Rules:
- No # symbol in the tag
- All lowercase
- No spaces
- Relevance 0-100 (higher = more relevant)
- Focus on hashtags with good LinkedIn following
- Mix of broad and specific hashtags`;

    const result = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    const response = result.text || '';

    // Parse JSON response
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const suggestions = JSON.parse(jsonMatch[0]) as HashtagSuggestion[];
      return suggestions.slice(0, count);
    }

    return getBasicSuggestions(topic, content, count);
  } catch (error) {
    console.error('Failed to generate hashtag suggestions:', error);
    return getBasicSuggestions(topic, content, count);
  }
}

// Basic keyword-based suggestions (fallback)
function getBasicSuggestions(topic: string, content: string, count: number): HashtagSuggestion[] {
  const text = `${topic} ${content}`.toLowerCase();
  const suggestions: HashtagSuggestion[] = [];

  // Check which popular hashtags are relevant to the content
  for (const [tag, info] of Object.entries(POPULAR_HASHTAGS)) {
    if (text.includes(tag) || tag.includes(topic.toLowerCase().split(' ')[0])) {
      suggestions.push({
        tag,
        relevance: 80,
        category: info.category as HashtagSuggestion['category'],
        description: `Popular hashtag with ${info.followers} followers`,
      });
    }
  }

  // Add some general suggestions based on keywords
  const keywords = ['leadership', 'innovation', 'growth', 'success', 'business'];
  for (const keyword of keywords) {
    if (text.includes(keyword) && !suggestions.find(s => s.tag === keyword)) {
      suggestions.push({
        tag: keyword,
        relevance: 70,
        category: 'topic',
        description: `Matches keyword in content`,
      });
    }
  }

  // Sort by relevance and return top N
  return suggestions
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, count);
}

// Get trending hashtags for a specific industry
export function getTrendingHashtags(industry: string): HashtagSuggestion[] {
  const trending: Record<string, HashtagSuggestion[]> = {
    'technology': [
      { tag: 'ai', relevance: 95, category: 'trending', description: 'AI is dominating tech conversations' },
      { tag: 'machinelearning', relevance: 88, category: 'trending' },
      { tag: 'automation', relevance: 85, category: 'trending' },
    ],
    'marketing': [
      { tag: 'contentmarketing', relevance: 90, category: 'industry' },
      { tag: 'digitalmarketing', relevance: 88, category: 'industry' },
      { tag: 'socialmediamarketing', relevance: 82, category: 'niche' },
    ],
    'business': [
      { tag: 'entrepreneurship', relevance: 92, category: 'industry' },
      { tag: 'startup', relevance: 85, category: 'niche' },
      { tag: 'leadership', relevance: 88, category: 'industry' },
    ],
    'default': [
      { tag: 'linkedintips', relevance: 80, category: 'niche' },
      { tag: 'personalbranding', relevance: 78, category: 'topic' },
      { tag: 'careergrowth', relevance: 75, category: 'topic' },
    ],
  };

  const normalizedIndustry = industry.toLowerCase();
  return trending[normalizedIndustry] || trending['default'];
}

// Analyze a post and return comprehensive hashtag analysis
export async function analyzePostHashtags(
  topic: string,
  content: string
): Promise<HashtagAnalysis> {
  const extracted = extractHashtags(content);
  const suggestions = await suggestHashtags(topic, content, 8);
  const { warnings } = validateHashtags(extracted);

  // Filter out suggestions that are already in the post
  const filteredSuggestions = suggestions.filter(
    s => !extracted.includes(s.tag.toLowerCase())
  );

  return {
    suggestions: filteredSuggestions,
    extracted,
    warnings,
  };
}

// Format hashtags for adding to post
export function formatHashtagsForPost(tags: string[]): string {
  return tags.map(tag => `#${tag}`).join(' ');
}

// Get optimal number of hashtags recommendation
export function getHashtagRecommendation(currentCount: number): string {
  if (currentCount === 0) {
    return 'Add 3-5 relevant hashtags to increase discoverability';
  }
  if (currentCount < 3) {
    return `Consider adding ${3 - currentCount} more hashtags for better reach`;
  }
  if (currentCount <= 5) {
    return 'Great! You have the optimal number of hashtags';
  }
  if (currentCount <= 10) {
    return 'Consider reducing to 5 hashtags for better engagement';
  }
  return 'Too many hashtags may look spammy - reduce to 5 or fewer';
}
