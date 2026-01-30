// packages/core/src/sync/promptBuilder.ts
// Shared AI sync prompt building logic

/** Context from a single cell in the notebook */
export interface CellContext {
  shortDescription: string;
  code: string;
}

/** Symbol info extracted from generated code */
export interface GeneratedSymbol {
  name: string;
  kind: 'variable' | 'function';
  type: string;
  description: string;
}

/** Extended result from code generation that includes symbol metadata */
export interface CodeGenerationResult {
  code: string;
  symbols: GeneratedSymbol[];
}

export interface AiSyncContext {
  newContent: string;
  previousContent?: string;
  existingCounterpart?: string;
  /** Cells that come BEFORE the current cell (in execution order) */
  cellsBefore?: CellContext[];
  /** Cells that come AFTER the current cell (in execution order) */
  cellsAfter?: CellContext[];
  /** #mentions in the description that should be used as variable/function names */
  proposedSymbols?: string[];
}

/**
 * Format surrounding cells as context for the prompt
 */
function formatCellsContext(cellsBefore?: CellContext[], cellsAfter?: CellContext[]): string {
  const parts: string[] = [];

  if (cellsBefore && cellsBefore.length > 0) {
    parts.push('EARLIER CELLS (executed before this cell - you MUST reuse their variables):');
    cellsBefore.forEach((cell, i) => {
      parts.push(`--- Cell ${i + 1} ---`);
      if (cell.shortDescription) {
        parts.push(`Description: ${cell.shortDescription}`);
      }
      if (cell.code && cell.code.trim()) {
        parts.push('```python');
        parts.push(cell.code);
        parts.push('```');
      } else if (cell.shortDescription) {
        parts.push('(Code not yet generated, but will produce results based on description)');
      }
    });
    parts.push('');
  }

  if (cellsAfter && cellsAfter.length > 0) {
    parts.push('LATER CELLS (executed after this cell - may use variables you define):');
    cellsAfter.forEach((cell, i) => {
      parts.push(`--- Cell ${i + 1} ---`);
      if (cell.shortDescription) {
        parts.push(`Description: ${cell.shortDescription}`);
      }
      if (cell.code && cell.code.trim()) {
        parts.push('```python');
        parts.push(cell.code);
        parts.push('```');
      }
    });
    parts.push('');
  }

  return parts.length > 0 ? parts.join('\n') : '';
}

export type SyncDirection =
  | 'expandInstructions'
  | 'shortenInstructions'
  | 'shortToFull'
  | 'fullToShort'
  | 'toCode'
  | 'fullToCode'
  | 'shortToCode'
  | 'toInstructions'
  | 'codeToShort'
  | 'codeToFull';

/**
 * Extract #mentions from description text
 */
export function extractHashMentions(text: string): string[] {
  const regex = /#([a-zA-Z_][a-zA-Z0-9_]*)/g;
  const mentions: string[] = [];
  let match;
  while ((match = regex.exec(text)) !== null) {
    mentions.push(match[1]);
  }
  return [...new Set(mentions)]; // Remove duplicates
}

// Few-shot example for structured code output
const CODE_OUTPUT_EXAMPLE = `
EXAMPLE INPUT:
"Calculate the #average_price from the prices list and create a #price_summary function"

EXAMPLE OUTPUT:
{
  "code": "def price_summary(prices):\\n    \\"\\"\\"Calculate summary statistics for prices.\\"\\"\\"\\n    return {\\n        'min': min(prices),\\n        'max': max(prices),\\n        'avg': sum(prices) / len(prices)\\n    }\\n\\naverage_price = sum(prices) / len(prices)\\nprint(f'Average price: {average_price:.2f}')",
  "symbols": [
    {"name": "price_summary", "kind": "function", "type": "price_summary(prices)", "description": "Calculate summary statistics for prices"},
    {"name": "average_price", "kind": "variable", "type": "float", "description": "The calculated average of all prices"}
  ]
}`;

/**
 * Build a prompt for AI sync based on the direction and context.
 * Used by both Electron and VS Code extension.
 */
export function buildSyncPrompt(direction: string, context: AiSyncContext): string {
  const { newContent, previousContent, existingCounterpart, cellsBefore, cellsAfter, proposedSymbols } = context;
  const cellsContext = formatCellsContext(cellsBefore, cellsAfter);

  // Extract proposed symbols from #mentions in the description
  const mentionedSymbols = proposedSymbols || extractHashMentions(newContent);

  // Handle expand/shorten instructions
  if (direction === 'expandInstructions') {
    return buildExpandPrompt(newContent);
  }

  if (direction === 'shortenInstructions') {
    return buildShortenPrompt(newContent);
  }

  // Handle description-to-description conversions
  if (direction === 'shortToFull') {
    return buildShortToFullPrompt(newContent, existingCounterpart);
  }

  if (direction === 'fullToShort') {
    return buildFullToShortPrompt(newContent, existingCounterpart);
  }

  // Normalize direction types
  const isToCode = direction === 'toCode' || direction === 'fullToCode' || direction === 'shortToCode';
  const isToShort = direction === 'codeToShort';
  const isToFull = direction === 'codeToFull';
  const isToInstructions = direction === 'toInstructions' || isToShort || isToFull;

  const hasExistingCode = isToCode && existingCounterpart?.trim();
  const hasExistingInstructions = isToInstructions && existingCounterpart?.trim();
  const hasChanges = previousContent && previousContent !== newContent;

  if (isToCode) {
    return buildToCodePrompt({
      newContent,
      previousContent,
      existingCounterpart,
      cellsContext,
      mentionedSymbols,
      hasExistingCode: !!hasExistingCode,
      hasChanges: !!hasChanges,
    });
  } else {
    return buildToDescriptionPrompt({
      newContent,
      previousContent,
      existingCounterpart,
      isToShort,
      hasExistingInstructions: !!hasExistingInstructions,
      hasChanges: !!hasChanges,
    });
  }
}

function buildExpandPrompt(content: string): string {
  return `Expand these instructions with more detail while keeping the same meaning.
Keep parameters in {{name:value}} format. Add context about what each step does.
Preserve any #variable or #function mentions exactly as written.

EXAMPLE:
Input: "Generate #fibonacci_numbers up to {{count:10}}"
Output: "Generate a sequence of #fibonacci_numbers up to {{count:10}} values. Each number in the sequence is the sum of the two preceding numbers, starting from 0 and 1."

Current instructions:
${content}

Return ONLY the expanded instructions, no code or markdown.`;
}

function buildShortenPrompt(content: string): string {
  return `Make these instructions more concise (1 short sentence preferred).
Keep parameters in {{name:value}} format. Remove unnecessary words.
Preserve any #variable or #function mentions exactly as written.
Don't mention "Python" or "code" - it's obvious.
Use action words: "Generate", "Calculate", "Plot", etc.

EXAMPLE:
Input: "Create a function called price_summary that takes a list of prices and calculates the minimum, maximum, and average values, then store the average in a variable"
Output: "Create #price_summary function and calculate #average_price from prices"

Current instructions:
${content}

Return ONLY the shortened instructions, no code or markdown.`;
}

function buildShortToFullPrompt(content: string, existingCounterpart?: string): string {
  return `Expand this short description into a fuller, more detailed description.

SHORT DESCRIPTION:
${content}

${existingCounterpart ? `EXISTING FULL DESCRIPTION (use as reference):
${existingCounterpart}

` : ''}GUIDELINES:
- Write 2-4 sentences with more detail
- Keep ALL parameters in {{name:value}} format
- Keep ALL #variable and #function mentions exactly as written
- Explain the purpose and approach
- Describe expected inputs and outputs
- Don't add parameters that aren't in the short description

EXAMPLE:
Input: "Calculate #moving_average for {{window:7}} days"
Output: "Calculate the #moving_average over a sliding {{window:7}} day period. This smooths out short-term fluctuations and highlights longer-term trends in the data. The result will be stored in #moving_average for use in subsequent analysis."

Return ONLY the expanded description, no code or markdown.`;
}

function buildFullToShortPrompt(content: string, existingCounterpart?: string): string {
  return `Condense this full description into a short, concise summary.

FULL DESCRIPTION:
${content}

${existingCounterpart ? `EXISTING SHORT DESCRIPTION (use as reference):
${existingCounterpart}

` : ''}GUIDELINES:
- Maximum 1 short sentence (5-10 words)
- Start with action verb: "Generate", "Calculate", "Plot", etc.
- Keep the most important parameters in {{name:value}} format
- Keep the most important #variable and #function mentions
- Don't mention "Python" or "code"

EXAMPLE:
Input: "Load the sales data from a CSV file and calculate the total revenue by summing all transaction amounts. Store the result in a variable for later reporting."
Output: "Load sales CSV, calculate #total_revenue"

Return ONLY the shortened description, no code or markdown.`;
}

interface ToCodePromptOptions {
  newContent: string;
  previousContent?: string;
  existingCounterpart?: string;
  cellsContext: string;
  mentionedSymbols: string[];
  hasExistingCode: boolean;
  hasChanges: boolean;
}

function buildToCodePrompt(opts: ToCodePromptOptions): string {
  const { newContent, previousContent, existingCounterpart, cellsContext, mentionedSymbols, hasExistingCode, hasChanges } = opts;

  const notebookContext = cellsContext ? `
NOTEBOOK CONTEXT (this cell is part of a larger notebook):
${cellsContext}
CRITICAL REQUIREMENTS:
1. This cell executes AFTER the earlier cells above. REUSE variables, functions, and imports from earlier cells.
2. DO NOT re-import libraries that are already imported in earlier cells.
3. DO NOT redefine functions or recompute values that already exist from earlier cells.
4. If an earlier cell generates data (like Fibonacci numbers, a dataframe, etc.), USE that variable directly.
5. Only add NEW code that builds on what already exists.

` : '';

  const proposedNames = mentionedSymbols.length > 0 ? `
PROPOSED NAMES (use these exact names for new variables/functions):
${mentionedSymbols.map(s => `- ${s}`).join('\n')}
When creating new variables or functions, use these names exactly as specified.

` : '';

  const structuredOutputInstructions = `
OUTPUT FORMAT:
Return your response as a JSON object. Use \\n for newlines in code strings.
${CODE_OUTPUT_EXAMPLE}

IMPORTANT:
- The "code" field must be a valid JSON string (escape newlines as \\n, quotes as \\")
- List ALL new variables and functions in "symbols" (not imports or reused variables)
- For variables: include type (e.g., "list", "DataFrame(100x5)", "float") and brief description
- For functions: include signature (e.g., "calc_avg(prices)") and purpose`;

  if (hasExistingCode && hasChanges) {
    return `You are updating Python code based on changed instructions.
${notebookContext}${proposedNames}
PREVIOUS INSTRUCTIONS:
${previousContent}

NEW INSTRUCTIONS:
${newContent}

CURRENT CODE:
\`\`\`python
${existingCounterpart}
\`\`\`

Update the code to reflect the new instructions. Make MINIMAL changes - only modify what's necessary. Keep code structure, variable names, and style consistent unless changes require otherwise.
${structuredOutputInstructions}`;
  } else if (hasExistingCode) {
    return `You are generating Python code for a task. There is existing code that may be relevant.
${notebookContext}${proposedNames}
INSTRUCTIONS:
${newContent}

EXISTING CODE (use as reference for style/structure):
\`\`\`python
${existingCounterpart}
\`\`\`

Generate code that implements the instructions. If the existing code is close to what's needed, make minimal modifications. Otherwise, write new code following the same coding style.
${structuredOutputInstructions}`;
  } else {
    return `Generate Python code for the following task. Write clean, efficient, and well-structured code.
${notebookContext}${proposedNames}
TASK:
${newContent}
${structuredOutputInstructions}`;
  }
}

interface ToDescriptionPromptOptions {
  newContent: string;
  previousContent?: string;
  existingCounterpart?: string;
  isToShort: boolean;
  hasExistingInstructions: boolean;
  hasChanges: boolean;
}

function buildToDescriptionPrompt(opts: ToDescriptionPromptOptions): string {
  const { newContent, previousContent, existingCounterpart, isToShort, hasExistingInstructions, hasChanges } = opts;

  const shortGuidelines = `
GUIDELINES FOR SHORT DESCRIPTION:
- Maximum 1 short sentence (5-10 words)
- Start with action verb: "Generate", "Calculate", "Plot", "Load", etc.
- Don't mention "Python" or "code" - it's obvious
- Include key parameters as {{name:value}} placeholders
- Use #variable_name to reference important variables defined in code
- Use #function_name to reference important functions defined in code

EXAMPLES:
Code: \`fibonacci = [0, 1]; [fibonacci.append(fibonacci[-1] + fibonacci[-2]) for _ in range(8)]\`
Output: "Generate first {{count:10}} #fibonacci numbers"

Code: \`avg_price = sum(prices) / len(prices)\`
Output: "Calculate #avg_price from prices list"

Code: \`df = pd.read_csv('sales.csv'); monthly = df.groupby('month').sum()\`
Output: "Load sales CSV, create #monthly summary"`;

  const fullGuidelines = `
GUIDELINES FOR FULL DESCRIPTION:
- 2-4 sentences with more detail
- Describe the purpose and approach
- Include ALL parameters as {{name:value}} placeholders
- Use #variable_name to reference important variables defined in code
- Use #function_name to reference important functions defined in code
- Explain what inputs are expected and what outputs are produced

EXAMPLES:
Code: \`def calc_fibonacci(n): ... ; fibonacci = calc_fibonacci(10)\`
Output: "Define #calc_fibonacci function that generates Fibonacci sequence. Call it with {{count:10}} to generate the first 10 numbers and store in #fibonacci list."

Code: \`prices = load_data(); avg = sum(prices)/len(prices); std = statistics.stdev(prices)\`
Output: "Load price data and calculate statistics. Compute #avg (mean) and #std (standard deviation) for analysis."`;

  const guidelines = isToShort ? shortGuidelines : fullGuidelines;
  const lengthHint = isToShort ? 'Keep it very short (1 sentence, 5-10 words).' : 'Include 2-4 sentences with details.';

  if (hasExistingInstructions && hasChanges) {
    return `You are updating ${isToShort ? 'a SHORT description' : 'a FULL description'} based on changed code.

PREVIOUS CODE:
\`\`\`python
${previousContent}
\`\`\`

NEW CODE:
\`\`\`python
${newContent}
\`\`\`

CURRENT ${isToShort ? 'SHORT' : 'FULL'} DESCRIPTION:
${existingCounterpart}
${guidelines}

Update the description to accurately describe what the new code does. ${lengthHint}

Return ONLY the updated description, no code or markdown.`;
  } else if (hasExistingInstructions) {
    return `You are generating a ${isToShort ? 'SHORT' : 'FULL'} description for code.

CODE:
\`\`\`python
${newContent}
\`\`\`

EXISTING DESCRIPTION (use as reference for style):
${existingCounterpart}
${guidelines}

${lengthHint}

Return ONLY the description, no code or markdown.`;
  } else {
    return `Generate a ${isToShort ? 'SHORT' : 'FULL'} description for this code.
${guidelines}

CODE:
\`\`\`python
${newContent}
\`\`\`

${lengthHint}

Return ONLY the description, no code or markdown.`;
  }
}
