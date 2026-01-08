// Post History Service - Stores past generated posts in localStorage

export interface SavedPost {
  id: string;
  topic: string;
  post: string;
  imagePrompt?: string;
  generatedImage?: string;
  contentType: 'text' | 'image' | 'carousel' | 'video' | 'article';
  carouselSlides?: Array<{ title: string; content: string }>;
  createdAt: number;
  postedToLinkedIn: boolean;
  linkedInPostUrl?: string;
}

const HISTORY_STORAGE_KEY = 'linkedin_post_history';
const MAX_HISTORY_ITEMS = 50;

// Get all saved posts
export const getPostHistory = (): SavedPost[] => {
  try {
    const stored = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch {
    return [];
  }
};

// Save a new post to history
export const savePostToHistory = (post: Omit<SavedPost, 'id' | 'createdAt'>): SavedPost => {
  const history = getPostHistory();

  const newPost: SavedPost = {
    ...post,
    id: `post_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    createdAt: Date.now(),
  };

  // Add to beginning of array
  history.unshift(newPost);

  // Keep only the most recent items
  const trimmedHistory = history.slice(0, MAX_HISTORY_ITEMS);

  localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(trimmedHistory));

  return newPost;
};

// Update an existing post (e.g., mark as posted)
export const updatePostInHistory = (id: string, updates: Partial<SavedPost>): void => {
  const history = getPostHistory();
  const index = history.findIndex(p => p.id === id);

  if (index !== -1) {
    history[index] = { ...history[index], ...updates };
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
  }
};

// Delete a post from history
export const deletePostFromHistory = (id: string): void => {
  const history = getPostHistory();
  const filtered = history.filter(p => p.id !== id);
  localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(filtered));
};

// Clear all history
export const clearPostHistory = (): void => {
  localStorage.removeItem(HISTORY_STORAGE_KEY);
};

// Get a single post by ID
export const getPostById = (id: string): SavedPost | null => {
  const history = getPostHistory();
  return history.find(p => p.id === id) || null;
};

// Format date for display
export const formatPostDate = (timestamp: number): string => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  });
};
