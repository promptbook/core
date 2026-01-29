import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OpenAIProvider } from '../openai';

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('OpenAIProvider', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('has correct name', () => {
    const provider = new OpenAIProvider({ apiKey: 'test-key' });
    expect(provider.name).toBe('openai');
  });

  it('calls OpenAI API with correct format', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        choices: [{
          message: {
            content: JSON.stringify({
              text: 'Load data from {{0}}',
              parameters: [{ id: '0', name: 'filename', value: 'test.csv', type: 'string' }],
            }),
          },
        }],
      }),
    });

    const provider = new OpenAIProvider({ apiKey: 'test-key' });
    const result = await provider.promptToInstructions('Load data from test.csv');

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.openai.com/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Authorization': 'Bearer test-key',
        }),
      })
    );
    expect(result.text).toBe('Load data from {{0}}');
  });
});
