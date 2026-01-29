// packages/core/src/__tests__/integration.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Notebook, createEmptyNotebook, createEmptyCell, SyncEngine, AIProvider } from '../index';

vi.mock('@monaco-editor/react', () => ({
  default: ({ value }: any) => <textarea data-testid="monaco-editor" value={value} readOnly />,
}));

describe('Promptbook Integration', () => {
  const mockProvider: AIProvider = {
    name: 'mock',
    promptToInstructions: vi.fn().mockResolvedValue({
      text: 'Load data from {{0}}',
      parameters: [{ id: '0', name: 'file', value: 'test.csv', type: 'string' }],
    }),
    instructionsToCode: vi.fn().mockResolvedValue("pd.read_csv('test.csv')"),
    codeToInstructions: vi.fn().mockResolvedValue({
      text: 'Load data from {{0}}',
      parameters: [{ id: '0', name: 'file', value: 'test.csv', type: 'string' }],
    }),
  };

  it('renders a notebook with cells', () => {
    const notebook = {
      ...createEmptyNotebook(),
      cells: [createEmptyCell('cell-1'), createEmptyCell('cell-2')],
    };

    render(
      <Notebook
        notebook={notebook}
        onUpdate={() => {}}
        onRunCell={() => {}}
        onSyncCell={() => {}}
        onAddCell={() => {}}
        onDeleteCell={() => {}}
      />
    );

    expect(screen.getAllByRole('tablist')).toHaveLength(2);
  });

  it('SyncEngine processes prompts through provider', async () => {
    const engine = new SyncEngine(mockProvider);

    const instructions = await engine.processPrompt('Load data from test.csv');
    expect(instructions.text).toBe('Load data from {{0}}');

    const code = await engine.generateCode(instructions);
    expect(code).toBe("pd.read_csv('test.csv')");
  });

  it('full sync workflow works end-to-end', async () => {
    const engine = new SyncEngine(mockProvider);

    // Start with prompt
    const instructions = await engine.processPrompt('Load my data');

    // Generate code
    const code = await engine.generateCode(instructions);

    // Reverse engineer back
    const reversedInstructions = await engine.reverseEngineer(code);

    expect(reversedInstructions.parameters).toHaveLength(1);
  });
});
