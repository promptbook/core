/**
 * Sync Orchestrator - Uses Claude Agent SDK to synchronize notebook cell content
 * Streams results back via async generator
 * Uses claude-agent-sdk which handles Bedrock auth via .claude/settings.json
 */

import type { CellContext } from '../../types';
import type { ContentType, AlignedResults, StreamChunk } from './types';

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
  /** Anthropic API key (for direct API fallback) */
  apiKey?: string;
  /** Model to use */
  model?: string;
}

/**
 * Build the prompt for the sync operation
 */
function buildSyncPrompt(
  sourceType: ContentType,
  sourceContent: string,
  context: SyncContext
): string {
  const sections: string[] = [];

  // System instruction
  sections.push(`You are a notebook cell synchronization assistant. Your job is to keep three representations of a notebook cell aligned: Instructions (a short one-line description), Detailed (a detailed pseudocode description), and Code (Python code).

Given a source (what the user edited), generate the other two representations to match.

IMPORTANT RULES:
1. Preserve any parameters in the format {{name:value}} - copy them exactly
2. Preserve any symbol references like #variable_name
3. Keep the three representations semantically aligned`);

  // Source information
  sections.push(`\n## Sync Request\n`);
  sections.push(`**Source Type:** ${sourceType}`);

  // Critical rule about code preservation
  if (sourceType === 'code') {
    sections.push(`\n**CRITICAL: The code below is user-written and must NOT be modified.**`);
    sections.push(`Only generate Instructions and Detailed descriptions to match this code.`);
  }

  sections.push(`\n**Source Content:**\n\`\`\`\n${sourceContent}\n\`\`\`\n`);

  // Cell context
  if (context.cellsBefore.length > 0) {
    sections.push('**Cells Before (for context):**');
    for (const cell of context.cellsBefore.slice(-3)) {
      const desc = cell.shortDescription || cell.code?.slice(0, 100) || 'Empty';
      sections.push(`- ${desc}`);
    }
    sections.push('');
  }

  if (context.cellsAfter.length > 0) {
    sections.push('**Cells After (for context):**');
    for (const cell of context.cellsAfter.slice(0, 3)) {
      const desc = cell.shortDescription || cell.code?.slice(0, 100) || 'Empty';
      sections.push(`- ${desc}`);
    }
    sections.push('');
  }

  // Parameters
  if (Object.keys(context.existingParameters).length > 0) {
    sections.push('**Existing Parameters (must preserve exactly):**');
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
  sections.push(`\n## Required Output Format

Return ONLY a JSON object with exactly this structure (no markdown code fences, no explanation):

{"instructions": "one-line description", "detailed": "detailed pseudocode description", "code": "python code"}`);

  if (sourceType === 'code') {
    sections.push(`\nRemember: The "code" field must contain EXACTLY the source content unchanged.`);
  }

  return sections.join('\n');
}

/**
 * Parse the orchestrator's JSON response
 */
function parseOrchestratorResponse(response: string): AlignedResults {
  console.log('[SyncOrchestrator] Parsing response, length:', response.length);

  // Try to extract JSON from the response (handle markdown code blocks)
  let jsonStr = response;
  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1];
  }

  // Try to extract JSON object
  const objectMatch = jsonStr.match(/\{[\s\S]*\}/);
  if (!objectMatch) {
    console.error('[SyncOrchestrator] No JSON found in response:', response.substring(0, 500));
    throw new Error('No JSON found in orchestrator response');
  }

  try {
    const parsed = JSON.parse(objectMatch[0]);
    console.log('[SyncOrchestrator] Successfully parsed JSON');
    return {
      instructions: parsed.instructions || '',
      detailed: parsed.detailed || '',
      code: parsed.code || '',
      unifiedParameters: parsed.parameters || {},
      alignmentChanges: parsed.changes || [],
    };
  } catch (e) {
    console.error('[SyncOrchestrator] JSON parse error:', e);
    console.error('[SyncOrchestrator] Attempted to parse:', objectMatch[0].substring(0, 500));
    throw new Error(`Failed to parse orchestrator response: ${e}`);
  }
}

/**
 * Run the sync orchestrator using Claude Agent SDK
 * Streams results back via async generator
 */
export async function* runSyncOrchestrator(
  sourceType: ContentType,
  sourceContent: string,
  context: SyncContext,
  _options: SyncOptions = {}
): AsyncGenerator<StreamChunk> {
  console.log('[SyncOrchestrator] Starting orchestration for sourceType:', sourceType);

  try {
    const prompt = buildSyncPrompt(sourceType, sourceContent, context);
    console.log('[SyncOrchestrator] Built prompt, length:', prompt.length);

    yield { type: 'thinking', content: 'Starting sync...' };

    console.log('[SyncOrchestrator] Importing Claude Agent SDK...');
    const { query } = await import('@anthropic-ai/claude-agent-sdk');

    console.log('[SyncOrchestrator] Calling Claude Agent SDK query...');
    let result = '';

    // Use the Claude Agent SDK query function
    // It handles Bedrock auth via .claude/settings.json when CLAUDE_CODE_USE_BEDROCK=1
    for await (const message of query({
      prompt,
      options: {
        // No tools needed - just text generation
        tools: [],
        // Bypass permissions since we're not using any tools
        permissionMode: 'bypassPermissions',
        // Limit to a single turn
        maxTurns: 1,
        // Don't persist the session
        persistSession: false,
      },
    })) {
      console.log('[SyncOrchestrator] Received message type:', message.type);

      // Yield content chunks for streaming (assistant messages contain partial content)
      if (message.type === 'assistant' && 'message' in message) {
        const assistantMessage = message as { type: 'assistant'; message: { content: unknown[] } };
        for (const block of assistantMessage.message.content) {
          if (typeof block === 'object' && block !== null && 'text' in block) {
            const text = (block as { text: string }).text;
            yield { type: 'content', content: text };
          }
        }
      }

      // Collect the final result
      if (message.type === 'result') {
        result = (message as { type: 'result'; result: string }).result;
        console.log('[SyncOrchestrator] Got result, length:', result.length);
      }
    }

    console.log('[SyncOrchestrator] Query complete, result length:', result.length);

    if (!result) {
      throw new Error('No result from Claude Agent SDK');
    }

    // Parse the final result
    const alignedResults = parseOrchestratorResponse(result);
    console.log('[SyncOrchestrator] Parsed results successfully');

    yield {
      type: 'complete',
      result: {
        content: JSON.stringify(alignedResults),
        parameters: alignedResults.unifiedParameters,
        symbolMentions: [],
        rawResponse: result,
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[SyncOrchestrator] Error:', errorMessage);
    yield {
      type: 'error',
      error: errorMessage,
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
