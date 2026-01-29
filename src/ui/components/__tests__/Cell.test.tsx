import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Cell } from '../Cell';
import { CellState } from '../../../types';

vi.mock('@monaco-editor/react', () => ({
  default: ({ value }: any) => <textarea data-testid="monaco-editor" value={value} readOnly />,
}));

describe('Cell', () => {
  const mockCell: CellState = {
    id: 'cell-1',
    instructions: {
      text: 'Load {{0}}',
      parameters: [{ id: '0', name: 'file', value: 'data.csv', type: 'string' }],
    },
    code: 'import pandas as pd',
    outputs: [],
    lastEditedTab: 'instructions',
    isDirty: false,
    isExecuting: false,
  };

  it('renders Instructions tab by default', () => {
    render(
      <Cell
        cell={mockCell}
        onUpdate={() => {}}
        onRun={() => {}}
        onSync={() => {}}
      />
    );

    expect(screen.getByRole('tab', { name: /instructions/i })).toHaveAttribute('aria-selected', 'true');
  });

  it('switches to Code tab when clicked', () => {
    render(
      <Cell
        cell={mockCell}
        onUpdate={() => {}}
        onRun={() => {}}
        onSync={() => {}}
      />
    );

    fireEvent.click(screen.getByRole('tab', { name: /code/i }));

    expect(screen.getByRole('tab', { name: /code/i })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('monaco-editor')).toBeInTheDocument();
  });

  it('calls onRun when run button is clicked', () => {
    const onRun = vi.fn();
    render(
      <Cell
        cell={mockCell}
        onUpdate={() => {}}
        onRun={onRun}
        onSync={() => {}}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /run/i }));

    expect(onRun).toHaveBeenCalledWith('cell-1');
  });

  it('shows sync button when cell is dirty', () => {
    const dirtyCell = { ...mockCell, isDirty: true };
    render(
      <Cell
        cell={dirtyCell}
        onUpdate={() => {}}
        onRun={() => {}}
        onSync={() => {}}
      />
    );

    expect(screen.getByRole('button', { name: /sync/i })).toBeInTheDocument();
  });
});
