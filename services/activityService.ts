// Activity Service - Track local content creation activity

import { ContentType } from '../types';

const ACTIVITY_STORAGE_KEY = 'content_activity';
const MAX_ACTIVITY_ENTRIES = 500;

export interface PostActivity {
  id: string;
  createdAt: Date;
  postedAt?: Date;
  contentType: ContentType;
  topic: string;
  postPreview: string; // First 150 chars
  status: 'draft' | 'scheduled' | 'posted' | 'failed';
  engagementNotes?: string; // Manual notes user can add
}

export interface ActivitySummary {
  totalCreated: number;
  totalPosted: number;
  totalScheduled: number;
  byContentType: {
    carousel: number;
    'single-image': number;
    'text-only': number;
    video: number;
    article: number;
  };
  dailyActivity: { date: string; count: number }[];
  weekdayDistribution: number[]; // Index 0 = Sunday, 6 = Saturday
}

// Get all activities from storage
export function getActivities(): PostActivity[] {
  try {
    const stored = localStorage.getItem(ACTIVITY_STORAGE_KEY);
    if (!stored) return [];

    const activities = JSON.parse(stored);
    // Convert date strings back to Date objects
    return activities.map((a: PostActivity) => ({
      ...a,
      createdAt: new Date(a.createdAt),
      postedAt: a.postedAt ? new Date(a.postedAt) : undefined,
    }));
  } catch (error) {
    console.error('Failed to load activities:', error);
    return [];
  }
}

// Save activities to storage
function saveActivities(activities: PostActivity[]): void {
  try {
    // Trim to max entries (keep most recent)
    const trimmed = activities.slice(-MAX_ACTIVITY_ENTRIES);
    localStorage.setItem(ACTIVITY_STORAGE_KEY, JSON.stringify(trimmed));
  } catch (error) {
    console.error('Failed to save activities:', error);
  }
}

// Log when a post is created/generated
export function logPostCreated(
  topic: string,
  post: string,
  contentType: ContentType
): string {
  const activities = getActivities();
  const id = `activity-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const activity: PostActivity = {
    id,
    createdAt: new Date(),
    contentType,
    topic: topic.substring(0, 100),
    postPreview: post.substring(0, 150),
    status: 'draft',
  };

  activities.push(activity);
  saveActivities(activities);

  return id;
}

// Log when a post is published
export function logPostPublished(activityId?: string, topic?: string, contentType?: ContentType): void {
  const activities = getActivities();

  if (activityId) {
    // Update existing activity
    const activity = activities.find(a => a.id === activityId);
    if (activity) {
      activity.status = 'posted';
      activity.postedAt = new Date();
    }
  } else if (topic && contentType) {
    // Create new activity for direct posts
    activities.push({
      id: `activity-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      postedAt: new Date(),
      contentType,
      topic: topic.substring(0, 100),
      postPreview: topic.substring(0, 150),
      status: 'posted',
    });
  }

  saveActivities(activities);
}

// Log when a post is scheduled
export function logPostScheduled(activityId?: string, topic?: string, contentType?: ContentType): void {
  const activities = getActivities();

  if (activityId) {
    const activity = activities.find(a => a.id === activityId);
    if (activity) {
      activity.status = 'scheduled';
    }
  } else if (topic && contentType) {
    activities.push({
      id: `activity-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      contentType,
      topic: topic.substring(0, 100),
      postPreview: topic.substring(0, 150),
      status: 'scheduled',
    });
  }

  saveActivities(activities);
}

// Update activity status
export function updateActivityStatus(
  activityId: string,
  status: PostActivity['status']
): void {
  const activities = getActivities();
  const activity = activities.find(a => a.id === activityId);

  if (activity) {
    activity.status = status;
    if (status === 'posted') {
      activity.postedAt = new Date();
    }
    saveActivities(activities);
  }
}

// Add engagement notes to an activity
export function addEngagementNotes(activityId: string, notes: string): void {
  const activities = getActivities();
  const activity = activities.find(a => a.id === activityId);

  if (activity) {
    activity.engagementNotes = notes;
    saveActivities(activities);
  }
}

// Get activity summary for a date range
export function getActivitySummary(days: number = 30): ActivitySummary {
  const activities = getActivities();
  const now = new Date();
  const startDate = new Date(now);
  startDate.setDate(startDate.getDate() - days);

  // Filter to date range
  const filtered = activities.filter(a => new Date(a.createdAt) >= startDate);

  // Count by content type
  const byContentType = {
    carousel: 0,
    'single-image': 0,
    'text-only': 0,
    video: 0,
    article: 0,
  };

  filtered.forEach(a => {
    if (byContentType[a.contentType] !== undefined) {
      byContentType[a.contentType]++;
    }
  });

  // Daily activity (last N days)
  const dailyActivity: { date: string; count: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];

    const count = filtered.filter(a => {
      const activityDate = new Date(a.createdAt).toISOString().split('T')[0];
      return activityDate === dateStr;
    }).length;

    dailyActivity.push({ date: dateStr, count });
  }

  // Weekday distribution
  const weekdayDistribution = [0, 0, 0, 0, 0, 0, 0];
  filtered.forEach(a => {
    const day = new Date(a.createdAt).getDay();
    weekdayDistribution[day]++;
  });

  return {
    totalCreated: filtered.length,
    totalPosted: filtered.filter(a => a.status === 'posted').length,
    totalScheduled: filtered.filter(a => a.status === 'scheduled').length,
    byContentType,
    dailyActivity,
    weekdayDistribution,
  };
}

// Get recent posts
export function getRecentPosts(limit: number = 10): PostActivity[] {
  const activities = getActivities();
  return activities
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);
}

// Get posts for a specific date
export function getPostsForDate(date: Date): PostActivity[] {
  const activities = getActivities();
  const dateStr = date.toISOString().split('T')[0];

  return activities.filter(a => {
    const activityDate = new Date(a.createdAt).toISOString().split('T')[0];
    return activityDate === dateStr;
  });
}

// Delete an activity
export function deleteActivity(activityId: string): void {
  const activities = getActivities();
  const filtered = activities.filter(a => a.id !== activityId);
  saveActivities(filtered);
}

// Clear all activities
export function clearAllActivities(): void {
  localStorage.removeItem(ACTIVITY_STORAGE_KEY);
}

// Get streak information
export function getStreak(): { current: number; longest: number } {
  const activities = getActivities();
  if (activities.length === 0) return { current: 0, longest: 0 };

  // Get unique days with activity
  const daysWithActivity = new Set<string>();
  activities.forEach(a => {
    daysWithActivity.add(new Date(a.createdAt).toISOString().split('T')[0]);
  });

  const sortedDays = Array.from(daysWithActivity).sort().reverse();
  if (sortedDays.length === 0) return { current: 0, longest: 0 };

  // Calculate current streak
  let currentStreak = 0;
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  // Check if there's activity today or yesterday to start counting
  if (sortedDays[0] === today || sortedDays[0] === yesterday) {
    currentStreak = 1;
    for (let i = 1; i < sortedDays.length; i++) {
      const prevDate = new Date(sortedDays[i - 1]);
      const currDate = new Date(sortedDays[i]);
      const diff = (prevDate.getTime() - currDate.getTime()) / 86400000;

      if (diff === 1) {
        currentStreak++;
      } else {
        break;
      }
    }
  }

  // Calculate longest streak
  let longestStreak = 1;
  let tempStreak = 1;

  for (let i = 1; i < sortedDays.length; i++) {
    const prevDate = new Date(sortedDays[i - 1]);
    const currDate = new Date(sortedDays[i]);
    const diff = (prevDate.getTime() - currDate.getTime()) / 86400000;

    if (diff === 1) {
      tempStreak++;
      longestStreak = Math.max(longestStreak, tempStreak);
    } else {
      tempStreak = 1;
    }
  }

  return { current: currentStreak, longest: longestStreak };
}
