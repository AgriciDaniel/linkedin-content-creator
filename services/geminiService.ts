import { GoogleGenAI, Modality } from "@google/genai";
import { GenerationResult, GroundingSource, CarouselGenerationResult } from '../types';
import {
  SlideData,
  validateCarouselSlides,
  sanitizeSlideData,
  isValidSlideData,
} from '../types/slideLayouts';
import { getMemoryContext, addToMemory } from './memoryService';
import { researchTopic, isFirecrawlConfigured } from './firecrawlService';
import { getProfile, StyleAnalysis } from './profileService';
import { suggestHashtags, formatHashtagsForPost } from './hashtagService';

// Build profile context for prompts
const getProfileContext = (): string => {
  const profile = getProfile();
  const parts: string[] = [];

  if (profile.name) {
    parts.push(`Author: ${profile.name}`);
  }
  if (profile.description) {
    parts.push(`About: ${profile.description}`);
  }
  if (profile.industry) {
    parts.push(`Industry: ${profile.industry}`);
  }
  if (profile.targetAudience) {
    parts.push(`Target Audience: ${profile.targetAudience}`);
  }
  if (profile.brandPersonality) {
    const personalityMap: Record<string, string> = {
      'professional': 'Professional & Authoritative - confident, credible, industry expert',
      'thought-leader': 'Thought Leader - visionary, challenging conventional thinking, bold opinions',
      'casual': 'Casual & Relatable - friendly, down-to-earth, conversational like talking to a friend',
      'data-driven': 'Data-Driven & Analytical - facts-focused, evidence-based, logical',
      'custom': profile.customBrandVoice || 'Custom voice style',
    };
    parts.push(`Voice/Tone: ${personalityMap[profile.brandPersonality] || profile.brandPersonality}`);
  }
  if (profile.focusKeywords && profile.focusKeywords.length > 0) {
    parts.push(`Key Topics: ${profile.focusKeywords.join(', ')}`);
  }
  // New profile fields
  if (profile.contentGoals) {
    parts.push(`Content Goals: ${profile.contentGoals}`);
  }
  if (profile.keyTopics) {
    parts.push(`Focus Topics: ${profile.keyTopics}`);
  }
  if (profile.topicsToAvoid) {
    parts.push(`Topics to AVOID: ${profile.topicsToAvoid}`);
  }
  if (profile.preferredLength) {
    const lengthMap: Record<string, string> = {
      'short': 'Short posts (100-150 words)',
      'medium': 'Medium posts (150-250 words)',
      'long': 'Long-form posts (250-400 words)',
    };
    parts.push(`Preferred Length: ${lengthMap[profile.preferredLength] || profile.preferredLength}`);
  }
  if (profile.ctaStyle) {
    const ctaMap: Record<string, string> = {
      'question': 'End with an engaging question',
      'action': 'End with a clear call-to-action',
      'subtle': 'End with a subtle invitation to engage',
      'none': 'No explicit CTA needed',
    };
    parts.push(`CTA Style: ${ctaMap[profile.ctaStyle] || profile.ctaStyle}`);
  }
  if (profile.uniqueValue) {
    parts.push(`Unique Value/Expertise: ${profile.uniqueValue}`);
  }

  return parts.length > 0 ? parts.join('\n') : 'No profile configured - use a general professional tone';
};

// Gemini API key storage functions
const GEMINI_KEY_STORAGE = 'gemini_api_key';

export const storeGeminiApiKey = (apiKey: string): void => {
  localStorage.setItem(GEMINI_KEY_STORAGE, apiKey);
};

export const getGeminiApiKey = (): string | null => {
  return localStorage.getItem(GEMINI_KEY_STORAGE);
};

export const clearGeminiApiKey = (): void => {
  localStorage.removeItem(GEMINI_KEY_STORAGE);
};

export const isGeminiConfigured = (): boolean => {
  const key = getGeminiApiKey();
  return key !== null && key.trim().length > 0;
};

/**
 * Test Gemini API connection
 */
export const testGeminiConnection = async (): Promise<{ success: boolean; error?: string }> => {
  try {
    const ai = getAI();
    // Make a simple test call with minimal tokens
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: 'Say "OK" if you can read this.',
    });

    if (response.text) {
      return { success: true };
    } else {
      return { success: false, error: 'No response from API' };
    }
  } catch (error) {
    console.error('Gemini connection test failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Connection test failed'
    };
  }
};

// Get AI instance with stored key
const getAI = (): GoogleGenAI => {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error("Gemini API key not configured. Please add your API key in Settings.");
  }
  return new GoogleGenAI({ apiKey });
};

export const getModels = () => getAI().models;

// Progress callback type for progressive updates
export type GenerationProgressCallback = (stage: string, partialResult?: Partial<GenerationResult>) => void;

// Carousel progress callback for progressive carousel updates
export type CarouselProgressCallback = (stage: string, partialResult?: Partial<CarouselGenerationResult>) => void;

export const generateLinkedInContent = async (
  topic: string,
  onProgress?: GenerationProgressCallback
): Promise<GenerationResult> => {
  try {
    // Get AI memory context
    const memoryContext = getMemoryContext();

    onProgress?.('researching');

    // Run research steps IN PARALLEL for speed
    const [firecrawlResult, practicesResponse, topicResponse] = await Promise.all([
      // Firecrawl research (optional)
      isFirecrawlConfigured()
        ? researchTopic(topic).catch(error => {
            console.warn('Firecrawl research failed, continuing without it:', error);
            return '';
          })
        : Promise.resolve(''),

      // 1. Research Best Practices for LinkedIn posts
      getModels().generateContent({
        model: 'gemini-2.5-flash',
        contents: `Find 2-3 recent articles (2024-2025) on highly engaging LinkedIn posts, focusing on:
    - Multi-image posts and carousel performance
    - Video content best practices (under 90 seconds)
    - Hook formulas that drive engagement
    - Native content vs external links
    - LinkedIn algorithm priorities for 2025`,
        config: { tools: [{ googleSearch: {} }] }
      }),

      // 2. Research the user's topic
      getModels().generateContent({
        model: 'gemini-2.5-flash',
        contents: `Find 3-5 recent, high-quality articles, statistics, case studies, or industry insights related to "${topic}". Prioritize:
    - Recent data and statistics (with specific numbers)
    - Contrarian or surprising insights
    - Personal stories or case studies
    - Actionable takeaways`,
        config: { tools: [{ googleSearch: {} }] }
      }),
    ]);

    const firecrawlResearch = firecrawlResult;
    const bestPracticesText = practicesResponse.text;
    const topicResearchText = topicResponse.text;
    const topicSources: GroundingSource[] = topicResponse.candidates?.[0]?.groundingMetadata?.groundingChunks
      ?.map(chunk => ({
        uri: chunk.web?.uri || '',
        title: chunk.web?.title || 'Untitled',
      }))
      .filter(source => source.uri) || [];

    onProgress?.('generating');

    // Get profile context and specific settings
    const profile = getProfile();
    const profileContext = getProfileContext();

    // Build CTA instruction based on profile setting
    const ctaInstruction = (() => {
      switch (profile.ctaStyle) {
        case 'none':
          return '**NO CTA REQUIRED** - End naturally without a question or call-to-action. A simple closing statement is fine.';
        case 'subtle':
          return '**CTA Style: Subtle** - End with a subtle invitation to engage (not a direct question).';
        case 'action':
          return '**CTA Style: Call to Action** - End with a clear call-to-action telling readers what to do.';
        case 'question':
        default:
          return '**CTA Style: Question** - End with an engaging question to drive comments.';
      }
    })();

    // 3. Generate the LinkedIn post using the research
    const postGenerationPrompt = `
You are writing a LinkedIn post AS the person described below. Write in THEIR voice, not as a generic content creator.

**WHO YOU ARE WRITING AS:**
${profileContext}

**Research Context:**
- **Latest LinkedIn Best Practices:** ${bestPracticesText}
- **Topic Research on "${topic}":** ${topicResearchText}
${firecrawlResearch ? `- **Real-Time Research (Firecrawl):** ${firecrawlResearch}` : ''}

**AI Memory Context (CRITICAL - Read Carefully):**
${memoryContext}

**Your Mission:**
Create a scroll-stopping LinkedIn post about "${topic}" that feels genuinely human and drives meaningful engagement.

**CRITICAL: ABSOLUTELY NO MARKDOWN FORMATTING**
⛔ FORBIDDEN - DO NOT USE:
- NO asterisks for bold (**text** or __text__)
- NO asterisks for italic (*text* or _text_)
- NO hashtag symbols for headers (# Header)
- NO backticks for code (\`code\`)
- NO brackets for links ([text](url))
- NO dashes or asterisks for bullet points (- item or * item)
- NO number lists with periods (1. item)
- NO greater-than for quotes (> quote)

✅ INSTEAD USE:
- Plain text only
- Natural emphasis through word choice and sentence structure
- Line breaks for visual separation
- Capital letters sparingly for emphasis (ONE WORD at most)
- Emojis for visual breaks (1-3 total, strategically placed)

**HOOK STRATEGY (CRITICAL - First 1-2 Lines):**
Your opening MUST use one of these proven formulas:

1. **Contrarian Hook** - Challenge conventional wisdom
2. **Pain/Problem Hook** - Call out a shared frustration
3. **Confession/Story Hook** - Start with vulnerability
4. **List/Number Hook** - Promise specific value
5. **Big Outcome Hook** - Lead with dramatic result

**STRUCTURE REQUIREMENTS:**

1. **Hook (1-2 lines, under 12 words ideal)**
2. **Opening Context (2-3 short lines)**
3. **Value Delivery (Main Body)** - 2-4 short sections with white space
4. **Story Element (Optional)** - 2-3 sentences maximum
5. **Takeaway/Lesson (2-3 lines)**
6. **Ending** - ${ctaInstruction}

**TONE & STYLE:**
- Write like a REAL PERSON talking to a friend, not a marketing robot
- Conversational, authentic, confident
- Match the profile's voice/personality above
- Strategic emoji use (1-3 total)

**BANNED AI PHRASES - NEVER USE THESE:**
- "game-changer", "paradigm shift", "unlock", "leverage"
- "dive deep", "deep dive", "at the end of the day"
- "warp speed", "lightning speed", "breakneck pace"
- "revolutionize", "transform", "disrupt" (overused)
- "cutting-edge", "state-of-the-art", "next-level"
- "Here's the thing:", "Let me be clear:", "The truth is:"
- "You'll learn...", "You'll discover...", "I'm sharing..."
- "In today's world...", "In this day and age..."
- "fundamentally", "essentially", "ultimately"
- "crucial", "vital", "pivotal", "paramount"
- Any phrase that sounds like a press release or TED talk

**INSTEAD, WRITE LIKE THIS:**
- Use simple, direct words
- Share specific examples, not vague claims
- Include real numbers when possible
- Sound like you're texting a smart colleague
- Be slightly imperfect - that's human

**FORMATTING - NATURAL, NOT ROBOTIC:**
Write like a human, not a formatting bot:
- Group related sentences together (2-3 sentences per paragraph is fine)
- Only use line breaks when changing topics or for emphasis
- DON'T break after every single sentence - that looks robotic
- Use blank lines sparingly - maybe 3-4 throughout the post
- Let it flow naturally like you're actually writing, not filling a template

**EXAMPLE OF NATURAL FORMATTING:**
Most people are still stuck in 2020 thinking about this. The rules changed and nobody sent the memo.

Here's what I've noticed after working with 50+ clients this year: the ones who succeed aren't doing anything fancy. They just show up consistently and share what they actually know.

No frameworks. No "secrets." Just real experience packaged in a way people can use.

The weird part? The more specific and personal you get, the more it resonates. Generic advice gets ignored. Your actual story cuts through.

${profile.ctaStyle === 'none' ? 'That\'s the real lesson here.' : profile.ctaStyle === 'subtle' ? 'Something to think about for your next post.' : profile.ctaStyle === 'action' ? 'Try being more specific in your next post. Watch what happens.' : 'What\'s one thing you\'ve learned the hard way that others might benefit from?'}

**LENGTH:** 150-250 words

Now create the post. Remember: PLAIN TEXT ONLY - NO MARKDOWN WHATSOEVER.
    `;

    const postResponse = await getModels().generateContent({
        model: 'gemini-2.5-flash',
        contents: postGenerationPrompt
    });
    const generatedPost = postResponse.text;

    // Immediately send partial result with the post so UI can show it
    onProgress?.('polishing', {
      post: generatedPost,
      sources: topicSources,
      imagePrompt: '', // Will be filled later
    });

    // 4. Generate image prompt - Using profile style analysis if available
    const styleAnalysis = profile.styleAnalysis;
    const hasStyleAnalysis = styleAnalysis && styleAnalysis.colors && styleAnalysis.colors.length > 0;

    // Build style-specific instructions - ONLY use colors, style, and mood (NOT the full suggestedPrompt to avoid replicating content)
    const colorPalette = hasStyleAnalysis
      ? styleAnalysis.colors.join(', ')
      : 'navy blue (#0A66C2), teal, charcoal, gold, coral, white';
    const styleDescription = hasStyleAnalysis
      ? `${styleAnalysis.style} (${styleAnalysis.mood})`
      : 'minimalist/flat design/photorealistic/modern illustration';

    const imagePromptGenerationPrompt = `
You are creating a prompt for Google's Gemini image generator (Nano Banana) to make a professional LinkedIn post image.

**THE LINKEDIN POST:**
${generatedPost}

**YOUR TASK:**
Create a SINGLE, DETAILED image prompt (3-5 sentences) that will generate a professional LinkedIn graphic.

${hasStyleAnalysis ? `**BRAND STYLE TO USE:**
- Color palette: ${colorPalette}
- Visual style: ${styleAnalysis.style}
- Mood/tone: ${styleAnalysis.mood}
IMPORTANT: Use ONLY these colors and style attributes. Create ORIGINAL content - do NOT copy any specific imagery from a reference.` : ''}

**REQUIREMENTS:**

1. **If the post has numbers/statistics** → Create a data visualization with the key number prominently displayed
2. **If the post has a powerful quote/message** → Create a typographic design with 5-10 key words
3. **If the post tells a story** → Create a visual metaphor or professional scene
4. **If the post is educational** → Create an infographic or illustrated concept

**PROMPT FORMAT:**
Describe the complete scene in narrative form. Include:
- Main subject/visual element (create something ORIGINAL that fits the post topic)
- Specific text to render (if any) - in quotes, using "large, bold, sans-serif typography"
- Colors: ${colorPalette}
- Style: ${styleDescription}
- Composition: centered, rule of thirds, negative space
- Lighting and atmosphere
- "High-resolution professional design, LinkedIn optimized, landscape 16:9 format"

**CRITICAL RULES:**
- Write as ONE continuous descriptive prompt (3-5 sentences)
- Be specific about colors, typography, layout - USE THE COLORS SPECIFIED ABOVE
- Create ORIGINAL imagery that matches the POST CONTENT - not a copy of any reference
- Include "High-resolution professional design, LinkedIn optimized, landscape 16:9 format" at the end
- DO NOT include any analysis, steps, or explanations
- DO NOT use asterisks, bullet points, or section headers
- JUST OUTPUT THE RAW IMAGE PROMPT READY TO USE

Generate the image prompt now:
`;

    // Run image prompt generation and hashtag suggestion IN PARALLEL
    onProgress?.('creating-visuals');

    const [imagePromptResponse, hashtagsResult] = await Promise.all([
      // Generate image prompt
      getModels().generateContent({
        model: 'gemini-2.5-flash',
        contents: imagePromptGenerationPrompt
      }),
      // Generate hashtags
      suggestHashtags(topic, generatedPost, 4).catch(() => []),
    ]);

    // Clean up the image prompt response
    let imagePrompt = imagePromptResponse.text.trim();

    // Remove common prefixes that might appear
    imagePrompt = imagePrompt
      .replace(/^Here's the image prompt:?\s*/i, '')
      .replace(/^Image prompt:?\s*/i, '')
      .replace(/^Prompt:?\s*/i, '')
      .replace(/^\*\*.*?\*\*:?\s*/g, '') // Remove any bold headers
      .replace(/^"/, '')
      .replace(/"$/, '')
      .trim();

    // Add hashtags to post
    let finalPost = generatedPost.trim();
    if (hashtagsResult.length > 0) {
      const hashtagString = formatHashtagsForPost(hashtagsResult.map(h => h.tag));
      finalPost = finalPost + String.fromCharCode(10) + String.fromCharCode(10) + hashtagString;
    }

    onProgress?.('complete', {
      post: finalPost,
      imagePrompt: imagePrompt,
      sources: topicSources,
    });

    return {
      post: finalPost,
      imagePrompt: imagePrompt,
      sources: topicSources,
    };
  } catch (error) {
    console.error("Error during Gemini API call:", error);
    throw new Error("Failed to generate content. Please check the console for details.");
  }
};

export const generateImageFromPrompt = async (prompt: string, referenceImageBase64?: string): Promise<string> => {
  try {
    // Get style analysis from profile if available
    const profile = getProfile();
    const styleAnalysis = profile.styleAnalysis;

    // Build content parts
    const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];

    // Add reference image if provided
    if (referenceImageBase64) {
      parts.push({
        inlineData: {
          mimeType: 'image/png',
          data: referenceImageBase64,
        },
      });

      // Build enhanced prompt with style analysis - ONLY use colors/style/mood, NOT full suggestedPrompt
      let enhancedPrompt = prompt;
      if (styleAnalysis) {
        enhancedPrompt = `STYLE REFERENCE: Use ONLY the color palette and visual style from the reference image above.
DO NOT copy the content or subject matter - create ORIGINAL imagery.

Apply these style attributes:
- Color palette: ${styleAnalysis.colors.join(', ')}
- Visual style: ${styleAnalysis.style}
- Mood: ${styleAnalysis.mood}

Now create this ORIGINAL image: ${prompt}`;
      } else {
        enhancedPrompt = `STYLE REFERENCE: Use ONLY the color palette and visual style from the reference image above.
DO NOT copy the content or subject matter - create ORIGINAL imagery.

Now create: ${prompt}`;
      }

      parts.push({ text: enhancedPrompt });
    } else if (styleAnalysis) {
      // No reference image but we have style analysis - ONLY use colors/style/mood
      const enhancedPrompt = `Apply these style attributes:
- Color palette: ${styleAnalysis.colors.join(', ')}
- Visual style: ${styleAnalysis.style}
- Mood: ${styleAnalysis.mood}

Create: ${prompt}`;
      parts.push({ text: enhancedPrompt });
    } else {
      parts.push({ text: prompt });
    }

    const response = await getAI().models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts,
      },
      config: {
        responseModalities: [Modality.IMAGE],
        imageConfig: {
          aspectRatio: "16:9",
        },
      },
    });

    for (const part of response.candidates?.[0]?.content?.parts ?? []) {
      if (part.inlineData) {
        return part.inlineData.data;
      }
    }

    throw new Error("No image data found in the API response.");
  } catch (error) {
    console.error("Error generating image:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    throw new Error(`Failed to generate image: ${errorMessage}`);
  }
};

// Generate multiple image variations
export const generateImageVariations = async (
  prompt: string,
  count: number = 3,
  referenceImageBase64?: string
): Promise<string[]> => {
  const variations: string[] = [];

  // Create variation prompts with slight modifications
  const variationPrompts = [
    prompt,
    `${prompt} - Alternative composition with different visual emphasis`,
    `${prompt} - Creative variation with unique perspective`,
  ];

  // Generate images in parallel for speed
  const promises = variationPrompts.slice(0, count).map(async (varPrompt, index) => {
    try {
      const result = await generateImageFromPrompt(varPrompt, referenceImageBase64);
      return { index, result };
    } catch (error) {
      console.error(`Failed to generate variation ${index + 1}:`, error);
      return { index, result: null };
    }
  });

  const results = await Promise.all(promises);

  // Sort by index and filter out failed generations
  results
    .sort((a, b) => a.index - b.index)
    .forEach(({ result }) => {
      if (result) variations.push(result);
    });

  if (variations.length === 0) {
    throw new Error("Failed to generate any image variations");
  }

  return variations;
};

// Edit image with reference (image-to-image)
export const editImageWithReference = async (
  referenceImageBase64: string,
  editPrompt: string,
  styleReferenceBase64?: string
): Promise<string> => {
  try {
    // Build parts array
    const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];

    // Add style reference image first if provided
    if (styleReferenceBase64) {
      parts.push({
        inlineData: {
          mimeType: 'image/png',
          data: styleReferenceBase64,
        },
      });
    }

    // Add the main image to edit
    parts.push({
      inlineData: {
        mimeType: 'image/png',
        data: referenceImageBase64,
      },
    });

    // Add the edit prompt with appropriate context
    const promptText = styleReferenceBase64
      ? `Using the first image as a style reference, edit the second image: ${editPrompt}. Apply the style and aesthetic from the reference while making the requested changes.`
      : `Edit this image: ${editPrompt}. Maintain the overall composition and style while applying the requested changes.`;

    parts.push({ text: promptText });

    const response = await getAI().models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts,
      },
      config: {
        responseModalities: [Modality.IMAGE],
        imageConfig: {
          aspectRatio: "16:9",
        },
      },
    });

    for (const part of response.candidates?.[0]?.content?.parts ?? []) {
      if (part.inlineData) {
        return part.inlineData.data;
      }
    }

    throw new Error("No image data found in the API response.");
  } catch (error) {
    console.error("Error editing image:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    throw new Error(`Failed to edit image: ${errorMessage}`);
  }
};

/**
 * Analyze a style reference image to extract colors, style, mood, and generate a consistent prompt
 */
export const analyzeStyleImage = async (imageBase64: string): Promise<StyleAnalysis> => {
  try {
    const prompt = `Analyze this image and extract the following information for consistent brand image generation.

You MUST respond with ONLY valid JSON in this exact format (no other text):
{
  "colors": ["#hexcode1", "#hexcode2", "#hexcode3", "#hexcode4", "#hexcode5"],
  "style": "style description",
  "mood": "mood description",
  "elements": ["element1", "element2", "element3"],
  "suggestedPrompt": "prompt template"
}

For each field:
1. **colors** - Extract 4-6 prominent colors as hex codes. Include primary, secondary, and accent colors.

2. **style** - Describe the visual style in 2-5 words. Examples:
   - "minimalist and modern"
   - "bold corporate"
   - "playful and colorful"
   - "elegant luxury"
   - "tech-forward gradient"

3. **mood** - Describe the mood/tone in 2-4 words. Examples:
   - "professional and confident"
   - "warm and approachable"
   - "energetic and dynamic"
   - "calm and sophisticated"

4. **elements** - List 3-5 key visual elements/patterns detected. Examples:
   - "geometric shapes"
   - "gradient overlays"
   - "clean typography"
   - "circular icons"
   - "line art illustrations"

5. **suggestedPrompt** - Write a prompt template (50-100 words) that can be used to generate images matching this style. Include:
   - Color palette references (use the extracted colors)
   - Style and mood keywords
   - Layout/composition suggestions
   - Typography style if relevant
   - End with "High-resolution professional design, LinkedIn optimized"

Respond with ONLY the JSON object, no explanation or markdown.`;

    const response = await getAI().models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          parts: [
            {
              inlineData: {
                mimeType: 'image/png',
                data: imageBase64,
              },
            },
            { text: prompt },
          ],
        },
      ],
    });

    let responseText = (response.text || '').trim();

    // Clean up the response - remove markdown code blocks if present
    responseText = responseText
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    // Parse the JSON response
    const analysis = JSON.parse(responseText);

    // Validate and sanitize the response
    const result: StyleAnalysis = {
      colors: Array.isArray(analysis.colors) ? analysis.colors.slice(0, 6) : ['#0A66C2', '#1E1E1E', '#FFFFFF'],
      style: typeof analysis.style === 'string' ? analysis.style : 'professional modern',
      mood: typeof analysis.mood === 'string' ? analysis.mood : 'professional',
      elements: Array.isArray(analysis.elements) ? analysis.elements.slice(0, 5) : [],
      suggestedPrompt: typeof analysis.suggestedPrompt === 'string' ? analysis.suggestedPrompt : '',
    };

    return result;
  } catch (error) {
    console.error('Error analyzing style image:', error);
    throw new Error('Failed to analyze image. Please try again.');
  }
};

// Generate carousel content (post + slides) - Layout-Based Architecture
export const generateCarouselContent = async (
  topic: string,
  onProgress?: CarouselProgressCallback
): Promise<CarouselGenerationResult> => {
  try {
    // Get AI memory context
    const memoryContext = getMemoryContext();

    onProgress?.('researching');

    // Get Firecrawl research if configured
    let firecrawlResearch = '';
    if (isFirecrawlConfigured()) {
      try {
        firecrawlResearch = await researchTopic(topic);
      } catch (error) {
        console.warn('Firecrawl research failed, continuing without it:', error);
      }
    }

    // 1. Research Best Practices for LinkedIn carousels (2025 algorithm)
    const bestPracticesPrompt = `Find 2-3 recent articles (2024-2025) on highly engaging LinkedIn carousel posts, focusing on:
    - Carousel/document post best practices
    - Optimal number of slides (typically 5-10)
    - First slide hook strategies
    - Slide design principles
    - LinkedIn algorithm priorities for 2025 (dwell time is #1 factor)
    - Limit hashtags to 3-5 maximum`;

    const practicesResponse = await getModels().generateContent({
      model: 'gemini-2.5-flash',
      contents: bestPracticesPrompt,
      config: { tools: [{ googleSearch: {} }] }
    });
    const bestPracticesText = practicesResponse.text;

    // 2. Research the user's topic
    const topicResearchPrompt = `Find 3-5 recent, high-quality articles, statistics, case studies, or industry insights related to "${topic}". Prioritize:
    - Recent data and statistics (with specific numbers)
    - Contrarian or surprising insights
    - Personal stories or case studies
    - Actionable takeaways`;

    const topicResponse = await getModels().generateContent({
      model: 'gemini-2.5-flash',
      contents: topicResearchPrompt,
      config: { tools: [{ googleSearch: {} }] }
    });
    const topicResearchText = topicResponse.text;
    const topicSources: GroundingSource[] = topicResponse.candidates?.[0]?.groundingMetadata?.groundingChunks
      ?.map(chunk => ({
        uri: chunk.web?.uri || '',
        title: chunk.web?.title || 'Untitled',
      }))
      .filter(source => source.uri) || [];

    onProgress?.('generating');

    // Get profile context and specific settings
    const profile = getProfile();
    const profileContext = getProfileContext();

    // Build CTA instruction based on profile setting
    const ctaInstruction = (() => {
      switch (profile.ctaStyle) {
        case 'none':
          return 'End naturally without a question or call-to-action';
        case 'subtle':
          return 'End with a subtle invitation to engage';
        case 'action':
          return 'End with a clear call-to-action';
        case 'question':
        default:
          return 'End with an engaging question';
      }
    })();

    // 3. Generate carousel content using LAYOUT-BASED system
    const carouselPrompt = `
You are writing a LinkedIn carousel AS the person described below. Write in THEIR voice.

**WHO YOU ARE WRITING AS:**
${profileContext}

**Research Context:**
- **LinkedIn Carousel Best Practices:** ${bestPracticesText}
- **Topic Research on "${topic}":** ${topicResearchText}
${firecrawlResearch ? `- **Real-Time Research (Firecrawl):** ${firecrawlResearch}` : ''}

**AI Memory Context:**
${memoryContext}

**YOUR TASK:**
Create a LinkedIn carousel about "${topic}" using our pre-defined LAYOUT TYPES.

**AVAILABLE LAYOUTS (choose one per slide):**

1. **title-hook** - Opening slide with big headline
   Fields: { "layout": "title-hook", "headline": "string (max 10 words)", "subtext": "optional string" }

2. **bullet-list** - Key points with styled bullets
   Fields: { "layout": "bullet-list", "title": "string (max 6 words)", "bullets": ["2-5 items, each max 50 chars"] }

3. **numbered-steps** - Process/steps with numbered circles
   Fields: { "layout": "numbered-steps", "title": "string", "steps": ["3-5 items, each max 40 chars"] }

4. **stat-card** - Big metric highlight
   Fields: { "layout": "stat-card", "title": "string", "stat": "string (e.g. '87%', '$2.5M', '10x')", "description": "string (max 20 words)" }

5. **bar-chart** - Vertical bars for comparisons
   Fields: { "layout": "bar-chart", "title": "string", "labels": ["3-6 items"], "values": [numbers], "description": "optional" }

6. **pie-chart** - Distribution/market share
   Fields: { "layout": "pie-chart", "title": "string", "labels": ["3-5 items"], "values": [numbers], "description": "optional" }

7. **line-chart** - Trends over time
   Fields: { "layout": "line-chart", "title": "string", "labels": ["4-8 time periods"], "values": [numbers], "description": "optional" }

8. **comparison** - Before/After visual (SHORT values only!)
   Fields: { "layout": "comparison", "title": "string", "before": {"label": "max 15 chars", "value": "SHORT like '2hrs', '$500', '10%'"}, "after": {"label": "max 15 chars", "value": "SHORT like '15min', '$50', '85%'"} }
   IMPORTANT: Values MUST be short metrics/numbers, NOT sentences!

9. **quote** - Testimonial or expert quote
   Fields: { "layout": "quote", "quote": "string (max 100 chars)", "attribution": "string (max 30 chars)" }

10. **cta** - Call to action closing slide
    Fields: { "layout": "cta", "headline": "string (max 8 words)", "subtext": "string (max 20 words)" }

**OUTPUT FORMAT (JSON):**
{
  "post": "LinkedIn post text (100-200 words, plain text, 3-5 hashtags)",
  "slides": [
    { "layout": "title-hook", "headline": "Your attention-grabbing hook" },
    { "layout": "bullet-list", "title": "Key Points", "bullets": ["Point 1", "Point 2", "Point 3"] },
    { "layout": "stat-card", "title": "The Impact", "stat": "87%", "description": "of professionals saw improvement" },
    { "layout": "bar-chart", "title": "Results by Category", "labels": ["A", "B", "C"], "values": [45, 72, 58] },
    { "layout": "comparison", "title": "The Difference", "before": {"label": "Before", "value": "2hrs"}, "after": {"label": "After", "value": "15min"} },
    { "layout": "numbered-steps", "title": "How To Start", "steps": ["Step one", "Step two", "Step three"] },
    { "layout": "quote", "quote": "This changed everything for our team", "attribution": "Industry Expert" },
    { "layout": "cta", "headline": "Ready to Transform?", "subtext": "Follow for more insights like this" }
  ]
}

**STRICT RULES:**
1. Slide 1: MUST be "title-hook" layout
2. Slide 8 (last): MUST be "cta" layout
3. Slides 2-7: Mix of other layouts for variety
4. MINIMUM 2 visual slides (stat-card, bar-chart, pie-chart, line-chart, or comparison)
5. Each field must match the layout's required format exactly
6. Use REAL data from the research when possible
7. Labels must be COMPLETE (no truncation, no "...")
8. Return ONLY valid JSON
9. COMPARISON values must be SHORT (max 10 chars) - use numbers/metrics like "2hrs", "85%", "$2K", NOT sentences!

**POST TEXT REQUIREMENTS:**
- 100-200 words, plain text only
- NO markdown formatting (no asterisks, no bullet points)
- Hook in first line
- ${ctaInstruction}
- 3-5 hashtags, 1-2 emojis max
- MATCH THE PROFILE'S VOICE above

**BANNED AI PHRASES - NEVER USE:**
- "game-changer", "paradigm shift", "unlock", "leverage", "dive deep"
- "warp speed", "revolutionize", "transform", "disrupt", "cutting-edge"
- "Here's the thing:", "The truth is:", "You'll learn...", "I'm sharing..."
- "In today's world...", "fundamentally", "crucial", "vital", "pivotal"
- Any phrase that sounds like a press release

**WRITE LIKE A HUMAN:**
- Simple, direct words (not corporate speak)
- Specific examples and real numbers
- Sound like texting a smart colleague
- Be slightly imperfect - that's authentic

**POST FORMATTING - NATURAL, NOT ROBOTIC:**
Write like a human, not a formatting bot:
- Group related sentences together (2-3 sentences per paragraph is fine)
- Only use line breaks when changing topics or for emphasis
- DON'T break after every single sentence - that looks robotic
- Use blank lines sparingly - maybe 3-4 throughout the post
- Let it flow naturally like you're talking to someone

**NEVER reference the carousel/post itself:**
- NO "This carousel shows..." or "Swipe through..."
- NO "In this post..." or "I'm sharing..."
- Just deliver the VALUE directly

Example format:
Most marketers get this wrong. I tested 47 different approaches last quarter and only 3 actually moved the needle.

The difference? Specificity beats generic advice. Every single time.

Here's what worked for us: [specific tactic that led to specific result]. Nothing fancy, just consistent execution on the basics.

${profile.ctaStyle === 'none' ? 'That\'s the real lesson.' : profile.ctaStyle === 'subtle' ? 'Worth trying on your next campaign.' : profile.ctaStyle === 'action' ? 'Start with just one of these tactics today.' : 'What\'s working for you right now?'}

#hashtag1 #hashtag2 #hashtag3

Generate the carousel now:
`;

    const carouselResponse = await getModels().generateContent({
      model: 'gemini-2.5-flash',
      contents: carouselPrompt
    });

    let responseText = carouselResponse.text.trim();

    // Clean up the response - remove markdown code blocks if present
    responseText = responseText
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    // Parse the JSON response
    let carouselData: {
      post: string;
      slides: any[];
    };
    try {
      carouselData = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse carousel JSON:', responseText);
      throw new Error('Failed to parse carousel content. Please try again.');
    }

    // Validate the structure
    if (!carouselData.post || !Array.isArray(carouselData.slides) || carouselData.slides.length === 0) {
      throw new Error('Invalid carousel content structure');
    }

    // Emit the post text immediately so UI can show it while slides are processed
    onProgress?.('polishing', {
      post: carouselData.post,
      slides: [], // Empty slides for now
      sources: topicSources,
    });

    onProgress?.('creating-visuals');

    // Sanitize and validate each slide using our layout system
    const slides: SlideData[] = [];
    for (const rawSlide of carouselData.slides) {
      // Extract common properties from raw slide before type narrowing
      const rawTitle = rawSlide.title || rawSlide.headline || 'Content';
      const rawContent = rawSlide.content || rawSlide.subtext || rawSlide.description || '';

      if (isValidSlideData(rawSlide)) {
        // Try to sanitize it (fix minor issues)
        const sanitized = sanitizeSlideData(rawSlide);
        if (sanitized) {
          slides.push(sanitized);
        } else {
          console.warn('Failed to sanitize slide:', rawSlide);
          // Create a fallback bullet-list slide
          slides.push({
            layout: 'bullet-list',
            title: rawTitle,
            bullets: rawContent ? [rawContent] : ['Content here'],
          });
        }
      } else {
        console.warn('Invalid slide layout, creating fallback:', rawSlide);
        // Convert old format to new layout format
        if (rawSlide.slideType === 'chart' && rawSlide.chartData) {
          const chartType = rawSlide.chartData.type;
          if (chartType === 'bar' || chartType === 'horizontal-bar' || chartType === 'stacked-bar') {
            slides.push({
              layout: 'bar-chart',
              title: rawSlide.title || 'Data',
              labels: rawSlide.chartData.labels || [],
              values: rawSlide.chartData.values || [],
              description: rawSlide.chartData.description,
            });
          } else if (chartType === 'pie' || chartType === 'donut') {
            slides.push({
              layout: 'pie-chart',
              title: rawSlide.title || 'Distribution',
              labels: rawSlide.chartData.labels || [],
              values: rawSlide.chartData.values || [],
              description: rawSlide.chartData.description,
            });
          } else if (chartType === 'line' || chartType === 'area') {
            slides.push({
              layout: 'line-chart',
              title: rawSlide.title || 'Trend',
              labels: rawSlide.chartData.labels || [],
              values: rawSlide.chartData.values || [],
              description: rawSlide.chartData.description,
            });
          } else if (chartType === 'comparison') {
            slides.push({
              layout: 'comparison',
              title: rawSlide.title || 'Comparison',
              before: { label: rawSlide.chartData.labels?.[0] || 'Before', value: String(rawSlide.chartData.values?.[0] || '0') },
              after: { label: rawSlide.chartData.labels?.[1] || 'After', value: String(rawSlide.chartData.values?.[1] || '0') },
            });
          } else {
            // Default to bar chart for other chart types
            slides.push({
              layout: 'bar-chart',
              title: rawSlide.title || 'Data',
              labels: rawSlide.chartData.labels || [],
              values: rawSlide.chartData.values || [],
              description: rawSlide.chartData.description,
            });
          }
        } else if (rawSlide.slideType === 'data') {
          // Data slides become stat-cards
          const numbers = (rawSlide.content || '').match(/\d+[%$KMB]?/gi) || ['0'];
          slides.push({
            layout: 'stat-card',
            title: rawSlide.title || 'Key Metric',
            stat: numbers[0] || '0',
            description: (rawSlide.content || '').replace(/\d+[%$KMB]?/gi, '').trim() || 'Key insight',
          });
        } else {
          // Text slides - determine best layout
          const content = rawSlide.content || '';
          const bulletMatch = content.match(/[-•*]\s/g);
          const numberMatch = content.match(/^\d+\./gm);

          if (numberMatch && numberMatch.length >= 3) {
            // Numbered list -> numbered-steps
            const steps = content.split(/\d+\.\s*/).filter((s: string) => s.trim());
            slides.push({
              layout: 'numbered-steps',
              title: rawSlide.title || 'Steps',
              steps: steps.slice(0, 5),
            });
          } else if (bulletMatch && bulletMatch.length >= 2) {
            // Bullet list
            const bullets = content.split(/[-•*]\s*/).filter((s: string) => s.trim());
            slides.push({
              layout: 'bullet-list',
              title: rawSlide.title || 'Key Points',
              bullets: bullets.slice(0, 5),
            });
          } else if (slides.length === 0) {
            // First slide -> title-hook
            slides.push({
              layout: 'title-hook',
              headline: rawSlide.title || 'Welcome',
              subtext: content.slice(0, 60),
            });
          } else {
            // Default to bullet-list with content split
            slides.push({
              layout: 'bullet-list',
              title: rawSlide.title || 'Insights',
              bullets: content.split(/[.!?]\s+/).filter((s: string) => s.trim()).slice(0, 5),
            });
          }
        }
      }
    }

    // Ensure first slide is title-hook
    if (slides.length > 0 && slides[0].layout !== 'title-hook') {
      const firstSlide = slides[0];
      slides[0] = {
        layout: 'title-hook',
        headline: (firstSlide as any).title || (firstSlide as any).headline || 'Key Insights',
        subtext: (firstSlide as any).subtext,
      };
    }

    // Ensure last slide is CTA
    if (slides.length > 0 && slides[slides.length - 1].layout !== 'cta') {
      const lastSlide = slides[slides.length - 1];
      slides[slides.length - 1] = {
        layout: 'cta',
        headline: (lastSlide as any).title || (lastSlide as any).headline || 'Take Action',
        subtext: (lastSlide as any).subtext || 'Follow for more insights',
      };
    }

    // Validate the final carousel
    const validation = validateCarouselSlides(slides);
    if (!validation.valid) {
      console.warn('Carousel validation warnings:', validation.errors);
    }

    const finalResult: CarouselGenerationResult = {
      post: carouselData.post,
      slides,
      sources: topicSources,
    };

    onProgress?.('complete', finalResult);

    return finalResult;
  } catch (error) {
    console.error("Error during carousel generation:", error);
    throw new Error("Failed to generate carousel content. Please check the console for details.");
  }
};

/**
 * Regenerate a single slide while keeping the same layout type
 */
export const regenerateSingleSlide = async (
  currentSlide: SlideData,
  context: {
    topic: string;
    slideIndex: number;
    totalSlides: number;
    currentLayout: string;
  }
): Promise<SlideData> => {
  try {
    const prompt = `
You are regenerating a single slide for a LinkedIn carousel.

**Context:**
- Topic: "${context.topic}"
- Slide position: ${context.slideIndex + 1} of ${context.totalSlides}
- Current layout type: ${context.currentLayout}

**Current slide data:**
${JSON.stringify(currentSlide, null, 2)}

**Task:**
Generate NEW content for this slide, keeping the SAME layout type (${context.currentLayout}).
Make the content fresh, engaging, and different from the current version.

**Layout format for "${context.currentLayout}":**
${getLayoutFormatDescription(context.currentLayout)}

**IMPORTANT:**
- Keep the EXACT same layout type
- Return ONLY valid JSON matching the layout format
- Make content compelling and professional
- Use different wording/angles than the current version

Generate the new slide now (JSON only):
`;

    const response = await getModels().generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt
    });

    let responseText = response.text.trim();

    // Clean up the response
    responseText = responseText
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    const newSlide = JSON.parse(responseText);

    // Validate and sanitize
    if (isValidSlideData(newSlide)) {
      const sanitized = sanitizeSlideData(newSlide);
      if (sanitized) {
        return sanitized;
      }
    }

    // If validation fails, return original slide
    console.warn('Failed to regenerate slide, returning original');
    return currentSlide;
  } catch (error) {
    console.error('Error regenerating slide:', error);
    throw new Error('Failed to regenerate slide. Please try again.');
  }
};

function getLayoutFormatDescription(layout: string): string {
  const formats: Record<string, string> = {
    'title-hook': '{ "layout": "title-hook", "headline": "string (max 10 words)", "subtext": "optional string" }',
    'bullet-list': '{ "layout": "bullet-list", "title": "string", "bullets": ["2-5 items, each max 50 chars"] }',
    'numbered-steps': '{ "layout": "numbered-steps", "title": "string", "steps": ["3-5 items, each max 40 chars"] }',
    'stat-card': '{ "layout": "stat-card", "title": "string", "stat": "string like 87%, $2.5M, 10x", "description": "string (max 20 words)" }',
    'bar-chart': '{ "layout": "bar-chart", "title": "string", "labels": ["3-6 items"], "values": [numbers], "description": "optional" }',
    'pie-chart': '{ "layout": "pie-chart", "title": "string", "labels": ["3-5 items"], "values": [numbers], "description": "optional" }',
    'line-chart': '{ "layout": "line-chart", "title": "string", "labels": ["4-8 items"], "values": [numbers], "description": "optional" }',
    'comparison': '{ "layout": "comparison", "title": "string", "before": {"label": "string", "value": "SHORT like 2hrs, $500"}, "after": {"label": "string", "value": "SHORT like 15min, $50"} }',
    'quote': '{ "layout": "quote", "quote": "string (max 100 chars)", "attribution": "string (max 30 chars)" }',
    'cta': '{ "layout": "cta", "headline": "string (max 8 words)", "subtext": "string (max 20 words)" }',
  };
  return formats[layout] || '{ "layout": "unknown" }';
}

// Batch Generation Types and Functions
export interface BatchOptions {
  variationStyle: 'angles' | 'series' | 'mixed';
  contentTypes: ('carousel' | 'image' | 'text')[];
}

export interface BatchGenerationResult {
  id: string;
  topic: string;
  contentType: 'carousel' | 'image' | 'text';
  post: string;
  imagePrompt: string;
  sources: GroundingSource[];
  variationNumber: number;
  angle?: string;
}

/**
 * Generate multiple post variations in batch
 */
export const generateBatch = async (
  topic: string,
  count: number,
  options: BatchOptions,
  onProgress?: (current: number, total: number) => void
): Promise<BatchGenerationResult[]> => {
  const results: BatchGenerationResult[] = [];
  const ai = getAI();
  const profileContext = getProfileContext();
  const memoryContext = getMemoryContext();

  // Get different angles for the topic
  const angles = await generateContentAngles(ai, topic, count, options.variationStyle, profileContext);

  for (let i = 0; i < count; i++) {
    onProgress?.(i + 1, count);

    // Cycle through content types if multiple selected
    const contentType = options.contentTypes[i % options.contentTypes.length];
    const angle = angles[i] || `Variation ${i + 1}`;

    try {
      // Generate post with specific angle
      const prompt = buildBatchPostPrompt(topic, angle, contentType, profileContext, memoryContext, options.variationStyle, i + 1, count);

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      const responseText = response.text || '';

      // Parse the response
      const parsed = parseBatchResponse(responseText);

      results.push({
        id: `batch-${Date.now()}-${i}`,
        topic,
        contentType,
        post: parsed.post,
        imagePrompt: parsed.imagePrompt,
        sources: [],
        variationNumber: i + 1,
        angle,
      });

      // Small delay between generations to avoid rate limiting
      if (i < count - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } catch (error) {
      console.error(`Failed to generate batch item ${i + 1}:`, error);
      // Continue with next item
    }
  }

  return results;
};

/**
 * Generate different content angles for a topic
 */
async function generateContentAngles(
  ai: GoogleGenAI,
  topic: string,
  count: number,
  style: BatchOptions['variationStyle'],
  profileContext: string
): Promise<string[]> {
  const stylePrompts: Record<BatchOptions['variationStyle'], string> = {
    angles: `Generate ${count} DIFFERENT angles/perspectives for LinkedIn posts about "${topic}".
Each angle should approach the topic from a unique viewpoint:
- Different target audiences
- Different pain points addressed
- Different benefits highlighted
- Different emotional hooks`,
    series: `Generate ${count} parts for a LinkedIn series about "${topic}".
Create a logical progression:
- Part 1: Introduction/Problem
- Part 2-${count - 1}: Key points/Solutions
- Part ${count}: Conclusion/Call-to-action`,
    mixed: `Generate ${count} VARIED content approaches for "${topic}":
- Mix educational, promotional, and personal angles
- Include different formats (how-to, story, list, question)
- Target different reader emotions`,
  };

  const prompt = `${stylePrompts[style]}

Profile context:
${profileContext}

Return ONLY a JSON array of ${count} short angle descriptions (max 10 words each):
["angle 1", "angle 2", ...]`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    const text = response.text || '';
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (error) {
    console.error('Failed to generate angles:', error);
  }

  // Fallback to generic angles
  return Array.from({ length: count }, (_, i) => `Variation ${i + 1}`);
}

/**
 * Build prompt for batch post generation
 */
function buildBatchPostPrompt(
  topic: string,
  angle: string,
  contentType: 'carousel' | 'image' | 'text',
  profileContext: string,
  memoryContext: string,
  variationStyle: BatchOptions['variationStyle'],
  current: number,
  total: number
): string {
  const contentTypeInstructions: Record<string, string> = {
    carousel: 'This will be a carousel post - make it educational with clear takeaways.',
    image: 'This will be a single-image post - make it punchy and visually descriptive.',
    text: 'This is a text-only post - focus on compelling storytelling.',
  };

  const seriesContext = variationStyle === 'series'
    ? `\nThis is Part ${current} of ${total} in a series. ${
        current === 1 ? 'Set up the problem/hook.' :
        current === total ? 'Conclude with a strong call-to-action.' :
        'Build on previous parts, add value.'
      }`
    : '';

  return `Create a LinkedIn post about "${topic}" with this specific angle: "${angle}"
${seriesContext}

${contentTypeInstructions[contentType]}

Profile context:
${profileContext}

${memoryContext ? `Previous content context:\n${memoryContext}` : ''}

REQUIREMENTS:
- Hook in first line (attention-grabbing)
- 150-300 words
- Natural line breaks for readability
- End with a question or call-to-action
- Include 3-5 relevant hashtags at the end
- Make it unique from typical LinkedIn posts

Return as JSON:
{
  "post": "the full post text",
  "imagePrompt": "descriptive prompt for an image (if applicable)"
}`;
}

/**
 * Parse batch generation response
 */
function parseBatchResponse(text: string): { post: string; imagePrompt: string } {
  try {
    // Clean up potential markdown formatting
    let cleaned = text
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    const parsed = JSON.parse(cleaned);
    return {
      post: parsed.post || text,
      imagePrompt: parsed.imagePrompt || '',
    };
  } catch {
    // If parsing fails, use the raw text as the post
    return {
      post: text,
      imagePrompt: '',
    };
  }
}
