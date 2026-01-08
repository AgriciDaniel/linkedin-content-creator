// Scheduler Service - Manages scheduled posts for the calendar

import { ContentType } from '../types';
import { SlideData } from '../types/slideLayouts';

// AI Planner metadata for tracking planned posts
export interface AIPlannerMetadata {
  planId: string;
  generatedFromTopic: boolean;
  originalTopic?: string;
  generationStatus: 'pending' | 'generating' | 'complete' | 'failed';
  themes?: string[];
}

export interface ScheduledPost {
  id: string;
  scheduledAt: Date;
  contentType: ContentType;
  topic: string;
  post: string;
  carouselSlides?: SlideData[];
  imageUrl?: string;
  imagePrompt?: string;
  status: 'draft' | 'scheduled' | 'posted' | 'failed' | 'cancelled';
  linkedinPostId?: string;
  linkedinPostUrl?: string;
  createdAt: Date;
  updatedAt: Date;
  error?: string;
  // AI Planner metadata (optional)
  aiPlannerMetadata?: AIPlannerMetadata;
}

export interface SchedulePostInput {
  scheduledAt: Date;
  contentType: ContentType;
  topic: string;
  post: string;
  carouselSlides?: SlideData[];
  imageUrl?: string;
  imagePrompt?: string;
  aiPlannerMetadata?: AIPlannerMetadata;
}

// Input for creating draft posts (content is optional)
export interface DraftPostInput {
  scheduledAt: Date;
  contentType: ContentType;
  topic: string;
  post?: string; // Optional for drafts - will be generated later
  aiPlannerMetadata: AIPlannerMetadata;
}

const STORAGE_KEY = 'linkedin_scheduled_posts';

// Generate unique ID
function generateId(): string {
  return `post_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Get all scheduled posts from storage
export function getScheduledPosts(): ScheduledPost[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];

    const posts = JSON.parse(stored) as ScheduledPost[];
    // Convert date strings back to Date objects
    return posts.map(post => ({
      ...post,
      scheduledAt: new Date(post.scheduledAt),
      createdAt: new Date(post.createdAt),
      updatedAt: new Date(post.updatedAt),
    }));
  } catch {
    console.error('Failed to load scheduled posts');
    return [];
  }
}

// Save posts to storage
function saveScheduledPosts(posts: ScheduledPost[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
  } catch (error) {
    console.error('Failed to save scheduled posts:', error);
    throw new Error('Failed to save scheduled post');
  }
}

// Schedule a new post
export function schedulePost(input: SchedulePostInput): ScheduledPost {
  const now = new Date();

  const newPost: ScheduledPost = {
    id: generateId(),
    ...input,
    status: 'scheduled',
    createdAt: now,
    updatedAt: now,
  };

  const posts = getScheduledPosts();
  posts.push(newPost);
  saveScheduledPosts(posts);

  console.log('📅 Post scheduled for:', newPost.scheduledAt);
  return newPost;
}

// Create a draft post (topic only, content generated later)
export function createDraftPost(input: DraftPostInput): ScheduledPost {
  const now = new Date();

  const newPost: ScheduledPost = {
    id: generateId(),
    scheduledAt: input.scheduledAt,
    contentType: input.contentType,
    topic: input.topic,
    post: input.post || '', // Empty content for drafts
    status: 'draft',
    aiPlannerMetadata: input.aiPlannerMetadata,
    createdAt: now,
    updatedAt: now,
  };

  const posts = getScheduledPosts();
  posts.push(newPost);
  saveScheduledPosts(posts);

  console.log('📝 Draft post created for:', newPost.scheduledAt);
  return newPost;
}

// Create multiple draft posts at once
export function createDraftPosts(inputs: DraftPostInput[]): ScheduledPost[] {
  const now = new Date();
  const posts = getScheduledPosts();

  const newPosts = inputs.map(input => ({
    id: generateId(),
    scheduledAt: input.scheduledAt,
    contentType: input.contentType,
    topic: input.topic,
    post: input.post || '',
    status: 'draft' as const,
    aiPlannerMetadata: input.aiPlannerMetadata,
    createdAt: now,
    updatedAt: now,
  }));

  posts.push(...newPosts);
  saveScheduledPosts(posts);

  console.log(`📝 Created ${newPosts.length} draft posts`);
  return newPosts;
}

// Get all draft posts
export function getDraftPosts(): ScheduledPost[] {
  const posts = getScheduledPosts();
  return posts
    .filter(p => p.status === 'draft')
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
}

// Get draft posts by plan ID
export function getDraftPostsByPlanId(planId: string): ScheduledPost[] {
  const posts = getScheduledPosts();
  return posts
    .filter(p => p.status === 'draft' && p.aiPlannerMetadata?.planId === planId)
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
}

// Convert draft to scheduled (after content is generated)
export function convertDraftToScheduled(id: string, content: string, additionalData?: Partial<SchedulePostInput>): ScheduledPost | null {
  const posts = getScheduledPosts();
  const index = posts.findIndex(p => p.id === id);

  if (index === -1) return null;

  posts[index] = {
    ...posts[index],
    post: content,
    status: 'scheduled',
    ...(additionalData || {}),
    aiPlannerMetadata: posts[index].aiPlannerMetadata ? {
      ...posts[index].aiPlannerMetadata,
      generationStatus: 'complete',
      generatedFromTopic: true,
    } : undefined,
    updatedAt: new Date(),
  };

  saveScheduledPosts(posts);
  console.log('✅ Draft converted to scheduled:', id);
  return posts[index];
}

// Update draft generation status
export function updateDraftGenerationStatus(id: string, status: AIPlannerMetadata['generationStatus'], error?: string): ScheduledPost | null {
  const posts = getScheduledPosts();
  const index = posts.findIndex(p => p.id === id);

  if (index === -1) return null;

  if (posts[index].aiPlannerMetadata) {
    posts[index].aiPlannerMetadata.generationStatus = status;
  }
  if (error) {
    posts[index].error = error;
  }
  posts[index].updatedAt = new Date();

  saveScheduledPosts(posts);
  return posts[index];
}

// Delete all drafts by plan ID
export function deleteDraftsByPlanId(planId: string): number {
  const posts = getScheduledPosts();
  const filtered = posts.filter(p => !(p.status === 'draft' && p.aiPlannerMetadata?.planId === planId));
  const deletedCount = posts.length - filtered.length;

  if (deletedCount > 0) {
    saveScheduledPosts(filtered);
    console.log(`🗑️ Deleted ${deletedCount} drafts for plan:`, planId);
  }

  return deletedCount;
}

// Reschedule an existing post
export function reschedulePost(id: string, newDateTime: Date): ScheduledPost | null {
  const posts = getScheduledPosts();
  const index = posts.findIndex(p => p.id === id);

  if (index === -1) return null;

  posts[index] = {
    ...posts[index],
    scheduledAt: newDateTime,
    updatedAt: new Date(),
  };

  saveScheduledPosts(posts);
  console.log('📅 Post rescheduled to:', newDateTime);
  return posts[index];
}

// Cancel a scheduled post
export function cancelScheduledPost(id: string): boolean {
  const posts = getScheduledPosts();
  const index = posts.findIndex(p => p.id === id);

  if (index === -1) return false;

  posts[index] = {
    ...posts[index],
    status: 'cancelled',
    updatedAt: new Date(),
  };

  saveScheduledPosts(posts);
  console.log('❌ Post cancelled:', id);
  return true;
}

// Delete a scheduled post permanently
export function deleteScheduledPost(id: string): boolean {
  const posts = getScheduledPosts();
  const filtered = posts.filter(p => p.id !== id);

  if (filtered.length === posts.length) return false;

  saveScheduledPosts(filtered);
  console.log('🗑️ Post deleted:', id);
  return true;
}

// Update post status after posting
export function markPostAsPosted(id: string, linkedinPostId?: string, linkedinPostUrl?: string): ScheduledPost | null {
  const posts = getScheduledPosts();
  const index = posts.findIndex(p => p.id === id);

  if (index === -1) return null;

  posts[index] = {
    ...posts[index],
    status: 'posted',
    linkedinPostId,
    linkedinPostUrl,
    updatedAt: new Date(),
  };

  saveScheduledPosts(posts);
  console.log('✅ Post marked as posted:', id);
  return posts[index];
}

// Mark post as failed
export function markPostAsFailed(id: string, error: string): ScheduledPost | null {
  const posts = getScheduledPosts();
  const index = posts.findIndex(p => p.id === id);

  if (index === -1) return null;

  posts[index] = {
    ...posts[index],
    status: 'failed',
    error,
    updatedAt: new Date(),
  };

  saveScheduledPosts(posts);
  console.log('❌ Post marked as failed:', id, error);
  return posts[index];
}

// Get posts for a specific date
export function getPostsForDate(date: Date): ScheduledPost[] {
  const posts = getScheduledPosts();

  return posts.filter(post => {
    const postDate = new Date(post.scheduledAt);
    return (
      postDate.getFullYear() === date.getFullYear() &&
      postDate.getMonth() === date.getMonth() &&
      postDate.getDate() === date.getDate()
    );
  });
}

// Get posts in a date range
export function getPostsInRange(start: Date, end: Date): ScheduledPost[] {
  const posts = getScheduledPosts();

  return posts.filter(post => {
    const postDate = new Date(post.scheduledAt);
    return postDate >= start && postDate <= end;
  });
}

// Get upcoming scheduled posts (not yet posted)
export function getUpcomingPosts(limit?: number): ScheduledPost[] {
  const posts = getScheduledPosts();
  const now = new Date();

  const upcoming = posts
    .filter(post => post.status === 'scheduled' && new Date(post.scheduledAt) > now)
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());

  return limit ? upcoming.slice(0, limit) : upcoming;
}

// Get the next post due for publishing
export function getNextDuePost(): ScheduledPost | null {
  const posts = getScheduledPosts();
  const now = new Date();

  const duePosts = posts
    .filter(post => post.status === 'scheduled' && new Date(post.scheduledAt) <= now)
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());

  return duePosts[0] || null;
}

// Get all posts that are due for publishing
export function getDuePosts(): ScheduledPost[] {
  const posts = getScheduledPosts();
  const now = new Date();

  return posts
    .filter(post => post.status === 'scheduled' && new Date(post.scheduledAt) <= now)
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
}

// Get post by ID
export function getScheduledPostById(id: string): ScheduledPost | null {
  const posts = getScheduledPosts();
  return posts.find(p => p.id === id) || null;
}

// Update a scheduled post's content
export function updateScheduledPost(id: string, updates: Partial<SchedulePostInput>): ScheduledPost | null {
  const posts = getScheduledPosts();
  const index = posts.findIndex(p => p.id === id);

  if (index === -1) return null;

  posts[index] = {
    ...posts[index],
    ...updates,
    updatedAt: new Date(),
  };

  saveScheduledPosts(posts);
  console.log('📝 Post updated:', id);
  return posts[index];
}

// Get statistics about scheduled posts
export function getSchedulerStats(): {
  total: number;
  draft: number;
  scheduled: number;
  posted: number;
  failed: number;
  cancelled: number;
  upcoming: number;
} {
  const posts = getScheduledPosts();
  const now = new Date();

  return {
    total: posts.length,
    draft: posts.filter(p => p.status === 'draft').length,
    scheduled: posts.filter(p => p.status === 'scheduled').length,
    posted: posts.filter(p => p.status === 'posted').length,
    failed: posts.filter(p => p.status === 'failed').length,
    cancelled: posts.filter(p => p.status === 'cancelled').length,
    upcoming: posts.filter(p => (p.status === 'scheduled' || p.status === 'draft') && new Date(p.scheduledAt) > now).length,
  };
}

// Clear all scheduled posts (for testing/reset)
export function clearAllScheduledPosts(): void {
  localStorage.removeItem(STORAGE_KEY);
  console.log('🗑️ All scheduled posts cleared');
}

// Clear only draft and scheduled posts (keep posted ones)
export function clearDraftAndScheduledPosts(): { clearedCount: number; keptCount: number } {
  const posts = getScheduledPosts();
  const drafts = getDraftPosts();
  const allPosts = [...posts, ...drafts];

  // Keep only posted posts
  const postedPosts = allPosts.filter(p => p.status === 'posted');
  const clearedCount = allPosts.length - postedPosts.length;

  // Save back only the posted ones
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(postedPosts));
    console.log(`🗑️ Cleared ${clearedCount} draft/scheduled posts, kept ${postedPosts.length} posted records`);
  } catch (error) {
    console.error('Failed to clear posts:', error);
  }

  return { clearedCount, keptCount: postedPosts.length };
}
