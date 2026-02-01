// Research assistance prompt builders
// Extracted from promptBuilder.ts to keep files under 500 lines

/**
 * Build a prompt for explaining cell output to the user.
 * Explains what the output means in a research/analysis context.
 */
export function buildExplainOutputPrompt(output: string, code: string): string {
  return `You are a research assistant helping explain Python code output.

CODE THAT WAS EXECUTED:
\`\`\`python
${code}
\`\`\`

OUTPUT:
${output}

TASK:
Explain what this output means in the context of the code that produced it. 
Focus on:
1. What the numbers/data represent
2. Any patterns or notable findings
3. Statistical significance if applicable
4. Practical implications of the results

Keep your explanation clear and concise (2-4 paragraphs). 
Use markdown formatting for readability.
If this appears to be a data analysis result, provide insights a researcher would find valuable.`;
}

/**
 * Build a prompt for suggesting next analysis steps based on output.
 */
export function buildSuggestNextStepsPrompt(output: string, code: string, description: string): string {
  return `You are a research assistant helping plan follow-up analyses.

DESCRIPTION OF CURRENT ANALYSIS:
${description || 'Not provided'}

CODE THAT WAS EXECUTED:
\`\`\`python
${code}
\`\`\`

OUTPUT:
${output}

TASK:
Based on this analysis result, suggest 3-5 follow-up analyses or next steps a researcher might want to do.

For each suggestion:
1. Provide a brief title
2. Explain why this would be valuable
3. Give a one-line code hint if applicable

Format as a numbered list. Focus on actionable, concrete suggestions that build on the current results.`;
}

/**
 * Build a prompt for debugging an error in cell output.
 */
export function buildDebugErrorPrompt(error: string, code: string): string {
  return `You are a Python debugging assistant.

CODE THAT CAUSED THE ERROR:
\`\`\`python
${code}
\`\`\`

ERROR MESSAGE:
${error}

TASK:
Analyze this error and provide:

1. **Error Explanation**: What went wrong and why (1-2 sentences)

2. **Likely Cause**: The specific issue in the code that triggered this error

3. **Suggested Fix**: Provide corrected code that should resolve the issue

Format the corrected code in a Python code block so it can be easily copied.
If there are multiple possible causes, address the most likely one first.`;
}

/**
 * Build a prompt for extracting search keywords from output for paper search.
 */
export function buildExtractKeywordsPrompt(output: string, code: string): string {
  return `You are helping find relevant academic papers based on a data analysis.

CODE:
\`\`\`python
${code}
\`\`\`

OUTPUT:
${output}

TASK:
Extract 3-5 academic search keywords or phrases that would help find relevant research papers related to this analysis.

Return ONLY a JSON array of strings, nothing else. Example:
["machine learning", "time series analysis", "regression"]

Focus on:
- Statistical methods being used
- Domain/field of the analysis
- Key concepts or techniques
- Types of data being analyzed`;
}
