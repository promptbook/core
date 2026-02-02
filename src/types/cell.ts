import { StructuredInstructions } from './instructions';

export type CellOutputType = 'stdout' | 'stderr' | 'result' | 'display' | 'error';
export type CellType = 'code' | 'text';
export type TextFormat = 'markdown' | 'html';
export type CodeCellTab = 'short' | 'pseudo' | 'code';

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
  pseudoCode: string;       // Structured pseudo-code with steps
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
  lastSyncedPseudo?: string;
  lastSyncedCode?: string;

  // Cell height (for resizable cells)
  height?: number;

  // Execution timing
  executionStartTime?: number;  // Timestamp when execution started
  lastExecutionTime?: number;   // Duration of last execution in ms
  executionCount?: number;      // Like Jupyter's [1], [2], etc.
  lastExecutionSuccess?: boolean; // Whether last execution succeeded

  // Parameter tracking for smart sync
  lastSyncedParams?: Record<string, string>; // Parameter values at last sync

  // Cell collapsing
  isInputCollapsed?: boolean;  // Whether cell input is collapsed
  isOutputCollapsed?: boolean; // Whether cell output is collapsed

  // Sync timing
  syncStartTime?: number;  // Timestamp when sync started (for showing elapsed time)

  // Streaming content from AI (for displaying during sync)
  streamingContent?: string;  // Accumulated streaming text from AI
  streamingThinking?: string; // AI's thinking/reasoning (if using extended thinking)

  // Last sync thinking process (persists after sync for the Thinking tab)
  lastSyncThinking?: string;  // Complete thinking from last sync (extended thinking if available)
  lastSyncResponse?: string;  // Complete raw response from last sync
  lastSyncTimestamp?: number; // When the last sync completed
  isThinkingCollapsed?: boolean; // Whether the thinking panel is collapsed

  // Background sync state
  isSyncingInBackground?: boolean;
  backgroundSyncError?: string;
  backgroundSyncStartTime?: number;  // Timestamp when background sync started
  lastBackgroundSyncTimestamp?: number;
}

export function createEmptyCell(id: string, cellType: CellType = 'code'): CellState {
  return {
    id,
    cellType,
    shortDescription: '',
    pseudoCode: '',
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
    lastSyncedPseudo: undefined,
    lastSyncedCode: undefined,
    height: undefined,
    executionStartTime: undefined,
    lastExecutionTime: undefined,
    executionCount: undefined,
    lastExecutionSuccess: undefined,
    lastSyncedParams: undefined,
    isInputCollapsed: false,
    isOutputCollapsed: false,
    syncStartTime: undefined,
    streamingContent: undefined,
    streamingThinking: undefined,
    lastSyncThinking: undefined,
    lastSyncResponse: undefined,
    lastSyncTimestamp: undefined,
    isThinkingCollapsed: true,
    isSyncingInBackground: false,
    backgroundSyncError: undefined,
    backgroundSyncStartTime: undefined,
    lastBackgroundSyncTimestamp: undefined,
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
