/**
 * Utility functions for parsing AI responses
 */

/**
 * Extract parameters from content in {{name:value}} format
 */
export function extractParameters(content: string): Record<string, string> {
  const params: Record<string, string> = {};
  const regex = /\{\{([^:}]+):([^}]+)\}\}/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    const name = match[1].trim();
    const value = match[2].trim();
    params[name] = value;
  }
  return params;
}

/**
 * Extract symbol mentions from content (#symbol_name format)
 */
export function extractSymbolMentions(content: string): string[] {
  const symbols: string[] = [];
  const regex = /#([a-zA-Z_][a-zA-Z0-9_]*)/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    if (!symbols.includes(match[1])) {
      symbols.push(match[1]);
    }
  }
  return symbols;
}
