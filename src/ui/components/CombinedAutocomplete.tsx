import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { FileEntry } from './FileAutocomplete';
import type { KernelSymbol } from './SymbolAutocomplete';

export interface CombinedAutocompleteProps {
  /** The current text value */
  value: string;
  /** Callback when text changes */
  onChange: (value: string) => void;
  /** Function to list files for @ autocomplete */
  listFiles?: (dirPath?: string) => Promise<{ files: FileEntry[]; cwd: string }>;
  /** Function to get kernel symbols for # autocomplete */
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

type AutocompleteMode = 'none' | 'file' | 'symbol';

interface AutocompleteItem {
  id: string;
  label: string;
  icon: string;
  iconColor: string;
  type: string;
  description?: string;
  isDirectory?: boolean;
  isCreateNew?: boolean;
  path?: string;
}

export function CombinedAutocomplete({
  value,
  onChange,
  listFiles,
  getSymbols,
  placeholder,
  className,
  rows = 4,
  onBlur,
  onKeyDown,
  textareaRef: externalRef,
}: CombinedAutocompleteProps) {
  const [mode, setMode] = useState<AutocompleteMode>('none');
  const [items, setItems] = useState<AutocompleteItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [triggerPosition, setTriggerPosition] = useState(0);
  const [filterText, setFilterText] = useState('');
  const [currentDir, setCurrentDir] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const internalRef = useRef<HTMLTextAreaElement>(null);
  const textareaRefToUse = externalRef || internalRef;
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter items based on what user typed
  const filteredItems = items.filter((item) =>
    item.label.toLowerCase().includes(filterText.toLowerCase())
  );

  // For symbol mode, add "create new" option
  const showCreateOption = mode === 'symbol' &&
    filterText.length > 0 &&
    /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(filterText) &&
    !items.some(item => item.label.toLowerCase() === filterText.toLowerCase());

  const totalItems = filteredItems.length + (showCreateOption ? 1 : 0);

  // Load files
  const loadFiles = useCallback(async (dir?: string) => {
    if (!listFiles) return;
    setIsLoading(true);
    try {
      const result = await listFiles(dir);
      setCurrentDir(result.cwd);
      setItems(result.files.map((f) => ({
        id: f.path,
        label: f.name,
        icon: f.isDirectory ? '📁' : '📄',
        iconColor: 'var(--pb-text-secondary)',
        type: f.isDirectory ? 'folder' : 'file',
        isDirectory: f.isDirectory,
        path: f.path,
      })));
    } catch {
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [listFiles]);

  // Load symbols
  const loadSymbols = useCallback(async () => {
    if (!getSymbols) return;
    setIsLoading(true);
    try {
      const symbols = await getSymbols();
      setItems(symbols.map((s) => ({
        id: s.name,
        label: s.name,
        icon: s.kind === 'function' ? 'ƒ' : 'x',
        iconColor: s.kind === 'function' ? 'var(--pb-info)' : 'var(--pb-success)',
        type: s.type,
        description: s.description,
      })));
    } catch {
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [getSymbols]);

  // Detect @ or # trigger
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const cursorPos = e.target.selectionStart;
    onChange(newValue);

    // Check for triggers
    if (cursorPos > 0) {
      const charBefore = newValue[cursorPos - 1];
      const charBeforeThat = cursorPos > 1 ? newValue[cursorPos - 2] : ' ';
      const isValidTrigger = charBeforeThat === ' ' || charBeforeThat === '\n' || cursorPos === 1;

      if (charBefore === '@' && isValidTrigger && listFiles) {
        setMode('file');
        setTriggerPosition(cursorPos);
        setFilterText('');
        setSelectedIndex(0);
        setCurrentDir('');
        loadFiles();
        return;
      }

      if (charBefore === '#' && isValidTrigger && getSymbols) {
        setMode('symbol');
        setTriggerPosition(cursorPos);
        setFilterText('');
        setSelectedIndex(0);
        loadSymbols();
        return;
      }
    }

    // Update filter if autocomplete is showing
    if (mode !== 'none') {
      const textAfterTrigger = newValue.slice(triggerPosition, cursorPos);
      if (textAfterTrigger.includes(' ') || textAfterTrigger.includes('\n')) {
        setMode('none');
      } else {
        setFilterText(textAfterTrigger);
      }
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (mode !== 'none' && totalItems > 0) {
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
        if (selectedIndex < filteredItems.length) {
          selectItem(filteredItems[selectedIndex]);
        } else if (showCreateOption) {
          selectNewSymbol(filterText);
        }
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setMode('none');
        return;
      }
    }
    onKeyDown?.(e);
  };

  // Select an item from the dropdown
  const selectItem = (item: AutocompleteItem) => {
    if (mode === 'file' && item.isDirectory) {
      // Navigate into directory
      loadFiles(item.path);
      setFilterText('');
      setSelectedIndex(0);
      return;
    }

    // Insert the item
    const beforeTrigger = value.slice(0, triggerPosition - 1); // Remove the trigger char
    const afterCursor = value.slice(triggerPosition + filterText.length);

    let insertText: string;
    if (mode === 'file') {
      insertText = item.label; // File names without @
    } else {
      insertText = `#${item.label}`; // Keep # for symbols
    }

    const newValue = beforeTrigger + insertText + afterCursor;
    onChange(newValue);
    setMode('none');

    // Move cursor after inserted text
    setTimeout(() => {
      const textarea = textareaRefToUse.current;
      if (textarea) {
        const newPos = beforeTrigger.length + insertText.length;
        textarea.setSelectionRange(newPos, newPos);
        textarea.focus();
      }
    }, 0);
  };

  // Select a new proposed symbol
  const selectNewSymbol = (name: string) => {
    const beforeTrigger = value.slice(0, triggerPosition); // Keep the #
    const afterCursor = value.slice(triggerPosition + filterText.length);
    const newValue = beforeTrigger + name + afterCursor;
    onChange(newValue);
    setMode('none');

    setTimeout(() => {
      const textarea = textareaRefToUse.current;
      if (textarea) {
        const newPos = beforeTrigger.length + name.length;
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
        setMode('none');
      }
    };

    if (mode !== 'none') {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [mode, textareaRefToUse]);

  // Scroll selected item into view
  useEffect(() => {
    if (mode !== 'none' && dropdownRef.current) {
      const selectedEl = dropdownRef.current.querySelector('.autocomplete-item--selected') as HTMLElement;
      if (selectedEl) {
        selectedEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex, mode]);

  const renderDropdown = () => {
    if (mode === 'none') return null;

    return (
      <div ref={dropdownRef} className="combined-autocomplete-dropdown">
        {mode === 'file' && currentDir && (
          <div className="autocomplete-header">{currentDir}</div>
        )}
        {isLoading ? (
          <div className="autocomplete-loading">Loading...</div>
        ) : totalItems === 0 ? (
          <div className="autocomplete-empty">
            {mode === 'file' ? 'No files found' : 'No symbols found'}
          </div>
        ) : (
          <>
            {filteredItems.map((item, index) => (
              <div
                key={item.id}
                className={`autocomplete-item ${index === selectedIndex ? 'autocomplete-item--selected' : ''} ${item.isDirectory ? 'autocomplete-item--directory' : ''}`}
                onClick={() => selectItem(item)}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <span className="autocomplete-icon" style={{ color: item.iconColor }}>
                  {item.icon}
                </span>
                <span className="autocomplete-name">{item.label}</span>
                {mode === 'symbol' && (
                  <>
                    <span className="autocomplete-type">{item.type}</span>
                    {item.description && (
                      <span className="autocomplete-description" title={item.description}>
                        {item.description.slice(0, 40)}{item.description.length > 40 ? '...' : ''}
                      </span>
                    )}
                  </>
                )}
              </div>
            ))}
            {showCreateOption && (
              <div
                className={`autocomplete-item autocomplete-item--create ${selectedIndex === filteredItems.length ? 'autocomplete-item--selected' : ''}`}
                onClick={() => selectNewSymbol(filterText)}
                onMouseEnter={() => setSelectedIndex(filteredItems.length)}
              >
                <span className="autocomplete-icon" style={{ color: 'var(--pb-accent)' }}>+</span>
                <span className="autocomplete-name">#{filterText}</span>
                <span className="autocomplete-type">proposed</span>
                <span className="autocomplete-description">Create new variable or function</span>
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  return (
    <div className="combined-autocomplete-container">
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
      {renderDropdown()}
    </div>
  );
}
