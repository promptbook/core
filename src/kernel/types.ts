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

export type KernelState = 'idle' | 'busy' | 'starting' | 'dead' | 'disconnected';

export interface KernelStatusInfo {
  state: KernelState;
  executionCount: number;
}

export type EnvironmentType = 'venv' | 'conda' | 'system' | 'pyenv' | 'pipenv';

export interface PythonEnvironment {
  path: string;
  name: string;
  version: string;
  type: EnvironmentType;
  hasIpykernel: boolean;
}

export interface KernelOutput {
  type: ExecutionResultType;
  content: string;
  mimeType?: string;
  executionCount?: number;
}
