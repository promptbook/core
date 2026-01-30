import React, { useState, useRef, useEffect } from 'react';
import { CellState } from '../../types/cell';

interface TextCellProps {
  cell: CellState;
  onUpdate: (cellId: string, updates: Partial<CellState>) => void;
  isActive?: boolean;
  onFocus?: (cellId: string) => void;
}

// Simple markdown to HTML converter (basic support)
function renderMarkdown(text: string): string {
  return text
    // Headers
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    // Bold
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    // Code blocks
    .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
    // Inline code
    .replace(/`(.*?)`/g, '<code>$1</code>')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    // Line breaks
    .replace(/\n/g, '<br/>');
}

export function TextCell({ cell, onUpdate, isActive, onFocus }: TextCellProps) {
  const [isEditing, setIsEditing] = useState(!cell.textContent);
  const [editValue, setEditValue] = useState(cell.textContent || '');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isEditing]);

  const handleDoubleClick = () => {
    setEditValue(cell.textContent || '');
    setIsEditing(true);
  };

  const handleBlur = () => {
    if (editValue !== cell.textContent) {
      onUpdate(cell.id, { textContent: editValue });
    }
    if (editValue.trim()) {
      setIsEditing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setEditValue(cell.textContent || '');
      if (cell.textContent?.trim()) {
        setIsEditing(false);
      }
    } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleBlur();
    }
  };

  const renderedContent = cell.textFormat === 'markdown'
    ? renderMarkdown(cell.textContent || '')
    : cell.textContent || '';

  return (
    <div
      className={`text-cell ${isActive ? 'text-cell--active' : ''}`}
      onClick={() => onFocus?.(cell.id)}
      tabIndex={0}
      onFocus={() => onFocus?.(cell.id)}
    >
      <div className="text-cell-badge">
        {cell.textFormat === 'markdown' ? 'Markdown' : 'HTML'}
      </div>
      {isEditing ? (
        <div className="text-cell-edit">
          <textarea
            ref={textareaRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className="text-cell-textarea"
            placeholder={cell.textFormat === 'markdown' ? 'Enter markdown...' : 'Enter HTML...'}
            style={{ height: cell.height ? `${cell.height}px` : undefined }}
          />
          <div className="text-cell-hint">
            Press <kbd>⌘</kbd>+<kbd>Enter</kbd> to save, <kbd>Esc</kbd> to cancel
          </div>
        </div>
      ) : (
        <div
          className="text-cell-content"
          onDoubleClick={handleDoubleClick}
          style={{ minHeight: cell.height ? `${cell.height}px` : undefined }}
          dangerouslySetInnerHTML={{ __html: renderedContent }}
        />
      )}
    </div>
  );
}
