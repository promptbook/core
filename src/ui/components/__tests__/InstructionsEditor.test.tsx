import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { InstructionsEditor } from '../InstructionsEditor';
import { StructuredInstructions } from '../../../types';

describe('InstructionsEditor', () => {
  const mockInstructions: StructuredInstructions = {
    text: 'Load data from {{0}} where {{1}} > {{2}}',
    parameters: [
      { id: '0', name: 'filename', value: 'data.csv', type: 'string' },
      { id: '1', name: 'column', value: 'revenue', type: 'column' },
      { id: '2', name: 'threshold', value: '100', type: 'number', min: 0, max: 1000 },
    ],
  };

  it('renders text with parameter placeholders as highlighted spans', () => {
    render(
      <InstructionsEditor
        instructions={mockInstructions}
        onChange={() => {}}
        onRawInput={() => {}}
        isRawMode={false}
      />
    );

    expect(screen.getByText('data.csv')).toHaveClass('parameter-value');
    expect(screen.getByText('revenue')).toHaveClass('parameter-value');
    expect(screen.getByText('100')).toHaveClass('parameter-value');
  });

  it('shows raw text input when in raw mode', () => {
    render(
      <InstructionsEditor
        instructions={null}
        onChange={() => {}}
        onRawInput={() => {}}
        isRawMode={true}
        rawText="Load some data"
      />
    );

    expect(screen.getByRole('textbox')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Load some data')).toBeInTheDocument();
  });

  it('opens inline input when clicking parameter value', () => {
    render(
      <InstructionsEditor
        instructions={mockInstructions}
        onChange={() => {}}
        onRawInput={() => {}}
        isRawMode={false}
      />
    );

    fireEvent.click(screen.getByText('100'));

    // Clicking a number parameter opens an inline number input
    expect(screen.getByRole('spinbutton')).toBeInTheDocument();
  });
});
