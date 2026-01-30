import React, { useRef } from 'react';
import type { FileEntry } from './FileAutocomplete';
import type { KernelSymbol } from './SymbolAutocomplete';
import { useCombinedAutocomplete, type AutocompleteItem } from '../hooks/useCombinedAutocomplete';

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
  const internalRef = useRef<HTMLTextAreaElement>(null);
  const textareaRefToUse = externalRef || internalRef;

  const autocomplete = useCombinedAutocomplete({
    value,
    onChange,
    listFiles,
    getSymbols,
    textareaRef: textareaRefToUse,
  });

  return (
    <div className="combined-autocomplete-container">
      <textarea
        ref={textareaRefToUse}
        value={value}
        onChange={autocomplete.handleChange}
        onKeyDown={(e) => autocomplete.handleKeyDown(e, onKeyDown)}
        onBlur={onBlur}
        placeholder={placeholder}
        className={className}
        rows={rows}
      />
      {autocomplete.mode !== 'none' && (
        <AutocompleteDropdown
          dropdownRef={autocomplete.dropdownRef}
          mode={autocomplete.mode}
          currentDir={autocomplete.currentDir}
          isLoading={autocomplete.isLoading}
          totalItems={autocomplete.totalItems}
          filteredItems={autocomplete.items}
          selectedIndex={autocomplete.selectedIndex}
          filterText={autocomplete.filterText}
          showCreateOption={autocomplete.showCreateOption}
          onSelectItem={autocomplete.selectItem}
          onSelectNewSymbol={autocomplete.insertNewSymbol}
          onHoverItem={autocomplete.setSelectedIndex}
        />
      )}
    </div>
  );
}

// Dropdown component
interface AutocompleteDropdownProps {
  dropdownRef: React.RefObject<HTMLDivElement>;
  mode: 'file' | 'symbol';
  currentDir: string;
  isLoading: boolean;
  totalItems: number;
  filteredItems: AutocompleteItem[];
  selectedIndex: number;
  filterText: string;
  showCreateOption: boolean;
  onSelectItem: (item: AutocompleteItem) => void;
  onSelectNewSymbol: (name: string) => void;
  onHoverItem: (index: number) => void;
}

function AutocompleteDropdown({
  dropdownRef,
  mode,
  currentDir,
  isLoading,
  totalItems,
  filteredItems,
  selectedIndex,
  filterText,
  showCreateOption,
  onSelectItem,
  onSelectNewSymbol,
  onHoverItem,
}: AutocompleteDropdownProps) {
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
            <AutocompleteItemRow
              key={item.id}
              item={item}
              isSelected={index === selectedIndex}
              showSymbolDetails={mode === 'symbol'}
              onSelect={() => onSelectItem(item)}
              onHover={() => onHoverItem(index)}
            />
          ))}
          {showCreateOption && (
            <div
              className={`autocomplete-item autocomplete-item--create ${selectedIndex === filteredItems.length ? 'autocomplete-item--selected' : ''}`}
              onClick={() => onSelectNewSymbol(filterText)}
              onMouseEnter={() => onHoverItem(filteredItems.length)}
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
}

// Individual item row
interface AutocompleteItemRowProps {
  item: AutocompleteItem;
  isSelected: boolean;
  showSymbolDetails: boolean;
  onSelect: () => void;
  onHover: () => void;
}

function AutocompleteItemRow({ item, isSelected, showSymbolDetails, onSelect, onHover }: AutocompleteItemRowProps) {
  const itemClasses = [
    'autocomplete-item',
    isSelected ? 'autocomplete-item--selected' : '',
    item.isDirectory ? 'autocomplete-item--directory' : '',
  ].filter(Boolean).join(' ');

  return (
    <div className={itemClasses} onClick={onSelect} onMouseEnter={onHover}>
      <span className="autocomplete-icon" style={{ color: item.iconColor }}>
        {item.icon}
      </span>
      <span className="autocomplete-name">{item.label}</span>
      {showSymbolDetails && (
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
  );
}
