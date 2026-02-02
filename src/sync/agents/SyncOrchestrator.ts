/**
 * Sync Orchestrator - Calls Claude to synchronize notebook cell content
 * Claude uses its native skill loading mechanism to access .claude/skills/
 */

import type { CellContext } from '../../types';
import type { ContentType, AlignedResults, StreamChunk } from './types';

// Dynamic import helper for ESM modules
const dynamicImport = new Function('specifier', 'return import(specifier)');

/**
 * Context for the sync operation
 */
export interface SyncContext {
  /** Cells before the current cell */
  cellsBefore: CellContext[];
  /** Cells after the current cell */
  cellsAfter: CellContext[];
  /** Existing parameters in the notebook */
  existingParameters: Record<string, string>;
  /** Symbols available in the kernel */
  notebookSymbols?: string[];
  /** Previous content of the cell (for diff-aware updates) */
  previousContent?: string;
  /** Existing counterpart content */
  existingInstructions?: string;
  existingDetailed?: string;
  existingCode?: string;
}

/**
 * Options for the sync operation
 */
export interface SyncOptions {
  /** Environment variables for Claude */
  env?: Record<string, string>;
}

/**
 * Build the prompt for the sync operation
 * This tells Claude to use the sync-orchestrator skill
 */
function buildSyncPrompt(
  sourceType: ContentType,
  sourceContent: string,
  context: SyncContext
): string {
  const sections: string[] = [];

  // Main instruction - use the skill
  sections.push('Use the sync-orchestrator skill to synchronize this notebook cell content.\n');

  // Source information
  sections.push(`## Sync Request\n`);
  sections.push(`**Source Type:** ${sourceType}`);

  // Critical rule about code preservation
  if (sourceType === 'code') {
    sections.push(`\n**CRITICAL: The code below is user-written and must NOT be modified.**`);
    sections.push(`Only generate Instructions and Detailed descriptions to match this code.`);
  }

  sections.push(`\n**Source Content:**\n\`\`\`\n${sourceContent}\n\`\`\`\n`);

  // Cell context
  if (context.cellsBefore.length > 0) {
    sections.push('**Cells Before:**');
    for (const cell of context.cellsBefore.slice(-3)) {
      const desc = cell.shortDescription || cell.code?.slice(0, 100) || 'Empty';
      sections.push(`- ${desc}`);
    }
    sections.push('');
  }

  if (context.cellsAfter.length > 0) {
    sections.push('**Cells After:**');
    for (const cell of context.cellsAfter.slice(0, 3)) {
      const desc = cell.shortDescription || cell.code?.slice(0, 100) || 'Empty';
      sections.push(`- ${desc}`);
    }
    sections.push('');
  }

  // Parameters
  if (Object.keys(context.existingParameters).length > 0) {
    sections.push('**Existing Parameters:**');
    for (const [name, value] of Object.entries(context.existingParameters)) {
      sections.push(`- {{${name}:${value}}}`);
    }
    sections.push('');
  }

  // Symbols
  if (context.notebookSymbols && context.notebookSymbols.length > 0) {
    sections.push('**Available Symbols:**');
    sections.push(context.notebookSymbols.slice(0, 20).map(s => `#${s}`).join(', '));
    sections.push('');
  }

  // Existing content for reference
  if (context.existingInstructions && sourceType !== 'instructions') {
    sections.push(`**Existing Instructions (for reference):**\n${context.existingInstructions}\n`);
  }
  if (context.existingDetailed && sourceType !== 'detailed') {
    sections.push(`**Existing Detailed (for reference):**\n${context.existingDetailed}\n`);
  }
  if (context.existingCode && sourceType !== 'code') {
    sections.push(`**Existing Code (for reference):**\n\`\`\`python\n${context.existingCode}\n\`\`\`\n`);
  }

  // Output format instruction
  sections.push(`\n## Output Format`);
  sections.push(`Return a JSON object with this structure:`);
  sections.push('```json');
  sections.push('{');
  sections.push('  "instructions": "concise instruction text",');
  sections.push('  "detailed": "detailed pseudocode/description",');
  sections.push('  "code": "python code"');
  sections.push('}');
  sections.push('```');

  return sections.join('\n');
}

/**
 * Parse the orchestrator's JSON response
 */
function parseOrchestratorResponse(response: string): AlignedResults {
  // Try to extract JSON from the response
  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('No JSON found in orchestrator response');
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      instructions: parsed.instructions || '',
      detailed: parsed.detailed || '',
      code: parsed.code || '',
      unifiedParameters: parsed.parameters || {},
      alignmentChanges: parsed.changes || [],
    };
  } catch (e) {
    throw new Error(`Failed to parse orchestrator response: ${e}`);
  }
}

/**
 * Run the sync orchestrator
 * This calls Claude with a prompt that instructs it to use the sync-orchestrator skill
 */
export async function* runSyncOrchestrator(
  sourceType: ContentType,
  sourceContent: string,
  context: SyncContext,
  options: SyncOptions = {}
): AsyncGenerator<StreamChunk> {
  console.log('[SyncOrchestrator] Starting orchestration for sourceType:', sourceType);
  try {
    const prompt = buildSyncPrompt(sourceType, sourceContent, context);
    console.log('[SyncOrchestrator] Built prompt, length:', prompt.length);

    yield { type: 'thinking', content: 'Starting sync orchestration...' };

    console.log('[SyncOrchestrator] Importing Claude Agent SDK...');
    const { query } = await dynamicImport('@anthropic-ai/claude-agent-sdk');
    console.log('[SyncOrchestrator] SDK imported, calling query()...');

    let fullResponse = '';

    for await (const message of query({
      prompt,
      options: {
        permissionMode: 'bypassPermissions',
        maxTurns: 10,
        persistSession: false,
        env: options.env,
      },
    })) {
      console.log('[SyncOrchestrator] Received message type:', message.type);
      if (message.type === 'assistant') {
        const content = (message as { type: 'assistant'; content: string }).content;
        fullResponse += content;
        console.log('[SyncOrchestrator] Assistant content chunk, length:', content.length);
        yield { type: 'content', content };
      } else if (message.type === 'result') {
        const result = (message as { type: 'result'; result: string }).result;
        console.log('[SyncOrchestrator] Got result message');
        fullResponse = result || fullResponse;
      }
    }

    console.log('[SyncOrchestrator] Finished receiving messages, parsing response...');
    console.log('[SyncOrchestrator] Full response length:', fullResponse.length);

    // Parse the final result
    const alignedResults = parseOrchestratorResponse(fullResponse);
    console.log('[SyncOrchestrator] Parsed results successfully');
    yield {
      type: 'complete',
      result: {
        content: JSON.stringify(alignedResults),
        parameters: alignedResults.unifiedParameters,
        symbolMentions: [],
        rawResponse: fullResponse,
      },
    };
  } catch (error) {
    console.error('[SyncOrchestrator] Error:', error);
    yield {
      type: 'error',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Run sync orchestrator without streaming (returns final result only)
 */
export async function runSyncOrchestratorSync(
  sourceType: ContentType,
  sourceContent: string,
  context: SyncContext,
  options: SyncOptions = {}
): Promise<AlignedResults> {
  let result: AlignedResults | null = null;
  let lastError: string | null = null;

  for await (const chunk of runSyncOrchestrator(sourceType, sourceContent, context, options)) {
    if (chunk.type === 'complete' && chunk.result) {
      result = JSON.parse(chunk.result.content);
    } else if (chunk.type === 'error') {
      lastError = chunk.error || 'Unknown error';
    }
  }

  if (lastError) {
    throw new Error(lastError);
  }

  if (!result) {
    throw new Error('No result from orchestrator');
  }

  return result;
}
