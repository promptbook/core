// packages/core/src/utils/packageDetection.ts
// Utility for detecting missing Python packages from error tracebacks

import { CellOutput } from '../types';

/**
 * Strip ANSI escape codes from text.
 * IPython/ipykernel includes ANSI codes for colored traceback output.
 */
function stripAnsi(text: string): string {
  // eslint-disable-next-line no-control-regex
  return text.replace(/\x1b\[[0-9;]*m/g, '');
}

/** Information about a missing package */
export interface MissingPackage {
  /** The import name used in code (e.g., "cv2") */
  importName: string;
  /** The pip package name to install (e.g., "opencv-python") */
  packageName: string;
}

/** Result of package detection */
export interface PackageDetectionResult {
  /** Whether any missing packages were detected */
  hasMissingPackages: boolean;
  /** List of missing packages */
  packages: MissingPackage[];
  /** Original error content for reference */
  originalError: string;
}

/**
 * Common import name to PyPI package name mappings.
 * These are packages where the import name differs from the pip install name.
 */
const PACKAGE_MAPPINGS: Record<string, string> = {
  // Image processing
  cv2: 'opencv-python',
  PIL: 'pillow',

  // Data science
  sklearn: 'scikit-learn',

  // Utilities
  yaml: 'pyyaml',
  dotenv: 'python-dotenv',
  dateutil: 'python-dateutil',

  // Web scraping
  bs4: 'beautifulsoup4',

  // Web frameworks
  flask_cors: 'flask-cors',

  // Auth/crypto
  jose: 'python-jose',
  jwt: 'pyjwt',

  // Database
  psycopg2: 'psycopg2-binary',

  // Testing
  pytest: 'pytest',
};

/**
 * Maps an import name to its PyPI package name.
 * Returns the original name if no mapping exists.
 */
export function mapPackageName(importName: string): string {
  return PACKAGE_MAPPINGS[importName] || importName;
}

/**
 * Validates that a package name is safe to use with pip.
 * PyPI package names: alphanumeric, hyphens, underscores, dots, brackets for extras.
 */
export function isValidPackageName(name: string): boolean {
  // Basic validation - alphanumeric, hyphens, underscores, dots
  // Also allow brackets for extras like "package[extra]"
  return /^[a-zA-Z0-9_\-.[\]]+$/.test(name) && name.length > 0 && name.length < 100;
}

/**
 * Detects missing Python packages from execution error outputs.
 * Handles both ModuleNotFoundError and ImportError.
 *
 * @param outputs - Array of cell outputs from execution
 * @returns Detection result with missing packages, or null if no import errors
 */
export function detectMissingPackages(outputs: CellOutput[]): PackageDetectionResult | null {
  // Find error outputs
  const errorOutput = outputs.find(o => o.type === 'error');
  if (!errorOutput) return null;

  // Strip ANSI codes that ipykernel includes for colored output
  const content = stripAnsi(errorOutput.content);
  const packages = new Set<string>();

  // Pattern 1: ModuleNotFoundError: No module named 'xxx'
  // Also handles: ModuleNotFoundError: No module named 'xxx.yyy'
  const moduleNotFoundRegex = /ModuleNotFoundError:\s*No\s+module\s+named\s+['"]([^'"]+)['"]/gi;
  let match: RegExpExecArray | null;

  while ((match = moduleNotFoundRegex.exec(content)) !== null) {
    // Take base module only (e.g., 'sklearn.linear_model' -> 'sklearn')
    const moduleName = match[1].split('.')[0];
    packages.add(moduleName);
  }

  // Pattern 2: ImportError: cannot import name 'xxx' from 'yyy'
  const importErrorFromRegex = /ImportError:\s*cannot\s+import\s+name\s+['"][^'"]+['"]\s+from\s+['"]([^'"]+)['"]/gi;
  while ((match = importErrorFromRegex.exec(content)) !== null) {
    const moduleName = match[1].split('.')[0];
    packages.add(moduleName);
  }

  // Pattern 3: ImportError: No module named xxx (older Python / different format)
  const oldImportErrorRegex = /ImportError:\s*No\s+module\s+named\s+['"]?([^\s'"]+)['"]?/gi;
  while ((match = oldImportErrorRegex.exec(content)) !== null) {
    const moduleName = match[1].split('.')[0];
    packages.add(moduleName);
  }

  if (packages.size === 0) return null;

  // Convert to MissingPackage array with mapped names
  const missingPackages: MissingPackage[] = Array.from(packages).map(importName => ({
    importName,
    packageName: mapPackageName(importName),
  }));

  return {
    hasMissingPackages: true,
    packages: missingPackages,
    originalError: content,
  };
}

/**
 * Generates a pip install command for the given packages.
 */
export function generatePipInstallCommand(packages: string[], asShellCommand = true): string {
  const validPackages = packages.filter(isValidPackageName);
  if (validPackages.length === 0) return '';

  const prefix = asShellCommand ? '!' : '';
  return `${prefix}pip install ${validPackages.join(' ')}`;
}

/**
 * Checks if a cell's code contains pip install commands.
 */
export function hasPipInstalls(code: string): boolean {
  return /!?\s*pip\s+install/i.test(code);
}

/**
 * Counts the number of pip install commands in a cell's code.
 */
export function countPipInstalls(code: string): number {
  const matches = code.match(/!?\s*pip\s+install/gi);
  return matches ? matches.length : 0;
}
