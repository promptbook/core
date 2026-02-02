/**
 * AI-powered code synchronization orchestrator
 * Uses Anthropic SDK for streaming sync
 */

export { extractParameters, extractSymbolMentions } from './SubAgent';
export {
  runSyncOrchestrator,
  runSyncOrchestratorSync,
  buildOrchestratorPrompt,
  parseOrchestratorResponse,
} from './SyncOrchestrator';
export type { SyncContext, SyncOptions } from './SyncOrchestrator';

export type {
  ContentType,
  SubAgentContext,
  SubAgentResult,
  StreamChunk,
  OrchestratorEvent,
  AlignedResults,
  AlignmentInput,
} from './types';
