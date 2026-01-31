// packages/core/src/kernel/index.ts
// Node.js kernel implementation for Jupyter protocol

export { KernelManager } from './KernelManager';
export type { KernelState, KernelOutput, ConnectionInfo } from '../types/kernel';
export {
  JupyterProtocol,
  type JupyterMessage,
  type JupyterHeader,
  type StreamContent,
  type DisplayDataContent,
  type ErrorContent,
  type StatusContent,
  type ExecuteReplyContent,
} from './JupyterProtocol';
export { PythonSetup } from './PythonSetup';
export type { PythonEnvironment, EnvironmentType } from '../types/kernel';
