// packages/core/src/sync/providers/SyncProviderFactory.ts
// Factory for creating AI sync providers

import type { AiSettings } from '../../types/ai';
import type { SyncProvider } from './BaseSyncProvider';
import { AgentSyncProvider } from './AgentSyncProvider';
import { ClaudeSyncProvider } from './ClaudeSyncProvider';

/**
 * Factory function to create a SyncProvider based on settings.
 * @param settings - AI settings including provider type and credentials
 * @returns A SyncProvider instance for the specified provider
 * @throws Error if the provider is not supported
 */
export function createSyncProvider(settings: AiSettings): SyncProvider {
  const provider = settings.provider || 'agent';

  switch (provider) {
    case 'agent':
      return new AgentSyncProvider(settings);

    case 'claude':
      return new ClaudeSyncProvider(settings);

    case 'bedrock':
      throw new Error('Bedrock provider not yet implemented');

    case 'openai':
      throw new Error('OpenAI provider not yet implemented');

    case 'ollama':
      throw new Error('Ollama provider not yet implemented');

    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

/**
 * Check if a provider is available/implemented
 */
export function isProviderAvailable(provider: string): boolean {
  return provider === 'agent' || provider === 'claude';
}

/**
 * Get list of all supported providers
 */
export function getSupportedProviders(): string[] {
  return ['agent', 'claude', 'bedrock', 'openai', 'ollama'];
}

/**
 * Get list of currently implemented providers
 */
export function getImplementedProviders(): string[] {
  return ['agent', 'claude'];
}
