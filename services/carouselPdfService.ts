import jsPDF from 'jspdf';
import { CarouselSlide } from '../types';

/**
 * Generates a PDF file from carousel slides with support for multiple slide types
 * (text, chart with 10 visualization types, data)
 */
export const generateCarouselPDF = async (slides: CarouselSlide[]): Promise<File> => {
  // Create PDF in square format (LinkedIn carousel standard)
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'px',
    format: [1080, 1080] // Square format for LinkedIn
  });

  // Render each slide
  for (let i = 0; i < slides.length; i++) {
    if (i > 0) {
      pdf.addPage();
    }

    const slide = slides[i];

    // Render based on slide type
    switch (slide.slideType) {
      case 'text':
        renderTextSlide(pdf, slide, i, slides.length);
        break;
      case 'chart':
        renderChartSlide(pdf, slide, i, slides.length);
        break;
      case 'data':
        renderDataSlide(pdf, slide, i, slides.length);
        break;
      default:
        // Fallback to text rendering
        renderTextSlide(pdf, slide, i, slides.length);
    }
  }

  // Convert to File object
  const pdfBlob = pdf.output('blob');
  return new File([pdfBlob], 'linkedin-carousel.pdf', { type: 'application/pdf' });
};

/**
 * Renders a text-based slide with title and content - Premium Dark Design
 */
function renderTextSlide(pdf: jsPDF, slide: CarouselSlide, slideIndex: number, totalSlides: number): void {

  // Dark background
  pdf.setFillColor(10, 10, 10);
  pdf.rect(0, 0, 1080, 1080, 'F');

  // Subtle border
  pdf.setDrawColor(60, 60, 60);
  pdf.setLineWidth(2);
  pdf.rect(0, 0, 1080, 1080, 'S');

  // Slide number (top left) - [01/08] format
  pdf.setFont('courier', 'normal');
  pdf.setFontSize(16);
  pdf.setTextColor(128, 128, 128);
  const slideNum = String(slideIndex + 1).padStart(2, '0');
  const totalNum = String(totalSlides).padStart(2, '0');
  pdf.text(`[${slideNum}/${totalNum}]`, 80, 80);

  // Title - Large, bold, white
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(72);
  pdf.setTextColor(255, 255, 255);

  // Ensure title is a string
  const safeTitle = typeof slide.title === 'string' ? slide.title : '';
  const titleLines = pdf.splitTextToSize(safeTitle, 900);
  const titleY = titleLines.length > 2 ? 280 : 380;

  titleLines.forEach((line, index) => {
    const lineY = titleY + (index * 80);
    pdf.text(line, 540, lineY, { align: 'center', maxWidth: 900 });
  });

  // Orange accent line under title
  pdf.setFillColor(255, 107, 53);
  pdf.rect(390, titleY + (titleLines.length * 80) + 20, 300, 4, 'F');

  // Content - Clean, readable, gray-white
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(28);
  pdf.setTextColor(200, 200, 200);

  // Ensure content is a string before splitting
  const contentStr = typeof slide.content === 'string' ? slide.content : '';
  const contentLines = contentStr.split('\n').filter(line => line.trim());
  let contentY = titleY + (titleLines.length * 80) + 100;

  contentLines.forEach((line) => {
    const trimmedLine = line.trim();

    if (trimmedLine.startsWith('•') || trimmedLine.startsWith('-') || trimmedLine.startsWith('*')) {
      // Bullet points with orange bullets
      const bulletText = trimmedLine.substring(1).trim();

      // Draw orange bullet
      pdf.setFillColor(255, 107, 53);
      pdf.circle(140, contentY - 8, 6, 'F');

      // Bullet text
      pdf.setTextColor(200, 200, 200);
      const wrappedLines = pdf.splitTextToSize(bulletText, 800);
      pdf.text(wrappedLines, 180, contentY, { maxWidth: 800 });
      contentY += wrappedLines.length * 45;
    } else {
      const wrappedLines = pdf.splitTextToSize(trimmedLine, 850);
      pdf.text(wrappedLines, 540, contentY, { align: 'center', maxWidth: 850 });
      contentY += wrappedLines.length * 45;
    }
  });
}

/**
 * Renders a chart slide with data visualization - Premium Dark Design
 */
function renderChartSlide(pdf: jsPDF, slide: CarouselSlide, slideIndex: number, totalSlides: number): void {
  // Dark background
  pdf.setFillColor(10, 10, 10);
  pdf.rect(0, 0, 1080, 1080, 'F');

  // Border
  pdf.setDrawColor(60, 60, 60);
  pdf.setLineWidth(2);
  pdf.rect(0, 0, 1080, 1080, 'S');

  // Slide number
  pdf.setFont('courier', 'normal');
  pdf.setFontSize(16);
  pdf.setTextColor(128, 128, 128);
  const slideNum = String(slideIndex + 1).padStart(2, '0');
  const totalNum = String(totalSlides).padStart(2, '0');
  pdf.text(`[${slideNum}/${totalNum}]`, 80, 80);

  // Title
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(56);
  pdf.setTextColor(255, 255, 255);
  // Ensure title is a string
  const safeTitle = typeof slide.title === 'string' ? slide.title : '';
  const titleLines = pdf.splitTextToSize(safeTitle, 900);
  pdf.text(titleLines, 540, 150, { align: 'center', maxWidth: 900 });

  // Chart rendering area
  const chartX = 150;
  const chartY = 250;
  const chartWidth = 780;
  const chartHeight = 500;

  if (slide.chartData) {
    switch (slide.chartData.type) {
      case 'bar':
        renderBarChart(pdf, chartX, chartY, chartWidth, chartHeight, slide.chartData);
        break;
      case 'horizontal-bar':
        renderHorizontalBarChart(pdf, chartX, chartY, chartWidth, chartHeight, slide.chartData);
        break;
      case 'stacked-bar':
        renderStackedBarChart(pdf, chartX, chartY, chartWidth, chartHeight, slide.chartData);
        break;
      case 'line':
        renderLineChart(pdf, chartX, chartY, chartWidth, chartHeight, slide.chartData);
        break;
      case 'area':
        renderAreaChart(pdf, chartX, chartY, chartWidth, chartHeight, slide.chartData);
        break;
      case 'pie':
        renderPieChart(pdf, chartX, chartY, chartWidth, chartHeight, slide.chartData);
        break;
      case 'donut':
        renderDonutChart(pdf, chartX, chartY, chartWidth, chartHeight, slide.chartData);
        break;
      case 'comparison':
        renderComparisonChart(pdf, chartX, chartY, chartWidth, chartHeight, slide.chartData);
        break;
      case 'funnel':
        renderFunnelChart(pdf, chartX, chartY, chartWidth, chartHeight, slide.chartData);
        break;
      case 'gauge':
        renderGaugeChart(pdf, chartX, chartY, chartWidth, chartHeight, slide.chartData);
        break;
    }

    // Chart description
    if (slide.chartData.description) {
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(22);
      pdf.setTextColor(180, 180, 180);
      const descLines = pdf.splitTextToSize(slide.chartData.description, 900);
      pdf.text(descLines, 540, chartY + chartHeight + 60, { align: 'center', maxWidth: 900 });
    }
  }

  // Orange accent line
  pdf.setFillColor(255, 107, 53);
  pdf.rect(390, 190, 300, 4, 'F');
}

/**
 * Renders a bar chart - Modern Dark Design
 */
function renderBarChart(
  pdf: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number,
  chartData: any
): void {
  const values = chartData.values || [];
  const labels = chartData.labels || [];

  if (values.length === 0) return;

  // Draw axes with subtle color
  pdf.setDrawColor(80, 80, 80);
  pdf.setLineWidth(2);
  pdf.line(x, y + height, x + width, y + height); // X-axis
  pdf.line(x, y, x, y + height); // Y-axis

  // Calculate bar dimensions
  const maxValue = Math.max(...values);
  const barWidth = (width - 100) / values.length;
  const barSpacing = barWidth * 0.2;
  const actualBarWidth = barWidth - barSpacing;

  // Orange gradient for bars
  const orangeShades = [
    [255, 107, 53],   // Main orange
    [255, 130, 80],   // Lighter
    [255, 90, 40],    // Darker
    [255, 120, 65],   // Medium
  ];

  // Draw bars
  values.forEach((value, index) => {
    const barHeight = (value / maxValue) * (height - 80);
    const barX = x + 50 + (index * barWidth);
    const barY = y + height - barHeight - 40;

    // Bar with gradient effect (darker at bottom)
    const orange = orangeShades[index % orangeShades.length];

    // Main bar
    pdf.setFillColor(orange[0], orange[1], orange[2]);
    pdf.rect(barX, barY, actualBarWidth, barHeight, 'F');

    // Value on top
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(24);
    pdf.setTextColor(255, 255, 255);
    pdf.text(value.toString(), barX + actualBarWidth / 2, barY - 15, { align: 'center' });

    // Label - use smaller font for longer labels instead of truncating
    if (labels[index]) {
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(180, 180, 180);

      const label = labels[index];
      // Dynamic font sizing based on label length - NO truncation
      const fontSize = label.length > 15 ? 14 : label.length > 10 ? 16 : 18;
      pdf.setFontSize(fontSize);
      pdf.text(label, barX + actualBarWidth / 2, y + height - 10, { align: 'center' });
    }
  });
}

/**
 * Renders a line chart - Modern Dark Design
 */
function renderLineChart(
  pdf: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number,
  chartData: any
): void {
  const values = chartData.values || [];
  const labels = chartData.labels || [];

  if (values.length === 0) return;

  // Draw axes
  pdf.setDrawColor(80, 80, 80);
  pdf.setLineWidth(2);
  pdf.line(x, y + height, x + width, y + height); // X-axis
  pdf.line(x, y, x, y + height); // Y-axis

  // Calculate points
  const maxValue = Math.max(...values);
  const pointSpacing = (width - 100) / (values.length - 1 || 1);

  // Draw line
  pdf.setDrawColor(255, 107, 53);
  pdf.setLineWidth(5);

  for (let i = 0; i < values.length - 1; i++) {
    const x1 = x + 50 + (i * pointSpacing);
    const y1 = y + height - 40 - ((values[i] / maxValue) * (height - 80));
    const x2 = x + 50 + ((i + 1) * pointSpacing);
    const y2 = y + height - 40 - ((values[i + 1] / maxValue) * (height - 80));

    pdf.line(x1, y1, x2, y2);
  }

  // Draw points and labels
  values.forEach((value, index) => {
    const pointX = x + 50 + (index * pointSpacing);
    const pointY = y + height - 40 - ((value / maxValue) * (height - 80));

    // Point
    pdf.setFillColor(255, 107, 53);
    pdf.circle(pointX, pointY, 10, 'F');

    // Inner white dot
    pdf.setFillColor(255, 255, 255);
    pdf.circle(pointX, pointY, 5, 'F');

    // Value
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(22);
    pdf.setTextColor(255, 255, 255);
    pdf.text(value.toString(), pointX, pointY - 25, { align: 'center' });

    // Label - use smaller font for longer labels instead of truncating
    if (labels[index]) {
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(180, 180, 180);

      const label = labels[index];
      // Dynamic font sizing based on label length - NO truncation
      const fontSize = label.length > 15 ? 14 : label.length > 10 ? 16 : 18;
      pdf.setFontSize(fontSize);
      pdf.text(label, pointX, y + height - 10, { align: 'center' });
    }
  });
}

/**
 * Renders a pie chart
 */
function renderPieChart(
  pdf: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number,
  chartData: any
): void {
  const values = chartData.values || [];
  const labels = chartData.labels || [];

  if (values.length === 0) return;

  // Center and radius
  const centerX = x + width / 2;
  const centerY = y + height / 2 - 30;
  const radius = Math.min(width, height) / 3;

  // Calculate total and angles
  const total = values.reduce((sum, val) => sum + val, 0);
  let currentAngle = -90; // Start from top

  // Modern color palette - Orange shades and complementary colors
  const colors = [
    [255, 107, 53],   // Primary orange
    [255, 130, 80],   // Light orange
    [255, 170, 120],  // Pale orange
    [255, 90, 40],    // Dark orange
    [200, 80, 40],    // Deep orange
    [255, 150, 100]   // Medium orange
  ];

  // Draw slices
  values.forEach((value, index) => {
    const sliceAngle = (value / total) * 360;
    const color = colors[index % colors.length];

    pdf.setFillColor(color[0], color[1], color[2]);

    // Draw pie slice using path
    const startAngle = (currentAngle * Math.PI) / 180;
    const endAngle = ((currentAngle + sliceAngle) * Math.PI) / 180;

    pdf.setFillColor(color[0], color[1], color[2]);

    // Simple arc approximation
    const segments = Math.ceil(sliceAngle / 5);
    for (let i = 0; i <= segments; i++) {
      const angle = startAngle + (endAngle - startAngle) * (i / segments);
      const px = centerX + radius * Math.cos(angle);
      const py = centerY + radius * Math.sin(angle);

      if (i === 0) {
        pdf.setDrawColor(color[0], color[1], color[2]);
        pdf.line(centerX, centerY, px, py);
      } else {
        const prevAngle = startAngle + (endAngle - startAngle) * ((i - 1) / segments);
        const prevPx = centerX + radius * Math.cos(prevAngle);
        const prevPy = centerY + radius * Math.sin(prevAngle);
        pdf.triangle(centerX, centerY, prevPx, prevPy, px, py, 'F');
      }
    }

    // Label with percentage
    const labelAngle = currentAngle + sliceAngle / 2;
    const labelRadius = radius + 60;
    const labelX = centerX + labelRadius * Math.cos((labelAngle * Math.PI) / 180);
    const labelY = centerY + labelRadius * Math.sin((labelAngle * Math.PI) / 180);

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(24);
    pdf.setTextColor(255, 255, 255);
    const percentage = Math.round((value / total) * 100);
    pdf.text(`${percentage}%`, labelX, labelY, { align: 'center' });

    if (labels[index]) {
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(18);
      pdf.setTextColor(180, 180, 180);
      pdf.text(labels[index], labelX, labelY + 25, { align: 'center' });
    }

    currentAngle += sliceAngle;
  });
}

/**
 * Renders a comparison chart (before/after or A/B comparison) - Modern Dark Design
 */
function renderComparisonChart(
  pdf: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number,
  chartData: any
): void {
  const values = chartData.values || [];
  const labels = chartData.labels || [];

  if (values.length < 2) return;

  // Draw two columns for comparison
  const columnWidth = (width - 150) / 2;
  const maxValue = Math.max(...values);

  // Left column (Before/Option A)
  const leftX = x + 50;
  const leftBarHeight = (values[0] / maxValue) * (height - 150);
  const leftBarY = y + height - leftBarHeight - 80;

  // Red/gray for before/old
  pdf.setFillColor(128, 128, 128);
  pdf.rect(leftX, leftBarY, columnWidth, leftBarHeight, 'F');

  // Value
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(56);
  pdf.setTextColor(255, 255, 255);
  pdf.text(values[0].toString(), leftX + columnWidth / 2, leftBarY - 30, { align: 'center' });

  // Label
  pdf.setFontSize(24);
  pdf.setTextColor(180, 180, 180);
  const leftLabel = labels[0] || 'Before';
  pdf.text(leftLabel, leftX + columnWidth / 2, y + height - 40, { align: 'center' });

  // Right column (After/Option B)
  const rightX = x + width - columnWidth - 50;
  const rightBarHeight = (values[1] / maxValue) * (height - 150);
  const rightBarY = y + height - rightBarHeight - 80;

  // Orange for after/new (success)
  pdf.setFillColor(255, 107, 53);
  pdf.rect(rightX, rightBarY, columnWidth, rightBarHeight, 'F');

  // Value
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(56);
  pdf.setTextColor(255, 255, 255);
  pdf.text(values[1].toString(), rightX + columnWidth / 2, rightBarY - 30, { align: 'center' });

  // Label
  pdf.setFontSize(24);
  pdf.setTextColor(180, 180, 180);
  const rightLabel = labels[1] || 'After';
  pdf.text(rightLabel, rightX + columnWidth / 2, y + height - 40, { align: 'center' });

  // Arrow indicator - draw with lines since Unicode arrows don't render in jsPDF
  const arrowCenterX = x + width / 2;
  const arrowCenterY = y + height / 2;
  pdf.setDrawColor(255, 107, 53);
  pdf.setLineWidth(6);
  // Arrow shaft
  pdf.line(arrowCenterX - 40, arrowCenterY, arrowCenterX + 40, arrowCenterY);
  // Arrow head
  pdf.line(arrowCenterX + 40, arrowCenterY, arrowCenterX + 20, arrowCenterY - 20);
  pdf.line(arrowCenterX + 40, arrowCenterY, arrowCenterX + 20, arrowCenterY + 20);
}

/**
 * Renders a horizontal bar chart - Good for rankings and long labels
 */
function renderHorizontalBarChart(
  pdf: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number,
  chartData: any
): void {
  const values = chartData.values || [];
  const labels = chartData.labels || [];

  if (values.length === 0) return;

  const maxValue = Math.max(...values);
  const barHeight = (height - 80) / values.length;
  const barSpacing = barHeight * 0.15;
  const actualBarHeight = barHeight - barSpacing;

  const orangeShades = [
    [255, 107, 53],
    [255, 130, 80],
    [255, 90, 40],
    [255, 120, 65],
  ];

  values.forEach((value: number, index: number) => {
    const barWidth = (value / maxValue) * (width - 200);
    const barY = y + 40 + index * barHeight;
    const barX = x + 150;

    const orange = orangeShades[index % orangeShades.length];
    pdf.setFillColor(orange[0], orange[1], orange[2]);
    pdf.rect(barX, barY, barWidth, actualBarHeight, 'F');

    // Value at end of bar
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(20);
    pdf.setTextColor(255, 255, 255);
    pdf.text(value.toString(), barX + barWidth + 15, barY + actualBarHeight / 2 + 7);

    // Label on left
    if (labels[index]) {
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(180, 180, 180);
      const fontSize = labels[index].length > 20 ? 14 : 18;
      pdf.setFontSize(fontSize);
      pdf.text(labels[index], barX - 10, barY + actualBarHeight / 2 + 5, { align: 'right' });
    }
  });
}

/**
 * Renders a stacked bar chart - Shows part-to-whole relationships
 */
function renderStackedBarChart(
  pdf: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number,
  chartData: any
): void {
  const values = chartData.values || [];
  const labels = chartData.labels || [];

  if (values.length === 0) return;

  // For stacked bar, we show a single bar with segments
  const total = values.reduce((sum: number, val: number) => sum + val, 0);
  const barWidth = width - 100;
  const barHeight = 120;
  const barX = x + 50;
  const barY = y + height / 2 - barHeight / 2;

  const orangeShades = [
    [255, 107, 53],
    [255, 140, 90],
    [255, 80, 30],
    [255, 160, 110],
    [200, 80, 40],
  ];

  let currentX = barX;

  values.forEach((value: number, index: number) => {
    const segmentWidth = (value / total) * barWidth;
    const orange = orangeShades[index % orangeShades.length];

    pdf.setFillColor(orange[0], orange[1], orange[2]);
    pdf.rect(currentX, barY, segmentWidth, barHeight, 'F');

    // Percentage in segment
    const percentage = Math.round((value / total) * 100);
    if (segmentWidth > 50) {
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(18);
      pdf.setTextColor(255, 255, 255);
      pdf.text(`${percentage}%`, currentX + segmentWidth / 2, barY + barHeight / 2 + 6, { align: 'center' });
    }

    // Label below
    if (labels[index]) {
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(14);
      pdf.setTextColor(180, 180, 180);
      pdf.text(labels[index], currentX + segmentWidth / 2, barY + barHeight + 30, { align: 'center' });
    }

    currentX += segmentWidth;
  });

  // Total label
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(24);
  pdf.setTextColor(255, 255, 255);
  pdf.text(`Total: ${total}`, x + width / 2, barY - 30, { align: 'center' });
}

/**
 * Renders an area chart - Line chart with filled area below
 */
function renderAreaChart(
  pdf: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number,
  chartData: any
): void {
  const values = chartData.values || [];
  const labels = chartData.labels || [];

  if (values.length === 0) return;

  // Draw axes
  pdf.setDrawColor(80, 80, 80);
  pdf.setLineWidth(2);
  pdf.line(x, y + height, x + width, y + height);
  pdf.line(x, y, x, y + height);

  const maxValue = Math.max(...values);
  const pointSpacing = (width - 100) / (values.length - 1 || 1);

  // Draw filled area using triangles with lighter orange color
  pdf.setFillColor(255, 160, 120); // Lighter orange for fill area

  for (let i = 0; i < values.length - 1; i++) {
    const x1 = x + 50 + i * pointSpacing;
    const y1 = y + height - 40 - ((values[i] / maxValue) * (height - 80));
    const x2 = x + 50 + (i + 1) * pointSpacing;
    const y2 = y + height - 40 - ((values[i + 1] / maxValue) * (height - 80));
    const baseY = y + height - 40;

    // Fill quad as two triangles
    pdf.triangle(x1, y1, x2, y2, x1, baseY, 'F');
    pdf.triangle(x2, y2, x2, baseY, x1, baseY, 'F');
  }

  // Draw line on top
  pdf.setDrawColor(255, 107, 53);
  pdf.setLineWidth(4);
  for (let i = 0; i < values.length - 1; i++) {
    const x1 = x + 50 + i * pointSpacing;
    const y1 = y + height - 40 - ((values[i] / maxValue) * (height - 80));
    const x2 = x + 50 + (i + 1) * pointSpacing;
    const y2 = y + height - 40 - ((values[i + 1] / maxValue) * (height - 80));
    pdf.line(x1, y1, x2, y2);
  }

  // Draw points and labels
  values.forEach((value: number, index: number) => {
    const pointX = x + 50 + index * pointSpacing;
    const pointY = y + height - 40 - ((value / maxValue) * (height - 80));

    pdf.setFillColor(255, 107, 53);
    pdf.circle(pointX, pointY, 8, 'F');
    pdf.setFillColor(255, 255, 255);
    pdf.circle(pointX, pointY, 4, 'F');

    // Value
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(18);
    pdf.setTextColor(255, 255, 255);
    pdf.text(value.toString(), pointX, pointY - 20, { align: 'center' });

    // Label
    if (labels[index]) {
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(14);
      pdf.setTextColor(180, 180, 180);
      pdf.text(labels[index], pointX, y + height - 10, { align: 'center' });
    }
  });
}

/**
 * Renders a donut chart - Pie with center hole for key metric
 */
function renderDonutChart(
  pdf: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number,
  chartData: any
): void {
  const values = chartData.values || [];
  const labels = chartData.labels || [];

  if (values.length === 0) return;

  const centerX = x + width / 2;
  const centerY = y + height / 2 - 20;
  const outerRadius = Math.min(width, height) / 3;
  const innerRadius = outerRadius * 0.55;

  const total = values.reduce((sum: number, val: number) => sum + val, 0);
  let currentAngle = -90;

  const colors = [
    [255, 107, 53],
    [255, 140, 90],
    [255, 80, 30],
    [255, 170, 120],
    [200, 80, 40],
    [255, 160, 100],
  ];

  // Draw donut slices
  values.forEach((value: number, index: number) => {
    const sliceAngle = (value / total) * 360;
    const color = colors[index % colors.length];

    pdf.setFillColor(color[0], color[1], color[2]);

    const startAngle = (currentAngle * Math.PI) / 180;
    const endAngle = ((currentAngle + sliceAngle) * Math.PI) / 180;

    // Draw arc segments
    const segments = Math.ceil(sliceAngle / 3);
    for (let i = 0; i < segments; i++) {
      const a1 = startAngle + (endAngle - startAngle) * (i / segments);
      const a2 = startAngle + (endAngle - startAngle) * ((i + 1) / segments);

      const ox1 = centerX + outerRadius * Math.cos(a1);
      const oy1 = centerY + outerRadius * Math.sin(a1);
      const ox2 = centerX + outerRadius * Math.cos(a2);
      const oy2 = centerY + outerRadius * Math.sin(a2);
      const ix1 = centerX + innerRadius * Math.cos(a1);
      const iy1 = centerY + innerRadius * Math.sin(a1);
      const ix2 = centerX + innerRadius * Math.cos(a2);
      const iy2 = centerY + innerRadius * Math.sin(a2);

      // Draw as triangles
      pdf.triangle(ix1, iy1, ox1, oy1, ox2, oy2, 'F');
      pdf.triangle(ix1, iy1, ox2, oy2, ix2, iy2, 'F');
    }

    // Label
    const labelAngle = currentAngle + sliceAngle / 2;
    const labelRadius = outerRadius + 50;
    const labelX = centerX + labelRadius * Math.cos((labelAngle * Math.PI) / 180);
    const labelY = centerY + labelRadius * Math.sin((labelAngle * Math.PI) / 180);

    const percentage = Math.round((value / total) * 100);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(20);
    pdf.setTextColor(255, 255, 255);
    pdf.text(`${percentage}%`, labelX, labelY, { align: 'center' });

    if (labels[index]) {
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(16);
      pdf.setTextColor(180, 180, 180);
      pdf.text(labels[index], labelX, labelY + 22, { align: 'center' });
    }

    currentAngle += sliceAngle;
  });

  // Center circle (hole)
  pdf.setFillColor(10, 10, 10);
  pdf.circle(centerX, centerY, innerRadius, 'F');

  // Center text - total or key metric
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(48);
  pdf.setTextColor(255, 107, 53);
  pdf.text(total.toString(), centerX, centerY + 10, { align: 'center' });

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(18);
  pdf.setTextColor(180, 180, 180);
  pdf.text('TOTAL', centerX, centerY + 40, { align: 'center' });
}

/**
 * Renders a funnel chart - For conversion flows and pipelines
 */
function renderFunnelChart(
  pdf: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number,
  chartData: any
): void {
  const values = chartData.values || [];
  const labels = chartData.labels || [];

  if (values.length === 0) return;

  const maxValue = Math.max(...values);
  const stageHeight = (height - 60) / values.length;
  const centerX = x + width / 2;

  const orangeShades = [
    [255, 107, 53],
    [255, 130, 80],
    [255, 90, 40],
    [255, 150, 100],
    [200, 80, 40],
  ];

  values.forEach((value: number, index: number) => {
    const stageY = y + 30 + index * stageHeight;
    const stageWidth = (value / maxValue) * (width - 100);
    const nextWidth = index < values.length - 1 ? (values[index + 1] / maxValue) * (width - 100) : stageWidth * 0.6;

    const orange = orangeShades[index % orangeShades.length];
    pdf.setFillColor(orange[0], orange[1], orange[2]);

    // Draw trapezoid
    const topLeft = centerX - stageWidth / 2;
    const topRight = centerX + stageWidth / 2;
    const bottomLeft = centerX - nextWidth / 2;
    const bottomRight = centerX + nextWidth / 2;

    // Draw as triangles
    pdf.triangle(topLeft, stageY, topRight, stageY, bottomRight, stageY + stageHeight - 5, 'F');
    pdf.triangle(topLeft, stageY, bottomRight, stageY + stageHeight - 5, bottomLeft, stageY + stageHeight - 5, 'F');

    // Value and label
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(24);
    pdf.setTextColor(255, 255, 255);
    pdf.text(value.toString(), centerX, stageY + stageHeight / 2, { align: 'center' });

    if (labels[index]) {
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(16);
      pdf.setTextColor(180, 180, 180);
      pdf.text(labels[index], centerX + stageWidth / 2 + 20, stageY + stageHeight / 2 + 5);
    }

    // Conversion rate (if not last)
    if (index < values.length - 1) {
      const rate = Math.round((values[index + 1] / value) * 100);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(14);
      pdf.setTextColor(255, 107, 53);
      pdf.text(`${rate}%`, centerX - stageWidth / 2 - 40, stageY + stageHeight - 10, { align: 'center' });
    }
  });
}

/**
 * Renders a gauge chart - Semi-circle meter for single KPI
 */
function renderGaugeChart(
  pdf: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number,
  chartData: any
): void {
  const values = chartData.values || [];
  const labels = chartData.labels || [];

  if (values.length === 0) return;

  const value = values[0];
  const maxValue = values[1] || 100; // Second value is max, default 100
  const percentage = Math.min((value / maxValue) * 100, 100);

  const centerX = x + width / 2;
  const centerY = y + height / 2 + 50;
  const radius = Math.min(width, height) / 2.5;
  const thickness = 40;

  // Background arc (gray)
  pdf.setDrawColor(60, 60, 60);
  pdf.setLineWidth(thickness);

  // Draw background arc
  const bgSegments = 60;
  for (let i = 0; i < bgSegments; i++) {
    const angle1 = Math.PI + (i / bgSegments) * Math.PI;
    const angle2 = Math.PI + ((i + 1) / bgSegments) * Math.PI;
    const x1 = centerX + radius * Math.cos(angle1);
    const y1 = centerY + radius * Math.sin(angle1);
    const x2 = centerX + radius * Math.cos(angle2);
    const y2 = centerY + radius * Math.sin(angle2);
    pdf.line(x1, y1, x2, y2);
  }

  // Value arc (orange)
  pdf.setDrawColor(255, 107, 53);
  const valueSegments = Math.floor((percentage / 100) * bgSegments);
  for (let i = 0; i < valueSegments; i++) {
    const angle1 = Math.PI + (i / bgSegments) * Math.PI;
    const angle2 = Math.PI + ((i + 1) / bgSegments) * Math.PI;
    const x1 = centerX + radius * Math.cos(angle1);
    const y1 = centerY + radius * Math.sin(angle1);
    const x2 = centerX + radius * Math.cos(angle2);
    const y2 = centerY + radius * Math.sin(angle2);
    pdf.line(x1, y1, x2, y2);
  }

  // Center value
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(72);
  pdf.setTextColor(255, 255, 255);
  pdf.text(value.toString(), centerX, centerY - 20, { align: 'center' });

  // Label below
  if (labels[0]) {
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(24);
    pdf.setTextColor(180, 180, 180);
    pdf.text(labels[0], centerX, centerY + 30, { align: 'center' });
  }

  // Min/Max labels
  pdf.setFontSize(18);
  pdf.text('0', centerX - radius - 20, centerY + 10, { align: 'center' });
  pdf.text(maxValue.toString(), centerX + radius + 20, centerY + 10, { align: 'center' });

  // Percentage
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(28);
  pdf.setTextColor(255, 107, 53);
  pdf.text(`${Math.round(percentage)}%`, centerX, centerY + 80, { align: 'center' });
}

/**
 * Renders a data/metrics slide with large numbers - Modern Dark Design
 */
function renderDataSlide(pdf: jsPDF, slide: CarouselSlide, slideIndex: number, totalSlides: number): void {
  // Dark background
  pdf.setFillColor(10, 10, 10);
  pdf.rect(0, 0, 1080, 1080, 'F');

  // Border
  pdf.setDrawColor(60, 60, 60);
  pdf.setLineWidth(2);
  pdf.rect(0, 0, 1080, 1080, 'S');

  // Slide number
  pdf.setFont('courier', 'normal');
  pdf.setFontSize(16);
  pdf.setTextColor(128, 128, 128);
  const slideNum = String(slideIndex + 1).padStart(2, '0');
  const totalNum = String(totalSlides).padStart(2, '0');
  pdf.text(`[${slideNum}/${totalNum}]`, 80, 80);

  // Title
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(48);
  pdf.setTextColor(255, 255, 255);
  // Ensure title is a string
  const safeTitle = typeof slide.title === 'string' ? slide.title : '';
  const titleLines = pdf.splitTextToSize(safeTitle, 900);
  pdf.text(titleLines, 540, 200, { align: 'center', maxWidth: 900 });

  // Extract numbers from content for big display (ensure content is a string)
  const dataContent = typeof slide.content === 'string' ? slide.content : '';
  const numbers = dataContent.match(/\d+[%\$]?/g) || [];

  if (numbers.length > 0) {
    // Display large number(s)
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(140);
    pdf.setTextColor(255, 107, 53); // Orange

    if (numbers.length === 1) {
      // Single large number
      pdf.text(numbers[0], 540, 500, { align: 'center' });
    } else {
      // Multiple numbers in a row
      pdf.setFontSize(100);
      const spacing = 280;
      const startX = 540 - ((numbers.length - 1) * spacing) / 2;
      numbers.slice(0, 3).forEach((num, index) => {
        pdf.text(num, startX + (index * spacing), 480, { align: 'center' });
      });
    }
  }

  // Description text
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(28);
  pdf.setTextColor(200, 200, 200);

  // Remove numbers from content to show only descriptive text
  const textContent = dataContent.replace(/\d+[%\$]?/g, '').trim();
  const contentLines = pdf.splitTextToSize(textContent, 850);
  pdf.text(contentLines, 540, 700, { align: 'center', maxWidth: 850 });

  // Add metric labels if provided
  if (slide.chartData?.labels && slide.chartData.labels.length > 0) {
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(24);
    pdf.setTextColor(180, 180, 180);
    const labelText = slide.chartData.labels.join(' • ');
    pdf.text(labelText, 540, 900, { align: 'center' });
  }

  // Orange accent line at bottom
  pdf.setFillColor(255, 107, 53);
  pdf.rect(390, 950, 300, 4, 'F');
}
