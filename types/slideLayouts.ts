/**
 * Slide Layout Types for Template-First Carousel Architecture
 *
 * Each layout has a strict schema that the AI must follow.
 * This ensures consistent, predictable rendering without overlaps or missing fields.
 */

// Available layout types
export type SlideLayoutType =
  | 'title-hook'      // Opening slide with big headline
  | 'bullet-list'     // Key points with bullets
  | 'numbered-steps'  // Process/steps with numbers
  | 'stat-card'       // Big metric highlight
  | 'bar-chart'       // Vertical bar comparison
  | 'pie-chart'       // Distribution chart
  | 'line-chart'      // Trend over time
  | 'comparison'      // Before/After comparison
  | 'quote'           // Testimonial or quote
  | 'cta';            // Call to action closing

// ============================================
// LAYOUT DATA INTERFACES
// ============================================

/**
 * Title Hook - Opening slide
 * Used for: First slide, grabbing attention
 */
export interface TitleHookData {
  layout: 'title-hook';
  headline: string;        // Max 10 words, attention-grabbing
  subtext?: string;        // Optional tagline (max 15 words)
}

/**
 * Bullet List - Key points
 * Used for: Tips, features, benefits, lists
 */
export interface BulletListData {
  layout: 'bullet-list';
  title: string;           // Section title (max 6 words)
  bullets: string[];       // 2-5 items, each max 50 chars
}

/**
 * Numbered Steps - Process/Steps
 * Used for: How-to, processes, frameworks
 */
export interface NumberedStepsData {
  layout: 'numbered-steps';
  title: string;           // Section title (max 6 words)
  steps: string[];         // 3-5 items, each max 40 chars
}

/**
 * Stat Card - Big metric highlight
 * Used for: Key statistics, achievements, impact
 */
export interface StatCardData {
  layout: 'stat-card';
  title: string;           // Context for the stat (max 6 words)
  stat: string;            // The big number (e.g., "87%", "$2.5M", "10x")
  description: string;     // What it means (max 20 words)
}

/**
 * Bar Chart - Vertical bar comparison
 * Used for: Comparing values, rankings
 */
export interface BarChartData {
  layout: 'bar-chart';
  title: string;           // Chart title (max 8 words)
  labels: string[];        // 3-6 category labels
  values: number[];        // Corresponding numeric values
  description?: string;    // Optional insight (max 15 words)
}

/**
 * Pie Chart - Distribution
 * Used for: Market share, breakdowns, percentages
 */
export interface PieChartData {
  layout: 'pie-chart';
  title: string;           // Chart title (max 8 words)
  labels: string[];        // 3-5 segment labels
  values: number[];        // Corresponding values (will be converted to %)
  description?: string;    // Optional insight (max 15 words)
}

/**
 * Line Chart - Trends over time
 * Used for: Growth, trends, progress
 */
export interface LineChartData {
  layout: 'line-chart';
  title: string;           // Chart title (max 8 words)
  labels: string[];        // 4-8 time period labels
  values: number[];        // Corresponding values
  description?: string;    // Optional insight (max 15 words)
}

/**
 * Comparison - Before/After
 * Used for: Transformations, improvements, contrasts
 */
export interface ComparisonData {
  layout: 'comparison';
  title: string;           // Comparison title (max 6 words)
  before: {
    label: string;         // e.g., "Before", "Old Way" (max 3 words)
    value: string;         // The before state (max 20 chars)
  };
  after: {
    label: string;         // e.g., "After", "New Way" (max 3 words)
    value: string;         // The after state (max 20 chars)
  };
}

/**
 * Quote - Testimonial or quote
 * Used for: Social proof, expert quotes, testimonials
 */
export interface QuoteData {
  layout: 'quote';
  quote: string;           // The quote text (max 100 chars)
  attribution: string;     // Who said it (max 30 chars)
}

/**
 * CTA - Call to action
 * Used for: Last slide, driving engagement
 */
export interface CTAData {
  layout: 'cta';
  headline: string;        // Main CTA (max 8 words)
  subtext: string;         // Supporting text (max 20 words)
}

// ============================================
// UNION TYPE FOR ALL SLIDE DATA
// ============================================

export type SlideData =
  | TitleHookData
  | BulletListData
  | NumberedStepsData
  | StatCardData
  | BarChartData
  | PieChartData
  | LineChartData
  | ComparisonData
  | QuoteData
  | CTAData;

// ============================================
// VALIDATION HELPERS
// ============================================

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

/**
 * Validates a single slide's data against its layout schema
 */
export function validateSlideData(slide: SlideData): ValidationResult {
  const errors: ValidationError[] = [];

  switch (slide.layout) {
    case 'title-hook':
      if (!slide.headline || slide.headline.trim().length === 0) {
        errors.push({ field: 'headline', message: 'Headline is required' });
      } else if (slide.headline.split(' ').length > 12) {
        errors.push({ field: 'headline', message: 'Headline should be max 12 words' });
      }
      break;

    case 'bullet-list':
      if (!slide.title || slide.title.trim().length === 0) {
        errors.push({ field: 'title', message: 'Title is required' });
      }
      if (!slide.bullets || slide.bullets.length < 2) {
        errors.push({ field: 'bullets', message: 'At least 2 bullets required' });
      } else if (slide.bullets.length > 5) {
        errors.push({ field: 'bullets', message: 'Maximum 5 bullets allowed' });
      }
      break;

    case 'numbered-steps':
      if (!slide.title || slide.title.trim().length === 0) {
        errors.push({ field: 'title', message: 'Title is required' });
      }
      if (!slide.steps || slide.steps.length < 3) {
        errors.push({ field: 'steps', message: 'At least 3 steps required' });
      } else if (slide.steps.length > 5) {
        errors.push({ field: 'steps', message: 'Maximum 5 steps allowed' });
      }
      break;

    case 'stat-card':
      if (!slide.title || slide.title.trim().length === 0) {
        errors.push({ field: 'title', message: 'Title is required' });
      }
      if (!slide.stat || slide.stat.trim().length === 0) {
        errors.push({ field: 'stat', message: 'Stat value is required' });
      }
      if (!slide.description || slide.description.trim().length === 0) {
        errors.push({ field: 'description', message: 'Description is required' });
      }
      break;

    case 'bar-chart':
    case 'pie-chart':
    case 'line-chart':
      if (!slide.title || slide.title.trim().length === 0) {
        errors.push({ field: 'title', message: 'Title is required' });
      }
      if (!slide.labels || slide.labels.length < 3) {
        errors.push({ field: 'labels', message: 'At least 3 labels required' });
      }
      if (!slide.values || slide.values.length < 3) {
        errors.push({ field: 'values', message: 'At least 3 values required' });
      }
      if (slide.labels && slide.values && slide.labels.length !== slide.values.length) {
        errors.push({ field: 'values', message: 'Labels and values must have same length' });
      }
      break;

    case 'comparison':
      if (!slide.title || slide.title.trim().length === 0) {
        errors.push({ field: 'title', message: 'Title is required' });
      }
      if (!slide.before || !slide.before.label || !slide.before.value) {
        errors.push({ field: 'before', message: 'Before label and value required' });
      }
      if (!slide.after || !slide.after.label || !slide.after.value) {
        errors.push({ field: 'after', message: 'After label and value required' });
      }
      break;

    case 'quote':
      if (!slide.quote || slide.quote.trim().length === 0) {
        errors.push({ field: 'quote', message: 'Quote text is required' });
      } else if (slide.quote.length > 150) {
        errors.push({ field: 'quote', message: 'Quote should be max 150 characters' });
      }
      if (!slide.attribution || slide.attribution.trim().length === 0) {
        errors.push({ field: 'attribution', message: 'Attribution is required' });
      }
      break;

    case 'cta':
      if (!slide.headline || slide.headline.trim().length === 0) {
        errors.push({ field: 'headline', message: 'Headline is required' });
      }
      if (!slide.subtext || slide.subtext.trim().length === 0) {
        errors.push({ field: 'subtext', message: 'Subtext is required' });
      }
      break;

    default:
      errors.push({ field: 'layout', message: `Unknown layout type: ${(slide as any).layout}` });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validates an entire carousel (array of slides)
 */
export function validateCarouselSlides(slides: SlideData[]): ValidationResult {
  const errors: ValidationError[] = [];

  if (!slides || slides.length < 4) {
    errors.push({ field: 'slides', message: 'Carousel must have at least 4 slides' });
    return { valid: false, errors };
  }

  if (slides.length > 10) {
    errors.push({ field: 'slides', message: 'Carousel can have maximum 10 slides' });
  }

  // First slide should be title-hook
  if (slides[0]?.layout !== 'title-hook') {
    errors.push({ field: 'slides[0]', message: 'First slide must be title-hook layout' });
  }

  // Last slide should be cta
  if (slides[slides.length - 1]?.layout !== 'cta') {
    errors.push({ field: `slides[${slides.length - 1}]`, message: 'Last slide must be cta layout' });
  }

  // Validate each slide
  slides.forEach((slide, index) => {
    const result = validateSlideData(slide);
    result.errors.forEach((err) => {
      errors.push({
        field: `slides[${index}].${err.field}`,
        message: err.message,
      });
    });
  });

  // Check for visual variety (at least 2 chart/stat slides in middle)
  const visualSlides = slides.slice(1, -1).filter((s) =>
    ['stat-card', 'bar-chart', 'pie-chart', 'line-chart', 'comparison'].includes(s.layout)
  );
  if (visualSlides.length < 2) {
    errors.push({
      field: 'slides',
      message: 'Carousel should have at least 2 visual slides (charts, stats, or comparisons)',
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Attempts to fix common issues with slide data
 * Returns corrected slide data or null if unfixable
 */
export function sanitizeSlideData(slide: Partial<SlideData>): SlideData | null {
  if (!slide.layout) return null;

  switch (slide.layout) {
    case 'title-hook':
      return {
        layout: 'title-hook',
        headline: (slide as TitleHookData).headline?.trim() || 'Untitled',
        subtext: (slide as TitleHookData).subtext?.trim(),
      };

    case 'bullet-list':
      const bulletData = slide as Partial<BulletListData>;
      const bullets = (bulletData.bullets || [])
        .filter((b) => b && b.trim().length > 0)
        .slice(0, 5);
      if (bullets.length < 2) return null;
      return {
        layout: 'bullet-list',
        title: bulletData.title?.trim() || 'Key Points',
        bullets,
      };

    case 'numbered-steps':
      const stepsData = slide as Partial<NumberedStepsData>;
      const steps = (stepsData.steps || [])
        .filter((s) => s && s.trim().length > 0)
        .slice(0, 5);
      if (steps.length < 3) return null;
      return {
        layout: 'numbered-steps',
        title: stepsData.title?.trim() || 'Steps',
        steps,
      };

    case 'stat-card':
      const statData = slide as Partial<StatCardData>;
      if (!statData.stat) return null;
      return {
        layout: 'stat-card',
        title: statData.title?.trim() || 'Key Metric',
        stat: statData.stat.trim(),
        description: statData.description?.trim() || '',
      };

    case 'bar-chart':
    case 'pie-chart':
    case 'line-chart':
      const chartData = slide as Partial<BarChartData | PieChartData | LineChartData>;
      if (!chartData.labels || !chartData.values) return null;
      const minLen = Math.min(chartData.labels.length, chartData.values.length);
      if (minLen < 3) return null;
      return {
        layout: slide.layout,
        title: chartData.title?.trim() || 'Data',
        labels: chartData.labels.slice(0, minLen),
        values: chartData.values.slice(0, minLen),
        description: chartData.description?.trim(),
      } as BarChartData | PieChartData | LineChartData;

    case 'comparison':
      const compData = slide as Partial<ComparisonData>;
      if (!compData.before || !compData.after) return null;
      // Truncate long values to prevent overflow (max 15 chars)
      const truncateValue = (val: string | undefined, max: number = 15): string => {
        const trimmed = val?.trim() || '-';
        return trimmed.length > max ? trimmed.slice(0, max) : trimmed;
      };
      return {
        layout: 'comparison',
        title: compData.title?.trim() || 'Comparison',
        before: {
          label: truncateValue(compData.before.label, 15),
          value: truncateValue(compData.before.value, 15),
        },
        after: {
          label: truncateValue(compData.after.label, 15),
          value: truncateValue(compData.after.value, 15),
        },
      };

    case 'quote':
      const quoteData = slide as Partial<QuoteData>;
      if (!quoteData.quote) return null;
      return {
        layout: 'quote',
        quote: quoteData.quote.trim().slice(0, 150),
        attribution: quoteData.attribution?.trim() || 'Unknown',
      };

    case 'cta':
      const ctaData = slide as Partial<CTAData>;
      return {
        layout: 'cta',
        headline: ctaData.headline?.trim() || 'Take Action',
        subtext: ctaData.subtext?.trim() || 'Follow for more insights',
      };

    default:
      return null;
  }
}

/**
 * Type guard to check if data is a valid SlideData
 */
export function isValidSlideData(data: unknown): data is SlideData {
  if (!data || typeof data !== 'object') return false;
  const slide = data as { layout?: unknown };
  if (!slide.layout || typeof slide.layout !== 'string') return false;

  const validLayouts: SlideLayoutType[] = [
    'title-hook', 'bullet-list', 'numbered-steps', 'stat-card',
    'bar-chart', 'pie-chart', 'line-chart', 'comparison', 'quote', 'cta'
  ];

  return validLayouts.includes(slide.layout as SlideLayoutType);
}
