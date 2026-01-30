import React, { useState, useRef, useCallback } from 'react';
import { CellState, CodeCellTab } from '../../types/cell';
import { DescriptionEditor } from './DescriptionEditor';
import { CodeEditor } from './CodeEditor';
import { OutputArea } from './OutputArea';
import { useCellResize } from '../hooks/useCellResize';

interface CellProps {
  cell: CellState;
  onUpdate: (cellId: string, updates: Partial<CellState>) => void;
  onRun: (cellId: string) => void;
  onSync: (cellId: string) => void;
  isActive?: boolean;
  onFocus?: (cellId: string) => void;
}

// Utility to escape regex special characters
const escapeRegex = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function Cell({ cell, onUpdate, onRun, onSync, isActive, onFocus }: CellProps) {
  const [activeTab, setActiveTab] = useState<CodeCellTab>(cell.lastEditedTab || 'short');
  const cellRef = useRef<HTMLDivElement>(null);

  // Use resize hook
  const { isResizing, contentHeight, handleResizeStart } = useCellResize({
    initialHeight: cell.height,
    onHeightChange: useCallback((height: number) => onUpdate(cell.id, { height }), [cell.id, onUpdate]),
  });

  // Handle tab change with sync
  const handleTabChange = (tab: CodeCellTab) => {
    if (cell.isDirty && tab !== activeTab) onSync(cell.id);
    setActiveTab(tab);
    onUpdate(cell.id, { lastEditedTab: tab });
  };

  // Content change handlers
  const handleShortChange = (content: string) => {
    onUpdate(cell.id, { shortDescription: content, lastEditedTab: 'short', isDirty: true });
  };

  const handleFullChange = (content: string) => {
    onUpdate(cell.id, { fullDescription: content, lastEditedTab: 'full', isDirty: true });
  };

  const handleCodeChange = (code: string) => {
    onUpdate(cell.id, { code, lastEditedTab: 'code', isDirty: true });
  };

  // Handle parameter changes - update all tabs
  const handleParameterChange = (paramName: string, oldValue: string, newValue: string) => {
    const updates: Partial<CellState> = {};
    const valueRegex = new RegExp(escapeRegex(oldValue), 'g');

    if (cell.code) updates.code = cell.code.replace(valueRegex, newValue);

    const paramRegex = (name: string, val: string) =>
      new RegExp(`\\{\\{${escapeRegex(name)}:${escapeRegex(val)}\\}\\}`, 'g');

    if (cell.shortDescription) {
      updates.shortDescription = cell.shortDescription.replace(paramRegex(paramName, oldValue), `{{${paramName}:${newValue}}}`);
    }
    if (cell.fullDescription) {
      updates.fullDescription = cell.fullDescription.replace(paramRegex(paramName, oldValue), `{{${paramName}:${newValue}}}`);
    }

    if (Object.keys(updates).length > 0) onUpdate(cell.id, updates);
  };

  const cellClasses = `cell ${cell.isExecuting ? 'cell--executing' : ''} ${cell.isSyncing ? 'cell--syncing' : ''} ${isActive ? 'cell--active' : ''}`;

  return (
    <div ref={cellRef} className={cellClasses} onClick={() => onFocus?.(cell.id)} tabIndex={0} onFocus={() => onFocus?.(cell.id)}>
      <CellToolbar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        isDirty={cell.isDirty}
        isSyncing={cell.isSyncing}
        isExecuting={cell.isExecuting}
        onSync={() => onSync(cell.id)}
        onRun={() => onRun(cell.id)}
      />
      <CellContent
        activeTab={activeTab}
        cell={cell}
        contentHeight={contentHeight}
        onShortChange={handleShortChange}
        onFullChange={handleFullChange}
        onCodeChange={handleCodeChange}
        onParameterChange={handleParameterChange}
      />
      <div className={`cell-resize-handle ${isResizing ? 'cell-resize-handle--active' : ''}`} onMouseDown={handleResizeStart}>
        <div className="cell-resize-handle__grip" />
      </div>
      {cell.outputs.length > 0 && (
        <div className="cell-output">
          <OutputArea outputs={cell.outputs} />
        </div>
      )}
    </div>
  );
}

// Sub-components to reduce main function size
interface CellToolbarProps {
  activeTab: CodeCellTab;
  onTabChange: (tab: CodeCellTab) => void;
  isDirty: boolean;
  isSyncing: boolean;
  isExecuting: boolean;
  onSync: () => void;
  onRun: () => void;
}

function CellToolbar({ activeTab, onTabChange, isDirty, isSyncing, isExecuting, onSync, onRun }: CellToolbarProps) {
  return (
    <div className="cell-toolbar">
      <div className="cell-tabs" role="tablist">
        <button role="tab" aria-selected={activeTab === 'short'} onClick={() => onTabChange('short')}>Short</button>
        <button role="tab" aria-selected={activeTab === 'full'} onClick={() => onTabChange('full')}>Full</button>
        <button role="tab" aria-selected={activeTab === 'code'} onClick={() => onTabChange('code')}>Code</button>
      </div>
      <div className="cell-actions">
        {isDirty && !isSyncing && <button onClick={onSync} aria-label="Sync">Sync</button>}
        {isSyncing && (
          <button disabled className="cell-syncing-btn">
            <span className="cell-syncing-spinner" />
            Syncing...
          </button>
        )}
        <button onClick={onRun} disabled={isExecuting || isSyncing} aria-label="Run">
          {isExecuting ? 'Running...' : '▶ Run'}
        </button>
      </div>
    </div>
  );
}

interface CellContentProps {
  activeTab: CodeCellTab;
  cell: CellState;
  contentHeight: number;
  onShortChange: (content: string) => void;
  onFullChange: (content: string) => void;
  onCodeChange: (code: string) => void;
  onParameterChange: (paramName: string, oldValue: string, newValue: string) => void;
}

function CellContent({ activeTab, cell, contentHeight, onShortChange, onFullChange, onCodeChange, onParameterChange }: CellContentProps) {
  const editorHeight = contentHeight - 32;

  return (
    <div className="cell-content" style={{ minHeight: `${contentHeight}px` }}>
      {activeTab === 'short' && (
        <DescriptionEditor content={cell.shortDescription} onChange={onShortChange} onParameterChange={onParameterChange} placeholder="Brief description of what this code does..." isSyncing={cell.isSyncing} minHeight={editorHeight} />
      )}
      {activeTab === 'full' && (
        <DescriptionEditor content={cell.fullDescription} onChange={onFullChange} onParameterChange={onParameterChange} placeholder="Detailed explanation of the code in plain English..." isSyncing={cell.isSyncing} minHeight={editorHeight} />
      )}
      {activeTab === 'code' && (
        <div className="cell-code-wrapper">
          {cell.isSyncing && (
            <div className="cell-sync-overlay">
              <div className="cell-sync-overlay__content">
                <span className="cell-sync-overlay__spinner" />
                <span>Generating code...</span>
              </div>
            </div>
          )}
          <CodeEditor code={cell.code} onChange={onCodeChange} readOnly={cell.isExecuting || cell.isSyncing} height={contentHeight} />
        </div>
      )}
    </div>
  );
}
