// packages/core/src/kernel/types.ts
export type ExecutionResultType = 'stdout' | 'stderr' | 'result' | 'display' | 'error' | 'status';

export interface ExecutionResult {
  type: ExecutionResultType;
  content: string;
  mimeType?: string;
}

export interface KernelInfo {
  name: string;
  language: string;
  version: string;
}

export interface KernelStatus {
  state: 'idle' | 'busy' | 'starting' | 'dead';
  executionCount: number;
}
