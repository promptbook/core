// packages/core/src/sync/providers/BaseSyncProvider.ts
// Base interface for AI sync providers

import type { AiSettings, AiSyncResult } from '../../types/ai';
import type { AiSyncContext, GeneratedSymbol, CodeGenerationResult } from '../promptBuilder';

/**
 * Interface for AI sync providers that handle bidirectional
 * conversion between natural language descriptions and code.
 */
export interface SyncProvider {
  readonly name: string;

  /**
   * Perform a sync operation in the specified direction
   * @param direction - The sync direction (toCode, toInstructions, etc.)
   * @param context - The sync context containing content and metadata
   * @returns The sync result with generated content and any extracted symbols
   */
  sync(direction: string, context: AiSyncContext): Promise<AiSyncResult>;
}

/**
 * Parse structured JSON output from code generation.
 * Falls back to extracting code from markdown if JSON parsing fails.
 */
export function parseCodeGenerationResult(
  response: string,
  isToCode: boolean
): { code: string; symbols: GeneratedSymbol[]; notebookSymbols: GeneratedSymbol[] } {
  if (!isToCode) {
    return { code: response.trim(), symbols: [], notebookSymbols: [] };
  }

  // Try to parse as JSON first
  try {
    // Look for JSON object in the response
    const jsonMatch = response.match(/\{[\s\S]*"code"[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as CodeGenerationResult;
      if (parsed.code) {
        const filterSymbols = (arr: GeneratedSymbol[] | undefined) =>
          (arr || []).filter(s => s.name && s.kind && (s.kind === 'variable' || s.kind === 'function'));
        return {
          code: parsed.code.trim(),
          symbols: filterSymbols(parsed.symbols),
          notebookSymbols: filterSymbols(parsed.notebookSymbols),
        };
      }
    }
  } catch {
    // JSON parsing failed, continue to fallback
  }

  // Fallback: extract code from markdown code blocks
  let code = response;
  const codeMatch = response.match(/```(?:python)?\s*([\s\S]*?)```/);
  if (codeMatch) {
    code = codeMatch[1];
  }

  return { code: code.trim(), symbols: [], notebookSymbols: [] };
}

/**
 * Check if a direction is a code generation direction
 */
export function isCodeDirection(direction: string): boolean {
  return direction === 'toCode' || direction === 'pseudoToCode' || direction === 'shortToCode';
}

/**
 * Base configuration for sync providers
 */
export interface SyncProviderConfig {
  settings: AiSettings;
}
