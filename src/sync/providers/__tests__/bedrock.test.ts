import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BedrockProvider } from '../bedrock';

// Create a shared mock function that we can control
const mockCreate = vi.fn();

// Mock the Bedrock SDK
vi.mock('@anthropic-ai/bedrock-sdk', () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: {
      create: mockCreate,
    },
  })),
}));

describe('BedrockProvider', () => {
  let provider: BedrockProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new BedrockProvider({
      awsRegion: 'us-east-1',
    });
  });

  it('has name "bedrock"', () => {
    expect(provider.name).toBe('bedrock');
  });

  it('promptToInstructions returns structured instructions from Bedrock', async () => {
    const mockResponse = {
      content: [{
        type: 'text',
        text: JSON.stringify({
          text: 'Load data from {{0}}',
          parameters: [{ id: '0', name: 'file', value: 'test.csv', type: 'string' }],
        }),
      }],
    };

    mockCreate.mockResolvedValueOnce(mockResponse);

    const result = await provider.promptToInstructions('Load data from test.csv');

    expect(result.text).toBe('Load data from {{0}}');
    expect(result.parameters).toHaveLength(1);
    expect(result.parameters[0].value).toBe('test.csv');
  });

  it('instructionsToCode returns Python code from Bedrock', async () => {
    const mockResponse = {
      content: [{
        type: 'text',
        text: "import pandas as pd\ndf = pd.read_csv('test.csv')",
      }],
    };

    mockCreate.mockResolvedValueOnce(mockResponse);

    const instructions = {
      text: 'Load data from {{0}}',
      parameters: [{ id: '0', name: 'file', value: 'test.csv', type: 'string' as const }],
    };

    const result = await provider.instructionsToCode(instructions);

    expect(result).toContain("pd.read_csv('test.csv')");
  });

  it('codeToInstructions returns structured instructions from Python code', async () => {
    const mockResponse = {
      content: [{
        type: 'text',
        text: JSON.stringify({
          text: 'Load data from {{0}}',
          parameters: [{ id: '0', name: 'filename', value: 'data.csv', type: 'string' }],
        }),
      }],
    };

    mockCreate.mockResolvedValueOnce(mockResponse);

    const result = await provider.codeToInstructions("pd.read_csv('data.csv')");

    expect(result.text).toBe('Load data from {{0}}');
    expect(result.parameters[0].value).toBe('data.csv');
  });

  it('uses custom model when provided', () => {
    const customProvider = new BedrockProvider({
      model: 'anthropic.claude-3-haiku-20240307-v1:0',
      awsRegion: 'us-west-2',
    });

    expect(customProvider.name).toBe('bedrock');
  });

  it('uses default region when not provided', () => {
    const defaultProvider = new BedrockProvider();

    expect(defaultProvider.name).toBe('bedrock');
  });
});
