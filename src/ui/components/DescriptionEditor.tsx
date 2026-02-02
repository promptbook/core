import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Parameter } from '../../types';
import { FileEntry } from './FileAutocomplete';
import { CombinedAutocomplete } from './CombinedAutocomplete';
import type { KernelSymbol } from './SymbolAutocomplete';
import { GeneratingOverlay } from './GeneratingOverlay';

interface DescriptionEditorProps {
  content: string;
  onChange: (content: string) => void;
  onParameterChange?: (paramName: string, oldValue: string, newValue: string) => void;
  placeholder?: string;
  isSyncing?: boolean;
  /** Timestamp when sync started (for elapsed time display) */
  syncStartTime?: number;
  minHeight?: number;
  /** Function to list files for @ autocomplete */
  listFiles?: (dirPath?: string) => Promise<{ files: FileEntry[]; cwd: string }>;
  /** Function to get kernel symbols for # autocomplete (fallback if no preloaded symbols) */
  getSymbols?: () => Promise<KernelSymbol[]>;
  /** Pre-loaded symbols from LLM code generation - preferred over kernel symbols */
  preloadedSymbols?: KernelSymbol[];
}

interface ParsedDescription {
  displayText: string;
  originalText: string;
  params: Parameter[];
}

// Parse {{param_name:value}} format into parameters
function parseParameters(text: string): ParsedDescription {
  const parameters: Parameter[] = [];
  const regex = /\{\{([^:}]+):([^}]+)\}\}/g;
  let match;
  let paramIndex = 0;
  let displayText = text;

  while ((match = regex.exec(text)) !== null) {
    const [, name, value] = match;
    parameters.push({
      id: String(paramIndex),
      name: name.trim(),
      value: value.trim(),
      type: isNaN(Number(value.trim())) ? 'string' : 'number',
    });
    paramIndex++;
  }

  let idx = 0;
  displayText = text.replace(regex, () => `{{${idx++}}}`);

  return { displayText, originalText: text, params: parameters };
}

function updateParameterInText(originalText: string, paramName: string, oldValue: string, newValue: string): string {
  const escapedName = paramName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const escapedOldValue = oldValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`\\{\\{${escapedName}:${escapedOldValue}\\}\\}`, 'g');
  return originalText.replace(regex, `{{${paramName}:${newValue}}}`);
}

export function DescriptionEditor({ content, onChange, onParameterChange, placeholder = 'Enter description...', isSyncing = false, syncStartTime, minHeight, listFiles, getSymbols, preloadedSymbols }: DescriptionEditorProps) {
  const [editingParamId, setEditingParamId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [isEditingText, setIsEditingText] = useState(false);
  const [editingTextValue, setEditingTextValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditingText && textareaRef.current) { textareaRef.current.focus(); textareaRef.current.select(); }
  }, [isEditingText]);

  const parsed = useMemo((): ParsedDescription => {
    if (!content) return { displayText: '', originalText: '', params: [] };
    return /\{\{[^:}]+:[^}]+\}\}/.test(content) ? parseParameters(content) : { displayText: content, originalText: content, params: [] };
  }, [content]);

  const handleTextClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.parameter-value') || editingParamId) return;
    setEditingTextValue(content); setIsEditingText(true);
  };

  const handleTextSubmit = () => { if (editingTextValue.trim() !== content?.trim()) onChange(editingTextValue); setIsEditingText(false); };

  const handleTextKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') setIsEditingText(false);
    else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); handleTextSubmit(); }
  };

  const handleParameterClick = (e: React.MouseEvent, paramId: string, val: string) => { e.stopPropagation(); setEditingParamId(paramId); setEditValue(val); };

  const handleParameterSubmit = (paramId: string) => {
    const param = parsed.params.find((p) => p.id === paramId);
    if (param && editValue !== param.value) {
      if (onParameterChange) {
        // Parameter change is handled by parent (updates all tabs without triggering LLM)
        onParameterChange(param.name, param.value, editValue);
      } else {
        // Fallback: update text directly if no parameter handler
        const newText = updateParameterInText(parsed.originalText, param.name, param.value, editValue);
        onChange(newText);
      }
    }
    setEditingParamId(null);
  };

  const handleParamKeyDown = (e: React.KeyboardEvent, paramId: string) => {
    if (e.key === 'Enter') { e.preventDefault(); handleParameterSubmit(paramId); }
    else if (e.key === 'Escape') setEditingParamId(null);
  };

  const heightStyle = minHeight ? { minHeight: `${minHeight}px` } : undefined;

  if (!content && !isEditingText) {
    return (
      <div className="description-editor description-editor--empty">
        <div className="description-text description-text--editable" onClick={() => setIsEditingText(true)} style={heightStyle}>
          <span className="description-placeholder">{placeholder}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`description-editor ${isSyncing ? 'description-editor--locked' : ''}`}>
      {isEditingText ? (
        <TextEditMode textareaRef={textareaRef} value={editingTextValue} onChange={setEditingTextValue} onBlur={handleTextSubmit} onKeyDown={handleTextKeyDown} placeholder={placeholder} minHeight={minHeight} listFiles={listFiles} getSymbols={getSymbols} preloadedSymbols={preloadedSymbols} />
      ) : (
        <div className="description-text description-text--editable" onClick={handleTextClick} title="Click to edit" style={heightStyle} dir="auto">
          <TextWithParameters parsed={parsed} editingParamId={editingParamId} editValue={editValue} onEditValueChange={setEditValue} onParameterClick={handleParameterClick} onParameterSubmit={handleParameterSubmit} onParamKeyDown={handleParamKeyDown} placeholder={placeholder} />
        </div>
      )}
      <GeneratingOverlay isVisible={isSyncing} startTime={syncStartTime} message="Generating..." />
    </div>
  );
}

// Sub-components
interface TextEditModeProps {
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  placeholder: string;
  minHeight?: number;
  listFiles?: (dirPath?: string) => Promise<{ files: FileEntry[]; cwd: string }>;
  getSymbols?: () => Promise<KernelSymbol[]>;
  preloadedSymbols?: KernelSymbol[];
}

function TextEditMode({ textareaRef, value, onChange, onBlur, onKeyDown, placeholder, minHeight, listFiles, getSymbols, preloadedSymbols }: TextEditModeProps) {
  const hasAutocomplete = listFiles || getSymbols || (preloadedSymbols && preloadedSymbols.length > 0);

  return (
    <div className="description-text-edit">
      {hasAutocomplete ? (
        <CombinedAutocomplete
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          onKeyDown={onKeyDown}
          listFiles={listFiles}
          getSymbols={getSymbols}
          preloadedSymbols={preloadedSymbols}
          placeholder={placeholder}
          className="description-textarea"
          textareaRef={textareaRef}
        />
      ) : (
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          onKeyDown={onKeyDown}
          className="description-textarea"
          placeholder={placeholder}
          style={{ minHeight: minHeight ? `${minHeight}px` : undefined }}
          dir="auto"
        />
      )}
      <div className="description-edit-hint">
        Press <kbd>⌘</kbd>+<kbd>Enter</kbd> to save, <kbd>Esc</kbd> to cancel{listFiles ? ' (@ for files' : ''}{getSymbols ? (listFiles ? ', # for variables)' : ' (# for variables)') : (listFiles ? ')' : '')}
      </div>
    </div>
  );
}

interface TextWithParametersProps {
  parsed: ParsedDescription;
  editingParamId: string | null;
  editValue: string;
  onEditValueChange: (value: string) => void;
  onParameterClick: (e: React.MouseEvent, paramId: string, value: string) => void;
  onParameterSubmit: (paramId: string) => void;
  onParamKeyDown: (e: React.KeyboardEvent, paramId: string) => void;
  placeholder: string;
}

// Render a text segment, highlighting #mentions within it
function renderTextWithMentions(text: string, keyPrefix: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const mentionRegex = /#([a-zA-Z_][a-zA-Z0-9_]*)/g;
  let lastIndex = 0;
  let match;

  while ((match = mentionRegex.exec(text)) !== null) {
    // Add text before the mention
    if (match.index > lastIndex) {
      parts.push(<span key={`${keyPrefix}-text-${lastIndex}`}>{text.slice(lastIndex, match.index)}</span>);
    }

    // Add the mention with styling
    const mentionName = match[1];
    parts.push(
      <span key={`${keyPrefix}-mention-${match.index}`} className="symbol-mention" title={`Symbol: ${mentionName}`}>
        #{mentionName}
      </span>
    );

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(<span key={`${keyPrefix}-text-${lastIndex}`}>{text.slice(lastIndex)}</span>);
  }

  return parts.length > 0 ? parts : [<span key={`${keyPrefix}-full`}>{text}</span>];
}

function TextWithParameters({ parsed, editingParamId, editValue, onEditValueChange, onParameterClick, onParameterSubmit, onParamKeyDown, placeholder }: TextWithParametersProps) {
  if (!parsed.displayText) {
    return <span className="description-placeholder">{placeholder}</span>;
  }

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  const regex = /\{\{(\d+)\}\}/g;
  let match;

  while ((match = regex.exec(parsed.displayText)) !== null) {
    if (match.index > lastIndex) {
      // Render text segment with #mentions highlighted
      const textSegment = parsed.displayText.slice(lastIndex, match.index);
      parts.push(...renderTextWithMentions(textSegment, `seg-${lastIndex}`));
    }

    const paramId = match[1];
    const param = parsed.params.find((p) => p.id === paramId);
    if (param) {
      const isEditing = editingParamId === paramId;
      parts.push(
        <span key={`param-${paramId}`} className={`parameter-inline ${isEditing ? 'parameter-inline--editing' : ''}`}>
          {isEditing ? (
            <input
              type={param.type === 'number' ? 'number' : 'text'}
              value={editValue}
              onChange={(e) => onEditValueChange(e.target.value)}
              onBlur={() => onParameterSubmit(paramId)}
              onKeyDown={(e) => onParamKeyDown(e, paramId)}
              onClick={(e) => e.stopPropagation()}
              autoFocus
              className="parameter-input"
            />
          ) : (
            <span className="parameter-value" onClick={(e) => onParameterClick(e, paramId, param.value)} title={`Click to edit ${param.name}`}>
              {param.value}
            </span>
          )}
        </span>
      );
    }
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < parsed.displayText.length) {
    // Render remaining text with #mentions highlighted
    const textSegment = parsed.displayText.slice(lastIndex);
    parts.push(...renderTextWithMentions(textSegment, `seg-${lastIndex}`));
  }

  return <>{parts.length > 0 ? parts : renderTextWithMentions(parsed.originalText, 'orig')}</>;
}

