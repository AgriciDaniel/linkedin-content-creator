/**
 * Firecrawl Service
 * Fetches real-time data, trending topics, and news using Firecrawl API
 */

const FIRECRAWL_KEY_STORAGE = 'firecrawl_api_key';
const FIRECRAWL_API_BASE = 'https://api.firecrawl.dev/v1';

export interface FirecrawlSearchResult {
  title: string;
  url: string;
  content: string;
  publishedDate?: string;
  relevanceScore?: number;
}

export interface TrendingTopic {
  topic: string;
  description: string;
  sources: string[];
  relevance: string;
}

/**
 * Store Firecrawl API key
 */
export const storeFirecrawlApiKey = (apiKey: string): void => {
  localStorage.setItem(FIRECRAWL_KEY_STORAGE, apiKey);
};

/**
 * Get Firecrawl API key
 */
export const getFirecrawlApiKey = (): string | null => {
  return localStorage.getItem(FIRECRAWL_KEY_STORAGE);
};

/**
 * Clear Firecrawl API key
 */
export const clearFirecrawlApiKey = (): void => {
  localStorage.removeItem(FIRECRAWL_KEY_STORAGE);
};

/**
 * Check if Firecrawl is configured
 */
export const isFirecrawlConfigured = (): boolean => {
  return !!getFirecrawlApiKey();
};

/**
 * Test Firecrawl API connection
 */
export const testFirecrawlConnection = async (): Promise<{ success: boolean; error?: string }> => {
  try {
    const apiKey = getFirecrawlApiKey();
    if (!apiKey) {
      return { success: false, error: 'API key not configured' };
    }

    // Make a minimal test search
    const response = await fetch(`${FIRECRAWL_API_BASE}/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        query: 'test',
        limit: 1,
      }),
    });

    if (response.ok) {
      return { success: true };
    } else {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.message || `API returned status ${response.status}`
      };
    }
  } catch (error) {
    console.error('Firecrawl connection test failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Connection test failed'
    };
  }
};

/**
 * Search the web using Firecrawl
 */
export const searchWeb = async (
  query: string,
  limit: number = 5
): Promise<FirecrawlSearchResult[]> => {
  const apiKey = getFirecrawlApiKey();
  if (!apiKey) {
    throw new Error('Firecrawl API key not configured');
  }

  try {
    const response = await fetch(`${FIRECRAWL_API_BASE}/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        query,
        limit,
        scrapeOptions: {
          formats: ['markdown'],
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Firecrawl search failed: ${error}`);
    }

    const data = await response.json();

    return (data.data || []).map((result: any) => ({
      title: result.metadata?.title || result.url,
      url: result.url,
      content: result.markdown || result.content || '',
      publishedDate: result.metadata?.publishedTime,
      relevanceScore: result.score,
    }));
  } catch (error) {
    console.error('Firecrawl search error:', error);
    throw error;
  }
};

/**
 * Scrape a specific URL using Firecrawl
 */
export const scrapeUrl = async (url: string): Promise<string> => {
  const apiKey = getFirecrawlApiKey();
  if (!apiKey) {
    throw new Error('Firecrawl API key not configured');
  }

  try {
    const response = await fetch(`${FIRECRAWL_API_BASE}/scrape`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        url,
        formats: ['markdown'],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Firecrawl scrape failed: ${error}`);
    }

    const data = await response.json();
    return data.data?.markdown || data.data?.content || '';
  } catch (error) {
    console.error('Firecrawl scrape error:', error);
    throw error;
  }
};

/**
 * Get trending topics based on user's niche/profile
 */
export const getTrendingTopics = async (
  niche: string,
  count: number = 5
): Promise<TrendingTopic[]> => {
  if (!isFirecrawlConfigured()) {
    return [];
  }

  try {
    // Search for trending topics in the niche
    const queries = [
      `${niche} trending news ${new Date().getFullYear()}`,
      `latest ${niche} trends`,
      `${niche} industry updates`,
    ];

    const allResults: FirecrawlSearchResult[] = [];

    // Run searches in parallel
    const searchPromises = queries.map(query =>
      searchWeb(query, 3).catch(err => {
        console.error(`Search failed for "${query}":`, err);
        return [];
      })
    );

    const results = await Promise.all(searchPromises);
    results.forEach(r => allResults.push(...r));

    // Extract unique topics from results
    const topicsMap = new Map<string, TrendingTopic>();

    allResults.forEach(result => {
      const topic = result.title;
      if (!topicsMap.has(topic)) {
        topicsMap.set(topic, {
          topic,
          description: result.content.slice(0, 200) + '...',
          sources: [result.url],
          relevance: niche,
        });
      } else {
        const existing = topicsMap.get(topic)!;
        existing.sources.push(result.url);
      }
    });

    return Array.from(topicsMap.values()).slice(0, count);
  } catch (error) {
    console.error('Failed to get trending topics:', error);
    return [];
  }
};

/**
 * Research a specific topic and get comprehensive data
 */
export const researchTopic = async (topic: string): Promise<string> => {
  if (!isFirecrawlConfigured()) {
    return '';
  }

  try {
    const results = await searchWeb(topic, 5);

    if (results.length === 0) {
      return '';
    }

    // Compile research data
    let research = `RESEARCH DATA FOR: ${topic}\n\n`;

    results.forEach((result, index) => {
      research += `SOURCE ${index + 1}: ${result.title}\n`;
      research += `URL: ${result.url}\n`;
      if (result.publishedDate) {
        research += `Published: ${result.publishedDate}\n`;
      }
      research += `Content: ${result.content.slice(0, 500)}...\n\n`;
    });

    research += `\nUse this research data to create an informed, factual, and up-to-date post about "${topic}".`;

    return research;
  } catch (error) {
    console.error('Failed to research topic:', error);
    return '';
  }
};

/**
 * Get fact-check data for claims
 */
export const factCheck = async (claim: string): Promise<string> => {
  if (!isFirecrawlConfigured()) {
    return '';
  }

  try {
    const results = await searchWeb(`fact check: ${claim}`, 3);

    if (results.length === 0) {
      return '';
    }

    let factCheckData = `FACT CHECK FOR: "${claim}"\n\n`;

    results.forEach((result, index) => {
      factCheckData += `Source ${index + 1}: ${result.title}\n`;
      factCheckData += `${result.content.slice(0, 300)}...\n\n`;
    });

    return factCheckData;
  } catch (error) {
    console.error('Failed to fact-check:', error);
    return '';
  }
};

/**
 * Get context about current events/news for a topic
 */
export const getCurrentContext = async (topic: string): Promise<string> => {
  if (!isFirecrawlConfigured()) {
    return '';
  }

  try {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().toLocaleString('default', { month: 'long' });

    const query = `${topic} news ${currentMonth} ${currentYear}`;
    const results = await searchWeb(query, 3);

    if (results.length === 0) {
      return '';
    }

    let context = `CURRENT CONTEXT (${currentMonth} ${currentYear}):\n\n`;

    results.forEach(result => {
      context += `- ${result.title}\n`;
      context += `  ${result.content.slice(0, 200)}...\n\n`;
    });

    return context;
  } catch (error) {
    console.error('Failed to get current context:', error);
    return '';
  }
};
