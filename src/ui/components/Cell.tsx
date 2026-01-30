import React, { useState, useEffect } from 'react';
import { CellState, StructuredInstructions } from '../../types';
import { InstructionsEditor } from './InstructionsEditor';
import { CodeEditor } from './CodeEditor';
import { OutputArea } from './OutputArea';

interface CellProps {
  cell: CellState;
  onUpdate: (cellId: string, updates: Partial<CellState>) => void;
  onRun: (cellId: string) => void;
  onSync: (cellId: string) => void;
  onExpandInstructions?: (cellId: string) => void;
  onShortenInstructions?: (cellId: string) => void;
  isActive?: boolean;
  onFocus?: (cellId: string) => void;
}

type TabType = 'instructions' | 'code';

export function Cell({ cell, onUpdate, onRun, onSync, onExpandInstructions, onShortenInstructions, isActive, onFocus }: CellProps) {
  const [activeTab, setActiveTab] = useState<TabType>('instructions');
  const [rawText, setRawText] = useState(cell.instructions?.text || '');
  const [isRawMode, setIsRawMode] = useState(!cell.instructions);

  // Sync local state when cell.instructions changes from outside (e.g., AI generation)
  useEffect(() => {
    if (cell.instructions?.text) {
      setRawText(cell.instructions.text);
      // If we have proper instructions now, exit raw mode
      if (cell.lastSyncedInstructions) {
        setIsRawMode(false);
      }
    }
  }, [cell.instructions?.text, cell.lastSyncedInstructions]);

  const handleTabChange = (tab: TabType) => {
    if (cell.isDirty && tab !== activeTab) {
      onSync(cell.id);
    }
    setActiveTab(tab);
  };

  const handleInstructionsChange = (instructions: StructuredInstructions) => {
    onUpdate(cell.id, {
      instructions,
      lastEditedTab: 'instructions',
      isDirty: true,
    });
  };

  // Handle instructions change from parameter update - don't mark dirty
  const handleInstructionsParameterUpdate = (instructions: StructuredInstructions) => {
    onUpdate(cell.id, {
      instructions,
      // Don't set isDirty or lastEditedTab - this is just a parameter value update
    });
  };

  const handleCodeChange = (code: string) => {
    onUpdate(cell.id, {
      code,
      lastEditedTab: 'code',
      isDirty: true,
    });
  };

  const handleRawInput = (text: string) => {
    setRawText(text);
    // Also update the cell's instructions so it gets marked dirty
    onUpdate(cell.id, {
      instructions: { text, parameters: [] },
      lastEditedTab: 'instructions',
      isDirty: true,
    });
  };

  // Handle parameter changes - update code directly without LLM
  const handleParameterChange = (paramName: string, oldValue: string, newValue: string) => {
    if (!cell.code) return;

    // Replace the old value with the new value in the code
    // This is a simple string replacement - works for most cases
    const updatedCode = cell.code.replace(
      new RegExp(oldValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
      newValue
    );

    if (updatedCode !== cell.code) {
      onUpdate(cell.id, {
        code: updatedCode,
        // Don't mark as dirty since this is a direct parameter update
      });
    }
  };

  return (
    <div
      className={`cell ${cell.isExecuting ? 'cell--executing' : ''} ${cell.isSyncing ? 'cell--syncing' : ''} ${isActive ? 'cell--active' : ''}`}
      onClick={() => onFocus?.(cell.id)}
      tabIndex={0}
      onFocus={() => onFocus?.(cell.id)}
    >
      <div className="cell-toolbar">
        <div className="cell-tabs" role="tablist">
          <button
            role="tab"
            aria-selected={activeTab === 'instructions'}
            onClick={() => handleTabChange('instructions')}
          >
            Instructions
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'code'}
            onClick={() => handleTabChange('code')}
          >
            Code
          </button>
        </div>
        <div className="cell-actions">
          {cell.isDirty && !cell.isSyncing && (
            <button onClick={() => onSync(cell.id)} aria-label="Sync">
              Sync
            </button>
          )}
          {cell.isSyncing && (
            <button disabled className="cell-syncing-btn">
              <span className="cell-syncing-spinner" />
              Syncing...
            </button>
          )}
          <button
            onClick={() => onRun(cell.id)}
            disabled={cell.isExecuting || cell.isSyncing}
            aria-label="Run"
          >
            {cell.isExecuting ? 'Running...' : '▶ Run'}
          </button>
        </div>
      </div>

      <div className="cell-content">
        {activeTab === 'instructions' ? (
          <InstructionsEditor
            instructions={cell.instructions}
            onChange={handleInstructionsChange}
            onParameterUpdate={handleInstructionsParameterUpdate}
            onRawInput={handleRawInput}
            onExpand={onExpandInstructions ? () => onExpandInstructions(cell.id) : undefined}
            onShorten={onShortenInstructions ? () => onShortenInstructions(cell.id) : undefined}
            onParameterChange={handleParameterChange}
            isRawMode={isRawMode}
            rawText={rawText}
            isSyncing={cell.isSyncing}
          />
        ) : (
          <div className="cell-code-wrapper">
            {cell.isSyncing && (
              <div className="cell-sync-overlay">
                <div className="cell-sync-overlay__content">
                  <span className="cell-sync-overlay__spinner" />
                  <span>Generating code...</span>
                </div>
              </div>
            )}
            <CodeEditor
              code={cell.code}
              onChange={handleCodeChange}
              readOnly={cell.isExecuting || cell.isSyncing}
            />
          </div>
        )}
      </div>

      {cell.outputs.length > 0 && (
        <div className="cell-output">
          <OutputArea outputs={cell.outputs} />
        </div>
      )}
    </div>
  );
}
