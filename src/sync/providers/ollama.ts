import { AIProvider, AIProviderConfig, StructuredInstructions } from '../../types';

const DEFAULT_BASE_URL = 'http://localhost:11434';
const DEFAULT_MODEL = 'codellama';

export class OllamaProvider implements AIProvider {
  readonly name = 'ollama';
  private baseUrl: string;
  private model: string;

  constructor(config: AIProviderConfig) {
    this.baseUrl = config.baseUrl || DEFAULT_BASE_URL;
    this.model = config.model || DEFAULT_MODEL;
  }

  private async generate(prompt: string): Promise<string> {
    const response = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        prompt,
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.response;
  }

  async promptToInstructions(prompt: string): Promise<StructuredInstructions> {
    const systemPrompt = `Convert the following natural language prompt into structured instructions.
Return a JSON object with:
- "text": the instruction template with {{0}}, {{1}}, etc. for parameters
- "parameters": array of {id, name, value, type} objects

User prompt: ${prompt}

Return only valid JSON:`;

    const response = await this.generate(systemPrompt);
    return JSON.parse(response);
  }

  async instructionsToCode(instructions: StructuredInstructions): Promise<string> {
    const filledText = this.fillParameters(instructions);
    const systemPrompt = `Generate code for the following instruction:
${filledText}

Return only the code, no explanations:`;

    return this.generate(systemPrompt);
  }

  async codeToInstructions(code: string): Promise<StructuredInstructions> {
    const systemPrompt = `Analyze this code and extract structured instructions.
Return a JSON object with:
- "text": natural language description with {{0}}, {{1}}, etc. for dynamic values
- "parameters": array of {id, name, value, type} objects for extracted values

Code:
${code}

Return only valid JSON:`;

    const response = await this.generate(systemPrompt);
    return JSON.parse(response);
  }

  private fillParameters(instructions: StructuredInstructions): string {
    let text = instructions.text;
    for (const param of instructions.parameters) {
      text = text.replace(`{{${param.id}}}`, param.value);
    }
    return text;
  }
}
