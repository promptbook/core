// packages/sync/src/providers/ClaudeSyncProvider.ts
// Direct Claude API sync provider

import type { AiSettings, AiSyncResult, AIProvider, AiSyncContext, SyncDirection } from '../../types';
import { buildSyncPrompt } from '../promptBuilder';
import { parseCodeGenerationResult, isCodeDirection } from './utils';

/**
 * AIProvider implementation using the Claude API directly.
 * Uses the @anthropic-ai/sdk for sync operations.
 */
export class ClaudeSyncProvider implements AIProvider {
  readonly name = 'claude';
  private settings: AiSettings;

  constructor(settings: AiSettings) {
    this.settings = settings;
  }

  async sync(direction: SyncDirection, context: AiSyncContext): Promise<AiSyncResult> {
    try {
      const Anthropic = (await import('@anthropic-ai/sdk')).default;

      // Use API key from settings if provided, otherwise fall back to environment variable
      const clientOptions: { apiKey?: string } = {};
      if (this.settings.claudeApiKey) {
        clientOptions.apiKey = this.settings.claudeApiKey;
      }

      const client = new Anthropic(clientOptions);
      const prompt = buildSyncPrompt(direction, context);

      const message = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2048,
        messages: [{ role: 'user', content: prompt }],
      });

      const textBlock = message.content.find((block: { type: string }) => block.type === 'text');
      if (textBlock && textBlock.type === 'text') {
        const rawResult = textBlock.text;
        const isToCode = isCodeDirection(direction);
        const { code, symbols, notebookSymbols } = parseCodeGenerationResult(rawResult, isToCode);
        return { success: true, result: code, symbols, notebookSymbols };
      }

      return { success: false, error: 'No response generated' };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error('[AI Sync] Claude API Exception:', errorMessage);
      return { success: false, error: `Claude API Error: ${errorMessage}` };
    }
  }
}
