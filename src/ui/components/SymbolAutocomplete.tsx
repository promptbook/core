import React, { useState, useEffect, useRef, useCallback } from 'react';

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

export function SymbolAutocomplete({
  value,
  onChange,
  getSymbols,
  placeholder,
  className,
  rows = 4,
  onBlur,
  onKeyDown,
  textareaRef: externalRef,
}: SymbolAutocompleteProps) {
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [symbols, setSymbols] = useState<KernelSymbol[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [triggerPosition, setTriggerPosition] = useState(0);
  const [filterText, setFilterText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const internalRef = useRef<HTMLTextAreaElement>(null);
  const textareaRefToUse = externalRef || internalRef;
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter symbols based on what user typed after #
  const filteredSymbols = symbols.filter((s) =>
    s.name.toLowerCase().includes(filterText.toLowerCase())
  );

  // Add "create new" option if filter text is a valid identifier and doesn't exist
  const showCreateOption = filterText.length > 0 &&
    /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(filterText) &&
    !symbols.some(s => s.name.toLowerCase() === filterText.toLowerCase());

  // Load symbols when autocomplete opens
  const loadSymbols = useCallback(async () => {
    if (!getSymbols) return;
    setIsLoading(true);
    try {
      const result = await getSymbols();
      setSymbols(result);
    } catch {
      setSymbols([]);
    } finally {
      setIsLoading(false);
    }
  }, [getSymbols]);

  // Detect # trigger
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const cursorPos = e.target.selectionStart;
    onChange(newValue);

    // Check if we just typed # after a space or at start
    if (cursorPos > 0) {
      const charBefore = newValue[cursorPos - 1];
      const charBeforeThat = cursorPos > 1 ? newValue[cursorPos - 2] : ' ';

      if (charBefore === '#' && (charBeforeThat === ' ' || charBeforeThat === '\n' || cursorPos === 1)) {
        setShowAutocomplete(true);
        setTriggerPosition(cursorPos);
        setFilterText('');
        setSelectedIndex(0);
        loadSymbols();
        return;
      }
    }

    // Update filter if autocomplete is showing
    if (showAutocomplete) {
      const textAfterTrigger = newValue.slice(triggerPosition, cursorPos);
      if (textAfterTrigger.includes(' ') || textAfterTrigger.includes('\n')) {
        // User typed space or newline, close autocomplete
        setShowAutocomplete(false);
      } else {
        setFilterText(textAfterTrigger);
      }
    }
  };

  // Total items count (symbols + create option if shown)
  const totalItems = filteredSymbols.length + (showCreateOption ? 1 : 0);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showAutocomplete && totalItems > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, totalItems - 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        if (selectedIndex < filteredSymbols.length) {
          selectSymbol(filteredSymbols[selectedIndex].name);
        } else if (showCreateOption) {
          selectSymbol(filterText); // Create new proposed name
        }
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowAutocomplete(false);
        return;
      }
    }
    onKeyDown?.(e);
  };

  // Select a symbol from the dropdown
  const selectSymbol = (symbolName: string) => {
    // Insert symbol name (keeping the #)
    const beforeTrigger = value.slice(0, triggerPosition); // Keep the #
    const afterCursor = value.slice(triggerPosition + filterText.length);
    const newValue = beforeTrigger + symbolName + afterCursor;
    onChange(newValue);
    setShowAutocomplete(false);

    // Move cursor after inserted text
    setTimeout(() => {
      const textarea = textareaRefToUse.current;
      if (textarea) {
        const newPos = beforeTrigger.length + symbolName.length;
        textarea.setSelectionRange(newPos, newPos);
        textarea.focus();
      }
    }, 0);
  };

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        textareaRefToUse.current &&
        !textareaRefToUse.current.contains(e.target as Node)
      ) {
        setShowAutocomplete(false);
      }
    };

    if (showAutocomplete) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showAutocomplete, textareaRefToUse]);

  // Scroll selected item into view
  useEffect(() => {
    if (showAutocomplete && dropdownRef.current) {
      const selectedEl = dropdownRef.current.children[selectedIndex] as HTMLElement;
      if (selectedEl) {
        selectedEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex, showAutocomplete]);

  const getSymbolIcon = (kind: 'variable' | 'function' | 'new') => {
    switch (kind) {
      case 'function': return 'ƒ';
      case 'variable': return 'x';
      case 'new': return '+';
    }
  };

  const getSymbolColor = (kind: 'variable' | 'function' | 'new') => {
    switch (kind) {
      case 'function': return 'var(--pb-info)';
      case 'variable': return 'var(--pb-success)';
      case 'new': return 'var(--pb-accent)';
    }
  };

  return (
    <div className="symbol-autocomplete-container">
      <textarea
        ref={textareaRefToUse}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={onBlur}
        placeholder={placeholder}
        className={className}
        rows={rows}
      />
      {showAutocomplete && (
        <div ref={dropdownRef} className="symbol-autocomplete-dropdown">
          {isLoading ? (
            <div className="symbol-autocomplete-loading">Loading symbols...</div>
          ) : totalItems === 0 ? (
            <div className="symbol-autocomplete-empty">No symbols found</div>
          ) : (
            <>
              {filteredSymbols.map((symbol, index) => (
                <div
                  key={symbol.name}
                  className={`symbol-autocomplete-item ${index === selectedIndex ? 'symbol-autocomplete-item--selected' : ''}`}
                  onClick={() => selectSymbol(symbol.name)}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <span
                    className="symbol-autocomplete-icon"
                    style={{ color: getSymbolColor(symbol.kind) }}
                  >
                    {getSymbolIcon(symbol.kind)}
                  </span>
                  <span className="symbol-autocomplete-name">{symbol.name}</span>
                  <span className="symbol-autocomplete-type">{symbol.type}</span>
                  <span className="symbol-autocomplete-description" title={symbol.description}>
                    {symbol.description.slice(0, 40)}{symbol.description.length > 40 ? '...' : ''}
                  </span>
                </div>
              ))}
              {showCreateOption && (
                <div
                  className={`symbol-autocomplete-item symbol-autocomplete-item--create ${selectedIndex === filteredSymbols.length ? 'symbol-autocomplete-item--selected' : ''}`}
                  onClick={() => selectSymbol(filterText)}
                  onMouseEnter={() => setSelectedIndex(filteredSymbols.length)}
                >
                  <span
                    className="symbol-autocomplete-icon"
                    style={{ color: getSymbolColor('new') }}
                  >
                    {getSymbolIcon('new')}
                  </span>
                  <span className="symbol-autocomplete-name">#{filterText}</span>
                  <span className="symbol-autocomplete-type">proposed</span>
                  <span className="symbol-autocomplete-description">
                    Create new variable or function
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
