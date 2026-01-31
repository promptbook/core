/**
 * Kernel type definitions shared between core and electron packages
 */

export type KernelState = 'idle' | 'busy' | 'starting' | 'dead' | 'disconnected';

export interface KernelOutput {
  type: 'stdout' | 'stderr' | 'result' | 'display' | 'error' | 'status';
  content: string;
  mimeType?: string;
  executionCount?: number;
}

export type EnvironmentType = 'venv' | 'conda' | 'system' | 'pyenv' | 'pipenv';

export interface PythonEnvironment {
  path: string;
  name: string;
  version: string;
  type: EnvironmentType;
  hasIpykernel: boolean;
}

export interface ConnectionInfo {
  shell_port: number;
  iopub_port: number;
  stdin_port: number;
  control_port: number;
  hb_port: number;
  ip: string;
  key: string;
  transport: string;
  signature_scheme: string;
  kernel_name: string;
}
