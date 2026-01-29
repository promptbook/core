import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OllamaProvider } from '../ollama';

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('OllamaProvider', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('has correct name', () => {
    const provider = new OllamaProvider({});
    expect(provider.name).toBe('ollama');
  });

  it('uses localhost by default', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        response: JSON.stringify({
          text: 'Load data from {{0}}',
          parameters: [{ id: '0', name: 'filename', value: 'test.csv', type: 'string' }],
        }),
      }),
    });

    const provider = new OllamaProvider({});
    await provider.promptToInstructions('test');

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:11434/api/generate',
      expect.anything()
    );
  });

  it('uses codellama model by default', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        response: JSON.stringify({ text: 'test', parameters: [] }),
      }),
    });

    const provider = new OllamaProvider({});
    await provider.promptToInstructions('test');

    expect(mockFetch).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        body: expect.stringContaining('"model":"codellama"'),
      })
    );
  });

  it('uses custom baseUrl when provided', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        response: JSON.stringify({ text: 'test', parameters: [] }),
      }),
    });

    const provider = new OllamaProvider({ baseUrl: 'http://custom:8080' });
    await provider.promptToInstructions('test');

    expect(mockFetch).toHaveBeenCalledWith(
      'http://custom:8080/api/generate',
      expect.anything()
    );
  });

  it('uses custom model when provided', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        response: JSON.stringify({ text: 'test', parameters: [] }),
      }),
    });

    const provider = new OllamaProvider({ model: 'llama2' });
    await provider.promptToInstructions('test');

    expect(mockFetch).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        body: expect.stringContaining('"model":"llama2"'),
      })
    );
  });

  it('handles instructionsToCode', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        response: 'const data = loadData("test.csv");',
      }),
    });

    const provider = new OllamaProvider({});
    const result = await provider.instructionsToCode({
      text: 'Load data from {{0}}',
      parameters: [{ id: '0', name: 'filename', value: 'test.csv', type: 'string' }],
    });

    expect(result).toBe('const data = loadData("test.csv");');
  });

  it('handles codeToInstructions', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        response: JSON.stringify({
          text: 'Load data from {{0}}',
          parameters: [{ id: '0', name: 'filename', value: 'test.csv', type: 'string' }],
        }),
      }),
    });

    const provider = new OllamaProvider({});
    const result = await provider.codeToInstructions('const data = loadData("test.csv");');

    expect(result.text).toBe('Load data from {{0}}');
    expect(result.parameters).toHaveLength(1);
  });

  it('throws error on failed request', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    });

    const provider = new OllamaProvider({});
    await expect(provider.promptToInstructions('test')).rejects.toThrow();
  });
});
