/**
 * Layout Renderer - Template-First Carousel Architecture
 * Clean, professional layouts with fixed positioning
 */

import {
  SlideData,
  TitleHookData,
  BulletListData,
  NumberedStepsData,
  StatCardData,
  BarChartData,
  PieChartData,
  LineChartData,
  ComparisonData,
  QuoteData,
  CTAData,
} from '../types/slideLayouts';
import {
  CarouselTemplate,
  RGB,
  rgbToCSS,
  FontConfig,
} from '../types/carouselTemplate';

const CANVAS_SIZE = 1080;
const PADDING = 80;

// ============================================
// DECORATIVE SHAPE RENDERING
// ============================================

function drawDecorativeShapes(
  ctx: CanvasRenderingContext2D,
  template: CarouselTemplate
): void {
  const decorations = template.decorations;
  if (!decorations) return;

  // Draw border if enabled
  if (decorations.showBorder && decorations.borderColor) {
    const borderWidth = decorations.borderWidth || 2;
    ctx.strokeStyle = rgbToCSS(decorations.borderColor);
    ctx.lineWidth = borderWidth;
    ctx.strokeRect(
      borderWidth / 2,
      borderWidth / 2,
      CANVAS_SIZE - borderWidth,
      CANVAS_SIZE - borderWidth
    );
  }

  // Draw decorative dots pattern
  if (decorations.dots) {
    const { position, color, rows, cols, size, spacing } = decorations.dots;
    ctx.fillStyle = rgbToCSS(color);

    let startX: number, startY: number;
    switch (position) {
      case 'top-right':
        startX = CANVAS_SIZE - PADDING - (cols * (size + spacing));
        startY = PADDING;
        break;
      case 'top-left':
        startX = PADDING;
        startY = PADDING;
        break;
      case 'bottom-right':
        startX = CANVAS_SIZE - PADDING - (cols * (size + spacing));
        startY = CANVAS_SIZE - PADDING - (rows * (size + spacing));
        break;
      case 'bottom-left':
        startX = PADDING;
        startY = CANVAS_SIZE - PADDING - (rows * (size + spacing));
        break;
      default:
        startX = CANVAS_SIZE - PADDING - (cols * (size + spacing));
        startY = PADDING;
    }

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        ctx.beginPath();
        ctx.arc(
          startX + col * (size + spacing) + size / 2,
          startY + row * (size + spacing) + size / 2,
          size / 2,
          0,
          Math.PI * 2
        );
        ctx.fill();
      }
    }
  }

  // Draw custom shapes
  if (decorations.shapes) {
    decorations.shapes.forEach((shape) => {
      const x = (shape.x / 100) * CANVAS_SIZE;
      const y = (shape.y / 100) * CANVAS_SIZE;

      ctx.fillStyle = rgbToCSS(shape.color);
      ctx.strokeStyle = rgbToCSS(shape.color);
      ctx.lineWidth = shape.strokeWidth || 2;

      switch (shape.type) {
        case 'rectangle':
          if (shape.width && shape.height) {
            const w = (shape.width / 100) * CANVAS_SIZE;
            const h = (shape.height / 100) * CANVAS_SIZE;
            if (shape.filled) {
              ctx.fillRect(x, y, w, h);
            } else {
              ctx.strokeRect(x, y, w, h);
            }
          }
          break;

        case 'circle':
          if (shape.radius) {
            const r = (shape.radius / 100) * CANVAS_SIZE;
            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            if (shape.filled) {
              ctx.fill();
            } else {
              ctx.stroke();
            }
          }
          break;

        case 'arc':
          if (shape.radius) {
            const r = (shape.radius / 100) * CANVAS_SIZE;
            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 0.5);
            ctx.stroke();
          }
          break;

        case 'line':
          if (shape.width) {
            const endX = x + (shape.width / 100) * CANVAS_SIZE;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(endX, y);
            ctx.stroke();
          }
          break;
      }
    });
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function getFontString(font: FontConfig, weight: string, size: number): string {
  const weightMap: Record<string, string> = {
    normal: '400',
    bold: '700',
    black: '900',
  };
  return `${weightMap[weight] || weight} ${size}px "${font.family}", ${font.fallback}`;
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const metrics = ctx.measureText(testLine);

    if (metrics.width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

/**
 * Fit text to width by reducing font size or wrapping
 */
function fitTextInBox(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxFontSize: number,
  minFontSize: number,
  font: FontConfig,
  weight: string
): { fontSize: number; lines: string[] } {
  // Try single line with decreasing font sizes
  for (let size = maxFontSize; size >= minFontSize; size -= 4) {
    ctx.font = getFontString(font, weight, size);
    if (ctx.measureText(text).width <= maxWidth) {
      return { fontSize: size, lines: [text] };
    }
  }

  // Text too long - wrap it
  ctx.font = getFontString(font, weight, minFontSize);
  const lines = wrapText(ctx, text, maxWidth);
  return { fontSize: minFontSize, lines: lines.slice(0, 3) };
}

// ============================================
// BASE SLIDE RENDERING
// ============================================

function drawSlideBase(
  ctx: CanvasRenderingContext2D,
  template: CarouselTemplate,
  slideIndex: number,
  totalSlides: number
): void {
  // Draw background
  const bg = template.background;
  if (bg.type === 'solid' && bg.color) {
    ctx.fillStyle = rgbToCSS(bg.color);
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
  } else if (bg.type === 'gradient' && bg.gradient) {
    const { from, to, angle } = bg.gradient;
    const radians = (angle * Math.PI) / 180;
    const x1 = CANVAS_SIZE / 2 - Math.cos(radians) * CANVAS_SIZE;
    const y1 = CANVAS_SIZE / 2 - Math.sin(radians) * CANVAS_SIZE;
    const x2 = CANVAS_SIZE / 2 + Math.cos(radians) * CANVAS_SIZE;
    const y2 = CANVAS_SIZE / 2 + Math.sin(radians) * CANVAS_SIZE;

    const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
    gradient.addColorStop(0, rgbToCSS(from));
    gradient.addColorStop(1, rgbToCSS(to));
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
  }

  // Overlay
  if (bg.overlay) {
    ctx.fillStyle = `rgba(${bg.overlay.r}, ${bg.overlay.g}, ${bg.overlay.b}, ${bg.overlay.a})`;
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
  }

  // Draw decorative shapes (borders, dots, custom shapes)
  drawDecorativeShapes(ctx, template);

  // Page number (top-left, styled)
  ctx.font = getFontString(template.typography.bodyFont, 'bold', 22);
  ctx.fillStyle = rgbToCSS(template.typography.mutedColor);
  ctx.textAlign = 'left';
  ctx.fillText(`${slideIndex + 1}/${totalSlides}`, PADDING, PADDING + 10);
}

function drawSwipeArrow(ctx: CanvasRenderingContext2D, template: CarouselTemplate): void {
  // Simple arrow at bottom-right
  const x = CANVAS_SIZE - PADDING - 20;
  const y = CANVAS_SIZE - PADDING - 20;

  ctx.strokeStyle = rgbToCSS(template.typography.mutedColor);
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x - 20, y);
  ctx.lineTo(x, y);
  ctx.lineTo(x - 8, y - 8);
  ctx.moveTo(x, y);
  ctx.lineTo(x - 8, y + 8);
  ctx.stroke();
}

// ============================================
// LAYOUT RENDERERS - CLEAN & PROFESSIONAL
// ============================================

/**
 * Title Hook - Big centered headline with accent styling
 */
function renderTitleHook(
  ctx: CanvasRenderingContext2D,
  data: TitleHookData,
  template: CarouselTemplate
): void {
  const centerX = CANVAS_SIZE / 2;
  const maxWidth = CANVAS_SIZE - PADDING * 2;

  // Main headline - larger, bolder
  ctx.font = getFontString(template.typography.titleFont, 'black', 80);
  ctx.fillStyle = rgbToCSS(template.typography.titleColor);
  ctx.textAlign = 'center';

  const lines = wrapText(ctx, data.headline, maxWidth);
  const lineHeight = 95;
  const totalHeight = lines.length * lineHeight;
  const startY = (CANVAS_SIZE - totalHeight) / 2 + 20;

  // Draw each line with subtle letter-spacing effect
  lines.slice(0, 3).forEach((line, i) => {
    ctx.fillText(line, centerX, startY + i * lineHeight);
  });

  // Accent underline below headline
  const underlineWidth = Math.min(ctx.measureText(lines[lines.length - 1] || '').width * 0.6, 300);
  const underlineY = startY + (lines.length - 1) * lineHeight + 40;
  ctx.fillStyle = rgbToCSS(template.typography.accentColor);
  ctx.fillRect(centerX - underlineWidth / 2, underlineY, underlineWidth, 5);

  // Subtext if present
  if (data.subtext) {
    ctx.font = getFontString(template.typography.bodyFont, 'normal', 30);
    ctx.fillStyle = rgbToCSS(template.typography.mutedColor);
    ctx.fillText(data.subtext, centerX, underlineY + 60);
  }
}

/**
 * Bullet List - Title + styled bullet points
 */
function renderBulletList(
  ctx: CanvasRenderingContext2D,
  data: BulletListData,
  template: CarouselTemplate
): void {
  const maxWidth = CANVAS_SIZE - PADDING * 2;

  // Title with accent bar
  ctx.fillStyle = rgbToCSS(template.typography.accentColor);
  ctx.fillRect(PADDING, 130, 60, 5);

  ctx.font = getFontString(template.typography.titleFont, 'bold', 52);
  ctx.fillStyle = rgbToCSS(template.typography.titleColor);
  ctx.textAlign = 'left';

  const titleLines = wrapText(ctx, data.title, maxWidth);
  titleLines.slice(0, 2).forEach((line, i) => {
    ctx.fillText(line, PADDING, 190 + i * 62);
  });

  // Bullets with larger spacing
  const bulletStartY = 190 + titleLines.length * 62 + 50;
  const bulletSpacing = 95;

  data.bullets.slice(0, 5).forEach((bullet, index) => {
    const y = bulletStartY + index * bulletSpacing;

    // Larger accent bullet dot
    ctx.fillStyle = rgbToCSS(template.typography.accentColor);
    ctx.beginPath();
    ctx.arc(PADDING + 14, y - 10, 10, 0, Math.PI * 2);
    ctx.fill();

    // Bullet text - slightly larger
    ctx.font = getFontString(template.typography.bodyFont, 'normal', 34);
    ctx.fillStyle = rgbToCSS(template.typography.bodyColor);
    ctx.textAlign = 'left';

    const lines = wrapText(ctx, bullet, maxWidth - 60);
    lines.slice(0, 2).forEach((line, i) => {
      ctx.fillText(line, PADDING + 50, y + i * 44);
    });
  });
}

/**
 * Numbered Steps - Title + styled numbered items
 */
function renderNumberedSteps(
  ctx: CanvasRenderingContext2D,
  data: NumberedStepsData,
  template: CarouselTemplate
): void {
  const maxWidth = CANVAS_SIZE - PADDING * 2;

  // Title with accent bar
  ctx.fillStyle = rgbToCSS(template.typography.accentColor);
  ctx.fillRect(PADDING, 130, 60, 5);

  ctx.font = getFontString(template.typography.titleFont, 'bold', 52);
  ctx.fillStyle = rgbToCSS(template.typography.titleColor);
  ctx.textAlign = 'left';

  const titleLines = wrapText(ctx, data.title, maxWidth);
  titleLines.slice(0, 2).forEach((line, i) => {
    ctx.fillText(line, PADDING, 190 + i * 62);
  });

  // Steps with larger spacing
  const stepStartY = 190 + titleLines.length * 62 + 60;
  const stepSpacing = 115;

  data.steps.slice(0, 5).forEach((step, index) => {
    const y = stepStartY + index * stepSpacing;

    // Larger number circle with accent color
    ctx.fillStyle = rgbToCSS(template.typography.accentColor);
    ctx.beginPath();
    ctx.arc(PADDING + 28, y - 8, 28, 0, Math.PI * 2);
    ctx.fill();

    // Number in circle - bolder
    ctx.font = getFontString(template.typography.bodyFont, 'bold', 28);
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.fillText((index + 1).toString(), PADDING + 28, y + 2);

    // Step text - larger
    ctx.font = getFontString(template.typography.bodyFont, 'normal', 32);
    ctx.fillStyle = rgbToCSS(template.typography.bodyColor);
    ctx.textAlign = 'left';

    const lines = wrapText(ctx, step, maxWidth - 90);
    lines.slice(0, 2).forEach((line, i) => {
      ctx.fillText(line, PADDING + 80, y + i * 42);
    });
  });
}

/**
 * Stat Card - Big number with context (CLEAN - no background circle)
 */
function renderStatCard(
  ctx: CanvasRenderingContext2D,
  data: StatCardData,
  template: CarouselTemplate
): void {
  const centerX = CANVAS_SIZE / 2;
  const maxWidth = CANVAS_SIZE - PADDING * 2;

  // Title at top - with wrapping
  ctx.font = getFontString(template.typography.titleFont, 'bold', 40);
  ctx.fillStyle = rgbToCSS(template.typography.titleColor);
  ctx.textAlign = 'center';
  const titleLines = wrapText(ctx, data.title, maxWidth);
  titleLines.slice(0, 2).forEach((line, i) => {
    ctx.fillText(line, centerX, 180 + i * 50);
  });

  // Big stat number - fit to width if needed
  const statFit = fitTextInBox(
    ctx,
    data.stat,
    maxWidth - 80,
    180,
    60,
    template.typography.titleFont,
    'black'
  );
  ctx.font = getFontString(template.typography.titleFont, 'black', statFit.fontSize);
  ctx.fillStyle = rgbToCSS(template.typography.accentColor);
  ctx.textAlign = 'center';
  const statY = 520 + (statFit.lines.length > 1 ? -40 : 0);
  statFit.lines.forEach((line, i) => {
    ctx.fillText(line, centerX, statY + i * (statFit.fontSize + 10));
  });

  // Simple underline
  ctx.font = getFontString(template.typography.titleFont, 'black', statFit.fontSize);
  const statWidth = Math.min(ctx.measureText(statFit.lines[0]).width * 0.7, 400);
  ctx.fillStyle = rgbToCSS(template.typography.accentColor);
  const underlineY = statY + (statFit.lines.length - 1) * (statFit.fontSize + 10) + 30;
  ctx.fillRect(centerX - statWidth / 2, underlineY, statWidth, 4);

  // Description
  ctx.font = getFontString(template.typography.bodyFont, 'normal', 28);
  ctx.fillStyle = rgbToCSS(template.typography.bodyColor);
  const descLines = wrapText(ctx, data.description, maxWidth - 40);
  descLines.slice(0, 3).forEach((line, i) => {
    ctx.fillText(line, centerX, underlineY + 70 + i * 42);
  });
}

/**
 * Bar Chart - Clean vertical bars
 */
function renderBarChart(
  ctx: CanvasRenderingContext2D,
  data: BarChartData,
  template: CarouselTemplate
): void {
  const centerX = CANVAS_SIZE / 2;

  // Title
  ctx.font = getFontString(template.typography.titleFont, 'bold', 44);
  ctx.fillStyle = rgbToCSS(template.typography.titleColor);
  ctx.textAlign = 'center';
  ctx.fillText(data.title, centerX, 140);

  // Chart area
  const chartX = 100;
  const chartY = 200;
  const chartWidth = CANVAS_SIZE - 200;
  const chartHeight = 500;
  const chartBottom = chartY + chartHeight;

  const values = data.values.slice(0, 6);
  const labels = data.labels.slice(0, 6);
  const maxValue = Math.max(...values);
  const barCount = values.length;
  const barWidth = (chartWidth - 60) / barCount;
  const actualBarWidth = barWidth * 0.7;

  values.forEach((value, index) => {
    const barHeight = (value / maxValue) * (chartHeight - 100);
    const barX = chartX + 30 + index * barWidth + (barWidth - actualBarWidth) / 2;
    const barY = chartBottom - barHeight - 60;

    // Bar with rounded top
    const color = template.chartColors[index % template.chartColors.length];
    ctx.fillStyle = rgbToCSS(color);
    ctx.beginPath();
    ctx.roundRect(barX, barY, actualBarWidth, barHeight, [8, 8, 0, 0]);
    ctx.fill();

    // Value above bar
    ctx.font = getFontString(template.typography.bodyFont, 'bold', 24);
    ctx.fillStyle = rgbToCSS(template.typography.titleColor);
    ctx.textAlign = 'center';
    ctx.fillText(value.toString(), barX + actualBarWidth / 2, barY - 15);

    // Label below
    if (labels[index]) {
      ctx.font = getFontString(template.typography.bodyFont, 'normal', 18);
      ctx.fillStyle = rgbToCSS(template.typography.mutedColor);
      const labelLines = wrapText(ctx, labels[index], barWidth - 10);
      labelLines.slice(0, 2).forEach((line, i) => {
        ctx.fillText(line, barX + actualBarWidth / 2, chartBottom - 30 + i * 22);
      });
    }
  });

  // Description
  if (data.description) {
    ctx.font = getFontString(template.typography.bodyFont, 'normal', 22);
    ctx.fillStyle = rgbToCSS(template.typography.mutedColor);
    ctx.textAlign = 'center';
    ctx.fillText(data.description, centerX, chartBottom + 40);
  }
}

/**
 * Pie Chart - Simple distribution
 */
function renderPieChart(
  ctx: CanvasRenderingContext2D,
  data: PieChartData,
  template: CarouselTemplate
): void {
  const centerX = CANVAS_SIZE / 2;

  // Title
  ctx.font = getFontString(template.typography.titleFont, 'bold', 44);
  ctx.fillStyle = rgbToCSS(template.typography.titleColor);
  ctx.textAlign = 'center';
  ctx.fillText(data.title, centerX, 140);

  // Pie chart
  const pieX = centerX;
  const pieY = 500;
  const radius = 220;

  const values = data.values.slice(0, 5);
  const labels = data.labels.slice(0, 5);
  const total = values.reduce((sum, val) => sum + val, 0);
  let currentAngle = -Math.PI / 2;

  values.forEach((value, index) => {
    const sliceAngle = (value / total) * Math.PI * 2;
    const color = template.chartColors[index % template.chartColors.length];

    // Slice
    ctx.fillStyle = rgbToCSS(color);
    ctx.beginPath();
    ctx.moveTo(pieX, pieY);
    ctx.arc(pieX, pieY, radius, currentAngle, currentAngle + sliceAngle);
    ctx.closePath();
    ctx.fill();

    // Label - positioned outside
    const labelAngle = currentAngle + sliceAngle / 2;
    const labelRadius = radius + 50;
    const labelX = pieX + labelRadius * Math.cos(labelAngle);
    const labelY = pieY + labelRadius * Math.sin(labelAngle);

    const percentage = Math.round((value / total) * 100);
    ctx.font = getFontString(template.typography.bodyFont, 'bold', 24);
    ctx.fillStyle = rgbToCSS(template.typography.titleColor);
    ctx.textAlign = 'center';
    ctx.fillText(`${percentage}%`, labelX, labelY);

    if (labels[index]) {
      ctx.font = getFontString(template.typography.bodyFont, 'normal', 16);
      ctx.fillStyle = rgbToCSS(template.typography.mutedColor);
      ctx.fillText(labels[index], labelX, labelY + 22);
    }

    currentAngle += sliceAngle;
  });

  // Description
  if (data.description) {
    ctx.font = getFontString(template.typography.bodyFont, 'normal', 22);
    ctx.fillStyle = rgbToCSS(template.typography.mutedColor);
    ctx.textAlign = 'center';
    ctx.fillText(data.description, centerX, 820);
  }
}

/**
 * Line Chart - Trend over time
 */
function renderLineChart(
  ctx: CanvasRenderingContext2D,
  data: LineChartData,
  template: CarouselTemplate
): void {
  const centerX = CANVAS_SIZE / 2;

  // Title
  ctx.font = getFontString(template.typography.titleFont, 'bold', 44);
  ctx.fillStyle = rgbToCSS(template.typography.titleColor);
  ctx.textAlign = 'center';
  ctx.fillText(data.title, centerX, 140);

  // Chart area
  const chartX = 100;
  const chartY = 200;
  const chartWidth = CANVAS_SIZE - 200;
  const chartHeight = 480;

  const values = data.values.slice(0, 8);
  const labels = data.labels.slice(0, 8);
  const maxValue = Math.max(...values);
  const minValue = Math.min(...values);
  const valueRange = maxValue - minValue || 1;
  const pointCount = values.length;
  const pointSpacing = chartWidth / (pointCount - 1 || 1);

  // Draw line
  ctx.strokeStyle = rgbToCSS(template.typography.accentColor);
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();

  values.forEach((value, index) => {
    const x = chartX + index * pointSpacing;
    const y = chartY + chartHeight - 80 - ((value - minValue) / valueRange) * (chartHeight - 150);
    if (index === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });
  ctx.stroke();

  // Draw points and labels
  values.forEach((value, index) => {
    const x = chartX + index * pointSpacing;
    const y = chartY + chartHeight - 80 - ((value - minValue) / valueRange) * (chartHeight - 150);

    // Point
    ctx.fillStyle = rgbToCSS(template.typography.accentColor);
    ctx.beginPath();
    ctx.arc(x, y, 8, 0, Math.PI * 2);
    ctx.fill();

    // Value above point
    ctx.font = getFontString(template.typography.bodyFont, 'bold', 20);
    ctx.fillStyle = rgbToCSS(template.typography.titleColor);
    ctx.textAlign = 'center';
    ctx.fillText(value.toString(), x, y - 18);

    // Label below
    if (labels[index]) {
      ctx.font = getFontString(template.typography.bodyFont, 'normal', 16);
      ctx.fillStyle = rgbToCSS(template.typography.mutedColor);
      ctx.fillText(labels[index], x, chartY + chartHeight - 30);
    }
  });

  // Description
  if (data.description) {
    ctx.font = getFontString(template.typography.bodyFont, 'normal', 22);
    ctx.fillStyle = rgbToCSS(template.typography.mutedColor);
    ctx.textAlign = 'center';
    ctx.fillText(data.description, centerX, chartY + chartHeight + 30);
  }
}

/**
 * Comparison - Clean before/after with centered layout
 */
function renderComparison(
  ctx: CanvasRenderingContext2D,
  data: ComparisonData,
  template: CarouselTemplate
): void {
  const centerX = CANVAS_SIZE / 2;

  // Title
  ctx.font = getFontString(template.typography.titleFont, 'bold', 44);
  ctx.fillStyle = rgbToCSS(template.typography.titleColor);
  ctx.textAlign = 'center';
  ctx.fillText(data.title, centerX, 160);

  // Layout constants
  const boxWidth = 380;
  const boxHeight = 320;
  const gap = 80;
  const topY = 280;
  const valueMaxWidth = boxWidth - 40; // Padding inside box

  // Before box (left)
  const beforeX = centerX - gap / 2 - boxWidth;

  // Before background
  ctx.fillStyle = `rgba(${template.typography.mutedColor.r}, ${template.typography.mutedColor.g}, ${template.typography.mutedColor.b}, 0.15)`;
  ctx.beginPath();
  ctx.roundRect(beforeX, topY, boxWidth, boxHeight, 16);
  ctx.fill();

  // Before label
  ctx.font = getFontString(template.typography.bodyFont, 'bold', 24);
  ctx.fillStyle = rgbToCSS(template.typography.mutedColor);
  ctx.textAlign = 'center';
  ctx.fillText(data.before.label.slice(0, 20), beforeX + boxWidth / 2, topY + 50);

  // Before value - fit text properly
  const beforeFit = fitTextInBox(
    ctx,
    data.before.value,
    valueMaxWidth,
    72,
    28,
    template.typography.titleFont,
    'bold'
  );
  ctx.font = getFontString(template.typography.titleFont, 'bold', beforeFit.fontSize);
  ctx.fillStyle = rgbToCSS(template.typography.titleColor);
  const beforeValueY = topY + boxHeight / 2 + (beforeFit.lines.length > 1 ? -20 : 20);
  beforeFit.lines.forEach((line, i) => {
    ctx.fillText(line, beforeX + boxWidth / 2, beforeValueY + i * (beforeFit.fontSize + 8));
  });

  // After box (right)
  const afterX = centerX + gap / 2;

  // After background with accent
  ctx.fillStyle = `rgba(${template.typography.accentColor.r}, ${template.typography.accentColor.g}, ${template.typography.accentColor.b}, 0.2)`;
  ctx.beginPath();
  ctx.roundRect(afterX, topY, boxWidth, boxHeight, 16);
  ctx.fill();

  // Accent border
  ctx.strokeStyle = rgbToCSS(template.typography.accentColor);
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(afterX, topY, boxWidth, boxHeight, 16);
  ctx.stroke();

  // After label
  ctx.font = getFontString(template.typography.bodyFont, 'bold', 24);
  ctx.fillStyle = rgbToCSS(template.typography.accentColor);
  ctx.textAlign = 'center';
  ctx.fillText(data.after.label.slice(0, 20), afterX + boxWidth / 2, topY + 50);

  // After value - fit text properly
  const afterFit = fitTextInBox(
    ctx,
    data.after.value,
    valueMaxWidth,
    72,
    28,
    template.typography.titleFont,
    'bold'
  );
  ctx.font = getFontString(template.typography.titleFont, 'bold', afterFit.fontSize);
  ctx.fillStyle = rgbToCSS(template.typography.accentColor);
  const afterValueY = topY + boxHeight / 2 + (afterFit.lines.length > 1 ? -20 : 20);
  afterFit.lines.forEach((line, i) => {
    ctx.fillText(line, afterX + boxWidth / 2, afterValueY + i * (afterFit.fontSize + 8));
  });

  // Arrow between boxes
  const arrowY = topY + boxHeight / 2;
  ctx.strokeStyle = rgbToCSS(template.typography.accentColor);
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(centerX - 30, arrowY);
  ctx.lineTo(centerX + 30, arrowY);
  ctx.stroke();

  // Arrow head
  ctx.beginPath();
  ctx.moveTo(centerX + 18, arrowY - 12);
  ctx.lineTo(centerX + 30, arrowY);
  ctx.lineTo(centerX + 18, arrowY + 12);
  ctx.stroke();

  // Bottom indicator text
  ctx.font = getFontString(template.typography.bodyFont, 'normal', 22);
  ctx.fillStyle = rgbToCSS(template.typography.mutedColor);
  ctx.textAlign = 'center';
  ctx.fillText('Improvement', centerX, topY + boxHeight + 60);
}

/**
 * Quote - Clean testimonial style
 */
function renderQuote(
  ctx: CanvasRenderingContext2D,
  data: QuoteData,
  template: CarouselTemplate
): void {
  const centerX = CANVAS_SIZE / 2;
  const maxWidth = CANVAS_SIZE - PADDING * 2 - 40;

  // Large quote mark
  ctx.font = getFontString(template.typography.titleFont, 'bold', 160);
  ctx.fillStyle = `rgba(${template.typography.accentColor.r}, ${template.typography.accentColor.g}, ${template.typography.accentColor.b}, 0.15)`;
  ctx.textAlign = 'left';
  ctx.fillText('"', PADDING, 260);

  // Quote text
  ctx.font = getFontString(template.typography.bodyFont, 'normal', 36);
  ctx.fillStyle = rgbToCSS(template.typography.bodyColor);
  ctx.textAlign = 'center';

  const lines = wrapText(ctx, data.quote, maxWidth);
  const lineHeight = 52;
  const startY = 400;

  lines.slice(0, 5).forEach((line, i) => {
    ctx.fillText(line, centerX, startY + i * lineHeight);
  });

  // Attribution
  const attrY = startY + lines.length * lineHeight + 60;

  // Line above attribution
  ctx.strokeStyle = rgbToCSS(template.typography.accentColor);
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(centerX - 40, attrY - 20);
  ctx.lineTo(centerX + 40, attrY - 20);
  ctx.stroke();

  ctx.font = getFontString(template.typography.bodyFont, 'bold', 24);
  ctx.fillStyle = rgbToCSS(template.typography.accentColor);
  ctx.fillText(`— ${data.attribution}`, centerX, attrY + 20);
}

/**
 * CTA - Impactful call to action with accent button
 */
function renderCTA(
  ctx: CanvasRenderingContext2D,
  data: CTAData,
  template: CarouselTemplate
): void {
  const centerX = CANVAS_SIZE / 2;
  const maxWidth = CANVAS_SIZE - PADDING * 2;

  // Main headline - larger and bolder
  ctx.font = getFontString(template.typography.titleFont, 'black', 68);
  ctx.fillStyle = rgbToCSS(template.typography.titleColor);
  ctx.textAlign = 'center';

  const lines = wrapText(ctx, data.headline, maxWidth);
  const lineHeight = 82;
  const startY = (CANVAS_SIZE - lines.length * lineHeight) / 2 - 40;

  lines.slice(0, 2).forEach((line, i) => {
    ctx.fillText(line, centerX, startY + i * lineHeight);
  });

  // Accent underline
  const underlineWidth = Math.min(ctx.measureText(lines[lines.length - 1] || '').width * 0.5, 250);
  ctx.fillStyle = rgbToCSS(template.typography.accentColor);
  ctx.fillRect(
    centerX - underlineWidth / 2,
    startY + (lines.length - 1) * lineHeight + 30,
    underlineWidth,
    5
  );

  // Subtext - styled with accent color
  ctx.font = getFontString(template.typography.bodyFont, 'normal', 30);
  ctx.fillStyle = rgbToCSS(template.typography.bodyColor);
  const subtextY = startY + lines.length * lineHeight + 80;
  const subtextLines = wrapText(ctx, data.subtext, maxWidth - 100);
  subtextLines.slice(0, 2).forEach((line, i) => {
    ctx.fillText(line, centerX, subtextY + i * 44);
  });

  // Decorative arrow indicator pointing right
  const arrowY = subtextY + subtextLines.length * 44 + 60;
  ctx.fillStyle = rgbToCSS(template.typography.accentColor);
  ctx.beginPath();
  ctx.moveTo(centerX - 30, arrowY);
  ctx.lineTo(centerX + 30, arrowY);
  ctx.lineTo(centerX + 15, arrowY - 15);
  ctx.moveTo(centerX + 30, arrowY);
  ctx.lineTo(centerX + 15, arrowY + 15);
  ctx.lineWidth = 4;
  ctx.strokeStyle = rgbToCSS(template.typography.accentColor);
  ctx.lineCap = 'round';
  ctx.stroke();
}

// ============================================
// MAIN EXPORT
// ============================================

export function renderSlideByLayout(
  ctx: CanvasRenderingContext2D,
  slideData: SlideData,
  slideIndex: number,
  totalSlides: number,
  template: CarouselTemplate
): void {
  // Draw base (background, page number)
  drawSlideBase(ctx, template, slideIndex, totalSlides);

  // Layout-specific rendering
  switch (slideData.layout) {
    case 'title-hook':
      renderTitleHook(ctx, slideData, template);
      break;
    case 'bullet-list':
      renderBulletList(ctx, slideData, template);
      break;
    case 'numbered-steps':
      renderNumberedSteps(ctx, slideData, template);
      break;
    case 'stat-card':
      renderStatCard(ctx, slideData, template);
      break;
    case 'bar-chart':
      renderBarChart(ctx, slideData, template);
      break;
    case 'pie-chart':
      renderPieChart(ctx, slideData, template);
      break;
    case 'line-chart':
      renderLineChart(ctx, slideData, template);
      break;
    case 'comparison':
      renderComparison(ctx, slideData, template);
      break;
    case 'quote':
      renderQuote(ctx, slideData, template);
      break;
    case 'cta':
      renderCTA(ctx, slideData, template);
      break;
    default:
      ctx.font = '32px sans-serif';
      ctx.fillStyle = '#ff0000';
      ctx.textAlign = 'center';
      ctx.fillText(`Unknown layout: ${(slideData as any).layout}`, CANVAS_SIZE / 2, CANVAS_SIZE / 2);
  }

  // Draw swipe arrow (except on last slide)
  if (slideIndex < totalSlides - 1) {
    drawSwipeArrow(ctx, template);
  }
}

export { CANVAS_SIZE };
