import { AIProvider, AIProviderConfig } from '../../types/provider';
import { StructuredInstructions } from '../../types/instructions';

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const DEFAULT_MODEL = 'gpt-4';

const SYSTEM_PROMPT = `You are an AI assistant that converts natural language prompts into structured instructions.
Extract parameters from the prompt and return a JSON object with:
- text: The instruction text with parameter placeholders like {{0}}, {{1}}, etc.
- parameters: Array of parameter objects with id, name, value, and type fields.

Respond only with valid JSON, no other text.`;

export class OpenAIProvider implements AIProvider {
  readonly name = 'openai';
  private apiKey: string;
  private baseUrl: string;
  private model: string;

  constructor(config: AIProviderConfig) {
    if (!config.apiKey) {
      throw new Error('OpenAI API key is required');
    }
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? OPENAI_API_URL;
    this.model = config.model ?? DEFAULT_MODEL;
  }

  async promptToInstructions(prompt: string): Promise<StructuredInstructions> {
    const response = await this.callAPI([
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: prompt },
    ]);
    return JSON.parse(response) as StructuredInstructions;
  }

  async instructionsToCode(instructions: StructuredInstructions): Promise<string> {
    const codePrompt = `Convert these structured instructions to Python code:
Instructions: ${instructions.text}
Parameters: ${JSON.stringify(instructions.parameters)}

Return only executable Python code, no explanations.`;

    return await this.callAPI([
      { role: 'system', content: 'You are a code generation assistant. Generate clean, executable Python code.' },
      { role: 'user', content: codePrompt },
    ]);
  }

  async codeToInstructions(code: string): Promise<StructuredInstructions> {
    const analysisPrompt = `Analyze this Python code and extract structured instructions:

${code}

Return a JSON object with:
- text: A description with parameter placeholders like {{0}}, {{1}}, etc.
- parameters: Array of parameter objects with id, name, value, and type fields.

Respond only with valid JSON.`;

    const response = await this.callAPI([
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: analysisPrompt },
    ]);
    return JSON.parse(response) as StructuredInstructions;
  }

  private async callAPI(messages: Array<{ role: string; content: string }>): Promise<string> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages,
      }),
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as {
      choices: Array<{ message: { content: string } }>;
    };
    return data.choices[0].message.content;
  }
}
