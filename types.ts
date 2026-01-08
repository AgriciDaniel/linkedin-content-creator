
export interface GroundingSource {
  uri: string;
  title: string;
}

export interface GenerationResult {
  post: string;
  imagePrompt: string;
  sources: GroundingSource[];
}

// LinkedIn Types
export interface LinkedInToken {
  accessToken: string;
  expiresAt: number; // Unix timestamp
  authMethod?: 'oauth' | 'manual'; // Authentication method used
}

export interface LinkedInUser {
  id: string;
  name: string;
  email?: string;
  profilePicture?: string;
}

export interface OAuthConfig {
  clientId: string;
}

export interface OAuthCallbackResult {
  success: boolean;
  token?: string;
  error?: string;
}

export type ContentType = 'text' | 'image' | 'carousel' | 'video' | 'article';

export type SlideType = 'text' | 'chart' | 'data';

// 10 chart types for data visualization
export type ChartType =
  | 'bar'           // Vertical bars for comparisons
  | 'horizontal-bar' // Sideways bars for rankings with long labels
  | 'stacked-bar'   // Layered bars for part-to-whole
  | 'line'          // Connected points for trends over time
  | 'area'          // Filled line for trends with volume
  | 'pie'           // Circle slices for distributions
  | 'donut'         // Pie with center hole for key metric
  | 'comparison'    // Side-by-side for before/after
  | 'funnel'        // Narrowing stages for conversions
  | 'gauge';        // Semi-circle for single KPI/progress

// Legacy CarouselSlide type (kept for backwards compatibility)
export interface CarouselSlide {
  title: string;
  content: string;
  slideType: SlideType; // Type of slide: text, chart, or data visualization
  chartData?: {
    type: ChartType; // 10 chart types available
    values?: number[]; // Numeric values for chart
    labels?: string[]; // Labels for data points
    description?: string; // What the chart shows
  };
}

// Import the new layout-based slide types
import { SlideData } from './types/slideLayouts';

// Re-export for convenience
export type { SlideData };

export interface CarouselGenerationResult {
  post: string;
  slides: SlideData[];  // Now uses layout-based slides
  sources: GroundingSource[];
}

export interface PostResult {
  success: boolean;
  postId?: string;
  postUrl?: string;
  error?: string;
}
