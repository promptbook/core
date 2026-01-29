import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Notebook } from '../Notebook';
import { NotebookState, createEmptyCell } from '../../../types';

vi.mock('@monaco-editor/react', () => ({
  default: ({ value }: any) => <textarea data-testid="monaco-editor" value={value} readOnly />,
}));

describe('Notebook', () => {
  const mockNotebook: NotebookState = {
    version: '1.0',
    metadata: {
      kernel: 'python3',
      aiProvider: 'claude',
      created: '2026-01-29T00:00:00Z',
      modified: '2026-01-29T00:00:00Z',
    },
    cells: [createEmptyCell('cell-1')],
    activeCellId: 'cell-1',
  };

  it('renders all cells', () => {
    const notebookWithCells: NotebookState = {
      ...mockNotebook,
      cells: [createEmptyCell('cell-1'), createEmptyCell('cell-2')],
    };

    render(
      <Notebook
        notebook={notebookWithCells}
        onUpdate={() => {}}
        onRunCell={() => {}}
        onSyncCell={() => {}}
        onAddCell={() => {}}
        onDeleteCell={() => {}}
      />
    );

    expect(screen.getAllByRole('tablist')).toHaveLength(2);
  });

  it('calls onAddCell when add button is clicked', () => {
    const onAddCell = vi.fn();
    render(
      <Notebook
        notebook={mockNotebook}
        onUpdate={() => {}}
        onRunCell={() => {}}
        onSyncCell={() => {}}
        onAddCell={onAddCell}
        onDeleteCell={() => {}}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /^add cell$/i }));

    expect(onAddCell).toHaveBeenCalled();
  });

  it('shows empty state when no cells', () => {
    const emptyNotebook: NotebookState = {
      ...mockNotebook,
      cells: [],
    };

    render(
      <Notebook
        notebook={emptyNotebook}
        onUpdate={() => {}}
        onRunCell={() => {}}
        onSyncCell={() => {}}
        onAddCell={() => {}}
        onDeleteCell={() => {}}
      />
    );

    expect(screen.getByText(/no cells/i)).toBeInTheDocument();
  });
});
