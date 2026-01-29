// packages/core/src/kernel/__tests__/KernelManager.test.ts
import { describe, it, expect } from 'vitest';
import { KernelManager } from '../KernelManager';

describe('KernelManager', () => {
  it('starts in idle state', () => {
    const kernel = new KernelManager();
    expect(kernel.getStatus().state).toBe('idle');
  });

  it('tracks execution count', async () => {
    const kernel = new KernelManager();

    // Execute code and consume the generator
    const results = [];
    for await (const result of kernel.execute('1 + 1')) {
      results.push(result);
    }

    expect(kernel.getStatus().executionCount).toBe(1);
  });

  it('provides kernel info', () => {
    const kernel = new KernelManager();
    const info = kernel.getInfo();

    expect(info.name).toBe('python3');
    expect(info.language).toBe('python');
  });
});
