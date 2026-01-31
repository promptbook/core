import React, { useState, useRef, useCallback, useEffect } from 'react';
import { CellState, CodeCellTab } from '../../types/cell';
import { DescriptionEditor } from './DescriptionEditor';
import { CodeEditor } from './CodeEditor';
import { OutputArea } from './OutputArea';
import { useCellResize } from '../hooks/useCellResize';
import { FileEntry } from './FileAutocomplete';
import type { KernelSymbol } from './SymbolAutocomplete';

interface CellProps {
  cell: CellState;
  onUpdate: (cellId: string, updates: Partial<CellState>) => void;
  onRun: (cellId: string) => void;
  onSync: (cellId: string) => void;
  isActive?: boolean;
  onFocus?: (cellId: string) => void;
  /** Function to list files for @ autocomplete */
  listFiles?: (dirPath?: string) => Promise<{ files: FileEntry[]; cwd: string }>;
  /** Function to get kernel symbols for # autocomplete */
  getSymbols?: () => Promise<KernelSymbol[]>;
}

// Utility to escape regex special characters
const escapeRegex = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Collapse icons
const CollapseIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M3 4.5l3 3 3-3" />
  </svg>
);

const ExpandIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M4.5 3l3 3-3 3" />
  </svg>
);

export function Cell({ cell, onUpdate, onRun, onSync, isActive, onFocus, listFiles, getSymbols }: CellProps) {
  const [activeTab, setActiveTab] = useState<CodeCellTab>(cell.lastEditedTab || 'short');
  const cellRef = useRef<HTMLDivElement>(null);

  // Use resize hook
  const { isResizing, contentHeight, handleResizeStart } = useCellResize({
    initialHeight: cell.height,
    onHeightChange: useCallback((height: number) => onUpdate(cell.id, { height }), [cell.id, onUpdate]),
  });

  // Collapse handlers
  const handleToggleInputCollapse = useCallback(() => {
    onUpdate(cell.id, { isInputCollapsed: !cell.isInputCollapsed });
  }, [cell.id, cell.isInputCollapsed, onUpdate]);

  const handleToggleOutputCollapse = useCallback(() => {
    onUpdate(cell.id, { isOutputCollapsed: !cell.isOutputCollapsed });
  }, [cell.id, cell.isOutputCollapsed, onUpdate]);

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

  const handlePseudoChange = (content: string) => {
    onUpdate(cell.id, { pseudoCode: content, lastEditedTab: 'pseudo', isDirty: true });
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
    if (cell.pseudoCode) {
      updates.pseudoCode = cell.pseudoCode.replace(paramRegex(paramName, oldValue), `{{${paramName}:${newValue}}}`);
    }

    if (Object.keys(updates).length > 0) onUpdate(cell.id, updates);
  };

  const cellClasses = `cell ${cell.isExecuting ? 'cell--executing' : ''} ${cell.isSyncing ? 'cell--syncing' : ''} ${isActive ? 'cell--active' : ''} ${cell.isInputCollapsed ? 'cell--input-collapsed' : ''}`;

  // Get preview text for collapsed state
  const getCollapsedPreview = (): string => {
    if (activeTab === 'code' && cell.code) {
      return cell.code.split('\n')[0].slice(0, 80) + (cell.code.length > 80 ? '...' : '');
    }
    if (activeTab === 'short' && cell.shortDescription) {
      return cell.shortDescription.slice(0, 80) + (cell.shortDescription.length > 80 ? '...' : '');
    }
    if (activeTab === 'pseudo' && cell.pseudoCode) {
      return cell.pseudoCode.slice(0, 80) + (cell.pseudoCode.length > 80 ? '...' : '');
    }
    return 'Empty cell';
  };

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
        executionStartTime={cell.executionStartTime}
        lastExecutionTime={cell.lastExecutionTime}
        lastExecutionSuccess={cell.lastExecutionSuccess}
        executionCount={cell.executionCount}
        isInputCollapsed={cell.isInputCollapsed}
        onToggleInputCollapse={handleToggleInputCollapse}
      />
      {cell.isInputCollapsed ? (
        <div className="cell-collapsed-preview" onClick={handleToggleInputCollapse}>
          <span className="cell-collapsed-preview__text">{getCollapsedPreview()}</span>
          <span className="cell-collapsed-preview__hint">Click to expand</span>
        </div>
      ) : (
        <>
          <CellContent
            activeTab={activeTab}
            cell={cell}
            contentHeight={contentHeight}
            onShortChange={handleShortChange}
            onPseudoChange={handlePseudoChange}
            onCodeChange={handleCodeChange}
            onParameterChange={handleParameterChange}
            listFiles={listFiles}
            getSymbols={getSymbols}
          />
          <div className={`cell-resize-handle ${isResizing ? 'cell-resize-handle--active' : ''}`} onMouseDown={handleResizeStart}>
            <div className="cell-resize-handle__grip" />
          </div>
        </>
      )}
      {cell.outputs.length > 0 && (
        <div className={`cell-output ${cell.isOutputCollapsed ? 'cell-output--collapsed' : ''}`}>
          <div className="cell-output-header" onClick={handleToggleOutputCollapse}>
            <span className="cell-output-header__icon">
              {cell.isOutputCollapsed ? <ExpandIcon /> : <CollapseIcon />}
            </span>
            <span className="cell-output-header__label">
              Output {cell.executionCount ? `[${cell.executionCount}]` : ''}
            </span>
            {cell.isOutputCollapsed && (
              <span className="cell-output-header__preview">
                {cell.outputs[0]?.content.slice(0, 50)}...
              </span>
            )}
          </div>
          {!cell.isOutputCollapsed && <OutputArea outputs={cell.outputs} />}
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
  executionStartTime?: number;
  lastExecutionTime?: number;
  lastExecutionSuccess?: boolean;
  executionCount?: number;
  isInputCollapsed?: boolean;
  onToggleInputCollapse: () => void;
}

function CellToolbar({ activeTab, onTabChange, isDirty, isSyncing, isExecuting, onSync, onRun, executionStartTime, lastExecutionTime, lastExecutionSuccess, executionCount, isInputCollapsed, onToggleInputCollapse }: CellToolbarProps) {
  return (
    <div className="cell-toolbar">
      <div className="cell-toolbar-left">
        <button
          className="cell-collapse-btn"
          onClick={(e) => { e.stopPropagation(); onToggleInputCollapse(); }}
          title={isInputCollapsed ? 'Expand cell' : 'Collapse cell'}
          aria-label={isInputCollapsed ? 'Expand cell' : 'Collapse cell'}
        >
          {isInputCollapsed ? <ExpandIcon /> : <CollapseIcon />}
        </button>
        <div className="cell-tabs" role="tablist">
          <button role="tab" aria-selected={activeTab === 'short'} onClick={() => onTabChange('short')}>Short</button>
          <button role="tab" aria-selected={activeTab === 'pseudo'} onClick={() => onTabChange('pseudo')}>Pseudo</button>
          <button role="tab" aria-selected={activeTab === 'code'} onClick={() => onTabChange('code')}>Code</button>
        </div>
      </div>
      <div className="cell-actions">
        <ExecutionStatus isExecuting={isExecuting} executionStartTime={executionStartTime} lastExecutionTime={lastExecutionTime} lastExecutionSuccess={lastExecutionSuccess} executionCount={executionCount} />
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

// Execution status with live timer
interface ExecutionStatusProps {
  isExecuting: boolean;
  executionStartTime?: number;
  lastExecutionTime?: number;
  lastExecutionSuccess?: boolean;
  executionCount?: number;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const mins = Math.floor(ms / 60000);
  const secs = ((ms % 60000) / 1000).toFixed(0);
  return `${mins}m ${secs}s`;
}

function ExecutionStatus({ isExecuting, executionStartTime, lastExecutionTime, lastExecutionSuccess, executionCount }: ExecutionStatusProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!isExecuting || !executionStartTime) {
      setElapsed(0);
      return;
    }

    const interval = setInterval(() => {
      setElapsed(Date.now() - executionStartTime);
    }, 100);

    return () => clearInterval(interval);
  }, [isExecuting, executionStartTime]);

  if (isExecuting) {
    return (
      <span className="execution-status execution-status--running">
        <span className="execution-status__spinner" />
        <span className="execution-status__time">{formatDuration(elapsed)}</span>
      </span>
    );
  }

  if (lastExecutionTime !== undefined && lastExecutionSuccess !== undefined) {
    const statusClass = lastExecutionSuccess ? 'execution-status--success' : 'execution-status--error';
    const icon = lastExecutionSuccess ? '✓' : '✗';
    return (
      <span className={`execution-status ${statusClass}`} title={`Execution ${executionCount || ''}: ${formatDuration(lastExecutionTime)}`}>
        <span className="execution-status__icon">{icon}</span>
        <span className="execution-status__time">{formatDuration(lastExecutionTime)}</span>
      </span>
    );
  }

  return null;
}

interface CellContentProps {
  activeTab: CodeCellTab;
  cell: CellState;
  contentHeight: number;
  onShortChange: (content: string) => void;
  onPseudoChange: (content: string) => void;
  onCodeChange: (code: string) => void;
  onParameterChange: (paramName: string, oldValue: string, newValue: string) => void;
  listFiles?: (dirPath?: string) => Promise<{ files: FileEntry[]; cwd: string }>;
  getSymbols?: () => Promise<KernelSymbol[]>;
}

function CellContent({ activeTab, cell, contentHeight, onShortChange, onPseudoChange, onCodeChange, onParameterChange, listFiles, getSymbols }: CellContentProps) {
  const editorHeight = contentHeight - 32;

  return (
    <div className="cell-content" style={{ minHeight: `${contentHeight}px` }}>
      {activeTab === 'short' && (
        <DescriptionEditor content={cell.shortDescription} onChange={onShortChange} onParameterChange={onParameterChange} placeholder="Brief description of what this code does..." isSyncing={cell.isSyncing} minHeight={editorHeight} listFiles={listFiles} getSymbols={getSymbols} />
      )}
      {activeTab === 'pseudo' && (
        <DescriptionEditor content={cell.pseudoCode} onChange={onPseudoChange} onParameterChange={onParameterChange} placeholder="Structured pseudo-code with numbered steps (FOR, IF, WHILE...)" isSyncing={cell.isSyncing} minHeight={editorHeight} listFiles={listFiles} getSymbols={getSymbols} />
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
