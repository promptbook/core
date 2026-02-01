/**
 * AI provider type definitions shared between packages
 */

import type { GeneratedSymbol } from './sync';

export type AiProvider = 'agent' | 'claude' | 'bedrock' | 'openai' | 'ollama';

export interface AiSettings {
  provider: AiProvider;
  claudeApiKey?: string;
  openaiApiKey?: string;
  bedrockRegion?: string;
  bedrockProfile?: string;
  ollamaUrl?: string;
  ollamaModel?: string;
}

export interface AiSyncResult {
  success: boolean;
  result?: string;
  symbols?: GeneratedSymbol[];
  /** All symbols from the entire notebook (all cells) */
  notebookSymbols?: GeneratedSymbol[];
  error?: string;
}
