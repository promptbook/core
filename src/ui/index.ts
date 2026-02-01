export * from './components';

// Re-export types needed by UI consumers
export type { CellState, CellOutput, CellOutputType, CellType, TextFormat, CodeCellTab } from '../types';
export type { NotebookState, NotebookMetadata } from '../types';
export type { AIAssistanceMessage } from '../types';
export type { StructuredInstructions, Parameter, ParamType } from '../types';
// Note: KernelState, KernelOutput, PythonEnvironment should be imported from @promptbook/core/kernel
export { createEmptyCell, createCodeCell, createTextCell } from '../types';
export { createEmptyNotebook } from '../types';

// Re-export symbol types for autocomplete
export type { KernelSymbol, SymbolAutocompleteProps } from './components/SymbolAutocomplete';
