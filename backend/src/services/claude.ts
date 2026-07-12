import Anthropic from '@anthropic-ai/sdk';
import { config } from '../config.js';

const client = new Anthropic({ apiKey: config.ANTHROPIC_API_KEY });

export interface ClaudeTextBlock {
  type: 'text';
  text: string;
  cache_control?: { type: 'ephemeral' };
}

export interface ClaudeImageBlock {
  type: 'image';
  source: { type: 'base64'; media_type: string; data: string };
  cache_control?: { type: 'ephemeral' };
}

export type ClaudeContentBlock = ClaudeTextBlock | ClaudeImageBlock;

export interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string | ClaudeContentBlock[];
}

export interface TokenStats {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
  totalTokens: number;
  costEstimate: number;
}

export async function streamChat(
  systemBlocks: ClaudeTextBlock[],
  messages: ClaudeMessage[],
  model: string,
  maxTokens: number,
  onChunk: (text: string) => void,
  onDone: (full: string, inputTokens: number, outputTokens: number, cacheHits: number) => void,
  onError: (err: Error) => void
): Promise<void> {
  let full = '';
  let inputTokens = 0;
  let outputTokens = 0;
  let cacheReadTokens = 0;
  let cacheCreationTokens = 0;

  try {
    const stream = await client.messages.create({
      model,
      max_tokens: maxTokens,
      system: systemBlocks as Anthropic.TextBlockParam[],
      messages: messages as Anthropic.MessageParam[],
      stream: true,
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        full += event.delta.text;
        onChunk(event.delta.text);
      }
      if (event.type === 'message_start') {
        inputTokens = event.message.usage.input_tokens;
        cacheReadTokens = (event.message.usage as { cache_read_input_tokens?: number })
          .cache_read_input_tokens || 0;
        cacheCreationTokens = (event.message.usage as { cache_creation_input_tokens?: number })
          .cache_creation_input_tokens || 0;
      }
      if (event.type === 'message_delta') {
        outputTokens = event.usage.output_tokens;
      }
    }
    // Legacy cacheHits param = cacheReadTokens for backward compatibility
    onDone(full, inputTokens, outputTokens, cacheReadTokens);

    // Log token stats
    const totalTokens = inputTokens + outputTokens;
    const savedByCache = Math.floor(cacheReadTokens * 0.1); // Cache reads are cheaper
    console.log(
      `[Claude ${model}] tokens: ${totalTokens} ` +
      `(input: ${inputTokens}, output: ${outputTokens}, ` +
      `cache_read: ${cacheReadTokens}, cache_write: ${cacheCreationTokens}, ` +
      `saved_by_cache: ${savedByCache})`
    );
  } catch (err) {
    onError(err as Error);
  }
}

export function getModels() {
  return [
    {
      id: 'claude-haiku-4-5-20251001',
      label: 'Haiku 4.5 (Fast — default)',
      description: 'Fast, low-cost, handles everyday family use well.'
    },
    {
      id: 'claude-sonnet-4-6',
      label: 'Sonnet 4.6 (Smarter, costs more)',
      description: 'Better for complex reasoning and longer writing.'
    },
  ];
}
