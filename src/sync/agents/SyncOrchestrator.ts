/**
 * Sync Orchestrator - Uses Anthropic SDK to synchronize notebook cell content
 * Streams results back via async generator
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
  /** Anthropic API key */
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

  // Try to extract JSON from the response
  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.error('[SyncOrchestrator] No JSON found in response:', response.substring(0, 500));
    throw new Error('No JSON found in orchestrator response');
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]);
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
    console.error('[SyncOrchestrator] Attempted to parse:', jsonMatch[0].substring(0, 500));
    throw new Error(`Failed to parse orchestrator response: ${e}`);
  }
}

/**
 * Run the sync orchestrator using Anthropic SDK
 * Streams results back via async generator
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

    yield { type: 'thinking', content: 'Starting sync...' };

    console.log('[SyncOrchestrator] Importing Anthropic SDK...');
    const Anthropic = (await import('@anthropic-ai/sdk')).default;

    // Create client with optional API key
    const clientOptions: { apiKey?: string } = {};
    if (options.apiKey) {
      clientOptions.apiKey = options.apiKey;
    }
    console.log('[SyncOrchestrator] Creating Anthropic client...');
    const client = new Anthropic(clientOptions);

    console.log('[SyncOrchestrator] Calling messages.create with streaming...');

    // Use streaming for real-time updates
    let fullResponse = '';

    const stream = client.messages.stream({
      model: options.model || 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta') {
        const delta = event.delta;
        if ('text' in delta) {
          fullResponse += delta.text;
          yield { type: 'content', content: delta.text };
        }
      }
    }

    console.log('[SyncOrchestrator] Stream complete, total response length:', fullResponse.length);

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
