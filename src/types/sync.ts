/**
 * Sync-related types shared between types, sync, and ui packages
 */

/** Context from a single cell in the notebook */
export interface CellContext {
  shortDescription: string;
  code: string;
}

/** Symbol info extracted from generated code */
export interface GeneratedSymbol {
  name: string;
  kind: 'variable' | 'function';
  type: string;
  description: string;
}

/** Extended result from code generation that includes symbol metadata */
export interface CodeGenerationResult {
  code: string;
  symbols: GeneratedSymbol[];
  /** All symbols from the entire notebook (all cells) */
  notebookSymbols: GeneratedSymbol[];
}

export interface AiSyncContext {
  newContent: string;
  previousContent?: string;
  existingCounterpart?: string;
  /** Cells that come BEFORE the current cell (in execution order) */
  cellsBefore?: CellContext[];
  /** Cells that come AFTER the current cell (in execution order) */
  cellsAfter?: CellContext[];
  /** #mentions in the description that should be used as variable/function names */
  proposedSymbols?: string[];
}

export type SyncDirection =
  | 'expandInstructions'
  | 'shortenInstructions'
  | 'shortToPseudo'
  | 'pseudoToShort'
  | 'toCode'
  | 'pseudoToCode'
  | 'shortToCode'
  | 'toInstructions'
  | 'codeToShort'
  | 'codeToPseudo'
  | 'codeAssist';

/** Message in AI assistance conversation */
export interface AIAssistanceMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  suggestedCode?: string;
  timestamp: number;
}
