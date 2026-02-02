/**
 * Sync Orchestrator - Builds prompts and parses responses for cell synchronization
 * The actual SDK call should be made by the caller (e.g., Electron main process)
 * to handle ESM/CommonJS module compatibility
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
export function buildOrchestratorPrompt(
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
2. In Instructions and Detailed descriptions ONLY: #variable_name syntax can reference variables from other cells
3. In Code: use standard Python variable names (NO # prefix - that's a comment in Python!)
4. Keep the three representations semantically aligned
5. Code must be valid, runnable Python`);

  // Source information
  sections.push(`\n## Sync Request\n`);
  sections.push(`**Source Type:** ${sourceType}`);

  // Rules about source handling
  if (sourceType === 'code') {
    sections.push(`\n**CRITICAL: The code below is user-written and must NOT be modified.**`);
    sections.push(`Copy it EXACTLY to the "code" field. Only generate Instructions and Detailed to match.`);
  } else if (sourceType === 'instructions') {
    sections.push(`\n**IMPORTANT: Keep the instructions at the SAME level of detail the user wrote.**`);
    sections.push(`You may rephrase slightly for clarity, but don't expand a brief instruction into a long one.`);
  } else if (sourceType === 'detailed') {
    sections.push(`\n**IMPORTANT: Keep the detailed description at the SAME level of detail the user wrote.**`);
    sections.push(`You may rephrase slightly for clarity, but don't expand or condense significantly.`);
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

  // Remind about source handling
  if (sourceType === 'code') {
    sections.push(`\nRemember: The "code" field must contain EXACTLY the source content unchanged.`);
  } else if (sourceType === 'instructions' || sourceType === 'detailed') {
    sections.push(`\nRemember: Match the user's level of detail - don't over-elaborate or over-simplify.`);
  }

  return sections.join('\n');
}

/**
 * Parse the orchestrator's JSON response
 */
export function parseOrchestratorResponse(response: string): AlignedResults {
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
 * Run the sync orchestrator - this is a stub that should be called from Electron
 * The actual SDK call is now in aiHandlers.ts to avoid ESM/CJS issues
 * @deprecated Use buildOrchestratorPrompt and parseOrchestratorResponse directly from Electron
 */
export async function* runSyncOrchestrator(
  sourceType: ContentType,
  sourceContent: string,
  context: SyncContext,
  _options: SyncOptions = {}
): AsyncGenerator<StreamChunk> {
  console.log('[SyncOrchestrator] Starting orchestration for sourceType:', sourceType);
  console.log('[SyncOrchestrator] NOTE: This function should be called from Electron aiHandlers.ts');

  // This is now a passthrough - the actual implementation is in aiHandlers.ts
  // We keep this for backwards compatibility but it won't work with claude-agent-sdk
  yield { type: 'error', error: 'runSyncOrchestrator should be called from Electron main process' };
}

/**
 * Run sync orchestrator without streaming (returns final result only)
 * @deprecated Use buildOrchestratorPrompt and parseOrchestratorResponse directly
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
