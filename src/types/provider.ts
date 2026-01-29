import { StructuredInstructions } from './instructions';

export interface AIProvider {
  name: string;
  promptToInstructions(prompt: string): Promise<StructuredInstructions>;
  instructionsToCode(instructions: StructuredInstructions): Promise<string>;
  codeToInstructions(code: string): Promise<StructuredInstructions>;
}

export interface AIProviderConfig {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
}
