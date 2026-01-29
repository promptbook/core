import { AIProvider } from '../../types/provider';
import { StructuredInstructions } from '../../types/instructions';

// Default model for Bedrock
const DEFAULT_MODEL = 'claude-sonnet-4-5-20250929';

export interface BedrockProviderConfig {
  model?: string;
  awsProfile?: string;
  awsRegion?: string;
}

export class BedrockProvider implements AIProvider {
  readonly name = 'bedrock';
  private model: string;
  private config: BedrockProviderConfig;

  constructor(config: BedrockProviderConfig = {}) {
    this.config = config;
    this.model = config.model || DEFAULT_MODEL;

    // Set environment variable to enable Bedrock in Claude Agent SDK
    process.env.CLAUDE_CODE_USE_BEDROCK = '1';

    if (config.awsRegion) {
      process.env.AWS_REGION = config.awsRegion;
    }
    if (config.awsProfile) {
      process.env.AWS_PROFILE = config.awsProfile;
    }
  }

  private async runQuery(prompt: string, systemPrompt: string): Promise<string> {
    // Dynamic import to avoid bundling issues
    const { query } = await import('@anthropic-ai/claude-agent-sdk');

    let result = '';

    for await (const message of query({
      prompt: `${systemPrompt}\n\nUser request: ${prompt}`,
      options: {
        model: this.model,
        allowedTools: [], // No tools needed for simple text generation
        maxTurns: 1,
      },
    })) {
      // Extract the result from the agent's response
      if ('result' in message && typeof message.result === 'string') {
        result = message.result;
      } else if ('content' in message && typeof message.content === 'string') {
        result = message.content;
      }
    }

    return result;
  }

  async promptToInstructions(prompt: string): Promise<StructuredInstructions> {
    const systemPrompt = `You are a helpful assistant that converts natural language prompts into structured instructions.
Given a user prompt, extract:
1. A templated text where dynamic values are replaced with placeholders like {{0}}, {{1}}, etc.
2. A list of parameters with their id, name, value, and type (string, number, column, date, or boolean).

Respond ONLY with valid JSON in this format:
{
  "text": "instruction text with {{0}} placeholders",
  "parameters": [
    { "id": "0", "name": "param_name", "value": "extracted_value", "type": "string" }
  ]
}`;

    const result = await this.runQuery(prompt, systemPrompt);

    // Extract JSON from the response (may be wrapped in markdown code blocks)
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to extract JSON from response');
    }

    return JSON.parse(jsonMatch[0]) as StructuredInstructions;
  }

  async instructionsToCode(instructions: StructuredInstructions): Promise<string> {
    const systemPrompt = `You are a helpful assistant that converts structured instructions into Python code.
Given instructions with parameters, generate clean, executable Python code.
Replace parameter placeholders {{id}} with actual values from the parameters list.
Respond ONLY with the Python code, no explanations or markdown.`;

    const result = await this.runQuery(JSON.stringify(instructions), systemPrompt);

    // Remove markdown code blocks if present
    const codeMatch = result.match(/```python\n?([\s\S]*?)```/) || result.match(/```\n?([\s\S]*?)```/);
    return codeMatch ? codeMatch[1].trim() : result.trim();
  }

  async codeToInstructions(code: string): Promise<StructuredInstructions> {
    const systemPrompt = `You are a helpful assistant that converts Python code into structured instructions.
Given Python code, extract:
1. A natural language description of what the code does with placeholders {{0}}, {{1}}, etc.
2. A list of parameters extracted from the code (file paths, column names, values, etc.)

Respond ONLY with valid JSON in this format:
{
  "text": "instruction text with {{0}} placeholders",
  "parameters": [
    { "id": "0", "name": "param_name", "value": "extracted_value", "type": "string" }
  ]
}`;

    const result = await this.runQuery(code, systemPrompt);

    // Extract JSON from the response
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to extract JSON from response');
    }

    return JSON.parse(jsonMatch[0]) as StructuredInstructions;
  }
}
