import { StructuredInstructions } from './instructions';

export type CellOutputType = 'stdout' | 'stderr' | 'result' | 'display' | 'error';
export type CellType = 'code' | 'text';
export type TextFormat = 'markdown' | 'html';
export type CodeCellTab = 'short' | 'full' | 'code';

export interface CellOutput {
  type: CellOutputType;
  content: string;
  mimeType?: string;
}

export interface CellState {
  id: string;
  cellType: CellType;

  // For code cells - three synced representations
  shortDescription: string; // Brief summary with params
  fullDescription: string;  // Detailed explanation with params
  code: string;

  // For text cells
  textContent: string;
  textFormat: TextFormat;

  // Legacy field for backward compatibility
  instructions: StructuredInstructions | null;

  outputs: CellOutput[];
  lastEditedTab: CodeCellTab;
  isDirty: boolean;
  isExecuting: boolean;
  isSyncing: boolean;

  // Cache for incremental sync - tracks what was last synced
  lastSyncedShort?: string;
  lastSyncedFull?: string;
  lastSyncedCode?: string;

  // Cell height (for resizable cells)
  height?: number;

  // Execution timing
  executionStartTime?: number;  // Timestamp when execution started
  lastExecutionTime?: number;   // Duration of last execution in ms
  executionCount?: number;      // Like Jupyter's [1], [2], etc.
  lastExecutionSuccess?: boolean; // Whether last execution succeeded
}

export function createEmptyCell(id: string, cellType: CellType = 'code'): CellState {
  return {
    id,
    cellType,
    shortDescription: '',
    fullDescription: '',
    code: '',
    textContent: '',
    textFormat: 'markdown',
    instructions: null,
    outputs: [],
    lastEditedTab: 'short',
    isDirty: false,
    isExecuting: false,
    isSyncing: false,
    lastSyncedShort: undefined,
    lastSyncedFull: undefined,
    lastSyncedCode: undefined,
    height: undefined,
    executionStartTime: undefined,
    lastExecutionTime: undefined,
    executionCount: undefined,
    lastExecutionSuccess: undefined,
  };
}

export function createCodeCell(id: string): CellState {
  return createEmptyCell(id, 'code');
}

export function createTextCell(id: string, format: TextFormat = 'markdown'): CellState {
  const cell = createEmptyCell(id, 'text');
  cell.textFormat = format;
  return cell;
}
