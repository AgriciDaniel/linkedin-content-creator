/**
 * Template-based Canvas Renderer
 * Renders carousel slides using HTML Canvas with Google Fonts support
 * Now supports the new Layout-Based Architecture with SlideData
 */

import jsPDF from 'jspdf';
import { CarouselSlide, SlideData } from '../types';
import { isValidSlideData } from '../types/slideLayouts';
import {
  CarouselTemplate,
  RGB,
  rgbToCSS,
  FontConfig,
  BackgroundConfig,
  LayoutZone
} from '../types/carouselTemplate';
import { defaultTemplate } from '../templates/carouselTemplates';
import { renderSlideByLayout } from './layoutRenderer';

const CANVAS_SIZE = 1080;
const PDF_SCALE = 2; // Render at 2x resolution for crisp PDF output (2160x2160)

// Google Fonts loader
const loadedFonts = new Set<string>();

async function loadGoogleFont(font: FontConfig): Promise<void> {
  if (!font.googleFont || loadedFonts.has(font.family)) {
    return;
  }

  try {
    const fontUrl = `https://fonts.googleapis.com/css2?family=${font.family.replace(' ', '+')}:wght@400;700;900&display=swap`;

    // Check if already loaded
    const existingLink = document.querySelector(`link[href*="${font.family.replace(' ', '+')}"]`);
    if (existingLink) {
      loadedFonts.add(font.family);
      return;
    }

    // Create link element
    const link = document.createElement('link');
    link.href = fontUrl;
    link.rel = 'stylesheet';
    document.head.appendChild(link);

    // Wait for font to load
    await document.fonts.load(`700 48px "${font.family}"`);
    loadedFonts.add(font.family);
    console.log(`✅ Loaded font: ${font.family}`);
  } catch (error) {
    console.warn(`⚠️ Failed to load font ${font.family}, using fallback:`, error);
  }
}

async function loadTemplateFonts(template: CarouselTemplate): Promise<void> {
  const fonts = [
    template.typography.titleFont,
    template.typography.subtitleFont,
    template.typography.bodyFont,
  ];

  await Promise.all(fonts.map(loadGoogleFont));
}

function getFontString(font: FontConfig, weight: string, size: number): string {
  const weightMap: Record<string, string> = {
    'normal': '400',
    'bold': '700',
    'black': '900',
  };
  return `${weightMap[weight] || weight} ${size}px "${font.family}", ${font.fallback}`;
}

function drawBackground(ctx: CanvasRenderingContext2D, background: BackgroundConfig): void {
  if (background.type === 'solid' && background.color) {
    ctx.fillStyle = rgbToCSS(background.color);
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
  } else if (background.type === 'gradient' && background.gradient) {
    const { from, to, angle } = background.gradient;
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

  // Apply overlay if present
  if (background.overlay) {
    ctx.fillStyle = `rgba(${background.overlay.r}, ${background.overlay.g}, ${background.overlay.b}, ${background.overlay.a})`;
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
  }
}

function drawBorder(ctx: CanvasRenderingContext2D, template: CarouselTemplate): void {
  if (template.decorations.showBorder && template.decorations.borderColor) {
    ctx.strokeStyle = rgbToCSS(template.decorations.borderColor);
    ctx.lineWidth = template.decorations.borderWidth || 2;
    ctx.strokeRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
  }
}

function drawDots(ctx: CanvasRenderingContext2D, template: CarouselTemplate): void {
  const dots = template.decorations.dots;
  if (!dots) return;

  ctx.fillStyle = rgbToCSS(dots.color);

  let startX: number, startY: number;
  const totalWidth = (dots.cols - 1) * dots.spacing + dots.size;
  const totalHeight = (dots.rows - 1) * dots.spacing + dots.size;

  switch (dots.position) {
    case 'top-left':
      startX = template.layout.padding;
      startY = template.layout.padding;
      break;
    case 'top-right':
      startX = CANVAS_SIZE - template.layout.padding - totalWidth;
      startY = template.layout.padding;
      break;
    case 'bottom-left':
      startX = template.layout.padding;
      startY = CANVAS_SIZE - template.layout.padding - totalHeight;
      break;
    case 'bottom-right':
      startX = CANVAS_SIZE - template.layout.padding - totalWidth;
      startY = CANVAS_SIZE - template.layout.padding - totalHeight;
      break;
  }

  for (let row = 0; row < dots.rows; row++) {
    for (let col = 0; col < dots.cols; col++) {
      const x = startX + col * dots.spacing + dots.size / 2;
      const y = startY + row * dots.spacing + dots.size / 2;
      ctx.beginPath();
      ctx.arc(x, y, dots.size / 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawArrow(ctx: CanvasRenderingContext2D, template: CarouselTemplate): void {
  const arrow = template.decorations.arrow;
  if (!arrow) return;

  const padding = template.layout.padding;
  let x: number, y: number;

  switch (arrow.position) {
    case 'bottom-right':
      x = CANVAS_SIZE - padding - 60;
      y = CANVAS_SIZE - padding - 30;
      break;
    case 'bottom-left':
      x = padding + 30;
      y = CANVAS_SIZE - padding - 30;
      break;
    default:
      x = CANVAS_SIZE - padding - 60;
      y = CANVAS_SIZE - padding - 30;
  }

  if (arrow.style === 'circle' && arrow.backgroundColor) {
    ctx.fillStyle = rgbToCSS(arrow.backgroundColor);
    ctx.beginPath();
    ctx.arc(x, y, 25, 0, Math.PI * 2);
    ctx.fill();
  } else if (arrow.style === 'pill' && arrow.backgroundColor) {
    ctx.fillStyle = rgbToCSS(arrow.backgroundColor);
    ctx.beginPath();
    ctx.roundRect(x - 35, y - 18, 70, 36, 18);
    ctx.fill();
  }

  // Draw arrow
  ctx.strokeStyle = rgbToCSS(arrow.color);
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x - 15, y);
  ctx.lineTo(x + 15, y);
  ctx.moveTo(x + 5, y - 10);
  ctx.lineTo(x + 15, y);
  ctx.lineTo(x + 5, y + 10);
  ctx.stroke();
}

function drawPageNumber(
  ctx: CanvasRenderingContext2D,
  template: CarouselTemplate,
  slideIndex: number,
  totalSlides: number
): void {
  if (!template.footer.show || !template.footer.showPageNumber) return;

  const padding = template.layout.padding;
  ctx.font = `400 16px "${template.typography.bodyFont.family}", ${template.typography.bodyFont.fallback}`;
  ctx.fillStyle = rgbToCSS(template.typography.mutedColor);

  let text: string;
  switch (template.footer.pageNumberStyle) {
    case 'fraction':
      text = `${slideIndex + 1}/${totalSlides}`;
      break;
    case 'simple':
      text = `${slideIndex + 1}`;
      break;
    case 'dots':
      text = Array(totalSlides).fill('○').map((d, i) => i === slideIndex ? '●' : d).join(' ');
      break;
    default:
      text = `${slideIndex + 1}/${totalSlides}`;
  }

  ctx.textAlign = 'left';
  ctx.fillText(text, padding, padding + 20);
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
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

function drawTitle(
  ctx: CanvasRenderingContext2D,
  template: CarouselTemplate,
  title: string
): number {
  const zone = template.layout.titleZone;
  const typography = template.typography;

  ctx.font = getFontString(typography.titleFont, typography.titleWeight, typography.titleSize);
  ctx.fillStyle = rgbToCSS(typography.titleColor);
  ctx.textAlign = zone.align;

  const x = zone.align === 'center'
    ? CANVAS_SIZE / 2
    : zone.align === 'right'
      ? CANVAS_SIZE - (zone.x * CANVAS_SIZE / 100)
      : zone.x * CANVAS_SIZE / 100;

  const y = zone.y * CANVAS_SIZE / 100;
  const maxWidth = zone.width * CANVAS_SIZE / 100;

  const lines = wrapText(ctx, title, maxWidth);
  const lineHeight = typography.titleSize * typography.titleLineHeight;

  lines.forEach((line, index) => {
    ctx.fillText(line, x, y + index * lineHeight);
  });

  // Return position after title (no accent line - cleaner design)
  const endY = y + lines.length * lineHeight + 30;
  return endY;
}

// Icon mapping for visual bullet points
const bulletIcons: Record<string, string> = {
  '✓': 'checkmark',
  '→': 'arrow',
  '★': 'star',
  '●': 'circle',
  '◆': 'diamond',
  '▶': 'play',
  '💡': 'lightbulb',
  '🎯': 'target',
  '📈': 'growth',
  '⚡': 'lightning',
};

function drawIconBullet(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: RGB,
  iconType: string = 'circle'
): void {
  ctx.fillStyle = rgbToCSS(color);

  switch (iconType) {
    case 'checkmark':
      ctx.strokeStyle = rgbToCSS(color);
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x - 6, y - 2);
      ctx.lineTo(x - 1, y + 4);
      ctx.lineTo(x + 8, y - 6);
      ctx.stroke();
      break;

    case 'arrow':
      ctx.beginPath();
      ctx.moveTo(x - 4, y);
      ctx.lineTo(x + 6, y);
      ctx.lineTo(x + 2, y - 4);
      ctx.moveTo(x + 6, y);
      ctx.lineTo(x + 2, y + 4);
      ctx.strokeStyle = rgbToCSS(color);
      ctx.lineWidth = 2.5;
      ctx.stroke();
      break;

    case 'star':
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
        const radius = i % 2 === 0 ? 8 : 4;
        const px = x + radius * Math.cos(angle);
        const py = y + radius * Math.sin(angle);
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      break;

    case 'diamond':
      ctx.beginPath();
      ctx.moveTo(x, y - 7);
      ctx.lineTo(x + 6, y);
      ctx.lineTo(x, y + 7);
      ctx.lineTo(x - 6, y);
      ctx.closePath();
      ctx.fill();
      break;

    case 'number':
      // Will be handled separately with actual numbers
      break;

    default: // circle
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fill();
  }
}

function drawNumberedBullet(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  number: number,
  accentColor: RGB,
  textColor: RGB
): void {
  // Draw circle background
  ctx.fillStyle = rgbToCSS(accentColor);
  ctx.beginPath();
  ctx.arc(x, y, 14, 0, Math.PI * 2);
  ctx.fill();

  // Draw number
  ctx.fillStyle = rgbToCSS(textColor);
  ctx.font = 'bold 16px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(number.toString(), x, y + 1);
  ctx.textBaseline = 'alphabetic';
}

function drawContent(
  ctx: CanvasRenderingContext2D,
  template: CarouselTemplate,
  content: string,
  startY: number
): void {
  const zone = template.layout.contentZone;
  const typography = template.typography;

  ctx.font = getFontString(typography.bodyFont, typography.bodyWeight, typography.bodySize);
  ctx.fillStyle = rgbToCSS(typography.bodyColor);
  ctx.textAlign = zone.align;

  const x = zone.align === 'center'
    ? CANVAS_SIZE / 2
    : zone.align === 'right'
      ? CANVAS_SIZE - (zone.x * CANVAS_SIZE / 100)
      : zone.x * CANVAS_SIZE / 100;

  const maxWidth = zone.width * CANVAS_SIZE / 100;
  const lines = content.split('\n').filter(l => l.trim());

  let currentY = startY;
  const lineHeight = typography.bodySize * typography.bodyLineHeight;
  let bulletNumber = 0;

  lines.forEach(line => {
    const trimmed = line.trim();

    // Check for numbered lists (1. 2. 3. etc)
    const numberedMatch = trimmed.match(/^(\d+)\.\s*(.+)/);
    // Check for bullet points
    const isBullet = trimmed.startsWith('•') || trimmed.startsWith('-') || trimmed.startsWith('*');
    // Check for icon bullets
    const iconMatch = Object.keys(bulletIcons).find(icon => trimmed.startsWith(icon));

    if (numberedMatch) {
      bulletNumber = parseInt(numberedMatch[1]);
      const bulletText = numberedMatch[2];

      const bulletX = zone.align === 'center'
        ? CANVAS_SIZE / 2 - maxWidth / 2
        : x;

      // Draw numbered circle
      drawNumberedBullet(
        ctx,
        bulletX + 14,
        currentY - 6,
        bulletNumber,
        typography.accentColor,
        { r: 255, g: 255, b: 255 }
      );

      // Draw text
      ctx.fillStyle = rgbToCSS(typography.bodyColor);
      ctx.font = getFontString(typography.bodyFont, typography.bodyWeight, typography.bodySize);
      const textX = zone.align === 'center'
        ? CANVAS_SIZE / 2 - maxWidth / 2 + 45
        : x + 45;
      ctx.textAlign = 'left';

      const wrapped = wrapText(ctx, bulletText, maxWidth - 55);
      wrapped.forEach((wLine, i) => {
        ctx.fillText(wLine, textX, currentY + i * lineHeight);
      });
      currentY += wrapped.length * lineHeight + 18;
      ctx.textAlign = zone.align;

    } else if (iconMatch) {
      const bulletText = trimmed.substring(iconMatch.length).trim();
      const iconType = bulletIcons[iconMatch];

      const bulletX = zone.align === 'center'
        ? CANVAS_SIZE / 2 - maxWidth / 2
        : x;

      // Draw icon
      drawIconBullet(ctx, bulletX + 10, currentY - 6, typography.accentColor, iconType);

      // Draw text
      ctx.fillStyle = rgbToCSS(typography.bodyColor);
      ctx.font = getFontString(typography.bodyFont, typography.bodyWeight, typography.bodySize);
      const textX = zone.align === 'center'
        ? CANVAS_SIZE / 2 - maxWidth / 2 + 35
        : x + 35;
      ctx.textAlign = 'left';

      const wrapped = wrapText(ctx, bulletText, maxWidth - 45);
      wrapped.forEach((wLine, i) => {
        ctx.fillText(wLine, textX, currentY + i * lineHeight);
      });
      currentY += wrapped.length * lineHeight + 14;
      ctx.textAlign = zone.align;

    } else if (isBullet) {
      const bulletText = trimmed.substring(1).trim();

      // Draw enhanced bullet
      ctx.fillStyle = rgbToCSS(typography.accentColor);
      const bulletX = zone.align === 'center'
        ? CANVAS_SIZE / 2 - maxWidth / 2 - 20
        : x;

      drawIconBullet(ctx, bulletX + 10, currentY - 6, typography.accentColor, 'circle');

      // Draw text
      ctx.fillStyle = rgbToCSS(typography.bodyColor);
      const textX = zone.align === 'center'
        ? CANVAS_SIZE / 2 - maxWidth / 2 + 30
        : x + 30;
      ctx.textAlign = 'left';

      const wrapped = wrapText(ctx, bulletText, maxWidth - 40);
      wrapped.forEach((wLine, i) => {
        ctx.fillText(wLine, textX, currentY + i * lineHeight);
      });
      currentY += wrapped.length * lineHeight + 14;
      ctx.textAlign = zone.align;
    } else {
      const wrapped = wrapText(ctx, trimmed, maxWidth);
      wrapped.forEach((wLine, i) => {
        ctx.fillText(wLine, x, currentY + i * lineHeight);
      });
      currentY += wrapped.length * lineHeight + 10;
    }
  });
}

/**
 * Main chart renderer - routes to specific chart type
 */
function drawChart(
  ctx: CanvasRenderingContext2D,
  template: CarouselTemplate,
  chartData: any,
  startY: number
): void {
  const chartX = 150;
  const chartY = startY;
  const chartWidth = CANVAS_SIZE - 300;
  const chartHeight = 400;

  switch (chartData.type) {
    case 'bar':
      drawBarChart(ctx, template, chartData, chartX, chartY, chartWidth, chartHeight);
      break;
    case 'horizontal-bar':
      drawHorizontalBarChart(ctx, template, chartData, chartX, chartY, chartWidth, chartHeight);
      break;
    case 'stacked-bar':
      drawStackedBarChart(ctx, template, chartData, chartX, chartY, chartWidth, chartHeight);
      break;
    case 'line':
      drawLineChart(ctx, template, chartData, chartX, chartY, chartWidth, chartHeight);
      break;
    case 'area':
      drawAreaChart(ctx, template, chartData, chartX, chartY, chartWidth, chartHeight);
      break;
    case 'pie':
      drawPieChart(ctx, template, chartData, chartX, chartY, chartWidth, chartHeight);
      break;
    case 'donut':
      drawDonutChart(ctx, template, chartData, chartX, chartY, chartWidth, chartHeight);
      break;
    case 'comparison':
      drawComparisonChart(ctx, template, chartData, chartX, chartY, chartWidth, chartHeight);
      break;
    case 'funnel':
      drawFunnelChart(ctx, template, chartData, chartX, chartY, chartWidth, chartHeight);
      break;
    case 'gauge':
      drawGaugeChart(ctx, template, chartData, chartX, chartY, chartWidth, chartHeight);
      break;
    case 'progress':
      drawProgressBars(ctx, template, chartData, chartX, chartY, chartWidth, chartHeight);
      break;
    default:
      drawBarChart(ctx, template, chartData, chartX, chartY, chartWidth, chartHeight);
  }

  // Description below chart
  if (chartData.description) {
    ctx.font = getFontString(template.typography.bodyFont, 'normal', 20);
    ctx.fillStyle = rgbToCSS(template.typography.mutedColor);
    ctx.textAlign = 'center';
    ctx.fillText(chartData.description, CANVAS_SIZE / 2, chartY + chartHeight + 50);
  }
}

function drawBarChart(
  ctx: CanvasRenderingContext2D,
  template: CarouselTemplate,
  chartData: any,
  x: number,
  y: number,
  width: number,
  height: number
): void {
  const values = chartData.values || [];
  const labels = chartData.labels || [];
  if (values.length === 0) return;

  const maxValue = Math.max(...values);
  const barWidth = (width - 50) / values.length;
  const barSpacing = barWidth * 0.2;
  const actualBarWidth = barWidth - barSpacing;

  values.forEach((value: number, index: number) => {
    const barHeight = (value / maxValue) * (height - 80);
    const barX = x + 25 + index * barWidth;
    const barY = y + height - barHeight - 40;

    const color = template.chartColors[index % template.chartColors.length];
    ctx.fillStyle = rgbToCSS(color);

    if (template.chartStyle.barRadius) {
      ctx.beginPath();
      ctx.roundRect(barX, barY, actualBarWidth, barHeight, [template.chartStyle.barRadius, template.chartStyle.barRadius, 0, 0]);
      ctx.fill();
    } else {
      ctx.fillRect(barX, barY, actualBarWidth, barHeight);
    }

    ctx.font = getFontString(template.typography.bodyFont, 'bold', 24);
    ctx.fillStyle = rgbToCSS(template.typography.titleColor);
    ctx.textAlign = 'center';
    ctx.fillText(value.toString(), barX + actualBarWidth / 2, barY - 15);

    if (labels[index]) {
      ctx.font = getFontString(template.typography.bodyFont, 'normal', 16);
      ctx.fillStyle = rgbToCSS(template.typography.mutedColor);
      ctx.fillText(labels[index], barX + actualBarWidth / 2, y + height - 10);
    }
  });
}

function drawHorizontalBarChart(
  ctx: CanvasRenderingContext2D,
  template: CarouselTemplate,
  chartData: any,
  x: number,
  y: number,
  width: number,
  height: number
): void {
  const values = chartData.values || [];
  const labels = chartData.labels || [];
  if (values.length === 0) return;

  const maxValue = Math.max(...values);
  const barHeight = (height - 60) / values.length;
  const barSpacing = barHeight * 0.15;
  const actualBarHeight = barHeight - barSpacing;

  values.forEach((value: number, index: number) => {
    const barWidth = (value / maxValue) * (width - 180);
    const barY = y + 30 + index * barHeight;
    const barX = x + 140;

    const color = template.chartColors[index % template.chartColors.length];
    ctx.fillStyle = rgbToCSS(color);
    ctx.fillRect(barX, barY, barWidth, actualBarHeight);

    ctx.font = getFontString(template.typography.bodyFont, 'bold', 20);
    ctx.fillStyle = rgbToCSS(template.typography.titleColor);
    ctx.textAlign = 'left';
    ctx.fillText(value.toString(), barX + barWidth + 10, barY + actualBarHeight / 2 + 7);

    if (labels[index]) {
      ctx.font = getFontString(template.typography.bodyFont, 'normal', 16);
      ctx.fillStyle = rgbToCSS(template.typography.mutedColor);
      ctx.textAlign = 'right';
      ctx.fillText(labels[index], barX - 10, barY + actualBarHeight / 2 + 5);
    }
  });
}

function drawStackedBarChart(
  ctx: CanvasRenderingContext2D,
  template: CarouselTemplate,
  chartData: any,
  x: number,
  y: number,
  width: number,
  height: number
): void {
  const values = chartData.values || [];
  const labels = chartData.labels || [];
  if (values.length === 0) return;

  const total = values.reduce((sum: number, val: number) => sum + val, 0);
  const barWidth = width - 80;
  const barHeight = 100;
  const barX = x + 40;
  const barY = y + height / 2 - barHeight / 2;

  let currentX = barX;

  values.forEach((value: number, index: number) => {
    const segmentWidth = (value / total) * barWidth;
    const color = template.chartColors[index % template.chartColors.length];

    ctx.fillStyle = rgbToCSS(color);
    ctx.fillRect(currentX, barY, segmentWidth, barHeight);

    const percentage = Math.round((value / total) * 100);
    if (segmentWidth > 40) {
      ctx.font = getFontString(template.typography.bodyFont, 'bold', 16);
      ctx.fillStyle = rgbToCSS({ r: 255, g: 255, b: 255 });
      ctx.textAlign = 'center';
      ctx.fillText(`${percentage}%`, currentX + segmentWidth / 2, barY + barHeight / 2 + 6);
    }

    if (labels[index]) {
      ctx.font = getFontString(template.typography.bodyFont, 'normal', 14);
      ctx.fillStyle = rgbToCSS(template.typography.mutedColor);
      ctx.fillText(labels[index], currentX + segmentWidth / 2, barY + barHeight + 25);
    }

    currentX += segmentWidth;
  });

  ctx.font = getFontString(template.typography.bodyFont, 'bold', 22);
  ctx.fillStyle = rgbToCSS(template.typography.titleColor);
  ctx.textAlign = 'center';
  ctx.fillText(`Total: ${total}`, x + width / 2, barY - 25);
}

function drawLineChart(
  ctx: CanvasRenderingContext2D,
  template: CarouselTemplate,
  chartData: any,
  x: number,
  y: number,
  width: number,
  height: number
): void {
  const values = chartData.values || [];
  const labels = chartData.labels || [];
  if (values.length === 0) return;

  const maxValue = Math.max(...values);
  const pointSpacing = (width - 80) / (values.length - 1 || 1);

  // Draw line
  ctx.strokeStyle = rgbToCSS(template.typography.accentColor);
  ctx.lineWidth = 4;
  ctx.beginPath();

  values.forEach((value: number, index: number) => {
    const pointX = x + 40 + index * pointSpacing;
    const pointY = y + height - 40 - ((value / maxValue) * (height - 80));
    if (index === 0) {
      ctx.moveTo(pointX, pointY);
    } else {
      ctx.lineTo(pointX, pointY);
    }
  });
  ctx.stroke();

  // Draw points and labels
  values.forEach((value: number, index: number) => {
    const pointX = x + 40 + index * pointSpacing;
    const pointY = y + height - 40 - ((value / maxValue) * (height - 80));

    ctx.fillStyle = rgbToCSS(template.typography.accentColor);
    ctx.beginPath();
    ctx.arc(pointX, pointY, 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = rgbToCSS({ r: 255, g: 255, b: 255 });
    ctx.beginPath();
    ctx.arc(pointX, pointY, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = getFontString(template.typography.bodyFont, 'bold', 18);
    ctx.fillStyle = rgbToCSS(template.typography.titleColor);
    ctx.textAlign = 'center';
    ctx.fillText(value.toString(), pointX, pointY - 18);

    if (labels[index]) {
      ctx.font = getFontString(template.typography.bodyFont, 'normal', 14);
      ctx.fillStyle = rgbToCSS(template.typography.mutedColor);
      ctx.fillText(labels[index], pointX, y + height - 10);
    }
  });
}

function drawAreaChart(
  ctx: CanvasRenderingContext2D,
  template: CarouselTemplate,
  chartData: any,
  x: number,
  y: number,
  width: number,
  height: number
): void {
  const values = chartData.values || [];
  const labels = chartData.labels || [];
  if (values.length === 0) return;

  const maxValue = Math.max(...values);
  const pointSpacing = (width - 80) / (values.length - 1 || 1);
  const baseY = y + height - 40;

  // Draw filled area
  const accentColor = template.typography.accentColor;
  ctx.fillStyle = `rgba(${accentColor.r}, ${accentColor.g}, ${accentColor.b}, 0.3)`;
  ctx.beginPath();
  ctx.moveTo(x + 40, baseY);

  values.forEach((value: number, index: number) => {
    const pointX = x + 40 + index * pointSpacing;
    const pointY = y + height - 40 - ((value / maxValue) * (height - 80));
    ctx.lineTo(pointX, pointY);
  });

  ctx.lineTo(x + 40 + (values.length - 1) * pointSpacing, baseY);
  ctx.closePath();
  ctx.fill();

  // Draw line on top
  ctx.strokeStyle = rgbToCSS(template.typography.accentColor);
  ctx.lineWidth = 3;
  ctx.beginPath();

  values.forEach((value: number, index: number) => {
    const pointX = x + 40 + index * pointSpacing;
    const pointY = y + height - 40 - ((value / maxValue) * (height - 80));
    if (index === 0) {
      ctx.moveTo(pointX, pointY);
    } else {
      ctx.lineTo(pointX, pointY);
    }
  });
  ctx.stroke();

  // Draw points and labels
  values.forEach((value: number, index: number) => {
    const pointX = x + 40 + index * pointSpacing;
    const pointY = y + height - 40 - ((value / maxValue) * (height - 80));

    ctx.fillStyle = rgbToCSS(template.typography.accentColor);
    ctx.beginPath();
    ctx.arc(pointX, pointY, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = getFontString(template.typography.bodyFont, 'bold', 16);
    ctx.fillStyle = rgbToCSS(template.typography.titleColor);
    ctx.textAlign = 'center';
    ctx.fillText(value.toString(), pointX, pointY - 15);

    if (labels[index]) {
      ctx.font = getFontString(template.typography.bodyFont, 'normal', 12);
      ctx.fillStyle = rgbToCSS(template.typography.mutedColor);
      ctx.fillText(labels[index], pointX, y + height - 10);
    }
  });
}

function drawPieChart(
  ctx: CanvasRenderingContext2D,
  template: CarouselTemplate,
  chartData: any,
  x: number,
  y: number,
  width: number,
  height: number
): void {
  const values = chartData.values || [];
  const labels = chartData.labels || [];
  if (values.length === 0) return;

  const centerX = x + width / 2;
  const centerY = y + height / 2 - 20;
  const radius = Math.min(width, height) / 3;
  const total = values.reduce((sum: number, val: number) => sum + val, 0);
  let currentAngle = -Math.PI / 2;

  values.forEach((value: number, index: number) => {
    const sliceAngle = (value / total) * Math.PI * 2;
    const color = template.chartColors[index % template.chartColors.length];

    ctx.fillStyle = rgbToCSS(color);
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
    ctx.closePath();
    ctx.fill();

    const labelAngle = currentAngle + sliceAngle / 2;
    const labelRadius = radius + 50;
    const labelX = centerX + labelRadius * Math.cos(labelAngle);
    const labelY = centerY + labelRadius * Math.sin(labelAngle);

    const percentage = Math.round((value / total) * 100);
    ctx.font = getFontString(template.typography.bodyFont, 'bold', 20);
    ctx.fillStyle = rgbToCSS(template.typography.titleColor);
    ctx.textAlign = 'center';
    ctx.fillText(`${percentage}%`, labelX, labelY);

    if (labels[index]) {
      ctx.font = getFontString(template.typography.bodyFont, 'normal', 14);
      ctx.fillStyle = rgbToCSS(template.typography.mutedColor);
      ctx.fillText(labels[index], labelX, labelY + 20);
    }

    currentAngle += sliceAngle;
  });
}

function drawDonutChart(
  ctx: CanvasRenderingContext2D,
  template: CarouselTemplate,
  chartData: any,
  x: number,
  y: number,
  width: number,
  height: number
): void {
  const values = chartData.values || [];
  const labels = chartData.labels || [];
  if (values.length === 0) return;

  const centerX = x + width / 2;
  const centerY = y + height / 2 - 20;
  const outerRadius = Math.min(width, height) / 3;
  const innerRadius = outerRadius * 0.55;
  const total = values.reduce((sum: number, val: number) => sum + val, 0);
  let currentAngle = -Math.PI / 2;

  values.forEach((value: number, index: number) => {
    const sliceAngle = (value / total) * Math.PI * 2;
    const color = template.chartColors[index % template.chartColors.length];

    ctx.fillStyle = rgbToCSS(color);
    ctx.beginPath();
    ctx.arc(centerX, centerY, outerRadius, currentAngle, currentAngle + sliceAngle);
    ctx.arc(centerX, centerY, innerRadius, currentAngle + sliceAngle, currentAngle, true);
    ctx.closePath();
    ctx.fill();

    const labelAngle = currentAngle + sliceAngle / 2;
    const labelRadius = outerRadius + 45;
    const labelX = centerX + labelRadius * Math.cos(labelAngle);
    const labelY = centerY + labelRadius * Math.sin(labelAngle);

    const percentage = Math.round((value / total) * 100);
    ctx.font = getFontString(template.typography.bodyFont, 'bold', 18);
    ctx.fillStyle = rgbToCSS(template.typography.titleColor);
    ctx.textAlign = 'center';
    ctx.fillText(`${percentage}%`, labelX, labelY);

    if (labels[index]) {
      ctx.font = getFontString(template.typography.bodyFont, 'normal', 13);
      ctx.fillStyle = rgbToCSS(template.typography.mutedColor);
      ctx.fillText(labels[index], labelX, labelY + 18);
    }

    currentAngle += sliceAngle;
  });

  // Center total
  ctx.font = getFontString(template.typography.titleFont, 'bold', 42);
  ctx.fillStyle = rgbToCSS(template.typography.accentColor);
  ctx.textAlign = 'center';
  ctx.fillText(total.toString(), centerX, centerY + 10);

  ctx.font = getFontString(template.typography.bodyFont, 'normal', 16);
  ctx.fillStyle = rgbToCSS(template.typography.mutedColor);
  ctx.fillText('TOTAL', centerX, centerY + 35);
}

function drawComparisonChart(
  ctx: CanvasRenderingContext2D,
  template: CarouselTemplate,
  chartData: any,
  x: number,
  y: number,
  width: number,
  height: number
): void {
  const values = chartData.values || [];
  const labels = chartData.labels || [];
  if (values.length < 2) return;

  const columnWidth = (width - 120) / 2;
  const maxValue = Math.max(...values);

  // Left bar
  const leftX = x + 40;
  const leftBarHeight = (values[0] / maxValue) * (height - 120);
  const leftBarY = y + height - leftBarHeight - 60;

  ctx.fillStyle = rgbToCSS(template.typography.mutedColor);
  ctx.fillRect(leftX, leftBarY, columnWidth, leftBarHeight);

  ctx.font = getFontString(template.typography.titleFont, 'bold', 48);
  ctx.fillStyle = rgbToCSS(template.typography.titleColor);
  ctx.textAlign = 'center';
  ctx.fillText(values[0].toString(), leftX + columnWidth / 2, leftBarY - 25);

  ctx.font = getFontString(template.typography.bodyFont, 'normal', 20);
  ctx.fillStyle = rgbToCSS(template.typography.mutedColor);
  ctx.fillText(labels[0] || 'Before', leftX + columnWidth / 2, y + height - 25);

  // Right bar
  const rightX = x + width - columnWidth - 40;
  const rightBarHeight = (values[1] / maxValue) * (height - 120);
  const rightBarY = y + height - rightBarHeight - 60;

  ctx.fillStyle = rgbToCSS(template.typography.accentColor);
  ctx.fillRect(rightX, rightBarY, columnWidth, rightBarHeight);

  ctx.font = getFontString(template.typography.titleFont, 'bold', 48);
  ctx.fillStyle = rgbToCSS(template.typography.titleColor);
  ctx.textAlign = 'center';
  ctx.fillText(values[1].toString(), rightX + columnWidth / 2, rightBarY - 25);

  ctx.font = getFontString(template.typography.bodyFont, 'normal', 20);
  ctx.fillStyle = rgbToCSS(template.typography.mutedColor);
  ctx.fillText(labels[1] || 'After', rightX + columnWidth / 2, y + height - 25);

  // Arrow
  const arrowY = y + height / 2;
  ctx.strokeStyle = rgbToCSS(template.typography.accentColor);
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(x + width / 2 - 35, arrowY);
  ctx.lineTo(x + width / 2 + 35, arrowY);
  ctx.moveTo(x + width / 2 + 35, arrowY);
  ctx.lineTo(x + width / 2 + 15, arrowY - 15);
  ctx.moveTo(x + width / 2 + 35, arrowY);
  ctx.lineTo(x + width / 2 + 15, arrowY + 15);
  ctx.stroke();
}

function drawFunnelChart(
  ctx: CanvasRenderingContext2D,
  template: CarouselTemplate,
  chartData: any,
  x: number,
  y: number,
  width: number,
  height: number
): void {
  const values = chartData.values || [];
  const labels = chartData.labels || [];
  if (values.length === 0) return;

  const maxValue = Math.max(...values);
  const stageHeight = (height - 40) / values.length;
  const centerX = x + width / 2;

  values.forEach((value: number, index: number) => {
    const stageY = y + 20 + index * stageHeight;
    const stageWidth = (value / maxValue) * (width - 80);
    const nextWidth = index < values.length - 1 ? (values[index + 1] / maxValue) * (width - 80) : stageWidth * 0.6;

    const color = template.chartColors[index % template.chartColors.length];
    ctx.fillStyle = rgbToCSS(color);

    ctx.beginPath();
    ctx.moveTo(centerX - stageWidth / 2, stageY);
    ctx.lineTo(centerX + stageWidth / 2, stageY);
    ctx.lineTo(centerX + nextWidth / 2, stageY + stageHeight - 4);
    ctx.lineTo(centerX - nextWidth / 2, stageY + stageHeight - 4);
    ctx.closePath();
    ctx.fill();

    ctx.font = getFontString(template.typography.bodyFont, 'bold', 22);
    ctx.fillStyle = rgbToCSS({ r: 255, g: 255, b: 255 });
    ctx.textAlign = 'center';
    ctx.fillText(value.toString(), centerX, stageY + stageHeight / 2 + 5);

    if (labels[index]) {
      ctx.font = getFontString(template.typography.bodyFont, 'normal', 14);
      ctx.fillStyle = rgbToCSS(template.typography.mutedColor);
      ctx.textAlign = 'left';
      ctx.fillText(labels[index], centerX + stageWidth / 2 + 15, stageY + stageHeight / 2 + 5);
    }
  });
}

function drawGaugeChart(
  ctx: CanvasRenderingContext2D,
  template: CarouselTemplate,
  chartData: any,
  x: number,
  y: number,
  width: number,
  height: number
): void {
  const values = chartData.values || [];
  const labels = chartData.labels || [];
  if (values.length === 0) return;

  const value = values[0];
  const maxValue = values[1] || 100;
  const percentage = Math.min((value / maxValue) * 100, 100);

  const centerX = x + width / 2;
  const centerY = y + height / 2 + 40;
  const radius = Math.min(width, height) / 2.8;
  const thickness = 35;

  // Background arc
  ctx.strokeStyle = rgbToCSS({ r: 60, g: 60, b: 60 });
  ctx.lineWidth = thickness;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, Math.PI, 2 * Math.PI);
  ctx.stroke();

  // Value arc
  ctx.strokeStyle = rgbToCSS(template.typography.accentColor);
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, Math.PI, Math.PI + (percentage / 100) * Math.PI);
  ctx.stroke();

  // Center value
  ctx.font = getFontString(template.typography.titleFont, 'bold', 64);
  ctx.fillStyle = rgbToCSS(template.typography.titleColor);
  ctx.textAlign = 'center';
  ctx.fillText(value.toString(), centerX, centerY - 15);

  if (labels[0]) {
    ctx.font = getFontString(template.typography.bodyFont, 'normal', 20);
    ctx.fillStyle = rgbToCSS(template.typography.mutedColor);
    ctx.fillText(labels[0], centerX, centerY + 20);
  }

  // Min/Max
  ctx.font = getFontString(template.typography.bodyFont, 'normal', 16);
  ctx.fillText('0', centerX - radius - 15, centerY + 10);
  ctx.fillText(maxValue.toString(), centerX + radius + 15, centerY + 10);

  // Percentage
  ctx.font = getFontString(template.typography.bodyFont, 'bold', 24);
  ctx.fillStyle = rgbToCSS(template.typography.accentColor);
  ctx.fillText(`${Math.round(percentage)}%`, centerX, centerY + 70);
}

/**
 * Draw progress bars - great for showing multiple metrics
 */
function drawProgressBars(
  ctx: CanvasRenderingContext2D,
  template: CarouselTemplate,
  chartData: any,
  x: number,
  y: number,
  width: number,
  height: number
): void {
  const values = chartData.values || [];
  const labels = chartData.labels || [];
  if (values.length === 0) return;

  const maxValue = Math.max(...values, 100);
  const barHeight = 28;
  const barSpacing = 65;
  const startY = y + 30;
  const barWidth = width - 60;

  values.forEach((value: number, index: number) => {
    const barY = startY + index * barSpacing;
    const fillWidth = (value / maxValue) * barWidth;
    const color = template.chartColors[index % template.chartColors.length];

    // Label above bar
    if (labels[index]) {
      ctx.font = getFontString(template.typography.bodyFont, 'normal', 18);
      ctx.fillStyle = rgbToCSS(template.typography.bodyColor);
      ctx.textAlign = 'left';
      ctx.fillText(labels[index], x + 30, barY - 8);
    }

    // Value on right
    ctx.font = getFontString(template.typography.bodyFont, 'bold', 20);
    ctx.fillStyle = rgbToCSS(template.typography.titleColor);
    ctx.textAlign = 'right';
    ctx.fillText(`${value}%`, x + width - 30, barY - 8);

    // Background bar
    ctx.fillStyle = rgbToCSS({ r: 60, g: 60, b: 60 });
    ctx.beginPath();
    ctx.roundRect(x + 30, barY, barWidth, barHeight, 6);
    ctx.fill();

    // Filled bar
    ctx.fillStyle = rgbToCSS(color);
    ctx.beginPath();
    ctx.roundRect(x + 30, barY, fillWidth, barHeight, 6);
    ctx.fill();
  });
}

// Type guard to check if slide is new SlideData format
function isNewLayoutSlide(slide: CarouselSlide | SlideData): slide is SlideData {
  return 'layout' in slide && isValidSlideData(slide);
}

async function renderSlideToCanvas(
  slide: CarouselSlide | SlideData,
  slideIndex: number,
  totalSlides: number,
  template: CarouselTemplate
): Promise<HTMLCanvasElement> {
  const canvas = document.createElement('canvas');
  canvas.width = CANVAS_SIZE;
  canvas.height = CANVAS_SIZE;
  const ctx = canvas.getContext('2d')!;

  // Check if this is the new layout-based slide format
  if (isNewLayoutSlide(slide)) {
    // Use the new layout renderer for SlideData
    renderSlideByLayout(ctx, slide, slideIndex, totalSlides, template);
    return canvas;
  }

  // Legacy rendering for old CarouselSlide format
  // Draw background
  drawBackground(ctx, template.background);

  // Draw decorations (behind content)
  drawDots(ctx, template);
  drawBorder(ctx, template);

  // Draw page number
  drawPageNumber(ctx, template, slideIndex, totalSlides);

  // Draw content based on slide type
  let contentStartY: number;

  // Ensure title is a string
  const safeTitle = typeof slide.title === 'string' ? slide.title : '';

  switch (slide.slideType) {
    case 'chart':
      contentStartY = drawTitle(ctx, template, safeTitle);
      if (slide.chartData) {
        drawChart(ctx, template, slide.chartData, contentStartY + 20);
      }
      break;

    case 'data':
      contentStartY = drawTitle(ctx, template, safeTitle);
      // Extract and display large numbers with enhanced stat card design
      const dataContent = typeof slide.content === 'string' ? slide.content : '';
      const numbers = dataContent.match(/\d+[%$KMB]?/gi) || [];
      if (numbers.length > 0) {
        const mainStat = numbers[0];
        const cardCenterX = CANVAS_SIZE / 2;
        const cardCenterY = contentStartY + 180;

        // Draw decorative circle behind the number
        const accentColor = template.typography.accentColor;
        ctx.fillStyle = `rgba(${accentColor.r}, ${accentColor.g}, ${accentColor.b}, 0.15)`;
        ctx.beginPath();
        ctx.arc(cardCenterX, cardCenterY - 20, 120, 0, Math.PI * 2);
        ctx.fill();

        // Draw accent ring
        ctx.strokeStyle = rgbToCSS(template.typography.accentColor);
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(cardCenterX, cardCenterY - 20, 130, -Math.PI * 0.3, Math.PI * 0.3);
        ctx.stroke();

        // Draw the big number
        ctx.font = getFontString(template.typography.titleFont, 'black', 140);
        ctx.fillStyle = rgbToCSS(template.typography.accentColor);
        ctx.textAlign = 'center';
        ctx.fillText(mainStat, cardCenterX, cardCenterY);

        // Draw decorative underline
        const underlineWidth = ctx.measureText(mainStat).width * 0.8;
        ctx.fillStyle = rgbToCSS(template.typography.accentColor);
        ctx.fillRect(cardCenterX - underlineWidth / 2, cardCenterY + 20, underlineWidth, 4);

        // Description below with better styling
        const textContent = dataContent.replace(/\d+[%$KMB]?/gi, '').trim();
        if (textContent) {
          ctx.font = getFontString(template.typography.bodyFont, 'normal', 26);
          ctx.fillStyle = rgbToCSS(template.typography.bodyColor);
          const lines = wrapText(ctx, textContent, 700);
          lines.forEach((line, i) => {
            ctx.fillText(line, cardCenterX, cardCenterY + 80 + i * 38);
          });
        }
      }
      break;

    default: // text
      contentStartY = drawTitle(ctx, template, safeTitle);
      // Ensure content is a string before drawing
      const textContent = typeof slide.content === 'string' ? slide.content : '';
      drawContent(ctx, template, textContent, contentStartY + 30);
      break;
  }

  // Draw arrow (in front)
  drawArrow(ctx, template);

  return canvas;
}

/**
 * Render a slide at high resolution for PDF export
 * Renders at PDF_SCALE (2x) resolution for crisp output
 */
async function renderSlideToCanvasHD(
  slide: CarouselSlide | SlideData,
  slideIndex: number,
  totalSlides: number,
  template: CarouselTemplate
): Promise<HTMLCanvasElement> {
  const hdSize = CANVAS_SIZE * PDF_SCALE;
  const canvas = document.createElement('canvas');
  canvas.width = hdSize;
  canvas.height = hdSize;
  const ctx = canvas.getContext('2d')!;

  // Scale all drawing operations
  ctx.scale(PDF_SCALE, PDF_SCALE);

  // Check if this is the new layout-based slide format
  if (isNewLayoutSlide(slide)) {
    // Use the new layout renderer for SlideData
    renderSlideByLayout(ctx, slide, slideIndex, totalSlides, template);
    return canvas;
  }

  // Legacy rendering for old CarouselSlide format
  drawBackground(ctx, template.background);
  drawDots(ctx, template);
  drawBorder(ctx, template);
  drawPageNumber(ctx, template, slideIndex, totalSlides);

  let contentStartY: number;
  const safeTitle = typeof slide.title === 'string' ? slide.title : '';

  switch (slide.slideType) {
    case 'chart':
      contentStartY = drawTitle(ctx, template, safeTitle);
      if (slide.chartData) {
        drawChart(ctx, template, slide.chartData, contentStartY + 20);
      }
      break;
    case 'data':
      contentStartY = drawTitle(ctx, template, safeTitle);
      const dataContent = typeof slide.content === 'string' ? slide.content : '';
      const numbers = dataContent.match(/\d+[%$KMB]?/gi) || [];
      if (numbers.length > 0) {
        const mainStat = numbers[0];
        const cardCenterX = CANVAS_SIZE / 2;
        const cardCenterY = contentStartY + 180;
        const accentColor = template.typography.accentColor;
        ctx.fillStyle = `rgba(${accentColor.r}, ${accentColor.g}, ${accentColor.b}, 0.15)`;
        ctx.beginPath();
        ctx.arc(cardCenterX, cardCenterY - 20, 120, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = rgbToCSS(template.typography.accentColor);
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(cardCenterX, cardCenterY - 20, 130, -Math.PI * 0.3, Math.PI * 0.3);
        ctx.stroke();
        ctx.font = getFontString(template.typography.titleFont, 'black', 140);
        ctx.fillStyle = rgbToCSS(template.typography.accentColor);
        ctx.textAlign = 'center';
        ctx.fillText(mainStat, cardCenterX, cardCenterY);
        const underlineWidth = ctx.measureText(mainStat).width * 0.8;
        ctx.fillStyle = rgbToCSS(template.typography.accentColor);
        ctx.fillRect(cardCenterX - underlineWidth / 2, cardCenterY + 20, underlineWidth, 4);
        const textContent = dataContent.replace(/\d+[%$KMB]?/gi, '').trim();
        if (textContent) {
          ctx.font = getFontString(template.typography.bodyFont, 'normal', 26);
          ctx.fillStyle = rgbToCSS(template.typography.bodyColor);
          const lines = wrapText(ctx, textContent, 700);
          lines.forEach((line, i) => {
            ctx.fillText(line, cardCenterX, cardCenterY + 80 + i * 38);
          });
        }
      }
      break;
    default:
      contentStartY = drawTitle(ctx, template, safeTitle);
      const textContent = typeof slide.content === 'string' ? slide.content : '';
      drawContent(ctx, template, textContent, contentStartY + 30);
      break;
  }

  drawArrow(ctx, template);
  return canvas;
}

/**
 * Generate PDF from slides using Canvas rendering with templates
 * Uses parallel rendering for better performance
 * Renders at 2x resolution (2160x2160) for crisp, print-quality output
 * Supports both new SlideData format and legacy CarouselSlide format
 */
export async function generateTemplatedPDF(
  slides: (CarouselSlide | SlideData)[],
  template: CarouselTemplate = defaultTemplate,
  onProgress?: (current: number, total: number) => void
): Promise<File> {
  const startTime = performance.now();
  const hdSize = CANVAS_SIZE * PDF_SCALE;

  // Load fonts first
  await loadTemplateFonts(template);

  // Render all slides in parallel at high resolution
  console.log(`🚀 Starting HD parallel render of ${slides.length} slides at ${hdSize}x${hdSize}...`);

  const renderPromises = slides.map((slide, index) =>
    renderSlideToCanvasHD(slide, index, slides.length, template)
      .then(canvas => {
        // Always use PNG for best quality (no compression artifacts)
        const imageData = canvas.toDataURL('image/png');

        onProgress?.(index + 1, slides.length);
        console.log(`✅ Rendered HD slide ${index + 1}/${slides.length}`);

        return { index, imageData };
      })
  );

  const renderedSlides = await Promise.all(renderPromises);

  // Sort by index to maintain order (parallel execution may complete out of order)
  renderedSlides.sort((a, b) => a.index - b.index);

  // Create PDF - page size is logical size (1080), but images are high-res
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'px',
    format: [CANVAS_SIZE, CANVAS_SIZE],
    compress: false, // Disable compression for best quality
  });

  renderedSlides.forEach((slide, i) => {
    if (i > 0) {
      pdf.addPage();
    }
    // Image is hdSize but fits into CANVAS_SIZE page = crisp high-DPI output
    pdf.addImage(slide.imageData, 'PNG', 0, 0, CANVAS_SIZE, CANVAS_SIZE);
  });

  const elapsed = Math.round(performance.now() - startTime);
  console.log(`⚡ HD PDF generated in ${elapsed}ms (${Math.round(elapsed / slides.length)}ms per slide)`);

  // Convert to File
  const pdfBlob = pdf.output('blob');
  return new File([pdfBlob], 'linkedin-carousel.pdf', { type: 'application/pdf' });
}

/**
 * Generate thumbnail previews for all slides (for carousel preview)
 * Supports both new SlideData format and legacy CarouselSlide format
 */
export async function generateSlideThumbnails(
  slides: (CarouselSlide | SlideData)[],
  template: CarouselTemplate = defaultTemplate,
  thumbnailSize: number = 400
): Promise<string[]> {
  await loadTemplateFonts(template);

  const thumbnailPromises = slides.map(async (slide, index) => {
    const fullCanvas = await renderSlideToCanvas(slide, index, slides.length, template);

    // Create scaled thumbnail
    const thumbCanvas = document.createElement('canvas');
    thumbCanvas.width = thumbnailSize;
    thumbCanvas.height = thumbnailSize;
    const thumbCtx = thumbCanvas.getContext('2d')!;

    // Draw scaled version
    thumbCtx.drawImage(fullCanvas, 0, 0, thumbnailSize, thumbnailSize);

    return thumbCanvas.toDataURL('image/jpeg', 0.85);
  });

  return Promise.all(thumbnailPromises);
}

/**
 * Generate a thumbnail preview of a template
 */
export async function generateTemplatePreview(template: CarouselTemplate): Promise<string> {
  await loadTemplateFonts(template);

  const canvas = document.createElement('canvas');
  canvas.width = 400;
  canvas.height = 400;
  const ctx = canvas.getContext('2d')!;

  // Scale down
  ctx.scale(400 / CANVAS_SIZE, 400 / CANVAS_SIZE);

  // Draw background
  drawBackground(ctx, template.background);
  drawDots(ctx, template);
  drawBorder(ctx, template);

  // Sample title
  ctx.font = getFontString(template.typography.titleFont, template.typography.titleWeight, template.typography.titleSize);
  ctx.fillStyle = rgbToCSS(template.typography.titleColor);
  ctx.textAlign = template.layout.titleZone.align;

  const x = template.layout.titleZone.align === 'center'
    ? CANVAS_SIZE / 2
    : template.layout.titleZone.x * CANVAS_SIZE / 100;
  const y = template.layout.titleZone.y * CANVAS_SIZE / 100;

  ctx.fillText('Sample Title', x, y);
  ctx.fillText('Goes Here', x, y + template.typography.titleSize * 1.1);

  // Arrow
  drawArrow(ctx, template);

  return canvas.toDataURL('image/png');
}
