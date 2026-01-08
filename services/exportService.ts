// Export Service - Export posts in various formats

import { saveAs } from 'file-saver';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
import { GenerationResult, ContentType } from '../types';
import { SlideData } from '../types/slideLayouts';

export interface ExportOptions {
  includeMetadata?: boolean;
  includeTopic?: boolean;
  includeTimestamp?: boolean;
}

// Generate filename with timestamp
function generateFilename(baseName: string, extension: string): string {
  const timestamp = new Date().toISOString().split('T')[0];
  const sanitized = baseName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .substring(0, 50);
  return `linkedin-post-${sanitized}-${timestamp}.${extension}`;
}

// Export as plain text (.txt)
export function exportAsText(
  post: string,
  topic?: string,
  options: ExportOptions = {}
): void {
  let content = '';

  // Add metadata if requested
  if (options.includeMetadata) {
    content += '='.repeat(50) + '\n';
    content += 'LinkedIn Post Export\n';
    content += '='.repeat(50) + '\n\n';

    if (options.includeTimestamp) {
      content += `Exported: ${new Date().toLocaleString()}\n`;
    }

    if (options.includeTopic && topic) {
      content += `Topic: ${topic}\n`;
    }

    content += '\n' + '-'.repeat(50) + '\n\n';
  }

  // Add post content
  content += post;

  // Create and download file
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const filename = generateFilename(topic || 'post', 'txt');
  saveAs(blob, filename);
}

// Export as Word document (.docx)
export async function exportAsDocx(
  post: string,
  topic?: string,
  options: ExportOptions = {}
): Promise<void> {
  const children: Paragraph[] = [];

  // Add title
  children.push(
    new Paragraph({
      text: 'LinkedIn Post',
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    })
  );

  // Add metadata if requested
  if (options.includeMetadata) {
    if (options.includeTimestamp) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: 'Exported: ',
              bold: true,
              size: 20,
            }),
            new TextRun({
              text: new Date().toLocaleString(),
              size: 20,
            }),
          ],
          spacing: { after: 100 },
        })
      );
    }

    if (options.includeTopic && topic) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: 'Topic: ',
              bold: true,
              size: 20,
            }),
            new TextRun({
              text: topic,
              size: 20,
            }),
          ],
          spacing: { after: 200 },
        })
      );
    }

    // Add separator
    children.push(
      new Paragraph({
        text: '─'.repeat(40),
        alignment: AlignmentType.CENTER,
        spacing: { before: 200, after: 200 },
      })
    );
  }

  // Add post content - split by paragraphs
  const paragraphs = post.split('\n\n');
  paragraphs.forEach((para, index) => {
    // Handle line breaks within paragraphs
    const lines = para.split('\n');
    const textRuns: TextRun[] = [];

    lines.forEach((line, lineIndex) => {
      // Check if line is a hashtag line
      const isHashtagLine = line.trim().startsWith('#');

      textRuns.push(
        new TextRun({
          text: line,
          size: 24, // 12pt
          color: isHashtagLine ? '0A66C2' : '000000',
        })
      );

      // Add line break if not last line
      if (lineIndex < lines.length - 1) {
        textRuns.push(new TextRun({ break: 1 }));
      }
    });

    children.push(
      new Paragraph({
        children: textRuns,
        spacing: { after: index < paragraphs.length - 1 ? 200 : 0 },
      })
    );
  });

  // Create document
  const doc = new Document({
    sections: [
      {
        properties: {},
        children,
      },
    ],
  });

  // Generate and download
  const blob = await Packer.toBlob(doc);
  const filename = generateFilename(topic || 'post', 'docx');
  saveAs(blob, filename);
}

// Export as JSON (full data)
export function exportAsJson(
  result: GenerationResult,
  topic?: string,
  contentType?: ContentType,
  carouselSlides?: SlideData[]
): void {
  const data = {
    exportedAt: new Date().toISOString(),
    topic: topic || 'Unknown',
    contentType: contentType || 'text',
    post: result.post,
    imagePrompt: result.imagePrompt,
    sources: result.sources,
    ...(carouselSlides && { carouselSlides }),
  };

  const content = JSON.stringify(data, null, 2);
  const blob = new Blob([content], { type: 'application/json;charset=utf-8' });
  const filename = generateFilename(topic || 'post', 'json');
  saveAs(blob, filename);
}

// Export carousel slides as markdown
export function exportCarouselAsMarkdown(
  post: string,
  slides: SlideData[],
  topic?: string
): void {
  let content = '# LinkedIn Carousel Post\n\n';

  if (topic) {
    content += `**Topic:** ${topic}\n\n`;
  }

  content += '---\n\n';
  content += '## Post Caption\n\n';
  content += post + '\n\n';
  content += '---\n\n';
  content += '## Slides\n\n';

  slides.forEach((slide, index) => {
    content += `### Slide ${index + 1}\n\n`;

    // Extract content based on slide layout
    if ('title' in slide && slide.title) {
      content += `**Title:** ${slide.title}\n\n`;
    }
    if ('content' in slide && slide.content) {
      content += `**Content:** ${slide.content}\n\n`;
    }
    if ('subtitle' in slide && slide.subtitle) {
      content += `**Subtitle:** ${slide.subtitle}\n\n`;
    }
    if ('hook' in slide && slide.hook) {
      content += `**Hook:** ${slide.hook}\n\n`;
    }
    if ('items' in slide && slide.items) {
      content += '**Items:**\n';
      slide.items.forEach((item: string) => {
        content += `- ${item}\n`;
      });
      content += '\n';
    }
    if ('steps' in slide && slide.steps) {
      content += '**Steps:**\n';
      slide.steps.forEach((step: { number: number; text: string }) => {
        content += `${step.number}. ${step.text}\n`;
      });
      content += '\n';
    }

    content += '---\n\n';
  });

  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const filename = generateFilename(topic || 'carousel', 'md');
  saveAs(blob, filename);
}

// Copy to clipboard with formatting
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);

    // Fallback method
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();

    try {
      document.execCommand('copy');
      document.body.removeChild(textarea);
      return true;
    } catch (fallbackError) {
      document.body.removeChild(textarea);
      return false;
    }
  }
}

// Export type definition
export type ExportFormat = 'txt' | 'docx' | 'json' | 'md';

// Universal export function
export async function exportPost(
  format: ExportFormat,
  post: string,
  options: {
    topic?: string;
    result?: GenerationResult;
    contentType?: ContentType;
    carouselSlides?: SlideData[];
    exportOptions?: ExportOptions;
  } = {}
): Promise<void> {
  const {
    topic,
    result,
    contentType,
    carouselSlides,
    exportOptions = { includeMetadata: true, includeTopic: true, includeTimestamp: true },
  } = options;

  switch (format) {
    case 'txt':
      exportAsText(post, topic, exportOptions);
      break;

    case 'docx':
      await exportAsDocx(post, topic, exportOptions);
      break;

    case 'json':
      if (result) {
        exportAsJson(result, topic, contentType, carouselSlides);
      } else {
        // Create minimal result
        exportAsJson(
          { post, imagePrompt: '', sources: [] },
          topic,
          contentType,
          carouselSlides
        );
      }
      break;

    case 'md':
      if (carouselSlides && carouselSlides.length > 0) {
        exportCarouselAsMarkdown(post, carouselSlides, topic);
      } else {
        // Export as simple markdown
        let content = `# LinkedIn Post\n\n`;
        if (topic) content += `**Topic:** ${topic}\n\n---\n\n`;
        content += post;
        const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
        const filename = generateFilename(topic || 'post', 'md');
        saveAs(blob, filename);
      }
      break;
  }
}
