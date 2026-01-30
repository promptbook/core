import React, { useState, useCallback, useEffect, useRef } from 'react';

export interface SearchMatch {
  cellId: string;
  field: 'shortDescription' | 'fullDescription' | 'code' | 'textContent';
  startIndex: number;
  endIndex: number;
  text: string;
}

interface FindReplaceProps {
  isOpen: boolean;
  onClose: () => void;
  onSearch: (query: string, caseSensitive: boolean, regex: boolean) => SearchMatch[];
  onReplace: (match: SearchMatch, replacement: string) => void;
  onReplaceAll: (query: string, replacement: string, caseSensitive: boolean, regex: boolean) => number;
  onNavigate: (cellId: string) => void;
}

// Icons
const CloseIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 3l8 8M11 3l-8 8" />
  </svg>
);

const ChevronUpIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M9 7.5l-3-3-3 3" />
  </svg>
);

const ChevronDownIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M3 4.5l3 3 3-3" />
  </svg>
);

export function FindReplace({
  isOpen,
  onClose,
  onSearch,
  onReplace,
  onReplaceAll,
  onNavigate,
}: FindReplaceProps) {
  const [query, setQuery] = useState('');
  const [replacement, setReplacement] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [useRegex, setUseRegex] = useState(false);
  const [showReplace, setShowReplace] = useState(false);
  const [matches, setMatches] = useState<SearchMatch[]>([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when opening
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isOpen]);

  // Search when query changes
  const handleSearch = useCallback(() => {
    if (!query.trim()) {
      setMatches([]);
      return;
    }
    const results = onSearch(query, caseSensitive, useRegex);
    setMatches(results);
    setCurrentMatchIndex(0);
    if (results.length > 0) {
      onNavigate(results[0].cellId);
    }
  }, [query, caseSensitive, useRegex, onSearch, onNavigate]);

  // Search on query change with debounce
  useEffect(() => {
    const timeout = setTimeout(handleSearch, 200);
    return () => clearTimeout(timeout);
  }, [handleSearch]);

  const handleNextMatch = useCallback(() => {
    if (matches.length === 0) return;
    const nextIndex = (currentMatchIndex + 1) % matches.length;
    setCurrentMatchIndex(nextIndex);
    onNavigate(matches[nextIndex].cellId);
  }, [matches, currentMatchIndex, onNavigate]);

  const handlePrevMatch = useCallback(() => {
    if (matches.length === 0) return;
    const prevIndex = (currentMatchIndex - 1 + matches.length) % matches.length;
    setCurrentMatchIndex(prevIndex);
    onNavigate(matches[prevIndex].cellId);
  }, [matches, currentMatchIndex, onNavigate]);

  const handleReplaceCurrent = useCallback(() => {
    if (matches.length === 0) return;
    const match = matches[currentMatchIndex];
    onReplace(match, replacement);
    handleSearch(); // Re-search to update matches
  }, [matches, currentMatchIndex, replacement, onReplace, handleSearch]);

  const handleReplaceAllClick = useCallback(() => {
    if (!query.trim()) return;
    const count = onReplaceAll(query, replacement, caseSensitive, useRegex);
    setMatches([]);
    setCurrentMatchIndex(0);
    // Could show a toast: `Replaced ${count} occurrences`
  }, [query, replacement, caseSensitive, useRegex, onReplaceAll]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key === 'Enter') {
        if (e.shiftKey) {
          handlePrevMatch();
        } else {
          handleNextMatch();
        }
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'h') {
        e.preventDefault();
        setShowReplace(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, handleNextMatch, handlePrevMatch]);

  if (!isOpen) return null;

  return (
    <div className="find-replace">
      <div className="find-replace__row">
        <input
          ref={inputRef}
          type="text"
          className="find-replace__input"
          placeholder="Find..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="find-replace__options">
          <button
            className={`find-replace__option ${caseSensitive ? 'find-replace__option--active' : ''}`}
            onClick={() => setCaseSensitive(!caseSensitive)}
            title="Match Case"
          >
            Aa
          </button>
          <button
            className={`find-replace__option ${useRegex ? 'find-replace__option--active' : ''}`}
            onClick={() => setUseRegex(!useRegex)}
            title="Use Regular Expression"
          >
            .*
          </button>
        </div>
        <span className="find-replace__count">
          {matches.length > 0
            ? `${currentMatchIndex + 1} of ${matches.length}`
            : query.trim()
            ? 'No results'
            : ''}
        </span>
        <button
          className="find-replace__nav"
          onClick={handlePrevMatch}
          disabled={matches.length === 0}
          title="Previous match (Shift+Enter)"
        >
          <ChevronUpIcon />
        </button>
        <button
          className="find-replace__nav"
          onClick={handleNextMatch}
          disabled={matches.length === 0}
          title="Next match (Enter)"
        >
          <ChevronDownIcon />
        </button>
        <button
          className={`find-replace__toggle ${showReplace ? 'find-replace__toggle--active' : ''}`}
          onClick={() => setShowReplace(!showReplace)}
          title="Toggle Replace (⌘H)"
        >
          ⟷
        </button>
        <button className="find-replace__close" onClick={onClose} title="Close (Esc)">
          <CloseIcon />
        </button>
      </div>
      {showReplace && (
        <div className="find-replace__row">
          <input
            type="text"
            className="find-replace__input"
            placeholder="Replace..."
            value={replacement}
            onChange={(e) => setReplacement(e.target.value)}
          />
          <button
            className="find-replace__action"
            onClick={handleReplaceCurrent}
            disabled={matches.length === 0}
          >
            Replace
          </button>
          <button
            className="find-replace__action"
            onClick={handleReplaceAllClick}
            disabled={!query.trim()}
          >
            Replace All
          </button>
        </div>
      )}
    </div>
  );
}
