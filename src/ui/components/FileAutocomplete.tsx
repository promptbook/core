import React, { useState, useEffect, useRef, useCallback } from 'react';

export interface FileEntry {
  name: string;
  isDirectory: boolean;
  path: string;
}

export interface FileAutocompleteProps {
  /** The current text value */
  value: string;
  /** Callback when text changes */
  onChange: (value: string) => void;
  /** Function to list files in a directory */
  listFiles: (dirPath?: string) => Promise<{ files: FileEntry[]; cwd: string }>;
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

interface FileDropdownProps {
  files: FileEntry[];
  selectedIndex: number;
  currentDir: string;
  onSelect: (file: FileEntry) => void;
  onHover: (index: number) => void;
  dropdownRef: React.RefObject<HTMLDivElement>;
}

function FileDropdown({ files, selectedIndex, currentDir, onSelect, onHover, dropdownRef }: FileDropdownProps) {
  return (
    <div ref={dropdownRef} className="file-autocomplete-dropdown">
      {currentDir && <div className="file-autocomplete-header">{currentDir}</div>}
      {files.map((file, index) => (
        <div
          key={file.path}
          className={`file-autocomplete-item ${index === selectedIndex ? 'file-autocomplete-item--selected' : ''} ${file.isDirectory ? 'file-autocomplete-item--directory' : ''}`}
          onClick={() => onSelect(file)}
          onMouseEnter={() => onHover(index)}
        >
          <span className="file-autocomplete-icon">{file.isDirectory ? '📁' : '📄'}</span>
          <span className="file-autocomplete-name">{file.name}</span>
        </div>
      ))}
    </div>
  );
}

/** Handle keyboard navigation for autocomplete dropdown */
function handleAutocompleteKeyDown(
  e: React.KeyboardEvent,
  filteredFiles: FileEntry[],
  selectedIndex: number,
  setSelectedIndex: (fn: (prev: number) => number) => void,
  selectFile: (file: FileEntry) => void,
  closeAutocomplete: () => void
): boolean {
  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, filteredFiles.length - 1));
      return true;
    case 'ArrowUp':
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
      return true;
    case 'Enter':
    case 'Tab':
      e.preventDefault();
      selectFile(filteredFiles[selectedIndex]);
      return true;
    case 'Escape':
      e.preventDefault();
      closeAutocomplete();
      return true;
    default:
      return false;
  }
}

/** Check if @ trigger should activate autocomplete */
function checkTrigger(newValue: string, cursorPos: number): boolean {
  if (cursorPos <= 0) return false;
  const charBefore = newValue[cursorPos - 1];
  const charBeforeThat = cursorPos > 1 ? newValue[cursorPos - 2] : ' ';
  return charBefore === '@' && (charBeforeThat === ' ' || charBeforeThat === '\n' || cursorPos === 1);
}

/** Hook to handle click outside and close autocomplete */
function useClickOutside(
  showAutocomplete: boolean,
  dropdownRef: React.RefObject<HTMLDivElement>,
  textareaRef: React.RefObject<HTMLTextAreaElement>,
  onClose: () => void
) {
  useEffect(() => {
    if (!showAutocomplete) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (dropdownRef.current?.contains(target) || textareaRef.current?.contains(target)) return;
      onClose();
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showAutocomplete, dropdownRef, textareaRef, onClose]);
}

/** Hook to scroll selected item into view */
function useScrollIntoView(showAutocomplete: boolean, dropdownRef: React.RefObject<HTMLDivElement>, selectedIndex: number) {
  useEffect(() => {
    if (!showAutocomplete || !dropdownRef.current) return;
    const selectedEl = dropdownRef.current.children[selectedIndex] as HTMLElement;
    selectedEl?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex, showAutocomplete, dropdownRef]);
}

export function FileAutocomplete({
  value, onChange, listFiles, placeholder, className, rows = 4, onBlur, onKeyDown, textareaRef: externalRef,
}: FileAutocompleteProps) {
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [triggerPosition, setTriggerPosition] = useState(0);
  const [currentDir, setCurrentDir] = useState('');
  const [filterText, setFilterText] = useState('');
  const internalRef = useRef<HTMLTextAreaElement>(null);
  const textareaRefToUse = externalRef || internalRef;
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filteredFiles = files.filter((f) => f.name.toLowerCase().includes(filterText.toLowerCase()));
  const closeAutocomplete = useCallback(() => setShowAutocomplete(false), []);

  const loadFiles = useCallback(async (dir?: string) => {
    try {
      const result = await listFiles(dir);
      setFiles(result.files);
      setCurrentDir(result.cwd);
    } catch {
      setFiles([]);
    }
  }, [listFiles]);

  const selectFile = useCallback((file: FileEntry) => {
    if (file.isDirectory) {
      loadFiles(file.path);
      setFilterText('');
      setSelectedIndex(0);
      return;
    }
    const beforeTrigger = value.slice(0, triggerPosition - 1);
    const afterCursor = value.slice(triggerPosition + filterText.length);
    onChange(beforeTrigger + file.name + afterCursor);
    setShowAutocomplete(false);
    setTimeout(() => {
      const textarea = textareaRefToUse.current;
      if (textarea) {
        const newPos = beforeTrigger.length + file.name.length;
        textarea.setSelectionRange(newPos, newPos);
        textarea.focus();
      }
    }, 0);
  }, [value, triggerPosition, filterText, onChange, loadFiles, textareaRefToUse]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const cursorPos = e.target.selectionStart;
    onChange(newValue);
    if (checkTrigger(newValue, cursorPos)) {
      setShowAutocomplete(true);
      setTriggerPosition(cursorPos);
      setFilterText('');
      setSelectedIndex(0);
      loadFiles();
      return;
    }
    if (showAutocomplete) {
      const textAfterTrigger = newValue.slice(triggerPosition, cursorPos);
      if (textAfterTrigger.includes(' ') || textAfterTrigger.includes('\n')) {
        setShowAutocomplete(false);
      } else {
        setFilterText(textAfterTrigger);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showAutocomplete && filteredFiles.length > 0) {
      if (handleAutocompleteKeyDown(e, filteredFiles, selectedIndex, setSelectedIndex, selectFile, closeAutocomplete)) return;
    }
    onKeyDown?.(e);
  };

  useClickOutside(showAutocomplete, dropdownRef, textareaRefToUse, closeAutocomplete);
  useScrollIntoView(showAutocomplete, dropdownRef, selectedIndex);

  return (
    <div className="file-autocomplete-container">
      <textarea ref={textareaRefToUse} value={value} onChange={handleChange} onKeyDown={handleKeyDown} onBlur={onBlur} placeholder={placeholder} className={className} rows={rows} />
      {showAutocomplete && filteredFiles.length > 0 && (
        <FileDropdown files={filteredFiles} selectedIndex={selectedIndex} currentDir={currentDir} onSelect={selectFile} onHover={setSelectedIndex} dropdownRef={dropdownRef} />
      )}
    </div>
  );
}
