/**
 * AI Planner Service
 * Core logic for AI-powered content calendar planning
 */

import { ContentType } from '../types';
import { getProfile } from './profileService';
import { getTopicsContextForPlanning, savePlannerPreferences, addPlannedTopicToMemory } from './memoryService';
import { getSuggestedPostingTimes, getBestDaysToPost, isTimeSlotAvailable } from './calendarStorage';
import { getScheduledPosts, createDraftPosts, DraftPostInput, convertDraftToScheduled, updateDraftGenerationStatus, getDraftPostsByPlanId } from './schedulerService';
import { generateLinkedInContent, generateCarouselContent } from './geminiService';
import { researchTopic, isFirecrawlConfigured } from './firecrawlService';
import {
  PlannerConfig,
  PlannedTopic,
  PlanningSession,
  createPlanningSession,
  getPlanningSession,
  updatePlanningSession,
  setGeneratedTopics,
  updateGenerationProgress,
  markPostGenerated,
  markPostFailed,
  pauseGeneration as pauseSession,
  resumeGeneration as resumeSession,
  completePlanningSession,
  failPlanningSession,
  setBackgroundMode,
  getGenerationStats,
} from './plannerStorageService';

// Re-export types for convenience
export type { PlannerConfig, PlannedTopic, PlanningSession } from './plannerStorageService';

// Generation callbacks
export interface GenerationCallbacks {
  onProgress?: (current: number, total: number, topic?: string) => void;
  onPostGenerated?: (postId: string, content: string) => void;
  onError?: (postId: string, error: string) => void;
  onComplete?: () => void;
  onPaused?: () => void;
}

// Generation state
let isGenerating = false;
let shouldPause = false;
let currentSessionId: string | null = null;

/**
 * Get profile context for topic generation
 */
function getProfileContextForPlanning(): string {
  const profile = getProfile();
  const parts: string[] = [];

  if (profile.name) parts.push(`Author: ${profile.name}`);
  if (profile.description) parts.push(`About: ${profile.description}`);
  if (profile.industry) parts.push(`Industry: ${profile.industry}`);
  if (profile.targetAudience) parts.push(`Target Audience: ${profile.targetAudience}`);
  if (profile.brandPersonality) {
    const personalityMap: Record<string, string> = {
      'professional': 'Professional & Authoritative',
      'thought-leader': 'Thought Leader - bold, visionary',
      'casual': 'Casual & Relatable',
      'data-driven': 'Data-Driven & Analytical',
    };
    parts.push(`Voice: ${personalityMap[profile.brandPersonality]}`);
  }
  if (profile.focusKeywords && profile.focusKeywords.length > 0) {
    parts.push(`Focus Areas: ${profile.focusKeywords.join(', ')}`);
  }

  return parts.length > 0 ? parts.join('\n') : 'General professional content creator';
}

/**
 * Calculate content type distribution based on mix strategy
 */
function getContentTypeDistribution(mix: PlannerConfig['contentMix'], totalPosts: number): ContentType[] {
  const distribution: ContentType[] = [];

  let carouselRatio: number;
  let imageRatio: number;

  switch (mix) {
    case 'carousel-heavy':
      carouselRatio = 0.6;
      imageRatio = 0.3;
      break;
    case 'text-heavy':
      carouselRatio = 0.2;
      imageRatio = 0.3;
      break;
    case 'balanced':
    default:
      carouselRatio = 0.4;
      imageRatio = 0.4;
      break;
  }

  const carouselCount = Math.round(totalPosts * carouselRatio);
  const imageCount = Math.round(totalPosts * imageRatio);
  const textCount = totalPosts - carouselCount - imageCount;

  // Add carousel posts
  for (let i = 0; i < carouselCount; i++) distribution.push('carousel');
  // Add image posts
  for (let i = 0; i < imageCount; i++) distribution.push('image');
  // Add text posts
  for (let i = 0; i < textCount; i++) distribution.push('text');

  // Shuffle for variety
  return distribution.sort(() => Math.random() - 0.5);
}

/**
 * Calculate optimal schedule dates based on config and existing posts
 */
export function calculateOptimalSchedule(config: PlannerConfig): Date[] {
  const existingPosts = getScheduledPosts();
  const bestDays = getBestDaysToPost();
  const schedule: Date[] = [];

  // Start from tomorrow
  const startDate = new Date();
  startDate.setHours(0, 0, 0, 0);
  startDate.setDate(startDate.getDate() + 1);

  // Sort posting times
  const times = [...config.postingTimes].sort();
  const totalPosts = config.durationDays * config.postsPerDay;

  let postsScheduled = 0;
  let currentDay = 0;

  while (postsScheduled < totalPosts && currentDay < config.durationDays * 2) {
    const currentDate = new Date(startDate);
    currentDate.setDate(currentDate.getDate() + currentDay);

    const dayOfWeek = currentDate.getDay();
    const dayInfo = bestDays.find(d => d.day === dayOfWeek);

    // Skip weekends if duration allows (score < 40)
    if (dayInfo && dayInfo.score < 40 && config.durationDays > 7 && currentDay < config.durationDays) {
      currentDay++;
      continue;
    }

    // Schedule posts for this day
    for (let postIndex = 0; postIndex < config.postsPerDay && postsScheduled < totalPosts; postIndex++) {
      const time = times[postIndex % times.length];
      const [hours, minutes] = time.split(':').map(Number);

      const postDate = new Date(currentDate);
      postDate.setHours(hours, minutes, 0, 0);

      // Check for conflicts (2-hour buffer)
      if (isTimeSlotAvailable(postDate, existingPosts)) {
        schedule.push(postDate);
        postsScheduled++;
      } else {
        // Try alternate times
        for (const altTime of times) {
          if (altTime === time) continue;
          const [altHours, altMinutes] = altTime.split(':').map(Number);
          const altDate = new Date(currentDate);
          altDate.setHours(altHours, altMinutes, 0, 0);

          if (isTimeSlotAvailable(altDate, existingPosts)) {
            schedule.push(altDate);
            postsScheduled++;
            break;
          }
        }
      }
    }

    currentDay++;
  }

  return schedule.sort((a, b) => a.getTime() - b.getTime());
}

/**
 * Build the topic generation prompt
 */
function buildTopicGenerationPrompt(
  config: PlannerConfig,
  totalPosts: number,
  researchData?: string
): string {
  const profileContext = getProfileContextForPlanning();
  const memoryContext = getTopicsContextForPlanning();
  const bestDays = getBestDaysToPost();

  const bestDaysContext = bestDays
    .filter(d => d.score >= 60)
    .map(d => `${d.name} (engagement score: ${d.score})`)
    .join(', ');

  return `
You are an expert LinkedIn content strategist creating a content calendar.

**AUTHOR PROFILE:**
${profileContext}

**CONTENT HISTORY (CRITICAL - AVOID REPETITION):**
${memoryContext}

**PLANNING PARAMETERS:**
- Duration: ${config.durationDays} days
- Total posts to plan: ${totalPosts}
- Content mix: ${config.contentMix} (carousel/image/text distribution will be assigned separately)
- User themes/goals: ${config.themes.length > 0 ? config.themes.join(', ') : 'General professional content'}
${researchData ? `\n**TRENDING TOPICS & RESEARCH:**\n${researchData}` : ''}

**BEST POSTING DAYS:**
${bestDaysContext}

**YOUR TASK:**
Generate exactly ${totalPosts} unique, engaging topic ideas that:
1. Align with the author's industry, expertise, and target audience
2. DO NOT repeat recent topics from content history
3. Cover the user's themes progressively across the planning period
4. Mix different content angles: how-to guides, personal stories, data insights, industry opinions, trend analysis
5. Are specific enough to generate compelling LinkedIn posts
6. Build a cohesive narrative/brand story across the period

**OUTPUT FORMAT (JSON only, no markdown):**
{
  "topics": [
    {
      "topic": "Specific, engaging topic title",
      "angle": "Brief description of the approach/hook (1-2 sentences)",
      "themes": ["theme1", "theme2"]
    }
  ]
}

Generate exactly ${totalPosts} topics. Be creative, specific, and diverse.
`.trim();
}

/**
 * Generate topics using AI
 */
export async function generatePlannerTopics(
  sessionId: string,
  onProgress?: (message: string) => void
): Promise<PlannedTopic[]> {
  const session = getPlanningSession(sessionId);
  if (!session) throw new Error('Session not found');

  const { config } = session;
  const totalPosts = config.durationDays * config.postsPerDay;

  onProgress?.('Calculating optimal schedule...');

  // Calculate schedule
  const scheduleDates = calculateOptimalSchedule(config);
  if (scheduleDates.length < totalPosts) {
    console.warn(`Could only schedule ${scheduleDates.length} of ${totalPosts} posts due to conflicts`);
  }

  // Get content type distribution
  const contentTypes = getContentTypeDistribution(config.contentMix, scheduleDates.length);

  // Optional research
  let researchData: string | undefined;
  if (config.includeResearch && isFirecrawlConfigured()) {
    onProgress?.('Researching trending topics...');
    try {
      const profile = getProfile();
      const researchQuery = config.themes.length > 0
        ? config.themes.join(' ')
        : profile.industry || profile.description || 'professional development';

      const research = await researchTopic(researchQuery);
      researchData = research || undefined;
    } catch (error) {
      console.warn('Research failed, continuing without:', error);
    }
  }

  onProgress?.('Generating topic ideas...');

  // Build prompt
  const prompt = buildTopicGenerationPrompt(config, scheduleDates.length, researchData);

  // Call Gemini
  const { GoogleGenAI } = await import('@google/genai');
  const apiKey = localStorage.getItem('gemini_api_key');
  if (!apiKey) throw new Error('Gemini API key not configured');

  const genAI = new GoogleGenAI({ apiKey });

  const result = await genAI.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
  });
  const responseText = result.text || '';

  // Parse JSON response
  let parsed: { topics: Array<{ topic: string; angle?: string; themes?: string[] }> };
  try {
    // Try to extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found in response');
    parsed = JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error('Failed to parse AI response:', responseText);
    throw new Error('Failed to parse topic suggestions');
  }

  // Create PlannedTopic objects
  const topics: PlannedTopic[] = parsed.topics.slice(0, scheduleDates.length).map((t, index) => ({
    id: `topic_${Date.now()}_${index}_${Math.random().toString(36).slice(2, 7)}`,
    scheduledAt: scheduleDates[index].toISOString(),
    topic: t.topic,
    contentType: contentTypes[index],
    themes: t.themes || config.themes,
    angle: t.angle,
    researchData: index === 0 ? researchData : undefined, // Only store on first
  }));

  // Save to session
  setGeneratedTopics(sessionId, topics);

  onProgress?.(`Generated ${topics.length} topics!`);

  return topics;
}

/**
 * Create draft posts from generated topics
 */
export function createDraftsFromTopics(sessionId: string): string[] {
  const session = getPlanningSession(sessionId);
  if (!session) throw new Error('Session not found');

  // Check if drafts already exist for this session to prevent duplicates
  const existingDrafts = getDraftPostsByPlanId(sessionId);
  if (existingDrafts.length > 0) {
    console.log(`📝 Found ${existingDrafts.length} existing drafts for session, skipping creation`);
    // Return existing draft IDs and update session if needed
    const existingIds = existingDrafts.map(d => d.id);

    // Update session with existing draft IDs if not already set
    if (session.contentGeneration.pending.length === 0) {
      const pendingDrafts = existingDrafts.filter(d => d.status === 'draft');
      const completedDrafts = existingDrafts.filter(d => d.status === 'scheduled');

      updatePlanningSession(sessionId, {
        contentGeneration: {
          ...session.contentGeneration,
          pending: pendingDrafts.map(d => d.id),
          completed: completedDrafts.map(d => d.id),
          totalCount: existingDrafts.length,
        },
      });
    }

    return existingIds;
  }

  const draftInputs: DraftPostInput[] = session.topicsGenerated.map(topic => ({
    scheduledAt: new Date(topic.scheduledAt),
    contentType: topic.contentType,
    topic: topic.topic,
    aiPlannerMetadata: {
      planId: sessionId,
      generatedFromTopic: false,
      originalTopic: topic.topic,
      generationStatus: 'pending',
      themes: topic.themes,
    },
  }));

  const drafts = createDraftPosts(draftInputs);

  // Update topics with post IDs
  const updatedTopics = session.topicsGenerated.map((topic, index) => ({
    ...topic,
    scheduledPostId: drafts[index]?.id,
  }));

  updatePlanningSession(sessionId, {
    topicsGenerated: updatedTopics,
    contentGeneration: {
      ...session.contentGeneration,
      pending: drafts.map(d => d.id),
      totalCount: drafts.length,
    },
  });

  return drafts.map(d => d.id);
}

/**
 * Generate content for a single draft post
 */
async function generateContentForDraft(
  postId: string,
  topic: PlannedTopic
): Promise<string> {
  // Update status to generating
  updateDraftGenerationStatus(postId, 'generating');

  try {
    let content: string;

    if (topic.contentType === 'carousel') {
      const result = await generateCarouselContent(topic.topic);
      content = result.post;

      // Convert draft to scheduled with carousel data
      convertDraftToScheduled(postId, content, {
        carouselSlides: result.slides,
      });
    } else {
      const result = await generateLinkedInContent(topic.topic);
      content = result.post;

      // Convert draft to scheduled
      convertDraftToScheduled(postId, content, {
        imagePrompt: result.imagePrompt,
      });
    }

    // Add to memory
    const memoryContentType = topic.contentType === 'carousel' ? 'carousel' :
      topic.contentType === 'image' ? 'single-image' : 'text-only';
    addPlannedTopicToMemory(topic.topic, content, memoryContentType, topic.themes);

    return content;
  } catch (error) {
    updateDraftGenerationStatus(postId, 'failed', error instanceof Error ? error.message : 'Unknown error');
    throw error;
  }
}

/**
 * Start or resume batch content generation
 */
export async function startContentGeneration(
  sessionId: string,
  callbacks?: GenerationCallbacks
): Promise<void> {
  // Check session status - if session is paused or was interrupted, reset the generating flag
  const existingSession = getPlanningSession(sessionId);
  if (existingSession && (existingSession.status === 'paused' || existingSession.status === 'topics-ready')) {
    // Reset generation state for paused/interrupted sessions
    isGenerating = false;
    shouldPause = false;
  }

  if (isGenerating && currentSessionId === sessionId) {
    // Already generating this session - this is a duplicate call, ignore
    console.log('Generation already in progress for this session');
    return;
  } else if (isGenerating && currentSessionId !== sessionId) {
    throw new Error('Generation already in progress for another session');
  }

  const session = getPlanningSession(sessionId);
  if (!session) throw new Error('Session not found');

  // Create drafts if not already created
  if (session.contentGeneration.pending.length === 0 && session.topicsGenerated.length > 0) {
    createDraftsFromTopics(sessionId);
  }

  // Reload session after creating drafts
  const updatedSession = getPlanningSession(sessionId);
  if (!updatedSession) throw new Error('Session not found after creating drafts');

  isGenerating = true;
  shouldPause = false;
  currentSessionId = sessionId;

  updatePlanningSession(sessionId, { status: 'generating-content' });

  const { contentGeneration, topicsGenerated } = updatedSession;
  const pending = [...contentGeneration.pending];
  let currentIndex = contentGeneration.completed.length;

  try {
    for (const postId of pending) {
      // Check for pause
      if (shouldPause) {
        pauseSession(sessionId);
        callbacks?.onPaused?.();
        break;
      }

      // Find the topic for this post
      const topic = topicsGenerated.find(t => t.scheduledPostId === postId);
      if (!topic) {
        console.warn('Topic not found for post:', postId);
        continue;
      }

      callbacks?.onProgress?.(currentIndex + 1, contentGeneration.totalCount, topic.topic);

      try {
        const content = await generateContentForDraft(postId, topic);
        markPostGenerated(sessionId, postId);
        callbacks?.onPostGenerated?.(postId, content);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Generation failed';
        markPostFailed(sessionId, postId, errorMsg);
        callbacks?.onError?.(postId, errorMsg);

        // Check if it's a rate limit error
        if (errorMsg.includes('429') || errorMsg.includes('rate limit') || errorMsg.includes('quota')) {
          // Pause generation on rate limit
          pauseSession(sessionId);
          callbacks?.onPaused?.();
          throw new Error(`API rate limit reached. Generation paused at ${currentIndex + 1}/${contentGeneration.totalCount}. You can resume later.`);
        }
      }

      currentIndex++;

      // Small delay between requests to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Check if complete
    const finalSession = getPlanningSession(sessionId);
    if (finalSession && finalSession.contentGeneration.pending.length === 0) {
      completePlanningSession(sessionId);
      callbacks?.onComplete?.();
    }
  } catch (error) {
    if (!shouldPause) {
      failPlanningSession(sessionId, error instanceof Error ? error.message : 'Generation failed');
    }
    throw error;
  } finally {
    isGenerating = false;
    currentSessionId = null;
  }
}

/**
 * Pause content generation
 */
export function pauseContentGeneration(): void {
  shouldPause = true;
}

/**
 * Resume content generation
 */
export async function resumeContentGeneration(
  sessionId: string,
  callbacks?: GenerationCallbacks
): Promise<void> {
  resumeSession(sessionId);
  await startContentGeneration(sessionId, callbacks);
}

/**
 * Enable/disable background mode
 */
export function setBackgroundGeneration(sessionId: string, enabled: boolean): void {
  setBackgroundMode(sessionId, enabled);
}

/**
 * Check if generation is in progress
 */
export function isGenerationInProgress(): boolean {
  return isGenerating;
}

/**
 * Get current generation session ID
 */
export function getCurrentSessionId(): string | null {
  return currentSessionId;
}

/**
 * Start a new planning session
 */
export function startNewPlanningSession(config?: Partial<PlannerConfig>): PlanningSession {
  // Save preferences for next time
  if (config) {
    savePlannerPreferences({
      lastDurationDays: config.durationDays,
      lastPostsPerDay: config.postsPerDay,
      preferredTimes: config.postingTimes,
      preferredContentMix: config.contentMix,
      includeResearch: config.includeResearch,
    });
  }

  return createPlanningSession(config);
}

/**
 * Get generation progress
 */
export { getGenerationStats };

/**
 * Delete drafts for a session
 */
export function deletePlannerDrafts(sessionId: string): void {
  const drafts = getDraftPostsByPlanId(sessionId);
  drafts.forEach(draft => {
    // Delete using scheduler service
    import('./schedulerService').then(({ deleteScheduledPost }) => {
      deleteScheduledPost(draft.id);
    });
  });
}
