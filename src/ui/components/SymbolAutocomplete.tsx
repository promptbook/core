// Types for kernel symbol autocomplete
// The actual autocomplete is implemented in CombinedAutocomplete.tsx

export interface KernelSymbol {
  name: string;
  kind: 'variable' | 'function';
  type: string;        // e.g., "DataFrame(100x5)", "my_func(x, y)"
  description: string; // docstring or value preview
}

export interface SymbolAutocompleteProps {
  /** The current text value */
  value: string;
  /** Callback when text changes */
  onChange: (value: string) => void;
  /** Function to get kernel symbols */
  getSymbols?: () => Promise<KernelSymbol[]>;
  /** Placeholder text */
  placeholder?: string;
  /** Additional class name */
  className?: string;
  /** Number of rows for textarea */
  rows?: number;
  /** Called on blur */
  onBlur?: () => void;
  /** Called on key down */
  onKeyDown?: (e: React.KeyboardEvent) => void;
  /** Ref to the textarea */
  textareaRef?: React.RefObject<HTMLTextAreaElement>;
}
