import React, { useState } from 'react';
import { StructuredInstructions } from '../../types';
import { ParameterControls } from './ParameterControls';

interface InstructionsEditorProps {
  instructions: StructuredInstructions | null;
  onChange: (instructions: StructuredInstructions) => void;
  onRawInput: (text: string) => void;
  isRawMode: boolean;
  rawText?: string;
}

export function InstructionsEditor({
  instructions,
  onChange,
  onRawInput,
  isRawMode,
  rawText = '',
}: InstructionsEditorProps) {
  const [activeParamId, setActiveParamId] = useState<string | null>(null);

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

  const handleParameterChange = (paramId: string, newValue: string) => {
    const updatedParams = instructions.parameters.map((p) =>
      p.id === paramId ? { ...p, value: newValue } : p
    );
    onChange({ ...instructions, parameters: updatedParams });
  };

  const renderTextWithParameters = () => {
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    const regex = /\{\{(\d+)\}\}/g;
    let match;

    while ((match = regex.exec(instructions.text)) !== null) {
      // Add text before the match
      if (match.index > lastIndex) {
        parts.push(
          <span key={`text-${lastIndex}`}>
            {instructions.text.slice(lastIndex, match.index)}
          </span>
        );
      }

      // Add the parameter
      const paramId = match[1];
      const param = instructions.parameters.find((p) => p.id === paramId);
      if (param) {
        parts.push(
          <span
            key={`param-${paramId}`}
            className="parameter-highlight"
            onClick={() => setActiveParamId(paramId)}
          >
            {param.value}
          </span>
        );
      }

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < instructions.text.length) {
      parts.push(
        <span key={`text-${lastIndex}`}>
          {instructions.text.slice(lastIndex)}
        </span>
      );
    }

    return parts;
  };

  const activeParam = activeParamId
    ? instructions.parameters.find((p) => p.id === activeParamId)
    : null;

  return (
    <div className="instructions-editor">
      <div className="instructions-text">{renderTextWithParameters()}</div>
      {activeParam && (
        <div className="parameter-popup">
          <ParameterControls
            parameter={activeParam}
            onChange={(value) => handleParameterChange(activeParam.id, value)}
          />
          <button onClick={() => setActiveParamId(null)}>Done</button>
        </div>
      )}
    </div>
  );
}
