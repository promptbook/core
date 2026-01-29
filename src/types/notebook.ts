import { CellState } from './cell';

export interface NotebookMetadata {
  kernel: string;
  aiProvider: string;
  created: string;
  modified: string;
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
    },
    cells: [],
    activeCellId: null,
  };
}
