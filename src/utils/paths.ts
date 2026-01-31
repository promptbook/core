// packages/core/src/utils/paths.ts
// Path validation utilities for secure file operations

import * as path from 'path';

/**
 * Resolve a relative path within a root directory, preventing path traversal.
 * Throws if the resolved path escapes the root directory.
 *
 * @param rootDir - The root directory to constrain paths within
 * @param relativePath - The relative path to resolve
 * @returns The resolved absolute path
 * @throws Error if path traversal is detected
 *
 * @example
 * ```typescript
 * resolveWithin('/home/user/project', 'src/file.ts')
 * // Returns: '/home/user/project/src/file.ts'
 *
 * resolveWithin('/home/user/project', '../../../etc/passwd')
 * // Throws: Error('Path traversal detected: ../../../etc/passwd')
 * ```
 */
export function resolveWithin(rootDir: string, relativePath: string): string {
  // Normalize and resolve the full path
  const resolved = path.resolve(rootDir, relativePath);

  // Ensure the resolved path starts with the root directory
  const normalizedRoot = path.resolve(rootDir) + path.sep;
  const normalizedResolved = path.resolve(resolved);

  // Allow exact root match or paths under root
  if (!normalizedResolved.startsWith(normalizedRoot) &&
      normalizedResolved !== path.resolve(rootDir)) {
    throw new Error(`Path traversal detected: ${relativePath}`);
  }

  return resolved;
}

/**
 * Check if a path is safely within a root directory without throwing.
 *
 * @param rootDir - The root directory to constrain paths within
 * @param relativePath - The relative path to check
 * @returns true if the path is safe, false otherwise
 */
export function isWithin(rootDir: string, relativePath: string): boolean {
  try {
    resolveWithin(rootDir, relativePath);
    return true;
  } catch {
    return false;
  }
}
