import { AIProvider, AIProviderConfig } from '../../types/provider';
import { StructuredInstructions } from '../../types/instructions';

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
const DEFAULT_MODEL = 'claude-3-sonnet-20240229';

export class ClaudeProvider implements AIProvider {
  readonly name = 'claude';
  private apiKey: string;
  private model: string;

  constructor(config: AIProviderConfig) {
    if (!config.apiKey) {
      throw new Error('API key is required for Claude provider');
    }
    this.apiKey = config.apiKey;
    this.model = config.model || DEFAULT_MODEL;
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

    const response = await fetch(CLAUDE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.content[0].text;
    return JSON.parse(content) as StructuredInstructions;
  }

  async instructionsToCode(instructions: StructuredInstructions): Promise<string> {
    const systemPrompt = `You are a helpful assistant that converts structured instructions into Python code.
Given instructions with parameters, generate clean, executable Python code.
Replace parameter placeholders {{id}} with actual values from the parameters list.
Respond ONLY with the Python code, no explanations.`;

    const response = await fetch(CLAUDE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 2048,
        system: systemPrompt,
        messages: [{ role: 'user', content: JSON.stringify(instructions) }],
      }),
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.content[0].text;
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

    const response = await fetch(CLAUDE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: 'user', content: code }],
      }),
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.content[0].text;
    return JSON.parse(content) as StructuredInstructions;
  }
}
