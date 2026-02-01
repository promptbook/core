// packages/sync/src/promptBuilder.ts
// Shared AI sync prompt building logic

// Re-export types from @promptbook/types
export type {
  CellContext,
  GeneratedSymbol,
  CodeGenerationResult,
  AiSyncContext,
  SyncDirection,
} from '../types';

import type { CellContext, AiSyncContext, SyncDirection } from '../types';

/**
 * Detect if text contains RTL or non-English characters
 * Returns a language hint for the prompt if non-English text is detected
 */
function getLanguageHint(text: string): string {
  // Check for Hebrew characters
  if (/[\u0590-\u05FF]/.test(text)) {
    return '\nLANGUAGE: The input contains Hebrew. Keep the output in Hebrew (or mixed Hebrew/English for technical terms).';
  }
  // Check for Arabic characters
  if (/[\u0600-\u06FF]/.test(text)) {
    return '\nLANGUAGE: The input contains Arabic. Keep the output in Arabic (or mixed Arabic/English for technical terms).';
  }
  // Check for Chinese characters
  if (/[\u4E00-\u9FFF]/.test(text)) {
    return '\nLANGUAGE: The input contains Chinese. Keep the output in Chinese (or mixed Chinese/English for technical terms).';
  }
  // Check for Japanese characters (Hiragana, Katakana, Kanji)
  if (/[\u3040-\u30FF\u4E00-\u9FFF]/.test(text)) {
    return '\nLANGUAGE: The input contains Japanese. Keep the output in Japanese (or mixed Japanese/English for technical terms).';
  }
  // Check for Korean characters
  if (/[\uAC00-\uD7AF]/.test(text)) {
    return '\nLANGUAGE: The input contains Korean. Keep the output in Korean (or mixed Korean/English for technical terms).';
  }
  // Check for Russian/Cyrillic characters
  if (/[\u0400-\u04FF]/.test(text)) {
    return '\nLANGUAGE: The input contains Russian/Cyrillic. Keep the output in the same language (or mixed with English for technical terms).';
  }
  return '';
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

(With earlier cell context containing: prices = [10, 20, 30, 40, 50])

EXAMPLE OUTPUT:
{
  "code": "def price_summary(prices):\\n    \\"\\"\\"Calculate summary statistics for prices.\\"\\"\\"\\n    return {\\n        'min': min(prices),\\n        'max': max(prices),\\n        'avg': sum(prices) / len(prices)\\n    }\\n\\naverage_price = sum(prices) / len(prices)\\nprint(f'Average price: {average_price:.2f}')",
  "symbols": [
    {"name": "price_summary", "kind": "function", "type": "price_summary(prices)", "description": "Calculate summary statistics for prices"},
    {"name": "average_price", "kind": "variable", "type": "float", "description": "The calculated average of all prices"}
  ],
  "notebookSymbols": [
    {"name": "prices", "kind": "variable", "type": "list", "description": "List of 5 price values [10, 20, 30, 40, 50]"},
    {"name": "price_summary", "kind": "function", "type": "price_summary(prices)", "description": "Calculate summary statistics for prices"},
    {"name": "average_price", "kind": "variable", "type": "float", "description": "The calculated average of all prices"}
  ]
}`;

/**
 * Build a prompt for AI sync based on the direction and context.
 * Used by both Electron and VS Code extension.
 */
export function buildSyncPrompt(direction: SyncDirection | string, context: AiSyncContext): string {
  const { newContent, previousContent, existingCounterpart, cellsBefore, cellsAfter, proposedSymbols } = context;
  const cellsContext = formatCellsContext(cellsBefore, cellsAfter);

  // Extract proposed symbols from #mentions in the description
  const mentionedSymbols = proposedSymbols || extractHashMentions(newContent);

  // Handle AI assistance for code modification
  if (direction === 'codeAssist') {
    return buildCodeAssistPrompt(newContent, existingCounterpart);
  }

  // Handle expand/shorten instructions
  if (direction === 'expandInstructions') {
    return buildExpandPrompt(newContent);
  }

  if (direction === 'shortenInstructions') {
    return buildShortenPrompt(newContent);
  }

  // Handle description-to-description conversions
  if (direction === 'shortToPseudo') {
    return buildShortToPseudoPrompt(newContent, existingCounterpart);
  }

  if (direction === 'pseudoToShort') {
    return buildPseudoToShortPrompt(newContent, existingCounterpart);
  }

  // Normalize direction types
  const isToCode = direction === 'toCode' || direction === 'pseudoToCode' || direction === 'shortToCode';
  const isToShort = direction === 'codeToShort';
  const isToPseudo = direction === 'codeToPseudo';
  const isToInstructions = direction === 'toInstructions' || isToShort || isToPseudo;

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
      targetType: isToShort ? 'short' : 'pseudo',
      hasExistingInstructions: !!hasExistingInstructions,
      hasChanges: !!hasChanges,
    });
  }
}

function buildExpandPrompt(content: string): string {
  const langHint = getLanguageHint(content);
  return `Expand these instructions with more detail while keeping the same meaning.
Keep existing parameters in {{name:value}} format. Add context about what each step does.
CONVERT literal numeric values to {{name:value}} format (e.g., "first 20" → "first {{count:20}}").
Preserve any #variable or #function mentions exactly as written.${langHint}

PARAMETER DETECTION:
Find values EXPLICITLY WRITTEN by the user that would become hardcoded in code, and convert them to {{name:value}}:
- Numbers: "first 20" → {{count:20}}
- Files: "from data.csv" → {{file:data.csv}}
- Dates: "since 2024-01-01" → {{start_date:2024-01-01}}
- Any specific value the user wrote → parameter

EXAMPLES:
Input: "Generate #fibonacci_numbers up to {{count:10}}"
Output: "Generate a sequence of #fibonacci_numbers up to {{count:10}} values. Each number in the sequence is the sum of the two preceding numbers, starting from 0 and 1."

Input: "Generate the first 20 Fibonacci numbers"
Output: "Generate the first {{count:20}} Fibonacci numbers. Each number is the sum of the two preceding numbers, starting from 0 and 1."

Input: "Load sales.csv and filter from January 2024"
Output: "Load data from {{file:sales.csv}} and filter records starting from {{start_date:January 2024}}."

Current instructions:
${content}

Return ONLY the expanded instructions, no code or markdown.`;
}

function buildCodeAssistPrompt(userRequest: string, currentCode?: string): string {
  return `You are an AI assistant helping to modify Python code based on a user's request.

CURRENT CODE:
\`\`\`python
${currentCode || '# No code yet'}
\`\`\`

USER REQUEST:
${userRequest}

INSTRUCTIONS:
1. Understand what the user wants to change, add, or fix
2. Modify the code to fulfill their request
3. Keep changes minimal - only modify what's necessary
4. Preserve existing variable names, style, and structure where possible
5. Write clean, readable, efficient Python code

RESPONSE FORMAT:
Provide a brief explanation of what you changed (1-2 sentences), then include the complete modified code in a Python code block.

Example response:
"I added error handling for the file operations and included a retry mechanism."

\`\`\`python
# Your modified code here
\`\`\`

Now respond to the user's request:`;
}

function buildShortenPrompt(content: string): string {
  const langHint = getLanguageHint(content);
  return `Your task: Clean up instructions AND convert explicit values to parameters.

**CRITICAL - PARAMETER CONVERSION (MANDATORY):**
You MUST convert ANY specific value the user wrote into {{name:value}} format:

| User wrote | Convert to |
|------------|------------|
| "first 20" | "first {{count:20}}" |
| "above 100" | "above {{threshold:100}}" |
| "top 5" | "top {{limit:5}}" |
| "sales.csv" | "{{file:sales.csv}}" |
| "output.json" | "{{output:output.json}}" |
| "January 2024" | "{{start_date:January 2024}}" |
| "2024-01-15" | "{{date:2024-01-15}}" |
| "user admin" | "user {{username:admin}}" |
| "column price" | "column {{column:price}}" |

EXAMPLES:
Input: "Generate the first 20 Fibonacci numbers, store in #fib, and print"
Output: "Generate the first {{count:20}} Fibonacci numbers, store in #fib, and print"

Input: "Load sales.csv, filter where price > 100"
Output: "Load {{file:sales.csv}}, filter where price > {{threshold:100}}"

Input: "Get data from January 2024 to March 2024"
Output: "Get data from {{start_date:January 2024}} to {{end_date:March 2024}}"

WRONG (no parameter conversion):
Input: "Load sales.csv and filter by 100"
Output: "Load sales.csv and filter by 100" ← WRONG! Must be "Load {{file:sales.csv}} and filter by {{threshold:100}}"

OTHER RULES:
- Keep #variable mentions exactly as written
- Do NOT add words like "iterative", "recursive", "using a loop"
- Preserve the meaning and level of detail${langHint}

INPUT:
${content}

OUTPUT (with parameters converted):`;
}

function buildShortToPseudoPrompt(content: string, existingCounterpart?: string): string {
  return `Convert this short description into detailed instructions that explain the logic step by step.

SHORT DESCRIPTION:
${content}

${existingCounterpart ? `EXISTING DETAILED INSTRUCTIONS (use as reference for style):
${existingCounterpart}

` : ''}STYLE GUIDE:
Write in natural language but include logic hints. Describe what happens step by step,
mentioning loops and conditions in plain English. Reference variables with #name format.
Keep it readable like explaining to a colleague, but precise enough to understand the algorithm.

RULES:
- Write in flowing sentences, not formal pseudo-code keywords
- Mention iterations as "loop through" or "for each" not "FOR"
- Mention conditions as "if/when" not "IF"
- Keep ALL existing parameters in {{name:value}} format
- CONVERT literal numeric values to {{name:value}} format (e.g., "first 20" → "first {{count:20}}")
- Keep ALL #variable and #function mentions exactly as written
- IMPORTANT: Always write in ENGLISH

PARAMETER DETECTION:
Find values EXPLICITLY WRITTEN by the user that would become hardcoded literals in code, and convert them to {{name:value}} format.

If the user writes a specific value, it should become a parameter:
- Numbers: "first 20" → {{count:20}}, "above 100" → {{threshold:100}}
- Files: "load sales.csv" → {{file:sales.csv}}
- Dates: "from January 2024" → {{start_date:January 2024}}
- Strings: "column price" → {{column:price}}

Rule: If the user explicitly wrote a value, it becomes a parameter.

FEW-SHOT EXAMPLES:

Example 1:
Input: "Generate the first 20 Fibonacci numbers, store in #fib list, and print the sequence"
Output: "Initialize #fib with [0, 1]. Loop {{count:20}} - 2 times, each time appending the sum of the last two elements. Print the final #fib list containing all {{count:20}} Fibonacci numbers."

Example 2:
Input: "Load sales.csv, filter by 100, calculate #average_price"
Output: "Load {{file:sales.csv}} into #df. Filter to keep only rows where price exceeds {{threshold:100}}, storing results in #filtered. Calculate #average_price as the mean of the filtered prices."

Example 3:
Input: "Create a function #is_prime that checks if a number is prime"
Output: "Define #is_prime(n) that returns False if n < 2. Loop from 2 to sqrt(n), returning False if any number divides n evenly. Return True if no divisors found."

Example 4:
Input: "Sort #users by age descending, take top 10, extract their names into #top_names"
Output: "Sort #users list by age in descending order. Take the first {{limit:10}} entries. Extract just the name field from each into #top_names list."

Example 5:
Input: "Read data from /data/input.json, filter entries from 2024-01-01"
Output: "Read data from {{file:/data/input.json}}. Filter entries where date is after {{start_date:2024-01-01}}."

Return ONLY the detailed instructions, no actual code or markdown fences.`;
}

function buildPseudoToShortPrompt(content: string, existingCounterpart?: string): string {
  // Use language from existing description if available, otherwise default to English
  const langHint = existingCounterpart ? getLanguageHint(existingCounterpart) : '';
  return `Convert these detailed instructions into a concise natural language description.

DETAILED INSTRUCTIONS:
${content}

${existingCounterpart ? `EXISTING DESCRIPTION (use as reference):
${existingCounterpart}

` : ''}RULES:
1. Summarize the logic at a high level - preserve all key steps
2. PRESERVE key domain terms (fibonacci, sales, prices, average, etc.)
3. Keep all #variable and #function mentions
4. Keep ALL parameters in {{name:value}} format - do NOT convert back to plain numbers
5. Don't mention "Python" or "code"
6. Do NOT add implementation details (like "iterative", "recursive", "using a loop")
7. Can be multiple sentences if needed to capture the full intent${langHint}

FEW-SHOT EXAMPLES:

Example 1:
Input: "Initialize #fib with [0, 1]. Loop {{count:20}} - 2 times, each time appending the sum of the last two elements. Print the final #fib list."
Output: "Generate the first {{count:20}} Fibonacci numbers, store in #fib, and print the sequence"

Example 2:
Input: "Load sales data from CSV into #df. Filter to keep only rows where price exceeds {{threshold:100}}, storing results in #filtered. Calculate #average_price as the mean of the filtered prices."
Output: "Load sales CSV, filter where price > {{threshold:100}}, calculate #average_price"

Example 3:
Input: "Define #is_prime(n) that returns False if n < 2. Loop from 2 to sqrt(n), returning False if any number divides n evenly. Return True if no divisors found."
Output: "Create a function #is_prime that checks if a number is prime"

BAD (added implementation details):
Input: "Initialize #fib with [0, 1]. Loop to generate numbers."
Output: "Generate Fibonacci numbers using an iterative approach" ← WRONG: added "iterative approach"

Return ONLY the description, no code or markdown.`;
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
- For variables: include type (e.g., "list", "DataFrame(100x5)", "float") and brief description of what it contains
- For functions: include signature (e.g., "calc_avg(prices)") and purpose

NOTEBOOK SYMBOLS (notebookSymbols field):
- Analyze ALL cells in the notebook context (earlier cells + this cell)
- List EVERY variable and function defined across ALL cells in "notebookSymbols"
- Include symbols from earlier cells that exist in the namespace
- For each symbol, provide a meaningful description of what it contains/does
- Example: for "fibonacci = [1,1,2,3,5,8,13,21]" → type: "list", description: "First 8 Fibonacci numbers"
- Example: for "df = pd.read_csv('sales.csv')" → type: "DataFrame", description: "Sales data loaded from CSV"`;

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
  targetType: 'short' | 'pseudo';
  hasExistingInstructions: boolean;
  hasChanges: boolean;
}

function buildToDescriptionPrompt(opts: ToDescriptionPromptOptions): string {
  const { newContent, previousContent, existingCounterpart, targetType, hasExistingInstructions, hasChanges } = opts;
  const isToShort = targetType === 'short';

  // For short descriptions, preserve language from existing counterpart if available
  const langHint = isToShort && existingCounterpart ? getLanguageHint(existingCounterpart) : '';

  const shortGuidelines = `
GUIDELINES FOR INSTRUCTIONS:
- Describe what the code does so a reader understands without reading the code
- PRESERVE all key steps and domain terms (fibonacci, sales, prices, average, etc.)
- Don't mention "Python" or "code" - it's obvious
- CONVERT literal numeric values from code into {{name:value}} parameters
- Use #variable_name to reference important variables defined in code
- Do NOT add implementation details (like "iterative", "recursive", "using a loop")
- Can be multiple sentences if needed to capture the full intent

PARAMETER DETECTION:
Find hardcoded literals in the code that represent configurable values, and convert them to {{name:value}}:
- Numbers: range(20) → {{count:20}}, > 100 → {{threshold:100}}
- Files: 'sales.csv' → {{file:sales.csv}}
- Dates: '2024-01-01' → {{date:2024-01-01}}
- Strings: column names, usernames, any hardcoded string that's a configuration value

EXAMPLES:
Code: \`fib = [0, 1]; [fib.append(fib[-1] + fib[-2]) for _ in range(18)]; print(fib)\`
Output: "List the first {{count:20}} Fibonacci numbers, store in #fib, and print it"

Code: \`df = pd.read_csv('sales.csv'); filtered = df[df['price'] > 100]; avg = filtered['price'].mean()\`
Output: "Load {{file:sales.csv}}, filter rows where price > {{threshold:100}}, calculate the average price"

Code: \`df = df[df['date'] >= '2024-01-01']\`
Output: "Filter #df where date >= {{start_date:2024-01-01}}"

BAD (didn't parameterize):
Code: \`pd.read_csv('data.csv')\`
Output: "Load data.csv" ← WRONG: should be "Load {{file:data.csv}}"

BAD (added implementation details):
Code: \`for i in range(20): fib.append(...)\`
Output: "Generate Fibonacci using an iterative loop" ← WRONG: added "iterative loop"${langHint}`;

  const pseudoGuidelines = `
GUIDELINES FOR DETAILED INSTRUCTIONS:
Write in natural language but include logic hints. Describe what happens step by step,
mentioning loops and conditions in plain English. Reference variables with #name format.
Keep it readable like explaining to a colleague, but precise enough to understand the algorithm.

RULES:
- Write in flowing sentences, not formal pseudo-code keywords
- Mention iterations as "loop through" or "for each" not "FOR"
- Mention conditions as "if/when" not "IF"
- CONVERT literal numeric values from code into {{name:value}} parameters
- Use #variable_name to reference variables defined in code
- Use #function_name to reference functions defined in code
- IMPORTANT: Always write in ENGLISH

PARAMETER DETECTION:
Find hardcoded literals in the code that represent configurable values, and convert them to {{name:value}}:
- Numbers: range(20) → {{count:20}}, > 100 → {{threshold:100}}
- Files: 'sales.csv' → {{file:sales.csv}}
- Dates: '2024-01-01' → {{date:2024-01-01}}
- Strings: column names, usernames, any hardcoded configuration value

FEW-SHOT EXAMPLES:

Code: \`fib = [0, 1]
for _ in range(18):
    fib.append(fib[-1] + fib[-2])
print(fib)\`
Output: "Initialize #fib with [0, 1]. Loop {{count:20}} - 2 times, each time appending the sum of the last two elements. Print the final #fib list containing all {{count:20}} Fibonacci numbers."

Code: \`def calc_fibonacci(n):
    fib = [0, 1]
    for i in range(2, n):
        fib.append(fib[-1] + fib[-2])
    return fib
fibonacci = calc_fibonacci(10)\`
Output: "Define #calc_fibonacci(n) that initializes #fib with [0, 1], then loops from 2 to n appending the sum of the last two values. Call #calc_fibonacci with {{count:10}} and store the result in #fibonacci."

Code: \`df = pd.read_csv('sales.csv')
filtered = df[df['price'] > 100]
avg = filtered['price'].mean()\`
Output: "Load {{file:sales.csv}} into #df. Filter to keep only rows where price exceeds {{threshold:100}}, storing in #filtered. Calculate #avg as the mean of the filtered prices."`;

  const guidelines = isToShort ? shortGuidelines : pseudoGuidelines;
  const lengthHint = isToShort ? 'Capture the full intent - use multiple sentences if needed.' : 'Write flowing sentences that explain the logic step by step.';
  const typeName = isToShort ? 'SHORT' : 'DETAILED INSTRUCTIONS';

  if (hasExistingInstructions && hasChanges) {
    return `You are updating ${isToShort ? 'a SHORT description' : 'DETAILED INSTRUCTIONS'} based on changed code.

PREVIOUS CODE:
\`\`\`python
${previousContent}
\`\`\`

NEW CODE:
\`\`\`python
${newContent}
\`\`\`

CURRENT ${typeName}:
${existingCounterpart}
${guidelines}

Update the ${isToShort ? 'description' : 'detailed instructions'} to accurately describe what the new code does. ${lengthHint}

Return ONLY the updated ${isToShort ? 'description' : 'detailed instructions'}, no actual code or markdown.`;
  } else if (hasExistingInstructions) {
    return `You are generating ${isToShort ? 'a SHORT description' : 'DETAILED INSTRUCTIONS'} for code.

CODE:
\`\`\`python
${newContent}
\`\`\`

EXISTING ${typeName} (use as reference for style):
${existingCounterpart}
${guidelines}

${lengthHint}

Return ONLY the ${isToShort ? 'description' : 'detailed instructions'}, no actual code or markdown.`;
  } else {
    return `Generate ${isToShort ? 'a SHORT description' : 'DETAILED INSTRUCTIONS'} for this code.
${guidelines}

CODE:
\`\`\`python
${newContent}
\`\`\`

${lengthHint}

Return ONLY the ${isToShort ? 'description' : 'detailed instructions'}, no actual code or markdown.`;
  }
}
