/**
 * Planner Storage Service
 * Manages AI planner sessions for progress persistence and resume capability
 */

import { ContentType } from '../types';

// Storage key for planner sessions
const PLANNER_SESSIONS_KEY = 'linkedin_planner_sessions';
const MAX_SESSIONS = 10; // Keep last 10 sessions

// Content mix strategy types
export type ContentMixStrategy = 'carousel-heavy' | 'balanced' | 'text-heavy';

// Planner configuration built from Q&A
export interface PlannerConfig {
  durationDays: number;
  postsPerDay: number;
  postingTimes: string[];
  contentMix: ContentMixStrategy;
  themes: string[];
  includeResearch: boolean;
}

// Individual planned topic
export interface PlannedTopic {
  id: string;
  scheduledAt: string; // ISO string for storage
  topic: string;
  contentType: ContentType;
  themes: string[];
  angle?: string;
  researchData?: string;
  scheduledPostId?: string; // Links to ScheduledPost after draft creation
}

// Content generation progress tracking
export interface GenerationProgress {
  currentIndex: number;
  totalCount: number;
  completed: string[]; // IDs of successfully generated posts
  failed: FailedGeneration[];
  pending: string[]; // IDs still to be generated
  runInBackground: boolean;
  pausedAt?: string; // ISO timestamp
}

export interface FailedGeneration {
  postId: string;
  error: string;
  attempts: number;
  lastAttempt: string; // ISO timestamp
}

// Planning session state
export interface PlanningSession {
  id: string;
  config: PlannerConfig;
  status: 'configuring' | 'generating-topics' | 'topics-ready' | 'generating-content' | 'complete' | 'paused' | 'failed';
  createdAt: string;
  updatedAt: string;
  topicsGenerated: PlannedTopic[];
  contentGeneration: GenerationProgress;
  error?: string;
}

// Generate unique session ID
function generateSessionId(): string {
  return `plan_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

// Get all planning sessions from storage
export function getAllPlanningSessions(): PlanningSession[] {
  try {
    const stored = localStorage.getItem(PLANNER_SESSIONS_KEY);
    if (!stored) return [];
    return JSON.parse(stored) as PlanningSession[];
  } catch (error) {
    console.error('Failed to load planner sessions:', error);
    return [];
  }
}

// Save all sessions to storage
function savePlanningSessions(sessions: PlanningSession[]): void {
  try {
    // Keep only last MAX_SESSIONS
    const trimmed = sessions.slice(-MAX_SESSIONS);
    localStorage.setItem(PLANNER_SESSIONS_KEY, JSON.stringify(trimmed));
  } catch (error) {
    console.error('Failed to save planner sessions:', error);
    throw new Error('Failed to save planning session');
  }
}

// Create a new planning session
export function createPlanningSession(config?: Partial<PlannerConfig>): PlanningSession {
  const now = new Date().toISOString();

  const session: PlanningSession = {
    id: generateSessionId(),
    config: {
      durationDays: config?.durationDays || 7,
      postsPerDay: config?.postsPerDay || 1,
      postingTimes: config?.postingTimes || ['09:00'],
      contentMix: config?.contentMix || 'balanced',
      themes: config?.themes || [],
      includeResearch: config?.includeResearch || false,
    },
    status: 'configuring',
    createdAt: now,
    updatedAt: now,
    topicsGenerated: [],
    contentGeneration: {
      currentIndex: 0,
      totalCount: 0,
      completed: [],
      failed: [],
      pending: [],
      runInBackground: false,
    },
  };

  const sessions = getAllPlanningSessions();
  sessions.push(session);
  savePlanningSessions(sessions);

  console.log('📋 Created planning session:', session.id);
  return session;
}

// Get a specific planning session by ID
export function getPlanningSession(sessionId: string): PlanningSession | null {
  const sessions = getAllPlanningSessions();
  return sessions.find(s => s.id === sessionId) || null;
}

// Get active or paused planning session (most recent non-complete)
export function getActivePlanningSession(): PlanningSession | null {
  const sessions = getAllPlanningSessions();
  const activeStatuses = ['configuring', 'generating-topics', 'topics-ready', 'generating-content', 'paused'];

  // Find most recent active session
  for (let i = sessions.length - 1; i >= 0; i--) {
    if (activeStatuses.includes(sessions[i].status)) {
      return sessions[i];
    }
  }

  return null;
}

// Update planning session
export function updatePlanningSession(sessionId: string, updates: Partial<PlanningSession>): PlanningSession | null {
  const sessions = getAllPlanningSessions();
  const index = sessions.findIndex(s => s.id === sessionId);

  if (index === -1) return null;

  sessions[index] = {
    ...sessions[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  savePlanningSessions(sessions);
  return sessions[index];
}

// Update session config
export function updatePlannerConfig(sessionId: string, config: Partial<PlannerConfig>): PlanningSession | null {
  const session = getPlanningSession(sessionId);
  if (!session) return null;

  return updatePlanningSession(sessionId, {
    config: { ...session.config, ...config },
  });
}

// Update session status
export function updateSessionStatus(
  sessionId: string,
  status: PlanningSession['status'],
  error?: string
): PlanningSession | null {
  return updatePlanningSession(sessionId, { status, error });
}

// Set generated topics
export function setGeneratedTopics(sessionId: string, topics: PlannedTopic[]): PlanningSession | null {
  const session = getPlanningSession(sessionId);
  if (!session) return null;

  // Note: Don't set pending here - it will be set when drafts are created
  // pending should contain POST IDs (from drafts), not topic IDs
  return updatePlanningSession(sessionId, {
    topicsGenerated: topics,
    status: 'topics-ready',
    contentGeneration: {
      ...session.contentGeneration,
      totalCount: topics.length,
      pending: [], // Will be populated when createDraftsFromTopics is called
    },
  });
}

// Update generation progress
export function updateGenerationProgress(
  sessionId: string,
  progress: Partial<GenerationProgress>
): PlanningSession | null {
  const session = getPlanningSession(sessionId);
  if (!session) return null;

  return updatePlanningSession(sessionId, {
    contentGeneration: { ...session.contentGeneration, ...progress },
  });
}

// Mark a post as generated successfully
export function markPostGenerated(sessionId: string, postId: string): PlanningSession | null {
  const session = getPlanningSession(sessionId);
  if (!session) return null;

  const { contentGeneration } = session;

  return updateGenerationProgress(sessionId, {
    currentIndex: contentGeneration.currentIndex + 1,
    completed: [...contentGeneration.completed, postId],
    pending: contentGeneration.pending.filter(id => id !== postId),
    // Remove from failed if it was there (retry success)
    failed: contentGeneration.failed.filter(f => f.postId !== postId),
  });
}

// Mark a post generation as failed
export function markPostFailed(sessionId: string, postId: string, error: string): PlanningSession | null {
  const session = getPlanningSession(sessionId);
  if (!session) return null;

  const { contentGeneration } = session;
  const existingFailed = contentGeneration.failed.find(f => f.postId === postId);

  const failedEntry: FailedGeneration = {
    postId,
    error,
    attempts: (existingFailed?.attempts || 0) + 1,
    lastAttempt: new Date().toISOString(),
  };

  return updateGenerationProgress(sessionId, {
    failed: [
      ...contentGeneration.failed.filter(f => f.postId !== postId),
      failedEntry,
    ],
  });
}

// Pause generation
export function pauseGeneration(sessionId: string): PlanningSession | null {
  const session = getPlanningSession(sessionId);
  if (!session) return null;

  return updatePlanningSession(sessionId, {
    status: 'paused',
    contentGeneration: {
      ...session.contentGeneration,
      pausedAt: new Date().toISOString(),
    },
  });
}

// Resume generation
export function resumeGeneration(sessionId: string): PlanningSession | null {
  const session = getPlanningSession(sessionId);
  if (!session || session.status !== 'paused') return null;

  return updatePlanningSession(sessionId, {
    status: 'generating-content',
    contentGeneration: {
      ...session.contentGeneration,
      pausedAt: undefined,
    },
  });
}

// Set background mode
export function setBackgroundMode(sessionId: string, runInBackground: boolean): PlanningSession | null {
  return updateGenerationProgress(sessionId, { runInBackground });
}

// Complete a planning session
export function completePlanningSession(sessionId: string): PlanningSession | null {
  return updateSessionStatus(sessionId, 'complete');
}

// Fail a planning session
export function failPlanningSession(sessionId: string, error: string): PlanningSession | null {
  return updateSessionStatus(sessionId, 'failed', error);
}

// Delete a planning session
export function deletePlanningSession(sessionId: string): boolean {
  const sessions = getAllPlanningSessions();
  const filtered = sessions.filter(s => s.id !== sessionId);

  if (filtered.length === sessions.length) return false;

  savePlanningSessions(filtered);
  console.log('🗑️ Deleted planning session:', sessionId);
  return true;
}

// Get generation stats for a session
export function getGenerationStats(sessionId: string): {
  total: number;
  completed: number;
  failed: number;
  pending: number;
  progress: number;
} | null {
  const session = getPlanningSession(sessionId);
  if (!session) return null;

  const { contentGeneration } = session;
  const total = contentGeneration.totalCount;
  const completed = contentGeneration.completed.length;
  const failed = contentGeneration.failed.length;
  const pending = contentGeneration.pending.length;

  return {
    total,
    completed,
    failed,
    pending,
    progress: total > 0 ? Math.round((completed / total) * 100) : 0,
  };
}

// Check if there's a resumable session
export function hasResumableSession(): boolean {
  const session = getActivePlanningSession();
  return session !== null && (session.status === 'paused' || session.status === 'generating-content');
}

// Get time since pause
export function getTimeSincePause(sessionId: string): string | null {
  const session = getPlanningSession(sessionId);
  if (!session || !session.contentGeneration.pausedAt) return null;

  const pausedAt = new Date(session.contentGeneration.pausedAt);
  const now = new Date();
  const diffMs = now.getTime() - pausedAt.getTime();

  const minutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  return 'Just now';
}

// Cleanup old sessions (keep only complete/failed for history)
export function cleanupOldSessions(): void {
  const sessions = getAllPlanningSessions();
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const filtered = sessions.filter(s => {
    // Keep all non-complete sessions
    if (s.status !== 'complete' && s.status !== 'failed') return true;
    // Keep complete/failed sessions from last 30 days
    return new Date(s.updatedAt) > thirtyDaysAgo;
  });

  if (filtered.length !== sessions.length) {
    savePlanningSessions(filtered);
    console.log(`🧹 Cleaned up ${sessions.length - filtered.length} old sessions`);
  }
}
