import { StructuredInstructions } from './instructions';

export type CellOutputType = 'stdout' | 'stderr' | 'result' | 'display' | 'error';

export interface CellOutput {
  type: CellOutputType;
  content: string;
  mimeType?: string;
}

export interface CellState {
  id: string;
  instructions: StructuredInstructions | null;
  code: string;
  outputs: CellOutput[];
  lastEditedTab: 'instructions' | 'code';
  isDirty: boolean;
  isExecuting: boolean;
}

export function createEmptyCell(id: string): CellState {
  return {
    id,
    instructions: null,
    code: '',
    outputs: [],
    lastEditedTab: 'instructions',
    isDirty: false,
    isExecuting: false,
  };
}
