import { Anthropic } from '@anthropic-ai/sdk';
import { config } from '../config.js';

export interface ContentFilterResult {
  blocked: boolean;
  reason?: string;
  flagType?: 'keyword' | 'ai_classifier';
}

const DEFAULT_BLOCKED_KEYWORDS = [
  'porn', 'pornography', 'xxx', 'explicit sex',
  'how to make a bomb', 'how to make drugs',
  'meth recipe', 'cocaine synthesis',
  'suicide method', 'how to kill myself',
  'how to make explosives', 'child porn',
];

/**
 * Tier 1: Keyword-based content filter (synchronous)
 * Runs first, fast, low cost
 */
export function keywordFilter(text: string, additionalKeywords: string[] = []): ContentFilterResult {
  const allKeywords = [...DEFAULT_BLOCKED_KEYWORDS, ...additionalKeywords];
  const lowerText = text.toLowerCase();

  for (const keyword of allKeywords) {
    if (lowerText.includes(keyword.toLowerCase())) {
      return {
        blocked: true,
        reason: `Keyword match: "${keyword}"`,
        flagType: 'keyword',
      };
    }
  }

  return { blocked: false };
}

/**
 * Tier 2: Claude-based AI content filter (async)
 * Only called if keyword filter passes
 * Uses Haiku for speed and cost (~$0.000005 per check)
 */
export async function aiContentFilter(text: string): Promise<ContentFilterResult> {
  try {
    const client = new Anthropic({
      apiKey: config.ANTHROPIC_API_KEY,
    });

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 5,
      system: 'You are a content safety classifier for a family app used by teens. Respond with ONLY the word SAFE or UNSAFE. Nothing else.',
      messages: [
        {
          role: 'user',
          content: text,
        },
      ],
    });

    const content = response.content[0];
    if (content.type === 'text') {
      const responseText = content.text.toUpperCase();
      if (responseText.includes('UNSAFE')) {
        return {
          blocked: true,
          reason: 'AI classifier',
          flagType: 'ai_classifier',
        };
      }
    }

    return { blocked: false };
  } catch (err: any) {
    console.warn('Content filter API error (fail-open):', err.message);
    // Fail open: if classifier is unavailable, don't block the request
    return { blocked: false };
  }
}

/**
 * Two-tier content filter
 * Runs keyword check first, then AI classifier if keyword passes
 */
export async function filterContent(
  text: string,
  additionalKeywords: string[] = []
): Promise<ContentFilterResult> {
  // Tier 1: Keyword filter
  const keywordResult = keywordFilter(text, additionalKeywords);
  if (keywordResult.blocked) {
    return keywordResult;
  }

  // Tier 2: AI classifier (only if keyword filter passed)
  return aiContentFilter(text);
}
