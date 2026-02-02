import React from 'react';
import { NotebookState, CellState, CellType, AIAssistanceMessage } from '../../types';
import { Cell } from './Cell';
import { TextCell } from './TextCell';
import { FileEntry } from './FileAutocomplete';
import type { KernelSymbol } from './SymbolAutocomplete';
import type { DataFrameCallbacks, ResearchCallbacks } from './OutputArea';

/** AI Assistance props for cells */
export interface CellAIAssistanceProps {
  messages: AIAssistanceMessage[];
  isLoading: boolean;
  onSendMessage: (content: string, currentCode: string) => void;
  clearHistory: () => void;
}

interface NotebookProps {
  notebook: NotebookState;
  onUpdate: (cellId: string, updates: Partial<CellState>) => void;
  onRunCell: (cellId: string) => void;
  onSyncCell: (cellId: string) => void;
  onAddCell: (afterCellId?: string, cellType?: CellType) => void;
  onDeleteCell: (cellId: string) => void;
  onMoveCell?: (cellId: string, direction: 'up' | 'down') => void;
  activeCellId?: string;
  onCellFocus?: (cellId: string) => void;
  /** Function to list files for @ autocomplete */
  listFiles?: (dirPath?: string) => Promise<{ files: FileEntry[]; cwd: string }>;
  /** Function to get kernel symbols for # autocomplete (fallback if no preloaded symbols) */
  getSymbols?: () => Promise<KernelSymbol[]>;
  /** Pre-loaded symbols from LLM code generation - preferred over kernel symbols */
  preloadedSymbols?: KernelSymbol[];
  /** AI Assistance props - if provided, enables AI assistant panel in Code tab */
  aiAssistance?: CellAIAssistanceProps;
  /** DataFrame callbacks - if provided, enables interactive DataFrame rendering */
  dataframeCallbacks?: DataFrameCallbacks;
  /** Research assistance callbacks - if provided, enables research buttons below output */
  researchCallbacks?: ResearchCallbacks;
  /** Callback to open the generate cells modal */
  onOpenGenerateCells?: () => void;
}

// Icons
const Icons = {
  delete: <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 3.5h8M5.5 3.5V2.5a1 1 0 011-1h1a1 1 0 011 1v1M9.5 5v6a1 1 0 01-1 1h-3a1 1 0 01-1-1V5" /></svg>,
  addCode: <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4.5 4L2 7l2.5 3M9.5 4L12 7l-2.5 3M8 2L6 12" /></svg>,
  addText: <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2.5 3h9M2.5 7h6M2.5 11h8" /></svg>,
  moveUp: <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M7 2v10M3 6l4-4 4 4" /></svg>,
  moveDown: <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M7 2v10M3 8l4 4 4-4" /></svg>,
  generate: <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M7 1v3M7 10v3M1 7h3M10 7h3M2.75 2.75l2.12 2.12M9.13 9.13l2.12 2.12M11.25 2.75l-2.12 2.12M4.87 9.13l-2.12 2.12" /></svg>,
};

export function Notebook({ notebook, onUpdate, onRunCell, onSyncCell, onAddCell, onDeleteCell, onMoveCell, activeCellId, onCellFocus, listFiles, getSymbols, preloadedSymbols, aiAssistance, dataframeCallbacks, researchCallbacks, onOpenGenerateCells }: NotebookProps) {
  if (notebook.cells.length === 0) {
    return (
      <div className="notebook notebook--empty">
        <p>No cells yet.</p>
        <div className="notebook-empty-actions">
          <button onClick={() => onAddCell(undefined, 'code')} aria-label="Add code cell">{Icons.addCode}<span>Add Code Cell</span></button>
          <button onClick={() => onAddCell(undefined, 'text')} aria-label="Add text cell">{Icons.addText}<span>Add Text Cell</span></button>
          {onOpenGenerateCells && (
            <button onClick={onOpenGenerateCells} aria-label="Generate cells" className="notebook-btn-generate">{Icons.generate}<span>Generate</span></button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="notebook">
      {notebook.cells.map((cell, index) => (
        <CellWrapper
          key={cell.id}
          cell={cell}
          index={index}
          totalCells={notebook.cells.length}
          activeCellId={activeCellId}
          onUpdate={onUpdate}
          onRunCell={onRunCell}
          onSyncCell={onSyncCell}
          onAddCell={onAddCell}
          onDeleteCell={onDeleteCell}
          onMoveCell={onMoveCell}
          onCellFocus={onCellFocus}
          listFiles={listFiles}
          getSymbols={getSymbols}
          preloadedSymbols={preloadedSymbols}
          aiAssistance={aiAssistance}
          dataframeCallbacks={dataframeCallbacks}
          researchCallbacks={researchCallbacks}
        />
      ))}
      <div className="notebook-footer">
        <button onClick={() => onAddCell(undefined, 'code')} aria-label="Add code cell">{Icons.addCode}<span>Code</span></button>
        <button onClick={() => onAddCell(undefined, 'text')} aria-label="Add text cell">{Icons.addText}<span>Text</span></button>
        {onOpenGenerateCells && (
          <button onClick={onOpenGenerateCells} aria-label="Generate cells" className="notebook-btn-generate">{Icons.generate}<span>Generate</span></button>
        )}
      </div>
    </div>
  );
}

// Sub-component to reduce main function size
interface CellWrapperProps {
  cell: CellState;
  index: number;
  totalCells: number;
  activeCellId?: string;
  onUpdate: (cellId: string, updates: Partial<CellState>) => void;
  onRunCell: (cellId: string) => void;
  onSyncCell: (cellId: string) => void;
  onAddCell: (afterCellId?: string, cellType?: CellType) => void;
  onDeleteCell: (cellId: string) => void;
  onMoveCell?: (cellId: string, direction: 'up' | 'down') => void;
  onCellFocus?: (cellId: string) => void;
  listFiles?: (dirPath?: string) => Promise<{ files: FileEntry[]; cwd: string }>;
  getSymbols?: () => Promise<KernelSymbol[]>;
  preloadedSymbols?: KernelSymbol[];
  aiAssistance?: CellAIAssistanceProps;
  dataframeCallbacks?: DataFrameCallbacks;
  researchCallbacks?: ResearchCallbacks;
}

function CellWrapper({ cell, index, totalCells, activeCellId, onUpdate, onRunCell, onSyncCell, onAddCell, onDeleteCell, onMoveCell, onCellFocus, listFiles, getSymbols, preloadedSymbols, aiAssistance, dataframeCallbacks, researchCallbacks }: CellWrapperProps) {
  return (
    <div className="notebook-cell-wrapper">
      {cell.cellType === 'text' ? (
        <TextCell cell={cell} onUpdate={onUpdate} isActive={activeCellId === cell.id} onFocus={onCellFocus} />
      ) : (
        <Cell cell={cell} cellIndex={index + 1} onUpdate={onUpdate} onRun={onRunCell} onSync={onSyncCell} isActive={activeCellId === cell.id} onFocus={onCellFocus} listFiles={listFiles} getSymbols={getSymbols} preloadedSymbols={preloadedSymbols} aiAssistance={aiAssistance} dataframeCallbacks={dataframeCallbacks} researchCallbacks={researchCallbacks} />
      )}
      <div className="cell-controls">
        {onMoveCell && index > 0 && (
          <button onClick={() => onMoveCell(cell.id, 'up')} aria-label="Move cell up" className="cell-control-btn cell-move-up" title="Move up">{Icons.moveUp}</button>
        )}
        {onMoveCell && index < totalCells - 1 && (
          <button onClick={() => onMoveCell(cell.id, 'down')} aria-label="Move cell down" className="cell-control-btn cell-move-down" title="Move down">{Icons.moveDown}</button>
        )}
        <button onClick={() => onDeleteCell(cell.id)} aria-label="Delete cell" className="cell-control-btn cell-delete" title="Delete cell">{Icons.delete}</button>
        <button onClick={() => onAddCell(cell.id, 'code')} aria-label="Add code cell below" className="cell-control-btn cell-add-code" title="Add code cell">{Icons.addCode}</button>
        <button onClick={() => onAddCell(cell.id, 'text')} aria-label="Add text cell below" className="cell-control-btn cell-add-text" title="Add text cell">{Icons.addText}</button>
      </div>
    </div>
  );
}
