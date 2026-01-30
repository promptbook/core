export * from './components';

// Re-export types needed by UI consumers
export type { CellState, CellOutput, CellOutputType, CellType, TextFormat, CodeCellTab } from '../types/cell';
export type { NotebookState, NotebookMetadata } from '../types/notebook';
export type { StructuredInstructions, Parameter, ParamType } from '../types/instructions';
export type { KernelState, PythonEnvironment, KernelOutput } from '../kernel/types';
export { createEmptyCell, createCodeCell, createTextCell } from '../types/cell';
export { createEmptyNotebook } from '../types/notebook';
