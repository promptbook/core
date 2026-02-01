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

// Sub-components for Find/Replace rows
interface SearchRowProps {
  inputRef: React.RefObject<HTMLInputElement>;
  query: string;
  setQuery: (query: string) => void;
  caseSensitive: boolean;
  setCaseSensitive: (value: boolean) => void;
  useRegex: boolean;
  setUseRegex: (value: boolean) => void;
  matchCount: number;
  currentMatchIndex: number;
  onPrevMatch: () => void;
  onNextMatch: () => void;
  showReplace: boolean;
  setShowReplace: (value: boolean) => void;
  onClose: () => void;
}

function SearchRow({
  inputRef,
  query,
  setQuery,
  caseSensitive,
  setCaseSensitive,
  useRegex,
  setUseRegex,
  matchCount,
  currentMatchIndex,
  onPrevMatch,
  onNextMatch,
  showReplace,
  setShowReplace,
  onClose,
}: SearchRowProps) {
  const countText =
    matchCount > 0 ? `${currentMatchIndex + 1} of ${matchCount}` : query.trim() ? 'No results' : '';

  return (
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
      <span className="find-replace__count">{countText}</span>
      <button
        className="find-replace__nav"
        onClick={onPrevMatch}
        disabled={matchCount === 0}
        title="Previous match (Shift+Enter)"
      >
        <ChevronUpIcon />
      </button>
      <button
        className="find-replace__nav"
        onClick={onNextMatch}
        disabled={matchCount === 0}
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
  );
}

interface ReplaceRowProps {
  replacement: string;
  setReplacement: (value: string) => void;
  onReplaceCurrent: () => void;
  onReplaceAll: () => void;
  hasMatches: boolean;
  hasQuery: boolean;
}

function ReplaceRow({
  replacement,
  setReplacement,
  onReplaceCurrent,
  onReplaceAll,
  hasMatches,
  hasQuery,
}: ReplaceRowProps) {
  return (
    <div className="find-replace__row">
      <input
        type="text"
        className="find-replace__input"
        placeholder="Replace..."
        value={replacement}
        onChange={(e) => setReplacement(e.target.value)}
      />
      <button className="find-replace__action" onClick={onReplaceCurrent} disabled={!hasMatches}>
        Replace
      </button>
      <button className="find-replace__action" onClick={onReplaceAll} disabled={!hasQuery}>
        Replace All
      </button>
    </div>
  );
}

// Hook for keyboard shortcuts
function useFindReplaceKeyboard(
  isOpen: boolean,
  onClose: () => void,
  onNext: () => void,
  onPrev: () => void,
  setShowReplace: (value: boolean) => void
) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key === 'Enter') {
        if (e.shiftKey) {
          onPrev();
        } else {
          onNext();
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
  }, [isOpen, onClose, onNext, onPrev, setShowReplace]);
}

// Custom hook for find/replace logic
function useFindReplace(
  isOpen: boolean,
  onSearch: FindReplaceProps['onSearch'],
  onReplace: FindReplaceProps['onReplace'],
  onReplaceAll: FindReplaceProps['onReplaceAll'],
  onNavigate: FindReplaceProps['onNavigate'],
  onClose: FindReplaceProps['onClose']
) {
  const [query, setQuery] = useState('');
  const [replacement, setReplacement] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [useRegex, setUseRegex] = useState(false);
  const [showReplace, setShowReplace] = useState(false);
  const [matches, setMatches] = useState<SearchMatch[]>([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isOpen]);

  const handleSearch = useCallback(() => {
    if (!query.trim()) {
      setMatches([]);
      return;
    }
    const results = onSearch(query, caseSensitive, useRegex);
    setMatches(results);
    setCurrentMatchIndex(0);
    if (results.length > 0) onNavigate(results[0].cellId);
  }, [query, caseSensitive, useRegex, onSearch, onNavigate]);

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
    onReplace(matches[currentMatchIndex], replacement);
    handleSearch();
  }, [matches, currentMatchIndex, replacement, onReplace, handleSearch]);

  const handleReplaceAllClick = useCallback(() => {
    if (!query.trim()) return;
    onReplaceAll(query, replacement, caseSensitive, useRegex);
    setMatches([]);
    setCurrentMatchIndex(0);
  }, [query, replacement, caseSensitive, useRegex, onReplaceAll]);

  useFindReplaceKeyboard(isOpen, onClose, handleNextMatch, handlePrevMatch, setShowReplace);

  return {
    query,
    setQuery,
    replacement,
    setReplacement,
    caseSensitive,
    setCaseSensitive,
    useRegex,
    setUseRegex,
    showReplace,
    setShowReplace,
    matches,
    currentMatchIndex,
    inputRef,
    handleNextMatch,
    handlePrevMatch,
    handleReplaceCurrent,
    handleReplaceAllClick,
  };
}

export function FindReplace({
  isOpen,
  onClose,
  onSearch,
  onReplace,
  onReplaceAll,
  onNavigate,
}: FindReplaceProps) {
  const state = useFindReplace(isOpen, onSearch, onReplace, onReplaceAll, onNavigate, onClose);

  if (!isOpen) return null;

  return (
    <div className="find-replace">
      <SearchRow
        inputRef={state.inputRef}
        query={state.query}
        setQuery={state.setQuery}
        caseSensitive={state.caseSensitive}
        setCaseSensitive={state.setCaseSensitive}
        useRegex={state.useRegex}
        setUseRegex={state.setUseRegex}
        matchCount={state.matches.length}
        currentMatchIndex={state.currentMatchIndex}
        onPrevMatch={state.handlePrevMatch}
        onNextMatch={state.handleNextMatch}
        showReplace={state.showReplace}
        setShowReplace={state.setShowReplace}
        onClose={onClose}
      />
      {state.showReplace && (
        <ReplaceRow
          replacement={state.replacement}
          setReplacement={state.setReplacement}
          onReplaceCurrent={state.handleReplaceCurrent}
          onReplaceAll={state.handleReplaceAllClick}
          hasMatches={state.matches.length > 0}
          hasQuery={!!state.query.trim()}
        />
      )}
    </div>
  );
}
