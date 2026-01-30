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

export function FileAutocomplete({
  value,
  onChange,
  listFiles,
  placeholder,
  className,
  rows = 4,
  onBlur,
  onKeyDown,
  textareaRef: externalRef,
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

  // Filter files based on what user typed after @
  const filteredFiles = files.filter((f) =>
    f.name.toLowerCase().includes(filterText.toLowerCase())
  );

  // Load files when autocomplete opens
  const loadFiles = useCallback(async (dir?: string) => {
    try {
      const result = await listFiles(dir);
      setFiles(result.files);
      setCurrentDir(result.cwd);
    } catch {
      setFiles([]);
    }
  }, [listFiles]);

  // Detect @ trigger
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const cursorPos = e.target.selectionStart;
    onChange(newValue);

    // Check if we just typed @ after a space or at start
    if (cursorPos > 0) {
      const charBefore = newValue[cursorPos - 1];
      const charBeforeThat = cursorPos > 1 ? newValue[cursorPos - 2] : ' ';

      if (charBefore === '@' && (charBeforeThat === ' ' || charBeforeThat === '\n' || cursorPos === 1)) {
        setShowAutocomplete(true);
        setTriggerPosition(cursorPos);
        setFilterText('');
        setSelectedIndex(0);
        loadFiles();
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

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showAutocomplete && filteredFiles.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, filteredFiles.length - 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        selectFile(filteredFiles[selectedIndex]);
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

  // Select a file from the dropdown
  const selectFile = (file: FileEntry) => {
    if (file.isDirectory) {
      // Navigate into directory
      loadFiles(file.path);
      setFilterText('');
      setSelectedIndex(0);
      return;
    }

    // Insert file path
    const beforeTrigger = value.slice(0, triggerPosition - 1); // Remove the @
    const afterCursor = value.slice(triggerPosition + filterText.length);
    const newValue = beforeTrigger + file.name + afterCursor;
    onChange(newValue);
    setShowAutocomplete(false);

    // Move cursor after inserted text
    setTimeout(() => {
      const textarea = textareaRefToUse.current;
      if (textarea) {
        const newPos = beforeTrigger.length + file.name.length;
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

  return (
    <div className="file-autocomplete-container">
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
      {showAutocomplete && filteredFiles.length > 0 && (
        <div ref={dropdownRef} className="file-autocomplete-dropdown">
          {currentDir && (
            <div className="file-autocomplete-header">
              {currentDir}
            </div>
          )}
          {filteredFiles.map((file, index) => (
            <div
              key={file.path}
              className={`file-autocomplete-item ${index === selectedIndex ? 'file-autocomplete-item--selected' : ''} ${file.isDirectory ? 'file-autocomplete-item--directory' : ''}`}
              onClick={() => selectFile(file)}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <span className="file-autocomplete-icon">
                {file.isDirectory ? '📁' : '📄'}
              </span>
              <span className="file-autocomplete-name">{file.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
