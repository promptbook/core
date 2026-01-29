import { AIProvider, StructuredInstructions } from '../types';

export class SyncEngine {
  private provider: AIProvider;

  constructor(provider: AIProvider) {
    this.provider = provider;
  }

  setProvider(provider: AIProvider): void {
    this.provider = provider;
  }

  getProvider(): AIProvider {
    return this.provider;
  }

  async processPrompt(prompt: string): Promise<StructuredInstructions> {
    return this.provider.promptToInstructions(prompt);
  }

  async generateCode(instructions: StructuredInstructions): Promise<string> {
    return this.provider.instructionsToCode(instructions);
  }

  async reverseEngineer(code: string): Promise<StructuredInstructions> {
    return this.provider.codeToInstructions(code);
  }

  async fullSync(
    source: 'instructions' | 'code',
    content: StructuredInstructions | string
  ): Promise<{ instructions: StructuredInstructions; code: string }> {
    if (source === 'instructions') {
      const instructions = content as StructuredInstructions;
      const code = await this.generateCode(instructions);
      return { instructions, code };
    } else {
      const code = content as string;
      const instructions = await this.reverseEngineer(code);
      return { instructions, code };
    }
  }
}
