export type ParamType = 'string' | 'number' | 'column' | 'date' | 'boolean';

export interface Parameter {
  id: string;
  name: string;
  value: string;
  type: ParamType;
  options?: string[];
  min?: number;
  max?: number;
}

export interface StructuredInstructions {
  text: string; // "Load data from {{0}} and filter where {{1}} > {{2}}"
  parameters: Parameter[];
}
