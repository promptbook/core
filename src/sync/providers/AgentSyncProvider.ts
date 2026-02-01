// packages/sync/src/providers/AgentSyncProvider.ts
// Claude Agent SDK-based sync provider

import type { AiSettings, AiSyncResult, AIProvider, AiSyncContext, SyncDirection } from '../../types';
import { buildSyncPrompt } from '../promptBuilder';
import { parseCodeGenerationResult, isCodeDirection } from './utils';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Helper to import ESM modules in CommonJS context
const dynamicImport = new Function('specifier', 'return import(specifier)');

/**
 * Read Claude CLI settings from ~/.claude/settings.json
 * These settings are used as defaults when app settings don't specify Bedrock config
 */
function getClaudeCliSettings(): { useBedrock?: boolean; region?: string; profile?: string } {
  try {
    const settingsPath = path.join(os.homedir(), '.claude', 'settings.json');
    if (!fs.existsSync(settingsPath)) {
      return {};
    }

    const content = fs.readFileSync(settingsPath, 'utf8');
    const settings = JSON.parse(content);

    // Check env object for Bedrock settings
    const env = settings.env || {};
    const useBedrock = env.CLAUDE_CODE_USE_BEDROCK === 'true' || env.CLAUDE_CODE_USE_BEDROCK === '1';
    const region = env.AWS_REGION;
    const profile = env.AWS_PROFILE;

    return { useBedrock, region, profile };
  } catch (err) {
    console.warn('[AI Sync] Could not read Claude CLI settings:', err);
    return {};
  }
}

/**
 * Get an enhanced PATH that includes common locations where CLI tools are installed.
 * This is necessary for Electron apps which don't inherit the shell PATH when
 * launched from the macOS Dock or Finder.
 */
function getEnhancedPath(): string {
  const currentPath = process.env.PATH || '';

  // These paths are PREPENDED to ensure they take priority
  const priorityPaths = [
    '/opt/homebrew/bin',     // Homebrew on Apple Silicon (where claude is)
    '/opt/homebrew/sbin',
    '/usr/local/bin',        // Homebrew on Intel, manual installs
    '/usr/local/sbin',
    `${process.env.HOME}/.local/bin`,  // pipx, user installs
  ];

  // Prepend priority paths to the current PATH
  return [...priorityPaths, currentPath].join(':');
}

/**
 * AIProvider implementation using the Claude Agent SDK.
 * Uses the query function from @anthropic-ai/claude-agent-sdk for sync operations.
 */
export class AgentSyncProvider implements AIProvider {
  readonly name = 'agent';
  private settings: AiSettings;

  constructor(settings: AiSettings) {
    this.settings = settings;
  }

  async sync(direction: SyncDirection, context: AiSyncContext): Promise<AiSyncResult> {
    // Declare rawResult outside try block so we can access it in catch
    let rawResult = '';

    try {
      const { query } = await dynamicImport('@anthropic-ai/claude-agent-sdk');

      const prompt = buildSyncPrompt(direction, context);

      // Build environment variables, respecting user settings
      // Use enhanced PATH to ensure Claude CLI can be found even when Electron
      // is launched from the Dock (which doesn't inherit shell PATH)
      const enhancedPath = getEnhancedPath();
      const env: Record<string, string> = {
        ...process.env as Record<string, string>,
        PATH: enhancedPath,
      };

      // Check Bedrock settings - app settings take precedence, then Claude CLI settings
      const cliSettings = getClaudeCliSettings();
      const useBedrock = this.settings.bedrockRegion || cliSettings.useBedrock;

      if (useBedrock) {
        env.CLAUDE_CODE_USE_BEDROCK = '1';
        env.AWS_REGION = this.settings.bedrockRegion || cliSettings.region || 'us-east-1';
      }

      const awsProfile = this.settings.bedrockProfile || cliSettings.profile;
      if (awsProfile) {
        env.AWS_PROFILE = awsProfile;
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

      // If we already got a result before the error, use it
      // (Claude Code sometimes exits with code 1 after completing successfully)
      if (rawResult) {
        console.warn('[AI Sync] Claude Code exited with error after returning result, using result anyway');
        const isToCode = isCodeDirection(direction);
        const { code, symbols, notebookSymbols } = parseCodeGenerationResult(rawResult, isToCode);
        return { success: true, result: code, symbols, notebookSymbols };
      }

      // Log full error details for debugging
      console.error('[AI Sync] Agent SDK Exception:', errorMessage);
      if (err instanceof Error && err.stack) {
        console.error('[AI Sync] Stack trace:', err.stack);
      }
      // Check if it's a Claude Code specific error
      if (errorMessage.includes('exited with code')) {
        console.error('[AI Sync] Claude Code failed. Check that:');
        console.error('  1. Claude Code CLI is installed and in PATH');
        console.error('  2. You have valid authentication (Bedrock or API key)');
        console.error('  3. Run "claude --version" to verify installation');
      }
      return { success: false, error: `Agent SDK Error: ${errorMessage}` };
    }
  }
}
