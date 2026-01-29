import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ClaudeProvider } from '../claude';

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('ClaudeProvider', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('has correct name', () => {
    const provider = new ClaudeProvider({ apiKey: 'test-key' });
    expect(provider.name).toBe('claude');
  });

  it('calls Claude API for promptToInstructions', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        content: [{
          text: JSON.stringify({
            text: 'Load data from {{0}}',
            parameters: [{ id: '0', name: 'filename', value: 'test.csv', type: 'string' }],
          }),
        }],
      }),
    });

    const provider = new ClaudeProvider({ apiKey: 'test-key' });
    const result = await provider.promptToInstructions('Load data from test.csv');

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.anthropic.com/v1/messages',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'x-api-key': 'test-key',
        }),
      })
    );
    expect(result.text).toBe('Load data from {{0}}');
  });

  it('throws error on API failure', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
    });

    const provider = new ClaudeProvider({ apiKey: 'bad-key' });

    await expect(provider.promptToInstructions('test')).rejects.toThrow('API request failed');
  });
});
