// packages/core/src/sync/providers/AgentSyncProvider.ts
// Claude Agent SDK-based sync provider

import type { AiSettings, AiSyncResult } from '../../types/ai';
import type { AiSyncContext } from '../promptBuilder';
import { buildSyncPrompt } from '../promptBuilder';
import { SyncProvider, parseCodeGenerationResult, isCodeDirection } from './BaseSyncProvider';

// Helper to import ESM modules in CommonJS context
const dynamicImport = new Function('specifier', 'return import(specifier)');

/**
 * SyncProvider implementation using the Claude Agent SDK.
 * Uses the query function from @anthropic-ai/claude-agent-sdk for sync operations.
 */
export class AgentSyncProvider implements SyncProvider {
  readonly name = 'agent';
  private settings: AiSettings;

  constructor(settings: AiSettings) {
    this.settings = settings;
  }

  async sync(direction: string, context: AiSyncContext): Promise<AiSyncResult> {
    try {
      const { query } = await dynamicImport('@anthropic-ai/claude-agent-sdk');

      const prompt = buildSyncPrompt(direction, context);

      let rawResult = '';

      // Build environment variables, respecting user settings
      const env: Record<string, string> = {
        ...process.env as Record<string, string>,
      };

      // Use Bedrock settings if configured
      if (this.settings.bedrockRegion) {
        env.CLAUDE_CODE_USE_BEDROCK = '1';
        env.AWS_REGION = this.settings.bedrockRegion;
      }
      if (this.settings.bedrockProfile) {
        env.AWS_PROFILE = this.settings.bedrockProfile;
      }

      // Use the Claude Agent SDK query function
      for await (const message of query({
        prompt,
        options: {
          tools: [],
          permissionMode: 'bypassPermissions',
          maxTurns: 1,
          persistSession: false,
          env,
        },
      })) {
        if (message.type === 'result') {
          rawResult = (message as { type: 'result'; result: string }).result;
        }
      }

      if (!rawResult) {
        return { success: false, error: 'No response generated' };
      }

      // Parse the result based on direction
      const isToCode = isCodeDirection(direction);
      const { code, symbols, notebookSymbols } = parseCodeGenerationResult(rawResult, isToCode);

      return { success: true, result: code, symbols, notebookSymbols };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error('[AI Sync] Agent SDK Exception:', errorMessage);
      return { success: false, error: `Agent SDK Error: ${errorMessage}` };
    }
  }
}
