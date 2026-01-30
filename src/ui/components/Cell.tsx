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
}

type TabType = 'instructions' | 'code';

export function Cell({ cell, onUpdate, onRun, onSync }: CellProps) {
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

  return (
    <div className={`cell ${cell.isExecuting ? 'cell--executing' : ''} ${cell.isSyncing ? 'cell--syncing' : ''}`}>
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
            onRawInput={handleRawInput}
            isRawMode={isRawMode}
            rawText={rawText}
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
