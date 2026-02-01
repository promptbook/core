import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { OutputArea } from '../OutputArea';
import { CellOutput } from '../../../types';

describe('OutputArea', () => {
  it('renders stdout output', () => {
    const outputs: CellOutput[] = [
      { type: 'stdout', content: 'Hello, World!' },
    ];

    render(<OutputArea outputs={outputs} />);

    expect(screen.getByText('Hello, World!')).toBeInTheDocument();
  });

  it('renders error output with error styling', () => {
    const outputs: CellOutput[] = [
      { type: 'error', content: 'NameError: name "x" is not defined' },
    ];

    render(<OutputArea outputs={outputs} />);

    const errorOutput = screen.getByText(/NameError/);
    expect(errorOutput.closest('.output-item')).toHaveClass('output-item--error');
  });

  it('renders multiple outputs in order', () => {
    const outputs: CellOutput[] = [
      { type: 'stdout', content: 'First' },
      { type: 'stdout', content: 'Second' },
    ];

    render(<OutputArea outputs={outputs} />);

    const items = screen.getAllByText(/First|Second/);
    expect(items[0]).toHaveTextContent('First');
    expect(items[1]).toHaveTextContent('Second');
  });

  it('renders nothing when outputs is empty', () => {
    const { container } = render(<OutputArea outputs={[]} />);

    expect(container.querySelector('.output-area')).toBeEmptyDOMElement();
  });
});
