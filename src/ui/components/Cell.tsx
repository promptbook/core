import React, { useState } from 'react';
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
  const [rawText, setRawText] = useState('');
  const [isRawMode] = useState(!cell.instructions);

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
  };

  return (
    <div className={`cell ${cell.isExecuting ? 'cell--executing' : ''}`}>
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
          {cell.isDirty && (
            <button onClick={() => onSync(cell.id)} aria-label="Sync">
              Sync
            </button>
          )}
          <button
            onClick={() => onRun(cell.id)}
            disabled={cell.isExecuting}
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
          <CodeEditor
            code={cell.code}
            onChange={handleCodeChange}
            readOnly={cell.isExecuting}
          />
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
