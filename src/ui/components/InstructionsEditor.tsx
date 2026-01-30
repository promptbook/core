import React, { useState, useMemo, useRef, useEffect } from 'react';
import { StructuredInstructions, Parameter } from '../../types';

interface InstructionsEditorProps {
  instructions: StructuredInstructions | null;
  onChange: (instructions: StructuredInstructions) => void;
  onParameterUpdate?: (instructions: StructuredInstructions) => void; // For parameter changes only (no dirty flag)
  onRawInput: (text: string) => void;
  onExpand?: () => void;
  onShorten?: () => void;
  onParameterChange?: (paramName: string, oldValue: string, newValue: string) => void;
  isRawMode: boolean;
  rawText?: string;
  isSyncing?: boolean;
  isEditable?: boolean; // Allow editing the text itself
}

interface ParsedInstruction {
  displayText: string;  // Text with {{0}}, {{1}} placeholders
  originalText: string; // Original text with {{name:value}} format
  params: Parameter[];
}

// Parse {{param_name:value}} format into parameters
function parseInstructionParameters(text: string): ParsedInstruction {
  const parameters: Parameter[] = [];
  const regex = /\{\{([^:}]+):([^}]+)\}\}/g;
  let match;
  let paramIndex = 0;
  let displayText = text;

  // First pass: extract all parameters
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

  // Second pass: replace {{name:value}} with {{index}} in order
  let idx = 0;
  displayText = text.replace(regex, () => `{{${idx++}}}`);

  return { displayText, originalText: text, params: parameters };
}

// Update a parameter value in the original text format
function updateParameterInText(originalText: string, paramName: string, oldValue: string, newValue: string): string {
  // Replace {{paramName:oldValue}} with {{paramName:newValue}}
  const escapedName = paramName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const escapedOldValue = oldValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`\\{\\{${escapedName}:${escapedOldValue}\\}\\}`, 'g');
  return originalText.replace(regex, `{{${paramName}:${newValue}}}`);
}

export function InstructionsEditor({
  instructions,
  onChange,
  onParameterUpdate,
  onRawInput,
  onExpand,
  onShorten,
  onParameterChange,
  isRawMode,
  rawText = '',
  isSyncing = false,
  isEditable = true,
}: InstructionsEditorProps) {
  const [editingParamId, setEditingParamId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [isEditingText, setIsEditingText] = useState(false);
  const [editingTextValue, setEditingTextValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Focus and select textarea when entering edit mode
  useEffect(() => {
    if (isEditingText && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [isEditingText]);

  // Enter text edit mode
  const handleTextClick = () => {
    if (isEditable && !editingParamId && instructions?.text) {
      setEditingTextValue(instructions.text);
      setIsEditingText(true);
    }
  };

  // Submit text edit
  const handleTextSubmit = () => {
    if (editingTextValue.trim() !== instructions?.text?.trim()) {
      // Text changed - use onChange which marks dirty
      onChange({ text: editingTextValue, parameters: instructions?.parameters || [] });
    }
    setIsEditingText(false);
  };

  // Handle text edit keyboard shortcuts
  const handleTextKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsEditingText(false);
    } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleTextSubmit();
    }
  };

  // Parse parameters from text when instructions change
  const parsed = useMemo((): ParsedInstruction => {
    if (!instructions?.text) {
      return { displayText: '', originalText: '', params: [] };
    }

    // Check if text contains {{name:value}} format
    if (/\{\{[^:}]+:[^}]+\}\}/.test(instructions.text)) {
      return parseInstructionParameters(instructions.text);
    }

    // Plain text without parameters
    return {
      displayText: instructions.text,
      originalText: instructions.text,
      params: instructions.parameters || []
    };
  }, [instructions?.text, instructions?.parameters]);

  if (isRawMode || !instructions) {
    return (
      <div className="instructions-editor instructions-editor--raw">
        <textarea
          value={rawText}
          onChange={(e) => onRawInput(e.target.value)}
          placeholder="Describe what you want to do..."
          rows={4}
        />
      </div>
    );
  }

  const handleParameterClick = (paramId: string, currentValue: string) => {
    setEditingParamId(paramId);
    setEditValue(currentValue);
  };

  const handleParameterSubmit = (paramId: string) => {
    const param = parsed.params.find((p) => p.id === paramId);
    if (param && editValue !== param.value) {
      // Update the instruction text with new parameter value
      const newText = updateParameterInText(parsed.originalText, param.name, param.value, editValue);

      // Update the parameters array
      const updatedParams = parsed.params.map((p) =>
        p.id === paramId ? { ...p, value: editValue } : p
      );

      // Notify parent about parameter change for direct code update (no LLM)
      if (onParameterChange) {
        onParameterChange(param.name, param.value, editValue);
      }

      // Update instructions using parameter-specific handler (no dirty flag)
      // Fall back to onChange if onParameterUpdate is not provided
      const updateHandler = onParameterUpdate || onChange;
      updateHandler({ text: newText, parameters: updatedParams });
    }
    setEditingParamId(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent, paramId: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleParameterSubmit(paramId);
    } else if (e.key === 'Escape') {
      setEditingParamId(null);
    }
  };

  const renderTextWithParameters = () => {
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    const regex = /\{\{(\d+)\}\}/g;
    let match;

    while ((match = regex.exec(parsed.displayText)) !== null) {
      // Add text before the match
      if (match.index > lastIndex) {
        parts.push(
          <span key={`text-${lastIndex}`}>
            {parsed.displayText.slice(lastIndex, match.index)}
          </span>
        );
      }

      // Add the parameter
      const paramId = match[1];
      const param = parsed.params.find((p) => p.id === paramId);
      if (param) {
        const isEditing = editingParamId === paramId;
        parts.push(
          <span
            key={`param-${paramId}`}
            className={`parameter-inline ${isEditing ? 'parameter-inline--editing' : ''}`}
          >
            {isEditing ? (
              <input
                type={param.type === 'number' ? 'number' : 'text'}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={() => handleParameterSubmit(paramId)}
                onKeyDown={(e) => handleKeyDown(e, paramId)}
                autoFocus
                className="parameter-input"
              />
            ) : (
              <span
                className="parameter-value"
                onClick={() => handleParameterClick(paramId, param.value)}
                title={`Click to edit ${param.name}`}
              >
                {param.value}
              </span>
            )}
          </span>
        );
      }

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < parsed.displayText.length) {
      parts.push(
        <span key={`text-${lastIndex}`}>
          {parsed.displayText.slice(lastIndex)}
        </span>
      );
    }

    return parts.length > 0 ? parts : instructions.text;
  };

  return (
    <div className="instructions-editor">
      <div className="instructions-content">
        {isEditingText ? (
          <div className="instructions-text-edit">
            <textarea
              ref={textareaRef}
              value={editingTextValue}
              onChange={(e) => setEditingTextValue(e.target.value)}
              onBlur={handleTextSubmit}
              onKeyDown={handleTextKeyDown}
              className="instructions-textarea"
              placeholder="Enter your instructions..."
            />
            <div className="instructions-edit-hint">
              Press <kbd>⌘</kbd>+<kbd>Enter</kbd> to save, <kbd>Esc</kbd> to cancel
            </div>
          </div>
        ) : (
          <div
            className={`instructions-text ${isEditable ? 'instructions-text--editable' : ''}`}
            onClick={handleTextClick}
            title={isEditable ? 'Click to edit instructions' : undefined}
          >
            {renderTextWithParameters()}
          </div>
        )}
        {!isEditingText && (onExpand || onShorten) && (
          <div className="instructions-actions">
            {onShorten && (
              <button
                className="instructions-action-btn"
                onClick={onShorten}
                disabled={isSyncing}
                title="Make instructions more concise"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M3 7h8" />
                </svg>
                Shorten
              </button>
            )}
            {onExpand && (
              <button
                className="instructions-action-btn"
                onClick={onExpand}
                disabled={isSyncing}
                title="Add more detail to instructions"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M7 3v8M3 7h8" />
                </svg>
                Expand
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
