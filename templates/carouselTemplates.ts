/**
 * Canva-Inspired Carousel Templates
 * Beautiful, professional templates for LinkedIn carousels
 */

import { CarouselTemplate, RGB } from '../types/carouselTemplate';

// Color palette helpers
const colors = {
  // Neutrals
  white: { r: 255, g: 255, b: 255 },
  black: { r: 0, g: 0, b: 0 },
  darkGray: { r: 30, g: 30, b: 30 },
  gray: { r: 128, g: 128, b: 128 },
  lightGray: { r: 200, g: 200, b: 200 },
  offWhite: { r: 250, g: 250, b: 250 },

  // Brand colors
  lime: { r: 198, g: 220, b: 47 },
  limeLight: { r: 220, g: 235, b: 100 },
  navy: { r: 23, g: 42, b: 69 },
  navyLight: { r: 35, g: 60, b: 95 },
  teal: { r: 29, g: 185, b: 184 },
  tealDark: { r: 20, g: 150, b: 150 },
  coral: { r: 255, g: 107, b: 107 },
  orange: { r: 255, g: 107, b: 53 },
  yellow: { r: 255, g: 222, b: 0 },
  purple: { r: 102, g: 51, b: 153 },
  pink: { r: 255, g: 182, b: 193 },
  mint: { r: 152, g: 224, b: 210 },

  // Canva-inspired additions
  brightYellow: { r: 255, g: 215, b: 0 },
  nearBlack: { r: 26, g: 26, b: 26 },
  warmCream: { r: 245, g: 240, b: 232 },
  warmBeige: { r: 235, g: 225, b: 210 },
  warmOrange: { r: 224, g: 123, b: 57 },
  vibrantOrange: { r: 255, g: 107, b: 53 },
  charcoal: { r: 45, g: 45, b: 45 },
  softGray: { r: 92, g: 92, b: 92 },
};

// Font configurations
const fonts = {
  montserrat: { family: 'Montserrat', fallback: 'sans-serif', googleFont: true },
  playfair: { family: 'Playfair Display', fallback: 'serif', googleFont: true },
  poppins: { family: 'Poppins', fallback: 'sans-serif', googleFont: true },
  inter: { family: 'Inter', fallback: 'sans-serif', googleFont: true },
  roboto: { family: 'Roboto', fallback: 'sans-serif', googleFont: true },
  lato: { family: 'Lato', fallback: 'sans-serif', googleFont: true },
  oswald: { family: 'Oswald', fallback: 'sans-serif', googleFont: true },
  raleway: { family: 'Raleway', fallback: 'sans-serif', googleFont: true },
  openSans: { family: 'Open Sans', fallback: 'sans-serif', googleFont: true },
  helvetica: { family: 'Helvetica', fallback: 'Arial, sans-serif', googleFont: false },
};

/**
 * Template 1: Dark Overlay
 * Elegant dark theme with photo background capability
 * Inspired by: "Secret to grow your business quickly"
 */
export const darkOverlayTemplate: CarouselTemplate = {
  id: 'dark-overlay',
  name: 'Dark Overlay',
  description: 'Elegant dark theme perfect for professional content',
  category: 'photo-overlay',

  background: {
    type: 'solid',
    color: { r: 18, g: 18, b: 22 },
    overlay: { r: 0, g: 0, b: 0, a: 0.7 },
  },

  typography: {
    titleFont: fonts.montserrat,
    titleSize: 72,
    titleWeight: 'bold',
    titleColor: colors.white,
    titleLineHeight: 1.1,

    subtitleFont: fonts.montserrat,
    subtitleSize: 28,
    subtitleWeight: 'normal',
    subtitleColor: colors.lightGray,

    bodyFont: fonts.inter,
    bodySize: 24,
    bodyWeight: 'normal',
    bodyColor: colors.lightGray,
    bodyLineHeight: 1.5,

    accentColor: colors.teal,
    mutedColor: colors.gray,
  },

  highlight: {
    type: 'underline',
    color: colors.teal,
    padding: 4,
  },

  decorations: {
    showBorder: true,
    borderColor: { r: 60, g: 60, b: 60 },
    borderWidth: 2,
    arrow: {
      style: 'simple',
      position: 'bottom-right',
      color: colors.white,
    },
  },

  layout: {
    padding: 80,
    titleZone: { x: 10, y: 35, width: 80, align: 'left' },
    subtitleZone: { x: 10, y: 55, width: 80, align: 'left' },
    contentZone: { x: 10, y: 45, width: 80, height: 40, align: 'left' },
  },

  footer: {
    show: true,
    showPageNumber: true,
    pageNumberStyle: 'fraction',
    showSwipeIndicator: true,
    showBranding: true,
    brandingText: '@yourbrand',
    brandingPosition: 'bottom-left',
  },

  chartColors: [
    colors.teal,
    { r: 100, g: 200, b: 200 },
    { r: 60, g: 160, b: 160 },
    { r: 150, g: 220, b: 220 },
  ],
  chartStyle: {
    barRadius: 4,
    lineWidth: 4,
    showGrid: false,
    gridColor: { r: 50, g: 50, b: 50 },
  },
};

/**
 * Template 2: Lime Bold
 * Fresh, energetic lime green with bold typography
 * Inspired by: "Build Personal Branding"
 */
export const limeBoldTemplate: CarouselTemplate = {
  id: 'lime-bold',
  name: 'Lime Bold',
  description: 'Fresh and energetic with bold typography',
  category: 'solid-bold',

  background: {
    type: 'solid',
    color: colors.lime,
  },

  typography: {
    titleFont: fonts.montserrat,
    titleSize: 80,
    titleWeight: 'black',
    titleColor: colors.black,
    titleLineHeight: 1.0,

    subtitleFont: fonts.montserrat,
    subtitleSize: 24,
    subtitleWeight: 'normal',
    subtitleColor: { r: 60, g: 60, b: 60 },

    bodyFont: fonts.inter,
    bodySize: 22,
    bodyWeight: 'normal',
    bodyColor: { r: 40, g: 40, b: 40 },
    bodyLineHeight: 1.6,

    accentColor: colors.black,
    mutedColor: { r: 80, g: 100, b: 40 },
  },

  highlight: {
    type: 'box',
    color: colors.white,
    padding: 8,
  },

  decorations: {
    showBorder: false,
    dots: {
      position: 'top-right',
      color: { r: 180, g: 200, b: 40 },
      rows: 3,
      cols: 3,
      size: 8,
      spacing: 16,
    },
    arrow: {
      style: 'pill',
      position: 'bottom-right',
      color: colors.black,
      backgroundColor: colors.white,
    },
  },

  layout: {
    padding: 80,
    titleZone: { x: 10, y: 30, width: 80, align: 'left' },
    subtitleZone: { x: 10, y: 20, width: 60, align: 'left' },
    contentZone: { x: 10, y: 50, width: 80, height: 35, align: 'left' },
  },

  footer: {
    show: true,
    showPageNumber: false,
    pageNumberStyle: 'simple',
    showSwipeIndicator: true,
    showBranding: true,
    brandingText: 'www.yourbrand.com',
    brandingPosition: 'bottom-left',
  },

  chartColors: [
    colors.black,
    { r: 60, g: 60, b: 60 },
    { r: 100, g: 100, b: 100 },
    colors.white,
  ],
  chartStyle: {
    barRadius: 0,
    lineWidth: 4,
    showGrid: false,
    gridColor: { r: 180, g: 200, b: 40 },
  },
};

/**
 * Template 3: Navy Professional
 * Corporate, trustworthy navy blue design
 * Inspired by: "Why you should post carousels"
 */
export const navyProfessionalTemplate: CarouselTemplate = {
  id: 'navy-professional',
  name: 'Navy Professional',
  description: 'Corporate and trustworthy for business content',
  category: 'professional',

  background: {
    type: 'solid',
    color: colors.navy,
  },

  typography: {
    titleFont: fonts.poppins,
    titleSize: 68,
    titleWeight: 'bold',
    titleColor: colors.white,
    titleLineHeight: 1.15,

    subtitleFont: fonts.poppins,
    subtitleSize: 26,
    subtitleWeight: 'normal',
    subtitleColor: { r: 180, g: 190, b: 200 },

    bodyFont: fonts.inter,
    bodySize: 24,
    bodyWeight: 'normal',
    bodyColor: { r: 200, g: 210, b: 220 },
    bodyLineHeight: 1.5,

    accentColor: colors.teal,
    mutedColor: { r: 100, g: 120, b: 150 },
  },

  highlight: {
    type: 'underline',
    color: colors.teal,
    padding: 4,
  },

  decorations: {
    showBorder: false,
    arrow: {
      style: 'simple',
      position: 'bottom-right',
      color: colors.white,
    },
  },

  layout: {
    padding: 100,
    titleZone: { x: 10, y: 35, width: 80, align: 'center' },
    subtitleZone: { x: 10, y: 55, width: 80, align: 'center' },
    contentZone: { x: 10, y: 45, width: 80, height: 40, align: 'center' },
  },

  footer: {
    show: true,
    showPageNumber: true,
    pageNumberStyle: 'fraction',
    showSwipeIndicator: false,
    showBranding: false,
    brandingPosition: 'bottom-left',
  },

  chartColors: [
    colors.teal,
    colors.coral,
    { r: 100, g: 180, b: 255 },
    colors.yellow,
  ],
  chartStyle: {
    barRadius: 8,
    lineWidth: 4,
    showGrid: true,
    gridColor: { r: 40, g: 60, b: 90 },
  },
};

/**
 * Template 4: Minimalist White
 * Clean, modern white design with accent highlights
 * Inspired by: "You Should Not Post on Social Media Every Day"
 */
export const minimalistWhiteTemplate: CarouselTemplate = {
  id: 'minimalist-white',
  name: 'Minimalist White',
  description: 'Clean and modern with accent highlights',
  category: 'minimalist',

  background: {
    type: 'solid',
    color: colors.offWhite,
  },

  typography: {
    titleFont: fonts.playfair,
    titleSize: 64,
    titleWeight: 'bold',
    titleColor: colors.black,
    titleLineHeight: 1.2,

    subtitleFont: fonts.inter,
    subtitleSize: 20,
    subtitleWeight: 'normal',
    subtitleColor: colors.gray,

    bodyFont: fonts.inter,
    bodySize: 22,
    bodyWeight: 'normal',
    bodyColor: { r: 60, g: 60, b: 60 },
    bodyLineHeight: 1.6,

    accentColor: colors.teal,
    mutedColor: colors.gray,
  },

  highlight: {
    type: 'circle',
    color: colors.lime,
    padding: 12,
  },

  decorations: {
    showBorder: false,
    arrow: {
      style: 'circle',
      position: 'bottom-right',
      color: colors.white,
      backgroundColor: colors.teal,
    },
  },

  layout: {
    padding: 80,
    titleZone: { x: 10, y: 30, width: 80, align: 'center' },
    subtitleZone: { x: 10, y: 15, width: 60, align: 'center' },
    contentZone: { x: 10, y: 50, width: 80, height: 35, align: 'center' },
  },

  footer: {
    show: true,
    showPageNumber: false,
    pageNumberStyle: 'dots',
    showSwipeIndicator: true,
    showBranding: false,
    brandingPosition: 'bottom-left',
  },

  chartColors: [
    colors.black,
    colors.teal,
    colors.coral,
    colors.gray,
  ],
  chartStyle: {
    barRadius: 4,
    lineWidth: 3,
    showGrid: true,
    gridColor: { r: 230, g: 230, b: 230 },
  },
};

/**
 * Template 5: Teal Modern
 * Fresh teal with decorative elements
 * Inspired by: "6 Steps For Your Fast Growing Business"
 */
export const tealModernTemplate: CarouselTemplate = {
  id: 'teal-modern',
  name: 'Teal Modern',
  description: 'Fresh and modern with decorative accents',
  category: 'illustrated',

  background: {
    type: 'gradient',
    gradient: {
      from: colors.teal,
      to: colors.tealDark,
      angle: 135,
    },
  },

  typography: {
    titleFont: fonts.poppins,
    titleSize: 70,
    titleWeight: 'bold',
    titleColor: colors.white,
    titleLineHeight: 1.1,

    subtitleFont: fonts.poppins,
    subtitleSize: 24,
    subtitleWeight: 'normal',
    subtitleColor: { r: 220, g: 250, b: 250 },

    bodyFont: fonts.inter,
    bodySize: 22,
    bodyWeight: 'normal',
    bodyColor: { r: 230, g: 255, b: 255 },
    bodyLineHeight: 1.5,

    accentColor: colors.yellow,
    mutedColor: { r: 150, g: 200, b: 200 },
  },

  highlight: {
    type: 'box',
    color: colors.yellow,
    padding: 6,
  },

  decorations: {
    showBorder: false,
    dots: {
      position: 'top-right',
      color: { r: 255, g: 255, b: 255 },
      rows: 4,
      cols: 4,
      size: 6,
      spacing: 14,
    },
    shapes: [
      {
        type: 'arc',
        x: 90,
        y: 10,
        radius: 80,
        color: { r: 255, g: 255, b: 255 },
        filled: false,
        strokeWidth: 3,
      },
    ],
    arrow: {
      style: 'pill',
      position: 'bottom-right',
      color: colors.teal,
      backgroundColor: colors.white,
    },
  },

  layout: {
    padding: 80,
    titleZone: { x: 10, y: 25, width: 70, align: 'left' },
    subtitleZone: { x: 10, y: 55, width: 70, align: 'left' },
    contentZone: { x: 10, y: 45, width: 70, height: 40, align: 'left' },
    imageZone: { x: 55, y: 30, width: 40, height: 50 },
  },

  footer: {
    show: true,
    showPageNumber: true,
    pageNumberStyle: 'simple',
    showSwipeIndicator: true,
    showBranding: false,
    brandingPosition: 'bottom-left',
  },

  chartColors: [
    colors.white,
    colors.yellow,
    { r: 200, g: 255, b: 255 },
    { r: 255, g: 200, b: 100 },
  ],
  chartStyle: {
    barRadius: 6,
    lineWidth: 4,
    showGrid: false,
    gridColor: { r: 50, g: 150, b: 150 },
  },
};

/**
 * Template 6: Coral Energy
 * Warm, energetic coral/orange theme
 */
export const coralEnergyTemplate: CarouselTemplate = {
  id: 'coral-energy',
  name: 'Coral Energy',
  description: 'Warm and energetic for motivational content',
  category: 'solid-bold',

  background: {
    type: 'gradient',
    gradient: {
      from: colors.coral,
      to: colors.orange,
      angle: 45,
    },
  },

  typography: {
    titleFont: fonts.montserrat,
    titleSize: 72,
    titleWeight: 'black',
    titleColor: colors.white,
    titleLineHeight: 1.1,

    subtitleFont: fonts.montserrat,
    subtitleSize: 26,
    subtitleWeight: 'normal',
    subtitleColor: { r: 255, g: 230, b: 220 },

    bodyFont: fonts.inter,
    bodySize: 24,
    bodyWeight: 'normal',
    bodyColor: { r: 255, g: 240, b: 235 },
    bodyLineHeight: 1.5,

    accentColor: colors.yellow,
    mutedColor: { r: 200, g: 150, b: 140 },
  },

  highlight: {
    type: 'box',
    color: colors.yellow,
    padding: 8,
  },

  decorations: {
    showBorder: false,
    shapes: [
      {
        type: 'circle',
        x: 85,
        y: 15,
        radius: 60,
        color: { r: 255, g: 255, b: 255 },
        filled: false,
        strokeWidth: 2,
      },
    ],
  },

  layout: {
    padding: 80,
    titleZone: { x: 10, y: 35, width: 80, align: 'center' },
    subtitleZone: { x: 10, y: 55, width: 70, align: 'center' },
    contentZone: { x: 10, y: 50, width: 80, height: 35, align: 'center' },
  },

  footer: {
    show: true,
    showPageNumber: true,
    pageNumberStyle: 'fraction',
    showSwipeIndicator: true,
    showBranding: false,
    brandingPosition: 'bottom-right',
  },

  chartColors: [
    colors.white,
    colors.yellow,
    { r: 255, g: 200, b: 180 },
    { r: 200, g: 80, b: 80 },
  ],
  chartStyle: {
    barRadius: 8,
    lineWidth: 4,
    showGrid: false,
    gridColor: { r: 200, g: 100, b: 80 },
  },
};

/**
 * Template 7: Bold Modern (Canva-inspired)
 * High-contrast black/yellow design from "Black Yellow Modern Branding Tips"
 */
export const boldModernTemplate: CarouselTemplate = {
  id: 'bold-modern',
  name: 'Bold Modern',
  description: 'High-contrast black and yellow for impactful content',
  category: 'solid-bold',

  background: {
    type: 'solid',
    color: colors.nearBlack,
  },

  typography: {
    titleFont: fonts.inter,
    titleSize: 72,
    titleWeight: 'black',
    titleColor: colors.white,
    titleLineHeight: 1.05,

    subtitleFont: fonts.inter,
    subtitleSize: 28,
    subtitleWeight: 'normal',
    subtitleColor: colors.brightYellow,

    bodyFont: fonts.inter,
    bodySize: 26,
    bodyWeight: 'normal',
    bodyColor: { r: 230, g: 230, b: 230 },
    bodyLineHeight: 1.5,

    accentColor: colors.brightYellow,
    mutedColor: { r: 160, g: 160, b: 160 },
  },

  highlight: {
    type: 'box',
    color: colors.brightYellow,
    padding: 8,
  },

  decorations: {
    showBorder: false,
    shapes: [
      {
        type: 'rectangle',
        x: 0,
        y: 0,
        width: 100,
        height: 8,
        color: colors.brightYellow,
        filled: true,
      },
    ],
    arrow: {
      style: 'pill',
      position: 'bottom-right',
      color: colors.nearBlack,
      backgroundColor: colors.brightYellow,
    },
  },

  layout: {
    padding: 80,
    titleZone: { x: 10, y: 35, width: 80, align: 'left' },
    subtitleZone: { x: 10, y: 55, width: 80, align: 'left' },
    contentZone: { x: 10, y: 45, width: 80, height: 40, align: 'left' },
  },

  footer: {
    show: true,
    showPageNumber: true,
    pageNumberStyle: 'fraction',
    showSwipeIndicator: true,
    showBranding: false,
    brandingPosition: 'bottom-left',
  },

  chartColors: [
    colors.brightYellow,
    { r: 255, g: 245, b: 157 },
    { r: 200, g: 170, b: 50 },
    colors.white,
  ],
  chartStyle: {
    barRadius: 4,
    lineWidth: 4,
    showGrid: false,
    gridColor: { r: 60, g: 60, b: 60 },
  },
};

/**
 * Template 8: Warm Minimal (Canva-inspired)
 * Soft beige/cream design from "Beige Minimal" templates
 */
export const warmMinimalTemplate: CarouselTemplate = {
  id: 'warm-minimal',
  name: 'Warm Minimal',
  description: 'Soft and elegant beige tones for professional content',
  category: 'minimalist',

  background: {
    type: 'solid',
    color: colors.warmCream,
  },

  typography: {
    titleFont: fonts.playfair,
    titleSize: 64,
    titleWeight: 'bold',
    titleColor: colors.charcoal,
    titleLineHeight: 1.15,

    subtitleFont: fonts.inter,
    subtitleSize: 24,
    subtitleWeight: 'normal',
    subtitleColor: colors.softGray,

    bodyFont: fonts.inter,
    bodySize: 24,
    bodyWeight: 'normal',
    bodyColor: { r: 70, g: 70, b: 70 },
    bodyLineHeight: 1.6,

    accentColor: colors.warmOrange,
    mutedColor: { r: 140, g: 130, b: 115 },
  },

  highlight: {
    type: 'underline',
    color: colors.warmOrange,
    padding: 4,
  },

  decorations: {
    showBorder: true,
    borderColor: { r: 200, g: 190, b: 175 },
    borderWidth: 2,
    arrow: {
      style: 'simple',
      position: 'bottom-right',
      color: colors.charcoal,
    },
  },

  layout: {
    padding: 90,
    titleZone: { x: 10, y: 30, width: 80, align: 'center' },
    subtitleZone: { x: 10, y: 55, width: 80, align: 'center' },
    contentZone: { x: 10, y: 50, width: 80, height: 35, align: 'center' },
  },

  footer: {
    show: true,
    showPageNumber: true,
    pageNumberStyle: 'simple',
    showSwipeIndicator: false,
    showBranding: false,
    brandingPosition: 'bottom-left',
  },

  chartColors: [
    colors.warmOrange,
    colors.charcoal,
    { r: 180, g: 160, b: 140 },
    { r: 140, g: 120, b: 100 },
  ],
  chartStyle: {
    barRadius: 6,
    lineWidth: 3,
    showGrid: true,
    gridColor: { r: 220, g: 215, b: 205 },
  },
};

/**
 * Template 9: Clean Professional (Canva-inspired)
 * White background with vibrant orange accents from "Cream Orange" templates
 */
export const cleanProfessionalTemplate: CarouselTemplate = {
  id: 'clean-professional',
  name: 'Clean Professional',
  description: 'Clean white design with vibrant orange accents',
  category: 'professional',

  background: {
    type: 'solid',
    color: colors.white,
  },

  typography: {
    titleFont: fonts.poppins,
    titleSize: 68,
    titleWeight: 'bold',
    titleColor: { r: 30, g: 30, b: 30 },
    titleLineHeight: 1.1,

    subtitleFont: fonts.poppins,
    subtitleSize: 26,
    subtitleWeight: 'normal',
    subtitleColor: { r: 100, g: 100, b: 100 },

    bodyFont: fonts.inter,
    bodySize: 24,
    bodyWeight: 'normal',
    bodyColor: { r: 70, g: 70, b: 70 },
    bodyLineHeight: 1.55,

    accentColor: colors.vibrantOrange,
    mutedColor: { r: 150, g: 150, b: 150 },
  },

  highlight: {
    type: 'box',
    color: colors.vibrantOrange,
    padding: 6,
  },

  decorations: {
    showBorder: false,
    shapes: [
      {
        type: 'rectangle',
        x: 0,
        y: 92,
        width: 100,
        height: 8,
        color: colors.vibrantOrange,
        filled: true,
      },
    ],
    arrow: {
      style: 'circle',
      position: 'bottom-right',
      color: colors.white,
      backgroundColor: colors.vibrantOrange,
    },
  },

  layout: {
    padding: 80,
    titleZone: { x: 10, y: 35, width: 80, align: 'left' },
    subtitleZone: { x: 10, y: 55, width: 70, align: 'left' },
    contentZone: { x: 10, y: 48, width: 80, height: 38, align: 'left' },
  },

  footer: {
    show: true,
    showPageNumber: true,
    pageNumberStyle: 'fraction',
    showSwipeIndicator: true,
    showBranding: false,
    brandingPosition: 'bottom-left',
  },

  chartColors: [
    colors.vibrantOrange,
    { r: 255, g: 180, b: 130 },
    { r: 60, g: 60, b: 60 },
    { r: 180, g: 180, b: 180 },
  ],
  chartStyle: {
    barRadius: 8,
    lineWidth: 4,
    showGrid: true,
    gridColor: { r: 240, g: 240, b: 240 },
  },
};

// Export all templates
export const carouselTemplates: CarouselTemplate[] = [
  boldModernTemplate,       // NEW: Best for high-impact content
  warmMinimalTemplate,      // NEW: Best for elegant/professional
  cleanProfessionalTemplate, // NEW: Best for corporate content
  darkOverlayTemplate,
  limeBoldTemplate,
  navyProfessionalTemplate,
  minimalistWhiteTemplate,
  tealModernTemplate,
  coralEnergyTemplate,
];

// Helper to get template by ID
export const getTemplateById = (id: string): CarouselTemplate | undefined => {
  return carouselTemplates.find(t => t.id === id);
};

// Default template - Bold Modern for maximum impact
export const defaultTemplate = boldModernTemplate;
