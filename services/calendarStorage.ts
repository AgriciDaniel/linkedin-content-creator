// Calendar Storage Service - Manages calendar preferences and state

export interface CalendarPreferences {
  defaultView: 'month' | 'week' | 'day' | 'agenda';
  defaultPostTime: string; // HH:mm format, e.g., "09:00"
  weekStartsOn: 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Sunday, 1 = Monday, etc.
  showWeekends: boolean;
  timeZone: string;
  reminderBefore: number; // minutes before post to show reminder
}

export interface CalendarState {
  currentDate: Date;
  selectedDate: Date | null;
  selectedPostId: string | null;
}

const PREFS_KEY = 'linkedin_calendar_preferences';
const STATE_KEY = 'linkedin_calendar_state';

const defaultPreferences: CalendarPreferences = {
  defaultView: 'month',
  defaultPostTime: '09:00',
  weekStartsOn: 1, // Monday
  showWeekends: true,
  timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  reminderBefore: 30,
};

// Get calendar preferences
export function getCalendarPreferences(): CalendarPreferences {
  try {
    const stored = localStorage.getItem(PREFS_KEY);
    if (!stored) return { ...defaultPreferences };

    return { ...defaultPreferences, ...JSON.parse(stored) };
  } catch {
    return { ...defaultPreferences };
  }
}

// Save calendar preferences
export function saveCalendarPreferences(prefs: Partial<CalendarPreferences>): CalendarPreferences {
  const current = getCalendarPreferences();
  const updated = { ...current, ...prefs };

  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(updated));
    console.log('📅 Calendar preferences saved');
    return updated;
  } catch (error) {
    console.error('Failed to save calendar preferences:', error);
    throw error;
  }
}

// Get calendar state
export function getCalendarState(): CalendarState {
  try {
    const stored = localStorage.getItem(STATE_KEY);
    if (!stored) {
      return {
        currentDate: new Date(),
        selectedDate: null,
        selectedPostId: null,
      };
    }

    const parsed = JSON.parse(stored);
    return {
      currentDate: parsed.currentDate ? new Date(parsed.currentDate) : new Date(),
      selectedDate: parsed.selectedDate ? new Date(parsed.selectedDate) : null,
      selectedPostId: parsed.selectedPostId || null,
    };
  } catch {
    return {
      currentDate: new Date(),
      selectedDate: null,
      selectedPostId: null,
    };
  }
}

// Save calendar state
export function saveCalendarState(state: Partial<CalendarState>): void {
  const current = getCalendarState();
  const updated = { ...current, ...state };

  try {
    localStorage.setItem(STATE_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('Failed to save calendar state:', error);
  }
}

// Get suggested posting times (based on LinkedIn best practices)
export function getSuggestedPostingTimes(): { time: string; label: string; description: string }[] {
  return [
    { time: '07:30', label: '7:30 AM', description: 'Early morning commute' },
    { time: '09:00', label: '9:00 AM', description: 'Work start (most popular)' },
    { time: '12:00', label: '12:00 PM', description: 'Lunch break' },
    { time: '17:00', label: '5:00 PM', description: 'End of work day' },
    { time: '19:00', label: '7:00 PM', description: 'Evening browsing' },
  ];
}

// Get best days to post (based on LinkedIn data)
export function getBestDaysToPost(): { day: number; name: string; score: number }[] {
  return [
    { day: 2, name: 'Tuesday', score: 95 },
    { day: 3, name: 'Wednesday', score: 90 },
    { day: 4, name: 'Thursday', score: 85 },
    { day: 1, name: 'Monday', score: 75 },
    { day: 5, name: 'Friday', score: 60 },
    { day: 6, name: 'Saturday', score: 30 },
    { day: 0, name: 'Sunday', score: 25 },
  ];
}

// Parse time string to hours and minutes
export function parseTimeString(time: string): { hours: number; minutes: number } {
  const [hours, minutes] = time.split(':').map(Number);
  return { hours: hours || 0, minutes: minutes || 0 };
}

// Create a Date with specific time from a date and time string
export function createDateWithTime(date: Date, time: string): Date {
  const { hours, minutes } = parseTimeString(time);
  const result = new Date(date);
  result.setHours(hours, minutes, 0, 0);
  return result;
}

// Format date for display
export function formatScheduledDate(date: Date): string {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const isToday = date.toDateString() === now.toDateString();
  const isTomorrow = date.toDateString() === tomorrow.toDateString();

  const timeStr = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  if (isToday) {
    return `Today at ${timeStr}`;
  }
  if (isTomorrow) {
    return `Tomorrow at ${timeStr}`;
  }

  const dateStr = date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  return `${dateStr} at ${timeStr}`;
}

// Get relative time string
export function getRelativeTime(date: Date): string {
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (diff < 0) {
    return 'Past due';
  }
  if (minutes < 60) {
    return `In ${minutes} minute${minutes !== 1 ? 's' : ''}`;
  }
  if (hours < 24) {
    return `In ${hours} hour${hours !== 1 ? 's' : ''}`;
  }
  return `In ${days} day${days !== 1 ? 's' : ''}`;
}

// Check if a time slot is available (no post within 2 hours)
export function isTimeSlotAvailable(date: Date, existingPosts: { scheduledAt: Date }[]): boolean {
  const twoHours = 2 * 60 * 60 * 1000;

  return !existingPosts.some(post => {
    const diff = Math.abs(new Date(post.scheduledAt).getTime() - date.getTime());
    return diff < twoHours;
  });
}
