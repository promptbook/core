// packages/core/src/kernel/__tests__/KernelManager.test.ts
import { describe, it, expect } from 'vitest';
import { KernelManager } from '../KernelManager';

describe('KernelManager', () => {
  it('starts in disconnected state before start() is called', () => {
    const kernel = new KernelManager('/usr/bin/python3');
    expect(kernel.getState()).toBe('disconnected');
  });

  it('tracks execution count starting at 0', () => {
    const kernel = new KernelManager('/usr/bin/python3');
    expect(kernel.getExecutionCount()).toBe(0);
  });

  it('is an EventEmitter', () => {
    const kernel = new KernelManager('/usr/bin/python3');
    expect(typeof kernel.on).toBe('function');
    expect(typeof kernel.emit).toBe('function');
  });

  // Integration tests that require a real Python environment are skipped
  // They should be run manually or in CI with proper Python setup
});
