// packages/core/src/sync/promptBuilder.ts
// Shared AI sync prompt building logic

/** Context from a single cell in the notebook */
export interface CellContext {
  shortDescription: string;
  code: string;
}

export interface AiSyncContext {
  newContent: string;
  previousContent?: string;
  existingCounterpart?: string;
  /** Cells that come BEFORE the current cell (in execution order) */
  cellsBefore?: CellContext[];
  /** Cells that come AFTER the current cell (in execution order) */
  cellsAfter?: CellContext[];
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
 * Build a prompt for AI sync based on the direction and context.
 * Used by both Electron and VS Code extension.
 */
export function buildSyncPrompt(direction: string, context: AiSyncContext): string {
  const { newContent, previousContent, existingCounterpart, cellsBefore, cellsAfter } = context;
  const cellsContext = formatCellsContext(cellsBefore, cellsAfter);

  // Handle expand/shorten instructions
  if (direction === 'expandInstructions') {
    return `Expand these instructions with more detail while keeping the same meaning.
Keep parameters in {{name:value}} format. Add context about what each step does.

Current instructions:
${newContent}

Return ONLY the expanded instructions, no code or markdown.`;
  }

  if (direction === 'shortenInstructions') {
    return `Make these instructions more concise (1 short sentence preferred).
Keep parameters in {{name:value}} format. Remove unnecessary words.
Don't mention "Python" or "code" - it's obvious.
Use action words: "Generate", "Calculate", "Plot", etc.

Current instructions:
${newContent}

Return ONLY the shortened instructions, no code or markdown.`;
  }

  // Handle description-to-description conversions
  if (direction === 'shortToFull') {
    return `Expand this short description into a fuller, more detailed description.

SHORT DESCRIPTION:
${newContent}

${existingCounterpart ? `EXISTING FULL DESCRIPTION (use as reference):
${existingCounterpart}

` : ''}GUIDELINES:
- Write 2-4 sentences with more detail
- Keep ALL parameters in {{name:value}} format
- Explain the purpose and approach
- Describe expected inputs and outputs
- Don't add parameters that aren't in the short description

Return ONLY the expanded description, no code or markdown.`;
  }

  if (direction === 'fullToShort') {
    return `Condense this full description into a short, concise summary.

FULL DESCRIPTION:
${newContent}

${existingCounterpart ? `EXISTING SHORT DESCRIPTION (use as reference):
${existingCounterpart}

` : ''}GUIDELINES:
- Maximum 1 short sentence (5-10 words)
- Start with action verb: "Generate", "Calculate", "Plot", etc.
- Keep the most important parameters in {{name:value}} format
- Don't mention "Python" or "code"

Return ONLY the shortened description, no code or markdown.`;
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

    if (hasExistingCode && hasChanges) {
      // Incremental update: instructions changed, update existing code
      return `You are updating Python code based on changed instructions.
${notebookContext}
PREVIOUS INSTRUCTIONS:
${previousContent}

NEW INSTRUCTIONS:
${newContent}

CURRENT CODE:
\`\`\`python
${existingCounterpart}
\`\`\`

Update the code to reflect the new instructions. Make MINIMAL changes - only modify what's necessary to implement the changes. Keep the code structure, variable names, and style consistent with the existing code unless the changes require otherwise.

Return ONLY the updated Python code, no explanations or markdown.`;
    } else if (hasExistingCode) {
      // Existing code but no tracked changes - still use it as reference
      return `You are generating Python code for a task. There is existing code that may be relevant.
${notebookContext}
INSTRUCTIONS:
${newContent}

EXISTING CODE (use as reference for style/structure):
\`\`\`python
${existingCounterpart}
\`\`\`

Generate code that implements the instructions. If the existing code is close to what's needed, make minimal modifications. Otherwise, write new code following the same coding style.

Return ONLY the Python code, no explanations or markdown.`;
    } else {
      // Fresh generation
      return `Generate Python code for the following task. Write clean, efficient, and well-structured code.
${notebookContext}
Return ONLY the Python code, no explanations or markdown.

TASK:
${newContent}`;
    }
  } else {
    // toInstructions - differentiate between short and full descriptions
    const shortGuidelines = `
GUIDELINES FOR SHORT DESCRIPTION:
- Maximum 1 short sentence (5-10 words)
- Start with action verb: "Generate", "Calculate", "Plot", "Load", etc.
- Don't mention "Python" or "code" - it's obvious
- Include key parameters as {{name:value}} placeholders
- Example: "Generate first {{count:10}} Fibonacci numbers"
- Example: "Plot {{metric:temperature}} trends"`;

    const fullGuidelines = `
GUIDELINES FOR FULL DESCRIPTION:
- 2-4 sentences with more detail
- Describe the purpose and approach
- Include ALL parameters as {{name:value}} placeholders
- Explain what inputs are expected and what outputs are produced
- Example: "Generate the first {{count:10}} Fibonacci numbers starting from {{start:0}}. Store results in a list and print each number."
- Example: "Load data from {{file:data.csv}} and plot {{metric:temperature}} over {{period:last 7 days}}. Use matplotlib with a line chart."`;

    const guidelines = isToShort ? shortGuidelines : fullGuidelines;
    const lengthHint = isToShort ? 'Keep it very short (1 sentence, 5-10 words).' : 'Include 2-4 sentences with details.';

    if (hasExistingInstructions && hasChanges) {
      // Code changed, update existing instructions
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
      // Existing instructions as reference
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
      // Fresh generation
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
}
