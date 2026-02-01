/**
 * Unified interface for AI providers that handle bidirectional
 * conversion between natural language descriptions and code.
 */

import type { AiSettings, AiSyncResult } from './ai';
import type { AiSyncContext, SyncDirection } from './sync';

export interface AIProvider {
  readonly name: string;

  /**
   * Perform a sync operation in the specified direction
   * @param direction - The sync direction (toCode, toInstructions, etc.)
   * @param context - The sync context containing content and metadata
   * @returns The sync result with generated content and any extracted symbols
   */
  sync(direction: SyncDirection, context: AiSyncContext): Promise<AiSyncResult>;
}

/**
 * Base configuration for AI providers
 */
export interface AIProviderConfig {
  settings: AiSettings;
}
