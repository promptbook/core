import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CodeEditor } from '../CodeEditor';

// Mock Monaco Editor
vi.mock('@monaco-editor/react', () => ({
  default: ({ value, onChange, language }: any) => (
    <textarea
      data-testid="monaco-editor"
      data-language={language}
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
    />
  ),
}));

describe('CodeEditor', () => {
  it('renders Monaco editor with Python language', () => {
    render(
      <CodeEditor
        code="import pandas as pd"
        onChange={() => {}}
        readOnly={false}
      />
    );

    const editor = screen.getByTestId('monaco-editor');
    expect(editor).toBeInTheDocument();
    expect(editor).toHaveAttribute('data-language', 'python');
  });

  it('displays the provided code', () => {
    render(
      <CodeEditor
        code="print('hello')"
        onChange={() => {}}
        readOnly={false}
      />
    );

    expect(screen.getByDisplayValue("print('hello')")).toBeInTheDocument();
  });

  it('calls onChange when code is modified', () => {
    const onChange = vi.fn();
    render(
      <CodeEditor
        code="x = 1"
        onChange={onChange}
        readOnly={false}
      />
    );

    const editor = screen.getByTestId('monaco-editor');
    fireEvent.change(editor, { target: { value: 'x = 2' } });
    expect(onChange).toHaveBeenCalledWith('x = 2');
  });
});
