/**
 * Auto-Pilot Service
 * Manages automatic content generation and posting to LinkedIn
 */

import { generateLinkedInContent, generateCarouselContent } from './geminiService';
import { postToLinkedIn } from './linkedinService';
import { getTrendingTopics, isFirecrawlConfigured } from './firecrawlService';
import { addToMemory, wasRecentlyCovered, getMemory } from './memoryService';
import { getProfile } from './profileService';
import { ContentType } from '../types';
import { getDuePosts, markPostAsPosted, markPostAsFailed, ScheduledPost } from './schedulerService';

const AUTOPILOT_STATE_KEY = 'autopilot_state';
const LAST_POST_TIME_KEY = 'autopilot_last_post';

export interface AutoPilotState {
  enabled: boolean;
  intervalHours: number;
  lastPostTime: number;
  nextPostTime: number;
  topicIndex: number;
  consecutivePosts: number;
}

export interface AutoPilotStats {
  isRunning: boolean;
  nextPostIn: string;
  totalAutoPosts: number;
  lastPostTime: number;
}

let autoPilotTimer: NodeJS.Timeout | null = null;

/**
 * Get Auto-Pilot state
 */
export const getAutoPilotState = (): AutoPilotState => {
  const enabled = localStorage.getItem('autopilot_enabled') === 'true';
  const intervalHours = parseInt(localStorage.getItem('autopilot_interval') || '4');

  try {
    const stored = localStorage.getItem(AUTOPILOT_STATE_KEY);
    if (stored) {
      const state = JSON.parse(stored);
      return {
        ...state,
        enabled,
        intervalHours,
      };
    }
  } catch (error) {
    console.error('Failed to load Auto-Pilot state:', error);
  }

  const now = Date.now();
  return {
    enabled,
    intervalHours,
    lastPostTime: 0,
    nextPostTime: now + (intervalHours * 60 * 60 * 1000),
    topicIndex: 0,
    consecutivePosts: 0,
  };
};

/**
 * Save Auto-Pilot state
 */
const saveAutoPilotState = (state: AutoPilotState): void => {
  localStorage.setItem(AUTOPILOT_STATE_KEY, JSON.stringify(state));
};

/**
 * Get predefined topics from settings
 */
const getPredefinedTopics = (): string[] => {
  const topics = localStorage.getItem('autopilot_topics') || '';
  return topics
    .split('\n')
    .map(t => t.trim())
    .filter(t => t.length > 0);
};

/**
 * Generate a topic from AI based on profile and memory
 */
const generateAITopic = async (profile: any): Promise<string> => {
  // Use profile description to generate relevant topics
  const niche = profile.description || 'professional development';

  const topics = [
    `Best practices for ${niche}`,
    `Common mistakes in ${niche}`,
    `Future trends in ${niche}`,
    `How to get started with ${niche}`,
    `Advanced tips for ${niche}`,
    `Tools and resources for ${niche}`,
    `Success stories in ${niche}`,
    `Challenges in ${niche} and how to overcome them`,
  ];

  // Filter out recently covered topics
  const unusedTopics = topics.filter(topic => !wasRecentlyCovered(topic, 20));

  if (unusedTopics.length > 0) {
    return unusedTopics[Math.floor(Math.random() * unusedTopics.length)];
  }

  return topics[Math.floor(Math.random() * topics.length)];
};

/**
 * Select next topic for Auto-Pilot
 */
const selectNextTopic = async (): Promise<string> => {
  const state = getAutoPilotState();
  const profile = getProfile();
  const predefinedTopics = getPredefinedTopics();

  const allTopics: string[] = [];

  // 1. Add predefined topics
  allTopics.push(...predefinedTopics);

  // 2. Add AI-generated topic
  try {
    const aiTopic = await generateAITopic(profile);
    allTopics.push(aiTopic);
  } catch (error) {
    console.error('Failed to generate AI topic:', error);
  }

  // 3. Add trending topics from Firecrawl (if configured)
  if (isFirecrawlConfigured() && profile.description) {
    try {
      const trendingTopics = await getTrendingTopics(profile.description, 2);
      allTopics.push(...trendingTopics.map(t => t.topic));
    } catch (error) {
      console.error('Failed to get trending topics:', error);
    }
  }

  // Filter out recently covered topics
  const availableTopics = allTopics.filter(topic => !wasRecentlyCovered(topic, 15));

  // If all topics were recently covered, use all topics anyway
  const topicsToUse = availableTopics.length > 0 ? availableTopics : allTopics;

  if (topicsToUse.length === 0) {
    // Fallback: generate a generic AI topic
    return await generateAITopic(profile);
  }

  // Cycle through topics
  const selectedTopic = topicsToUse[state.topicIndex % topicsToUse.length];

  // Update topic index
  state.topicIndex = (state.topicIndex + 1) % topicsToUse.length;
  saveAutoPilotState(state);

  return selectedTopic;
};

/**
 * Determine content type based on variety
 */
const selectContentType = (): ContentType => {
  const memory = getMemory();
  const recentPosts = memory.posts.slice(0, 5);

  // Count recent content types
  const carouselCount = recentPosts.filter(p => p.contentType === 'carousel').length;
  const singleImageCount = recentPosts.filter(p => p.contentType === 'single-image').length;

  // Prefer carousel (best performing), but add variety
  if (carouselCount >= 3) {
    return 'single-image';
  }

  // 70% carousel, 30% single-image
  return Math.random() < 0.7 ? 'carousel' : 'single-image';
};

/**
 * Execute a scheduled post from the calendar
 */
const executeScheduledPost = async (scheduledPost: ScheduledPost): Promise<void> => {
  console.log('[Auto-Pilot] Executing scheduled post:', scheduledPost.id);

  try {
    // Post to LinkedIn
    await postToLinkedIn(scheduledPost.post);
    console.log('[Auto-Pilot] Scheduled post published successfully');

    // Mark as posted
    markPostAsPosted(scheduledPost.id);

    // Add to memory (map contentType for memory service)
    const memoryContentType = scheduledPost.contentType === 'carousel' ? 'carousel' :
      scheduledPost.contentType === 'image' ? 'single-image' : 'text-only';
    addToMemory(scheduledPost.topic, scheduledPost.post, memoryContentType, true);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Auto-Pilot] Failed to publish scheduled post:', errorMessage);

    // Mark as failed
    markPostAsFailed(scheduledPost.id, errorMessage);
    throw error;
  }
};

/**
 * Check and execute any due scheduled posts
 */
export const checkScheduledPosts = async (): Promise<boolean> => {
  const duePosts = getDuePosts();

  if (duePosts.length === 0) {
    return false;
  }

  console.log('[Auto-Pilot] Found', duePosts.length, 'due scheduled posts');

  // Execute the first due post (oldest)
  for (const post of duePosts) {
    try {
      await executeScheduledPost(post);
      return true; // Successfully posted one
    } catch (error) {
      console.error('[Auto-Pilot] Failed to execute scheduled post:', post.id);
      // Continue to next post
    }
  }

  return false;
};

/**
 * Execute a single Auto-Pilot post
 */
export const executeAutoPilotPost = async (): Promise<void> => {
  console.log('[Auto-Pilot] Starting post cycle...');

  // First, check for scheduled posts that are due
  const postedScheduled = await checkScheduledPosts();
  if (postedScheduled) {
    console.log('[Auto-Pilot] Posted scheduled content, skipping auto-generation');

    // Update state
    const state = getAutoPilotState();
    state.lastPostTime = Date.now();
    state.nextPostTime = Date.now() + (state.intervalHours * 60 * 60 * 1000);
    state.consecutivePosts++;
    saveAutoPilotState(state);

    localStorage.setItem(LAST_POST_TIME_KEY, Date.now().toString());
    return;
  }

  // No scheduled posts due, generate fresh content
  console.log('[Auto-Pilot] No scheduled posts due, generating fresh content...');

  try {
    // Select topic
    const topic = await selectNextTopic();
    console.log('[Auto-Pilot] Selected topic:', topic);

    // Select content type
    const contentType = selectContentType();
    console.log('[Auto-Pilot] Content type:', contentType);

    // Generate content
    let postContent: string;
    if (contentType === 'carousel') {
      const result = await generateCarouselContent(topic);
      postContent = result.post;

      // Add to memory
      addToMemory(topic, postContent, 'carousel', true);
    } else {
      const result = await generateLinkedInContent(topic);
      postContent = result.post;

      // Add to memory
      addToMemory(topic, postContent, 'single-image', true);
    }

    console.log('[Auto-Pilot] Content generated');

    // Post to LinkedIn
    await postToLinkedIn(postContent);
    console.log('[Auto-Pilot] Posted to LinkedIn successfully');

    // Update state
    const state = getAutoPilotState();
    state.lastPostTime = Date.now();
    state.nextPostTime = Date.now() + (state.intervalHours * 60 * 60 * 1000);
    state.consecutivePosts++;
    saveAutoPilotState(state);

    localStorage.setItem(LAST_POST_TIME_KEY, Date.now().toString());

    console.log('[Auto-Pilot] Next post scheduled in', state.intervalHours, 'hours');
  } catch (error) {
    console.error('[Auto-Pilot] Failed to execute post:', error);
    throw error;
  }
};

/**
 * Start Auto-Pilot
 */
export const startAutoPilot = (): void => {
  const state = getAutoPilotState();

  if (!state.enabled) {
    console.log('[Auto-Pilot] Not enabled, skipping start');
    return;
  }

  // Stop existing timer
  stopAutoPilot();

  console.log('[Auto-Pilot] Starting with interval:', state.intervalHours, 'hours');

  const intervalMs = state.intervalHours * 60 * 60 * 1000;

  // Calculate time until next post
  const now = Date.now();
  const timeSinceLastPost = now - state.lastPostTime;
  const timeUntilNextPost = Math.max(0, intervalMs - timeSinceLastPost);

  console.log('[Auto-Pilot] Next post in:', Math.floor(timeUntilNextPost / 1000 / 60), 'minutes');

  // Schedule first post
  setTimeout(() => {
    executeAutoPilotPost()
      .catch(err => console.error('[Auto-Pilot] Post failed:', err));

    // Start regular interval
    autoPilotTimer = setInterval(() => {
      executeAutoPilotPost()
        .catch(err => console.error('[Auto-Pilot] Post failed:', err));
    }, intervalMs);
  }, timeUntilNextPost);
};

/**
 * Stop Auto-Pilot
 */
export const stopAutoPilot = (): void => {
  if (autoPilotTimer) {
    clearInterval(autoPilotTimer);
    clearTimeout(autoPilotTimer as any);
    autoPilotTimer = null;
    console.log('[Auto-Pilot] Stopped');
  }
};

/**
 * Get Auto-Pilot statistics
 */
export const getAutoPilotStats = (): AutoPilotStats => {
  const state = getAutoPilotState();
  const now = Date.now();
  const timeUntilNext = Math.max(0, state.nextPostTime - now);

  const hours = Math.floor(timeUntilNext / 1000 / 60 / 60);
  const minutes = Math.floor((timeUntilNext / 1000 / 60) % 60);

  let nextPostIn = '';
  if (hours > 0) {
    nextPostIn = `${hours}h ${minutes}m`;
  } else {
    nextPostIn = `${minutes}m`;
  }

  return {
    isRunning: state.enabled && autoPilotTimer !== null,
    nextPostIn: state.enabled ? nextPostIn : 'Disabled',
    totalAutoPosts: state.consecutivePosts,
    lastPostTime: state.lastPostTime,
  };
};

/**
 * Reset Auto-Pilot statistics
 */
export const resetAutoPilotStats = (): void => {
  const state = getAutoPilotState();
  state.consecutivePosts = 0;
  state.topicIndex = 0;
  saveAutoPilotState(state);
};
