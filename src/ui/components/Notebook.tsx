import React from 'react';
import { NotebookState, CellState } from '../../types';
import { Cell } from './Cell';

interface NotebookProps {
  notebook: NotebookState;
  onUpdate: (cellId: string, updates: Partial<CellState>) => void;
  onRunCell: (cellId: string) => void;
  onSyncCell: (cellId: string) => void;
  onAddCell: (afterCellId?: string) => void;
  onDeleteCell: (cellId: string) => void;
}

export function Notebook({
  notebook,
  onUpdate,
  onRunCell,
  onSyncCell,
  onAddCell,
  onDeleteCell,
}: NotebookProps) {
  if (notebook.cells.length === 0) {
    return (
      <div className="notebook notebook--empty">
        <p>No cells yet.</p>
        <button onClick={() => onAddCell()} aria-label="Add cell">
          + Add Cell
        </button>
      </div>
    );
  }

  return (
    <div className="notebook">
      {notebook.cells.map((cell, index) => (
        <div key={cell.id} className="notebook-cell-wrapper">
          <Cell
            cell={cell}
            onUpdate={onUpdate}
            onRun={onRunCell}
            onSync={onSyncCell}
          />
          <div className="cell-controls">
            <button
              onClick={() => onDeleteCell(cell.id)}
              aria-label="Delete cell"
              className="cell-delete"
            >
              ×
            </button>
            <button
              onClick={() => onAddCell(cell.id)}
              aria-label="Add cell below"
              className="cell-add-below"
            >
              + Add below
            </button>
          </div>
        </div>
      ))}
      <div className="notebook-footer">
        <button onClick={() => onAddCell()} aria-label="Add cell">
          + Add Cell
        </button>
      </div>
    </div>
  );
}
