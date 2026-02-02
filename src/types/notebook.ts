import { CellState } from './cell';
import type { GeneratedSymbol } from './sync';

export interface NotebookMetadata {
  kernel: string;
  aiProvider: string;
  created: string;
  modified: string;
  /** Cached symbols from LLM code generation - for # autocomplete */
  symbols?: GeneratedSymbol[];
  /** Timestamp of last symbol update */
  symbolsLastUpdated?: string;
}

export interface NotebookState {
  version: '1.0';
  metadata: NotebookMetadata;
  cells: CellState[];
  activeCellId: string | null;
}

export function createEmptyNotebook(): NotebookState {
  return {
    version: '1.0',
    metadata: {
      kernel: 'python3',
      aiProvider: 'claude',
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
      symbols: [],
      symbolsLastUpdated: undefined,
    },
    cells: [],
    activeCellId: null,
  };
}
