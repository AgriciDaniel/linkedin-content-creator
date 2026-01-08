/**
 * Carousel Template Types
 * Canva-inspired template system for LinkedIn carousels
 */

export type TemplateCategory =
  | 'photo-overlay'    // Background image with dark overlay
  | 'solid-bold'       // Single bold color with clean typography
  | 'minimalist'       // Clean white/light with accent colors
  | 'illustrated'      // Solid color with illustration zone
  | 'gradient'         // Gradient backgrounds
  | 'professional';    // Corporate/business style

export type FontWeight = 'normal' | 'bold' | 'black';
export type TextAlign = 'left' | 'center' | 'right';
export type Position = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface RGBA extends RGB {
  a: number;
}

export interface GradientConfig {
  from: RGB;
  to: RGB;
  angle: number; // degrees
}

export interface BackgroundConfig {
  type: 'solid' | 'gradient' | 'image';
  color?: RGB;
  gradient?: GradientConfig;
  imageUrl?: string;
  overlay?: RGBA; // For photo backgrounds
}

export interface FontConfig {
  family: string;      // Google Font name: 'Montserrat', 'Playfair Display', etc.
  fallback: string;    // Fallback: 'sans-serif', 'serif'
  googleFont: boolean; // Whether to load from Google Fonts
}

export interface TypographyConfig {
  titleFont: FontConfig;
  titleSize: number;
  titleWeight: FontWeight;
  titleColor: RGB;
  titleLineHeight: number;

  subtitleFont: FontConfig;
  subtitleSize: number;
  subtitleWeight: FontWeight;
  subtitleColor: RGB;

  bodyFont: FontConfig;
  bodySize: number;
  bodyWeight: FontWeight;
  bodyColor: RGB;
  bodyLineHeight: number;

  accentColor: RGB;
  mutedColor: RGB;
}

export interface HighlightStyle {
  type: 'box' | 'circle' | 'underline' | 'strikethrough' | 'none';
  color: RGB;
  padding?: number;
}

export interface DecorationDots {
  position: Position;
  color: RGB;
  rows: number;
  cols: number;
  size: number;
  spacing: number;
}

export interface DecorationArrow {
  style: 'simple' | 'circle' | 'pill';
  position: Position;
  color: RGB;
  backgroundColor?: RGB;
}

export interface DecorationShape {
  type: 'circle' | 'rectangle' | 'line' | 'arc';
  x: number;
  y: number;
  width?: number;
  height?: number;
  radius?: number;
  color: RGB;
  filled: boolean;
  strokeWidth?: number;
}

export interface DecorationsConfig {
  dots?: DecorationDots;
  arrow?: DecorationArrow;
  shapes?: DecorationShape[];
  showBorder?: boolean;
  borderColor?: RGB;
  borderWidth?: number;
}

export interface LayoutZone {
  x: number;      // percentage from left (0-100)
  y: number;      // percentage from top (0-100)
  width: number;  // percentage of canvas width
  height?: number; // percentage of canvas height (optional)
  align: TextAlign;
  verticalAlign?: 'top' | 'center' | 'bottom';
}

export interface LayoutConfig {
  padding: number;
  titleZone: LayoutZone;
  subtitleZone?: LayoutZone;
  contentZone: LayoutZone;
  imageZone?: LayoutZone;
  footerZone?: LayoutZone;
}

export interface FooterConfig {
  show: boolean;
  showPageNumber: boolean;
  pageNumberStyle: 'fraction' | 'dots' | 'simple'; // "1/8" or "• • •" or "1"
  showSwipeIndicator: boolean;
  showBranding: boolean;
  brandingText?: string;
  brandingPosition: Position;
}

export interface SlideVariant {
  // Different layouts for different slide types
  title: Partial<LayoutConfig>;      // First slide (hook)
  content: Partial<LayoutConfig>;    // Regular content slides
  chart: Partial<LayoutConfig>;      // Chart slides
  image: Partial<LayoutConfig>;      // Image slides
  cta: Partial<LayoutConfig>;        // Call-to-action slides
}

export interface CarouselTemplate {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  thumbnail?: string; // Base64 or URL for preview

  // Visual configuration
  background: BackgroundConfig;
  typography: TypographyConfig;
  highlight: HighlightStyle;
  decorations: DecorationsConfig;

  // Layout
  layout: LayoutConfig;
  variants?: SlideVariant;
  footer: FooterConfig;

  // Chart styling
  chartColors: RGB[];
  chartStyle: {
    barRadius?: number;
    lineWidth?: number;
    showGrid: boolean;
    gridColor: RGB;
  };
}

// Helper to convert RGB to CSS color
export const rgbToCSS = (color: RGB, alpha?: number): string => {
  if (alpha !== undefined) {
    return `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`;
  }
  return `rgb(${color.r}, ${color.g}, ${color.b})`;
};

// Helper to convert RGB to jsPDF format [r, g, b]
export const rgbToArray = (color: RGB): [number, number, number] => {
  return [color.r, color.g, color.b];
};
