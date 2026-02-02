// packages/core/src/ui/components/GenerateCellsModal.tsx
// Modal for generating multiple cells from a description

import React, { useState, useRef, useEffect } from 'react';
import { CombinedAutocomplete } from './CombinedAutocomplete';
import type { FileEntry } from './FileAutocomplete';

export interface GenerateCellsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (description: string, fileRefs: string[]) => void;
  isGenerating: boolean;
  streamingContent: string;
  progress?: { current: number; total: number };
  error?: string | null;
  /** Function to list files for @ autocomplete */
  listFiles?: (dirPath?: string) => Promise<{ files: FileEntry[]; cwd: string }>;
}

// Extract @file references from text
function extractFileReferences(text: string): string[] {
  const regex = /@([^\s@]+)/g;
  const matches: string[] = [];
  let match;
  while ((match = regex.exec(text)) !== null) {
    matches.push(match[1]);
  }
  return matches;
}

export function GenerateCellsModal({
  isOpen,
  onClose,
  onGenerate,
  isGenerating,
  streamingContent,
  progress,
  error,
  listFiles,
}: GenerateCellsModalProps) {
  const [description, setDescription] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Focus textarea when modal opens
  useEffect(() => {
    if (isOpen && textareaRef.current) {
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setDescription('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (!description.trim() || isGenerating) return;
    const fileRefs = extractFileReferences(description);
    onGenerate(description, fileRefs);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Submit on Cmd/Ctrl + Enter
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="generate-cells-overlay" onClick={onClose}>
      <div className="generate-cells-modal" onClick={e => e.stopPropagation()}>
        <header className="generate-cells-header">
          <h2>Generate Cells</h2>
          <button
            className="generate-cells-close"
            onClick={onClose}
            disabled={isGenerating}
            title="Close"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 4l8 8M12 4l-8 8" />
            </svg>
          </button>
        </header>

        <div className="generate-cells-content">
          {isGenerating ? (
            <GeneratingState
              streamingContent={streamingContent}
              progress={progress}
            />
          ) : (
            <>
              <p className="generate-cells-description">
                Describe what you want to do. Use <code>@filename</code> to reference files.
              </p>
              <CombinedAutocomplete
                value={description}
                onChange={setDescription}
                listFiles={listFiles}
                placeholder="e.g., Load @data.csv, show basic statistics, and create a visualization"
                className="generate-cells-textarea"
                rows={4}
                onKeyDown={handleKeyDown}
                textareaRef={textareaRef}
              />
              <p className="generate-cells-hint">
                Press <kbd>Cmd</kbd>+<kbd>Enter</kbd> to generate
              </p>
              {error && (
                <div className="generate-cells-error">{error}</div>
              )}
            </>
          )}
        </div>

        {!isGenerating && (
          <footer className="generate-cells-footer">
            <button
              onClick={onClose}
              className="generate-cells-btn generate-cells-btn--secondary"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              className="generate-cells-btn generate-cells-btn--primary"
              disabled={!description.trim()}
            >
              Generate
            </button>
          </footer>
        )}
      </div>
    </div>
  );
}

// Sub-component for generating state
function GeneratingState({
  streamingContent,
  progress,
}: {
  streamingContent: string;
  progress?: { current: number; total: number };
}) {
  return (
    <div className="generate-cells-generating">
      <div className="generate-cells-spinner" />
      <span className="generate-cells-status">
        {progress
          ? `Generating cell ${progress.current} of ${progress.total}...`
          : 'Generating cells...'}
      </span>
      {streamingContent && (
        <div className="generate-cells-preview">
          <pre>{streamingContent.slice(-500)}</pre>
        </div>
      )}
    </div>
  );
}
