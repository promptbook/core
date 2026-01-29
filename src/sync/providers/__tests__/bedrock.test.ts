import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BedrockProvider } from '../bedrock';

// Mock async generator function for query
async function* mockQueryGenerator(response: string) {
  yield { result: response };
}

const mockQuery = vi.fn();

// Mock the Claude Agent SDK
vi.mock('@anthropic-ai/claude-agent-sdk', () => ({
  query: (params: unknown) => mockQuery(params),
}));

describe('BedrockProvider', () => {
  let provider: BedrockProvider;
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    provider = new BedrockProvider({
      awsRegion: 'us-east-1',
    });
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('has name "bedrock"', () => {
    expect(provider.name).toBe('bedrock');
  });

  it('sets CLAUDE_CODE_USE_BEDROCK environment variable', () => {
    expect(process.env.CLAUDE_CODE_USE_BEDROCK).toBe('1');
  });

  it('sets AWS_REGION when provided', () => {
    expect(process.env.AWS_REGION).toBe('us-east-1');
  });

  it('promptToInstructions returns structured instructions', async () => {
    const mockResponse = JSON.stringify({
      text: 'Load data from {{0}}',
      parameters: [{ id: '0', name: 'file', value: 'test.csv', type: 'string' }],
    });

    mockQuery.mockReturnValueOnce(mockQueryGenerator(mockResponse));

    const result = await provider.promptToInstructions('Load data from test.csv');

    expect(result.text).toBe('Load data from {{0}}');
    expect(result.parameters).toHaveLength(1);
    expect(result.parameters[0].value).toBe('test.csv');
    expect(mockQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        options: expect.objectContaining({
          allowedTools: [],
          maxTurns: 1,
        }),
      })
    );
  });

  it('instructionsToCode returns Python code', async () => {
    const mockResponse = "import pandas as pd\ndf = pd.read_csv('test.csv')";

    mockQuery.mockReturnValueOnce(mockQueryGenerator(mockResponse));

    const instructions = {
      text: 'Load data from {{0}}',
      parameters: [{ id: '0', name: 'file', value: 'test.csv', type: 'string' as const }],
    };

    const result = await provider.instructionsToCode(instructions);

    expect(result).toContain("pd.read_csv('test.csv')");
  });

  it('instructionsToCode strips markdown code blocks', async () => {
    const mockResponse = "```python\nimport pandas as pd\ndf = pd.read_csv('test.csv')\n```";

    mockQuery.mockReturnValueOnce(mockQueryGenerator(mockResponse));

    const instructions = {
      text: 'Load data from {{0}}',
      parameters: [{ id: '0', name: 'file', value: 'test.csv', type: 'string' as const }],
    };

    const result = await provider.instructionsToCode(instructions);

    expect(result).not.toContain('```');
    expect(result).toContain("pd.read_csv('test.csv')");
  });

  it('codeToInstructions returns structured instructions from Python code', async () => {
    const mockResponse = JSON.stringify({
      text: 'Load data from {{0}}',
      parameters: [{ id: '0', name: 'filename', value: 'data.csv', type: 'string' }],
    });

    mockQuery.mockReturnValueOnce(mockQueryGenerator(mockResponse));

    const result = await provider.codeToInstructions("pd.read_csv('data.csv')");

    expect(result.text).toBe('Load data from {{0}}');
    expect(result.parameters[0].value).toBe('data.csv');
  });

  it('uses custom model when provided', () => {
    const customProvider = new BedrockProvider({
      model: 'claude-3-haiku-20240307',
      awsRegion: 'us-west-2',
    });

    expect(customProvider.name).toBe('bedrock');
    expect(process.env.AWS_REGION).toBe('us-west-2');
  });

  it('sets AWS_PROFILE when provided', () => {
    new BedrockProvider({
      awsProfile: 'my-profile',
    });

    expect(process.env.AWS_PROFILE).toBe('my-profile');
  });
});
