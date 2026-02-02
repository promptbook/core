/**
 * Type definitions for the sub-agent system
 */

import type { CellContext } from '../../types';

/**
 * The type of content being processed
 */
export type ContentType = 'instructions' | 'detailed' | 'code';

/**
 * Context provided to a sub-agent for generation
 */
export interface SubAgentContext {
  /** The source content to transform */
  sourceContent: string;
  /** What type of content the source is */
  sourceType: ContentType;
  /** Context from cells before the current cell */
  cellsBefore: CellContext[];
  /** Context from cells after the current cell */
  cellsAfter: CellContext[];
  /** Existing parameters in the notebook (name -> value) */
  existingParameters: Record<string, string>;
  /** Symbols available in the notebook kernel */
  notebookSymbols?: string[];
  /** Previous content of the target (for diff-aware updates) */
  previousContent?: string;
  /** Existing content of the target (for preservation) */
  existingCounterpart?: string;
}

/**
 * Result from a sub-agent generation
 */
export interface SubAgentResult {
  /** The generated content */
  content: string;
  /** Parameters extracted/preserved in the content */
  parameters: Record<string, string>;
  /** Symbol references found in the content */
  symbolMentions: string[];
  /** Raw response from the LLM (for debugging) */
  rawResponse?: string;
}

/**
 * A chunk of streamed content from a sub-agent
 */
export interface StreamChunk {
  /** Type of chunk */
  type: 'content' | 'thinking' | 'complete' | 'error';
  /** The content of this chunk (for content/thinking types) */
  content?: string;
  /** Final result (for complete type) */
  result?: SubAgentResult;
  /** Error message (for error type) */
  error?: string;
}

/**
 * Events emitted by the orchestrator during sync
 */
export interface OrchestratorEvent {
  /** Type of event */
  type: 'start' | 'stream' | 'alignment-stream' | 'complete' | 'error';
  /** Current phase (for start events) */
  phase?: 'generation' | 'alignment';
  /** Which tab this stream is for (for stream events) */
  tab?: ContentType;
  /** Streamed content */
  content?: string;
  /** Final aligned results (for complete events) */
  results?: AlignedResults;
  /** Error message */
  error?: string;
}

/**
 * Results after alignment
 */
export interface AlignedResults {
  instructions: string;
  detailed: string;
  code: string;
  /** Parameters unified across all representations */
  unifiedParameters: Record<string, string>;
  /** Changes made during alignment */
  alignmentChanges?: string[];
}

/**
 * Input to the alignment supervisor
 */
export interface AlignmentInput {
  /** Generated instructions */
  instructions: SubAgentResult;
  /** Generated detailed description */
  detailed: SubAgentResult;
  /** Generated code */
  code: SubAgentResult;
  /** Which content type was the original source */
  sourceType: ContentType;
  /** The original source content */
  sourceContent: string;
}

