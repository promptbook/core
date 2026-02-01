// packages/kernel/src/index.ts
// Node.js kernel implementation for Jupyter protocol

export { KernelManager } from './KernelManager';
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

// Re-export types from @promptbook/types
export type {
  KernelState,
  KernelOutput,
  ConnectionInfo,
  PythonEnvironment,
  EnvironmentType,
} from '../types';

// Package detection utilities
export {
  detectMissingPackages,
  mapPackageName,
  generatePipInstallCommand,
  hasPipInstalls,
  countPipInstalls,
  isValidPackageName,
} from './packageDetection';

// Re-export types from @promptbook/types (already there but for clarity)
export type {
  MissingPackage,
  PackageDetectionResult,
} from '../types';

// Path utilities
export {
  resolveWithin,
  isWithin,
} from './paths';
