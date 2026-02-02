import React, { useState, useMemo, useRef, useEffect } from 'react';
import { StructuredInstructions, Parameter } from '../../types';
import { FileAutocomplete, FileEntry } from './FileAutocomplete';

interface InstructionsEditorProps {
  instructions: StructuredInstructions | null;
  onChange: (instructions: StructuredInstructions) => void;
  onParameterUpdate?: (instructions: StructuredInstructions) => void;
  onRawInput: (text: string) => void;
  onExpand?: () => void;
  onShorten?: () => void;
  onParameterChange?: (paramName: string, oldValue: string, newValue: string) => void;
  isRawMode: boolean;
  rawText?: string;
  isSyncing?: boolean;
  isEditable?: boolean;
  /** Function to list files for @ autocomplete */
  listFiles?: (dirPath?: string) => Promise<{ files: FileEntry[]; cwd: string }>;
}

interface ParsedInstruction {
  displayText: string;
  originalText: string;
  params: Parameter[];
}

function parseInstructionParameters(text: string): ParsedInstruction {
  const parameters: Parameter[] = [];
  const regex = /\{\{([^:}]+):([^}]+)\}\}/g;
  let match, paramIndex = 0, displayText = text;

  while ((match = regex.exec(text)) !== null) {
    const [, name, value] = match;
    parameters.push({ id: String(paramIndex), name: name.trim(), value: value.trim(), type: isNaN(Number(value.trim())) ? 'string' : 'number' });
    paramIndex++;
  }

  let idx = 0;
  displayText = text.replace(regex, () => `{{${idx++}}}`);
  return { displayText, originalText: text, params: parameters };
}

function updateParameterInText(originalText: string, paramName: string, oldValue: string, newValue: string): string {
  const escapedName = paramName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const escapedOldValue = oldValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return originalText.replace(new RegExp(`\\{\\{${escapedName}:${escapedOldValue}\\}\\}`, 'g'), `{{${paramName}:${newValue}}}`);
}

export function InstructionsEditor({ instructions, onChange, onParameterUpdate, onRawInput, onExpand, onShorten, onParameterChange, isRawMode, rawText = '', isSyncing = false, isEditable = true, listFiles }: InstructionsEditorProps) {
  const [editingParamId, setEditingParamId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [isEditingText, setIsEditingText] = useState(false);
  const [editingTextValue, setEditingTextValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { if (isEditingText && textareaRef.current) { textareaRef.current.focus(); textareaRef.current.select(); } }, [isEditingText]);

  const handleTextClick = () => { if (isEditable && !editingParamId && instructions?.text) { setEditingTextValue(instructions.text); setIsEditingText(true); } };
  const handleTextSubmit = () => { if (editingTextValue.trim() !== instructions?.text?.trim()) onChange({ text: editingTextValue, parameters: instructions?.parameters || [] }); setIsEditingText(false); };
  const handleTextKeyDown = (e: React.KeyboardEvent) => { if (e.key === 'Escape') setIsEditingText(false); else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); handleTextSubmit(); } };

  const parsed = useMemo((): ParsedInstruction => {
    if (!instructions?.text) return { displayText: '', originalText: '', params: [] };
    if (/\{\{[^:}]+:[^}]+\}\}/.test(instructions.text)) return parseInstructionParameters(instructions.text);
    return { displayText: instructions.text, originalText: instructions.text, params: instructions.parameters || [] };
  }, [instructions?.text, instructions?.parameters]);

  if (isRawMode || !instructions) {
    return (
      <div className="instructions-editor instructions-editor--raw">
        {listFiles ? (
          <FileAutocomplete
            value={rawText}
            onChange={onRawInput}
            listFiles={listFiles}
            placeholder="Describe what you want to do... (type @ for file autocomplete)"
            rows={4}
          />
        ) : (
          <textarea value={rawText} onChange={(e) => onRawInput(e.target.value)} placeholder="Describe what you want to do..." rows={4} />
        )}
      </div>
    );
  }

  const handleParameterClick = (e: React.MouseEvent, paramId: string, val: string) => { e.stopPropagation(); setEditingParamId(paramId); setEditValue(val); };

  const handleParameterSubmit = (paramId: string) => {
    const param = parsed.params.find((p) => p.id === paramId);
    if (param && editValue !== param.value) {
      if (onParameterChange) {
        // Parameter change is handled by parent (updates all tabs without triggering LLM)
        onParameterChange(param.name, param.value, editValue);
      } else {
        // Fallback: update locally if no parameter handler
        const newText = updateParameterInText(parsed.originalText, param.name, param.value, editValue);
        const updatedParams = parsed.params.map((p) => p.id === paramId ? { ...p, value: editValue } : p);
        (onParameterUpdate || onChange)({ text: newText, parameters: updatedParams });
      }
    }
    setEditingParamId(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent, paramId: string) => {
    if (e.key === 'Enter') { e.preventDefault(); handleParameterSubmit(paramId); }
    else if (e.key === 'Escape') setEditingParamId(null);
  };

  return (
    <div className="instructions-editor">
      <div className="instructions-content">
        {isEditingText ? (
          <TextEditView textareaRef={textareaRef} value={editingTextValue} onChange={setEditingTextValue} onBlur={handleTextSubmit} onKeyDown={handleTextKeyDown} />
        ) : (
          <div className={`instructions-text ${isEditable ? 'instructions-text--editable' : ''}`} onClick={handleTextClick} title={isEditable ? 'Click to edit instructions' : undefined}>
            <TextWithParams parsed={parsed} editingParamId={editingParamId} editValue={editValue} setEditValue={setEditValue} onParameterClick={handleParameterClick} onParameterSubmit={handleParameterSubmit} onKeyDown={handleKeyDown} fallbackText={instructions.text} />
          </div>
        )}
        {!isEditingText && (onExpand || onShorten) && <ActionButtons onShorten={onShorten} onExpand={onExpand} isSyncing={isSyncing} />}
      </div>
    </div>
  );
}

// Sub-components
function TextEditView({ textareaRef, value, onChange, onBlur, onKeyDown }: { textareaRef: React.RefObject<HTMLTextAreaElement>; value: string; onChange: (v: string) => void; onBlur: () => void; onKeyDown: (e: React.KeyboardEvent) => void }) {
  return (
    <div className="instructions-text-edit">
      <textarea ref={textareaRef} value={value} onChange={(e) => onChange(e.target.value)} onBlur={onBlur} onKeyDown={onKeyDown} className="instructions-textarea" placeholder="Enter your instructions..." />
      <div className="instructions-edit-hint">Press <kbd>⌘</kbd>+<kbd>Enter</kbd> to save, <kbd>Esc</kbd> to cancel</div>
    </div>
  );
}

interface TextWithParamsProps {
  parsed: ParsedInstruction; editingParamId: string | null; editValue: string; setEditValue: (v: string) => void;
  onParameterClick: (e: React.MouseEvent, id: string, val: string) => void; onParameterSubmit: (id: string) => void; onKeyDown: (e: React.KeyboardEvent, id: string) => void;
  fallbackText: string;
}

function TextWithParams({ parsed, editingParamId, editValue, setEditValue, onParameterClick, onParameterSubmit, onKeyDown, fallbackText }: TextWithParamsProps) {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  const regex = /\{\{(\d+)\}\}/g;
  let match;

  while ((match = regex.exec(parsed.displayText)) !== null) {
    if (match.index > lastIndex) parts.push(<span key={`text-${lastIndex}`}>{parsed.displayText.slice(lastIndex, match.index)}</span>);
    const paramId = match[1];
    const param = parsed.params.find((p) => p.id === paramId);
    if (param) {
      const isEditing = editingParamId === paramId;
      parts.push(
        <span key={`param-${paramId}`} className={`parameter-inline ${isEditing ? 'parameter-inline--editing' : ''}`}>
          {isEditing ? (
            <input type={param.type === 'number' ? 'number' : 'text'} value={editValue} onChange={(e) => setEditValue(e.target.value)} onBlur={() => onParameterSubmit(paramId)} onKeyDown={(e) => onKeyDown(e, paramId)} autoFocus className="parameter-input" />
          ) : (
            <span className="parameter-value" onClick={(e) => onParameterClick(e, paramId, param.value)} title={`Click to edit ${param.name}`}>{param.value}</span>
          )}
        </span>
      );
    }
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < parsed.displayText.length) parts.push(<span key={`text-${lastIndex}`}>{parsed.displayText.slice(lastIndex)}</span>);
  return <>{parts.length > 0 ? parts : fallbackText}</>;
}

function ActionButtons({ onShorten, onExpand, isSyncing }: { onShorten?: () => void; onExpand?: () => void; isSyncing: boolean }) {
  return (
    <div className="instructions-actions">
      {onShorten && (
        <button className="instructions-action-btn" onClick={onShorten} disabled={isSyncing} title="Make instructions more concise">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 7h8" /></svg>Shorten
        </button>
      )}
      {onExpand && (
        <button className="instructions-action-btn" onClick={onExpand} disabled={isSyncing} title="Add more detail to instructions">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M7 3v8M3 7h8" /></svg>Expand
        </button>
      )}
    </div>
  );
}

