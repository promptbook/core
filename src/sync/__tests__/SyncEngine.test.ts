import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SyncEngine } from '../SyncEngine';
import { AIProvider, StructuredInstructions } from '../../types';

describe('SyncEngine', () => {
  let mockProvider: AIProvider;

  beforeEach(() => {
    mockProvider = {
      name: 'mock',
      promptToInstructions: vi.fn(),
      instructionsToCode: vi.fn(),
      codeToInstructions: vi.fn(),
    };
  });

  it('converts raw prompt to structured instructions', async () => {
    const expected: StructuredInstructions = {
      text: 'Load data from {{0}}',
      parameters: [{ id: '0', name: 'filename', value: 'data.csv', type: 'string' }],
    };
    vi.mocked(mockProvider.promptToInstructions).mockResolvedValue(expected);

    const engine = new SyncEngine(mockProvider);
    const result = await engine.processPrompt('Load data from data.csv');

    expect(result).toEqual(expected);
    expect(mockProvider.promptToInstructions).toHaveBeenCalledWith('Load data from data.csv');
  });

  it('generates code from instructions', async () => {
    const instructions: StructuredInstructions = {
      text: 'Load data from {{0}}',
      parameters: [{ id: '0', name: 'filename', value: 'data.csv', type: 'string' }],
    };
    vi.mocked(mockProvider.instructionsToCode).mockResolvedValue("pd.read_csv('data.csv')");

    const engine = new SyncEngine(mockProvider);
    const result = await engine.generateCode(instructions);

    expect(result).toBe("pd.read_csv('data.csv')");
  });

  it('generates instructions from code', async () => {
    const expected: StructuredInstructions = {
      text: 'Load data from {{0}}',
      parameters: [{ id: '0', name: 'filename', value: 'data.csv', type: 'string' }],
    };
    vi.mocked(mockProvider.codeToInstructions).mockResolvedValue(expected);

    const engine = new SyncEngine(mockProvider);
    const result = await engine.reverseEngineer("pd.read_csv('data.csv')");

    expect(result).toEqual(expected);
  });

  it('allows changing provider', async () => {
    const engine = new SyncEngine(mockProvider);

    const newProvider: AIProvider = {
      name: 'new-provider',
      promptToInstructions: vi.fn().mockResolvedValue({ text: 'test', parameters: [] }),
      instructionsToCode: vi.fn(),
      codeToInstructions: vi.fn(),
    };

    engine.setProvider(newProvider);
    await engine.processPrompt('test');

    expect(newProvider.promptToInstructions).toHaveBeenCalled();
    expect(mockProvider.promptToInstructions).not.toHaveBeenCalled();
  });

  it('returns current provider via getProvider', () => {
    const engine = new SyncEngine(mockProvider);
    expect(engine.getProvider()).toBe(mockProvider);
  });

  describe('fullSync', () => {
    it('syncs from instructions to code', async () => {
      const instructions: StructuredInstructions = {
        text: 'Load data from {{0}}',
        parameters: [{ id: '0', name: 'filename', value: 'data.csv', type: 'string' }],
      };
      vi.mocked(mockProvider.instructionsToCode).mockResolvedValue("pd.read_csv('data.csv')");

      const engine = new SyncEngine(mockProvider);
      const result = await engine.fullSync('instructions', instructions);

      expect(result).toEqual({
        instructions,
        code: "pd.read_csv('data.csv')",
      });
    });

    it('syncs from code to instructions', async () => {
      const code = "pd.read_csv('data.csv')";
      const instructions: StructuredInstructions = {
        text: 'Load data from {{0}}',
        parameters: [{ id: '0', name: 'filename', value: 'data.csv', type: 'string' }],
      };
      vi.mocked(mockProvider.codeToInstructions).mockResolvedValue(instructions);

      const engine = new SyncEngine(mockProvider);
      const result = await engine.fullSync('code', code);

      expect(result).toEqual({
        instructions,
        code,
      });
    });
  });
});
