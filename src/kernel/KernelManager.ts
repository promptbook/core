// packages/core/src/kernel/KernelManager.ts
import { ExecutionResult, KernelInfo, KernelStatus } from './types';

export class KernelManager {
  private status: KernelStatus = {
    state: 'idle',
    executionCount: 0,
  };

  private info: KernelInfo = {
    name: 'python3',
    language: 'python',
    version: '3.x',
  };

  getStatus(): KernelStatus {
    return { ...this.status };
  }

  getInfo(): KernelInfo {
    return { ...this.info };
  }

  async start(): Promise<void> {
    this.status.state = 'starting';
    // TODO: Actually start jupyter kernel
    this.status.state = 'idle';
  }

  async *execute(code: string): AsyncIterable<ExecutionResult> {
    this.status.state = 'busy';
    this.status.executionCount++;

    try {
      // TODO: Actually execute via jupyter kernel protocol
      // For now, yield a placeholder
      yield {
        type: 'result',
        content: 'Kernel execution not yet implemented',
      };
    } finally {
      this.status.state = 'idle';
    }
  }

  async interrupt(): Promise<void> {
    // TODO: Send interrupt signal to kernel
  }

  async restart(): Promise<void> {
    await this.shutdown();
    await this.start();
  }

  async shutdown(): Promise<void> {
    this.status.state = 'dead';
    // TODO: Actually shutdown kernel
  }
}
