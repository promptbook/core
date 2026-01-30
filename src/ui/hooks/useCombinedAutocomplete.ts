import { useState, useRef, useCallback, useEffect } from 'react';
import type { FileEntry } from '../components/FileAutocomplete';
import type { KernelSymbol } from '../components/SymbolAutocomplete';

type AutocompleteMode = 'none' | 'file' | 'symbol';

export interface AutocompleteItem {
  id: string;
  label: string;
  icon: string;
  iconColor: string;
  type: string;
  description?: string;
  isDirectory?: boolean;
  path?: string;
}

interface UseCombinedAutocompleteOptions {
  value: string;
  onChange: (value: string) => void;
  listFiles?: (dirPath?: string) => Promise<{ files: FileEntry[]; cwd: string }>;
  getSymbols?: () => Promise<KernelSymbol[]>;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
}

// Convert file entries to autocomplete items
function filesToItems(files: FileEntry[]): AutocompleteItem[] {
  return files.map((f) => ({
    id: f.path,
    label: f.name,
    icon: f.isDirectory ? '📁' : '📄',
    iconColor: 'var(--pb-text-secondary)',
    type: f.isDirectory ? 'folder' : 'file',
    isDirectory: f.isDirectory,
    path: f.path,
  }));
}

// Convert kernel symbols to autocomplete items
function symbolsToItems(symbols: KernelSymbol[]): AutocompleteItem[] {
  return symbols.map((s) => ({
    id: s.name,
    label: s.name,
    icon: s.kind === 'function' ? 'ƒ' : 'x',
    iconColor: s.kind === 'function' ? 'var(--pb-info)' : 'var(--pb-success)',
    type: s.type,
    description: s.description,
  }));
}

// Check if position is a valid trigger location
function isValidTriggerPosition(str: string, cursorPos: number): boolean {
  if (cursorPos <= 1) return true;
  const charBeforeThat = str[cursorPos - 2];
  return charBeforeThat === ' ' || charBeforeThat === '\n';
}

export function useCombinedAutocomplete({
  value,
  onChange,
  listFiles,
  getSymbols,
  textareaRef,
}: UseCombinedAutocompleteOptions) {
  const [mode, setMode] = useState<AutocompleteMode>('none');
  const [items, setItems] = useState<AutocompleteItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [triggerPosition, setTriggerPosition] = useState(0);
  const [filterText, setFilterText] = useState('');
  const [currentDir, setCurrentDir] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter items based on what user typed
  const filteredItems = items.filter((item) =>
    item.label.toLowerCase().includes(filterText.toLowerCase())
  );

  // For symbol mode, add "create new" option if valid identifier
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
      setItems(filesToItems(result.files));
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
      setItems(symbolsToItems(symbols));
    } catch {
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [getSymbols]);

  // Insert selected item into text
  const insertItem = useCallback((item: AutocompleteItem) => {
    const beforeTrigger = value.slice(0, triggerPosition - 1);
    const afterCursor = value.slice(triggerPosition + filterText.length);
    const insertText = mode === 'file' ? item.label : `#${item.label}`;
    const newValue = beforeTrigger + insertText + afterCursor;
    onChange(newValue);
    setMode('none');

    setTimeout(() => {
      if (textareaRef.current) {
        const newPos = beforeTrigger.length + insertText.length;
        textareaRef.current.setSelectionRange(newPos, newPos);
        textareaRef.current.focus();
      }
    }, 0);
  }, [value, triggerPosition, filterText, mode, onChange, textareaRef]);

  // Insert new proposed symbol
  const insertNewSymbol = useCallback((name: string) => {
    const beforeTrigger = value.slice(0, triggerPosition);
    const afterCursor = value.slice(triggerPosition + filterText.length);
    const newValue = beforeTrigger + name + afterCursor;
    onChange(newValue);
    setMode('none');

    setTimeout(() => {
      if (textareaRef.current) {
        const newPos = beforeTrigger.length + name.length;
        textareaRef.current.setSelectionRange(newPos, newPos);
        textareaRef.current.focus();
      }
    }, 0);
  }, [value, triggerPosition, filterText, onChange, textareaRef]);

  // Handle item selection
  const selectItem = useCallback((item: AutocompleteItem) => {
    if (mode === 'file' && item.isDirectory) {
      loadFiles(item.path);
      setFilterText('');
      setSelectedIndex(0);
      return;
    }
    insertItem(item);
  }, [mode, loadFiles, insertItem]);

  // Handle text change
  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const cursorPos = e.target.selectionStart;
    onChange(newValue);

    if (cursorPos > 0) {
      const charBefore = newValue[cursorPos - 1];
      const isValidTrigger = isValidTriggerPosition(newValue, cursorPos);

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

    if (mode !== 'none') {
      const textAfterTrigger = newValue.slice(triggerPosition, cursorPos);
      if (textAfterTrigger.includes(' ') || textAfterTrigger.includes('\n')) {
        setMode('none');
      } else {
        setFilterText(textAfterTrigger);
      }
    }
  }, [onChange, listFiles, getSymbols, mode, triggerPosition, loadFiles, loadSymbols]);

  // Handle keyboard events
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>, externalHandler?: (e: React.KeyboardEvent) => void) => {
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
          insertNewSymbol(filterText);
        }
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setMode('none');
        return;
      }
    }
    externalHandler?.(e);
  }, [mode, totalItems, selectedIndex, filteredItems, showCreateOption, filterText, selectItem, insertNewSymbol]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        textareaRef.current &&
        !textareaRef.current.contains(e.target as Node)
      ) {
        setMode('none');
      }
    };

    if (mode !== 'none') {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [mode, textareaRef]);

  // Scroll selected item into view
  useEffect(() => {
    if (mode !== 'none' && dropdownRef.current) {
      const selectedEl = dropdownRef.current.querySelector('.autocomplete-item--selected') as HTMLElement;
      if (selectedEl) {
        selectedEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex, mode]);

  return {
    mode,
    items: filteredItems,
    selectedIndex,
    filterText,
    currentDir,
    isLoading,
    showCreateOption,
    totalItems,
    dropdownRef,
    handleChange,
    handleKeyDown,
    selectItem,
    insertNewSymbol,
    setSelectedIndex,
  };
}
