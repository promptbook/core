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

export interface DropdownPosition {
  top: number;
  left: number;
  width: number;
}

interface UseCombinedAutocompleteOptions {
  value: string;
  onChange: (value: string) => void;
  listFiles?: (dirPath?: string) => Promise<{ files: FileEntry[]; cwd: string }>;
  getSymbols?: () => Promise<KernelSymbol[]>;
  /** Pre-loaded symbols from LLM code generation - used instead of kernel symbols when available */
  preloadedSymbols?: KernelSymbol[];
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

// Calculate dropdown position based on textarea
function calculateDropdownPosition(textarea: HTMLTextAreaElement): DropdownPosition {
  const rect = textarea.getBoundingClientRect();
  return {
    top: rect.bottom + 4,
    left: rect.left,
    width: rect.width,
  };
}

// Filter items based on filter text
function filterItems(items: AutocompleteItem[], filterText: string): AutocompleteItem[] {
  return items.filter((item) =>
    item.label.toLowerCase().includes(filterText.toLowerCase())
  );
}

// Check if "create new" option should be shown for symbol mode
function shouldShowCreateOption(
  mode: AutocompleteMode,
  filterText: string,
  items: AutocompleteItem[]
): boolean {
  return mode === 'symbol' &&
    filterText.length > 0 &&
    /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(filterText) &&
    !items.some(item => item.label.toLowerCase() === filterText.toLowerCase());
}

// Build insertion text from item selection
function buildInsertedText(
  value: string,
  triggerPosition: number,
  filterText: string,
  mode: AutocompleteMode,
  itemLabel: string
): { newValue: string; newCursorPos: number } {
  const beforeTrigger = value.slice(0, triggerPosition - 1);
  const afterCursor = value.slice(triggerPosition + filterText.length);
  const insertText = mode === 'file' ? itemLabel : `#${itemLabel}`;
  const newValue = beforeTrigger + insertText + afterCursor;
  return { newValue, newCursorPos: beforeTrigger.length + insertText.length };
}

// Build text for new symbol insertion
function buildNewSymbolText(
  value: string,
  triggerPosition: number,
  filterText: string,
  name: string
): { newValue: string; newCursorPos: number } {
  const beforeTrigger = value.slice(0, triggerPosition);
  const afterCursor = value.slice(triggerPosition + filterText.length);
  const newValue = beforeTrigger + name + afterCursor;
  return { newValue, newCursorPos: beforeTrigger.length + name.length };
}

// Handle keyboard navigation and selection
function handleAutocompleteKeyDown(
  e: React.KeyboardEvent<HTMLTextAreaElement>,
  state: {
    mode: AutocompleteMode;
    totalItems: number;
    selectedIndex: number;
    filteredItems: AutocompleteItem[];
    showCreateOption: boolean;
    filterText: string;
  },
  actions: {
    setSelectedIndex: React.Dispatch<React.SetStateAction<number>>;
    selectItem: (item: AutocompleteItem) => void;
    insertNewSymbol: (name: string) => void;
    setMode: React.Dispatch<React.SetStateAction<AutocompleteMode>>;
  }
): boolean {
  const { mode, totalItems, selectedIndex, filteredItems, showCreateOption, filterText } = state;
  const { setSelectedIndex, selectItem, insertNewSymbol, setMode } = actions;

  if (mode === 'none' || totalItems === 0) return false;

  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, totalItems - 1));
      return true;
    case 'ArrowUp':
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
      return true;
    case 'Enter':
    case 'Tab':
      e.preventDefault();
      if (selectedIndex < filteredItems.length) {
        selectItem(filteredItems[selectedIndex]);
      } else if (showCreateOption) {
        insertNewSymbol(filterText);
      }
      return true;
    case 'Escape':
      e.preventDefault();
      setMode('none');
      return true;
    default:
      return false;
  }
}

// Helper to set cursor position in textarea
function setCursorPosition(textarea: HTMLTextAreaElement | null, position: number): void {
  setTimeout(() => {
    if (textarea) {
      textarea.setSelectionRange(position, position);
      textarea.focus();
    }
  }, 0);
}

// Setup click outside listener for dropdown
function useClickOutside(
  mode: AutocompleteMode,
  dropdownRef: React.RefObject<HTMLDivElement>,
  textareaRef: React.RefObject<HTMLTextAreaElement>,
  setMode: React.Dispatch<React.SetStateAction<AutocompleteMode>>
): void {
  useEffect(() => {
    if (mode === 'none') return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      const isOutside = dropdownRef.current && !dropdownRef.current.contains(target) &&
        textareaRef.current && !textareaRef.current.contains(target);
      if (isOutside) setMode('none');
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [mode, textareaRef, dropdownRef, setMode]);
}

// Scroll selected item into view
function useScrollIntoView(mode: AutocompleteMode, selectedIndex: number, dropdownRef: React.RefObject<HTMLDivElement>): void {
  useEffect(() => {
    if (mode !== 'none' && dropdownRef.current) {
      const selectedEl = dropdownRef.current.querySelector('.autocomplete-item--selected') as HTMLElement;
      selectedEl?.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex, mode, dropdownRef]);
}

// Check for trigger character and activate autocomplete mode
interface TriggerResult {
  triggered: boolean;
  mode?: 'file' | 'symbol';
}

function checkTrigger(newValue: string, cursorPos: number, hasFiles: boolean, hasSymbols: boolean): TriggerResult {
  if (cursorPos <= 0) return { triggered: false };
  const charBefore = newValue[cursorPos - 1];
  const isValid = isValidTriggerPosition(newValue, cursorPos);
  if (charBefore === '@' && isValid && hasFiles) return { triggered: true, mode: 'file' };
  if (charBefore === '#' && isValid && hasSymbols) return { triggered: true, mode: 'symbol' };
  return { triggered: false };
}

// Update filter text based on content after trigger
function getFilterUpdate(newValue: string, cursorPos: number, triggerPos: number): { clear: boolean; text: string } {
  const textAfterTrigger = newValue.slice(triggerPos, cursorPos);
  if (textAfterTrigger.includes(' ') || textAfterTrigger.includes('\n')) return { clear: true, text: '' };
  return { clear: false, text: textAfterTrigger };
}

export function useCombinedAutocomplete(opts: UseCombinedAutocompleteOptions) {
  const { value, onChange, listFiles, getSymbols, preloadedSymbols, textareaRef } = opts;
  const hasSymbols = !!(getSymbols || (preloadedSymbols && preloadedSymbols.length > 0));
  const [mode, setMode] = useState<AutocompleteMode>('none');
  const [items, setItems] = useState<AutocompleteItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [triggerPosition, setTriggerPosition] = useState(0);
  const [filterText, setFilterText] = useState('');
  const [currentDir, setCurrentDir] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState<DropdownPosition>({ top: 0, left: 0, width: 300 });
  const dropdownRef = useRef<HTMLDivElement>(null);
  const filteredItems = filterItems(items, filterText);
  const showCreateOption = shouldShowCreateOption(mode, filterText, items);
  const totalItems = filteredItems.length + (showCreateOption ? 1 : 0);

  useEffect(() => {
    if (mode !== 'none' && textareaRef.current) setDropdownPosition(calculateDropdownPosition(textareaRef.current));
  }, [mode, textareaRef]);

  const loadFiles = useCallback(async (dir?: string) => {
    if (!listFiles) return;
    setIsLoading(true);
    try { const r = await listFiles(dir); setCurrentDir(r.cwd); setItems(filesToItems(r.files)); }
    catch { setItems([]); } finally { setIsLoading(false); }
  }, [listFiles]);

  const loadSymbols = useCallback(async () => {
    // Prefer preloaded symbols from LLM over kernel symbols
    if (preloadedSymbols && preloadedSymbols.length > 0) {
      setItems(symbolsToItems(preloadedSymbols));
      return;
    }
    if (!getSymbols) return;
    setIsLoading(true);
    try { setItems(symbolsToItems(await getSymbols())); }
    catch { setItems([]); } finally { setIsLoading(false); }
  }, [getSymbols, preloadedSymbols]);

  const insertItem = useCallback((item: AutocompleteItem) => {
    const { newValue, newCursorPos } = buildInsertedText(value, triggerPosition, filterText, mode, item.label);
    onChange(newValue); setMode('none'); setCursorPosition(textareaRef.current, newCursorPos);
  }, [value, triggerPosition, filterText, mode, onChange, textareaRef]);

  const insertNewSymbol = useCallback((name: string) => {
    const { newValue, newCursorPos } = buildNewSymbolText(value, triggerPosition, filterText, name);
    onChange(newValue); setMode('none'); setCursorPosition(textareaRef.current, newCursorPos);
  }, [value, triggerPosition, filterText, onChange, textareaRef]);

  const selectItem = useCallback((item: AutocompleteItem) => {
    if (mode === 'file' && item.isDirectory) { loadFiles(item.path); setFilterText(''); setSelectedIndex(0); return; }
    insertItem(item);
  }, [mode, loadFiles, insertItem]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value; const cursorPos = e.target.selectionStart;
    onChange(newValue);
    const trigger = checkTrigger(newValue, cursorPos, !!listFiles, hasSymbols);
    if (trigger.triggered && trigger.mode) {
      setMode(trigger.mode); setTriggerPosition(cursorPos); setFilterText(''); setSelectedIndex(0);
      if (trigger.mode === 'file') setCurrentDir('');
      if (textareaRef.current) setDropdownPosition(calculateDropdownPosition(textareaRef.current));
      if (trigger.mode === 'file') loadFiles(); else loadSymbols();
      return;
    }
    if (mode !== 'none') {
      const update = getFilterUpdate(newValue, cursorPos, triggerPosition);
      if (update.clear) setMode('none'); else setFilterText(update.text);
    }
  }, [onChange, listFiles, hasSymbols, mode, triggerPosition, loadFiles, loadSymbols, textareaRef]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>, ext?: (e: React.KeyboardEvent) => void) => {
    const handled = handleAutocompleteKeyDown(e,
      { mode, totalItems, selectedIndex, filteredItems, showCreateOption, filterText },
      { setSelectedIndex, selectItem, insertNewSymbol, setMode });
    if (!handled) ext?.(e);
  }, [mode, totalItems, selectedIndex, filteredItems, showCreateOption, filterText, selectItem, insertNewSymbol]);

  useClickOutside(mode, dropdownRef, textareaRef, setMode);
  useScrollIntoView(mode, selectedIndex, dropdownRef);

  return { mode, items: filteredItems, selectedIndex, filterText, currentDir, isLoading, showCreateOption,
    totalItems, dropdownRef, dropdownPosition, handleChange, handleKeyDown, selectItem, insertNewSymbol, setSelectedIndex };
}
