// Prompt constants and few-shot examples for AI sync

// Few-shot example for structured code output
export const CODE_OUTPUT_EXAMPLE = `
EXAMPLE INPUT:
"Calculate the #average_price from the prices list and create a #price_summary function"

(With earlier cell context containing: prices = [10, 20, 30, 40, 50])

EXAMPLE OUTPUT:
{
  "code": "def price_summary(prices):\\n    \\"\\"\\"\\"Calculate summary statistics for prices.\\"\\"\\"\\"\\n    return {\\n        'min': min(prices),\\n        'max': max(prices),\\n        'avg': sum(prices) / len(prices)\\n    }\\n\\naverage_price = sum(prices) / len(prices)\\nprint(f'Average price: {average_price:.2f}')",
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

export const SHORT_TO_PSEUDO_EXAMPLES = `
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
Output: "Read data from {{file:/data/input.json}}. Filter entries where date is after {{start_date:2024-01-01}}."`;

export const PSEUDO_TO_SHORT_EXAMPLES = `
FEW-SHOT EXAMPLES:

Example 1:
Input: "Initialize #fib with [0, 1]. Loop {{count:20}} - 2 times, each time appending the sum of the last two elements. Print the final #fib list."
Output: "Generate the first {{count:20}} Fibonacci numbers, store in #fib, and print the sequence"

Example 2:
Input: "Load sales data from CSV into #df. Filter to keep only rows where price exceeds {{threshold:100}}, storing results in #filtered. Calculate #average_price as the mean of the filtered prices."
Output: "Load sales CSV, filter where price > {{threshold:100}}, calculate #average_price"

Example 3:
Input: "Define #is_prime(n) that returns False if n < 2. Loop from 2 to sqrt(n), returning False if any number divides n evenly. Return True if no divisors found."
Output: "Create a function #is_prime that checks if a number is prime"`;

export const SHORT_GUIDELINES = `
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

BAD (didn't parameterize):
Code: \`pd.read_csv('data.csv')\`
Output: "Load data.csv" ← WRONG: should be "Load {{file:data.csv}}"

BAD (added implementation details):
Code: \`for i in range(20): fib.append(...)\`
Output: "Generate Fibonacci using an iterative loop" ← WRONG: added "iterative loop"`;

export const PSEUDO_GUIDELINES = `
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
