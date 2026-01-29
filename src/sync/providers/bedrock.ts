import { AIProvider } from '../../types/provider';
import { StructuredInstructions } from '../../types/instructions';

// Default to Claude Sonnet 4 on Bedrock
const DEFAULT_MODEL = 'global.anthropic.claude-sonnet-4-20250514-v1:0';
const DEFAULT_REGION = 'us-east-1';

export interface BedrockProviderConfig {
  awsAccessKey?: string;
  awsSecretKey?: string;
  awsSessionToken?: string;
  awsRegion?: string;
  model?: string;
}

export class BedrockProvider implements AIProvider {
  readonly name = 'bedrock';
  private config: BedrockProviderConfig;
  private model: string;

  constructor(config: BedrockProviderConfig = {}) {
    this.config = config;
    this.model = config.model || DEFAULT_MODEL;
  }

  private async getClient() {
    // Dynamic import to avoid bundling issues when SDK is not installed
    const { default: AnthropicBedrock } = await import('@anthropic-ai/bedrock-sdk');

    return new AnthropicBedrock({
      awsAccessKey: this.config.awsAccessKey,
      awsSecretKey: this.config.awsSecretKey,
      awsSessionToken: this.config.awsSessionToken,
      awsRegion: this.config.awsRegion || DEFAULT_REGION,
    });
  }

  async promptToInstructions(prompt: string): Promise<StructuredInstructions> {
    const client = await this.getClient();

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

    const message = await client.messages.create({
      model: this.model,
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = message.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Bedrock');
    }
    return JSON.parse(content.text) as StructuredInstructions;
  }

  async instructionsToCode(instructions: StructuredInstructions): Promise<string> {
    const client = await this.getClient();

    const systemPrompt = `You are a helpful assistant that converts structured instructions into Python code.
Given instructions with parameters, generate clean, executable Python code.
Replace parameter placeholders {{id}} with actual values from the parameters list.
Respond ONLY with the Python code, no explanations.`;

    const message = await client.messages.create({
      model: this.model,
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{ role: 'user', content: JSON.stringify(instructions) }],
    });

    const content = message.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Bedrock');
    }
    return content.text;
  }

  async codeToInstructions(code: string): Promise<StructuredInstructions> {
    const client = await this.getClient();

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

    const message = await client.messages.create({
      model: this.model,
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: code }],
    });

    const content = message.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Bedrock');
    }
    return JSON.parse(content.text) as StructuredInstructions;
  }
}
